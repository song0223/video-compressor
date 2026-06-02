import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { FolderCog, Music, PenLine, Play, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addCompletionMessage,
  completionBadgeCount,
  dismissCompletionMessage,
  type CompletionMessage,
} from "../../lib/completionMessages";
import {
  appCompletionNotifier,
  setExportCompletionBadge,
} from "../../lib/completionNotifications";
import { directoryFromPath, fileNameFromPath } from "../../lib/filePaths";
import { getDefaultAudioPreset, audioExtensions, isSupportedAudio } from "../../lib/audioPresets";
import { loadAudioPreset, saveAudioPreset, loadOutputDirectory, saveOutputDirectory } from "../../lib/settingsStorage";
import type { AudioMetadata, AudioPreset, AudioQueueItem } from "../../types/audio";
import { AudioDropZone } from "./AudioDropZone";
import { AudioPresetPanel } from "./AudioPresetPanel";
import { AudioQueueTable } from "./AudioQueueTable";

interface AudioExportResult {
  outputPath: string;
  outputSizeBytes: number;
}

export function AudioTool() {
  const [selectedPreset, setSelectedPreset] = useState<AudioPreset>(() => {
    return loadAudioPreset() ?? getDefaultAudioPreset();
  });
  const [items, setItems] = useState<AudioQueueItem[]>([]);
  const [outputDirectory, setOutputDirectory] = useState(() => loadOutputDirectory("audio"));
  const [notice, setNotice] = useState("");
  const [completionMessages, setCompletionMessages] = useState<CompletionMessage[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [customName, setCustomName] = useState("");

  const completionNotificationCount = useMemo(
    () => completionBadgeCount(completionMessages),
    [completionMessages],
  );

  useEffect(() => {
    void setExportCompletionBadge(completionNotificationCount, appCompletionNotifier);
  }, [completionNotificationCount]);

  useEffect(() => {
    saveAudioPreset(selectedPreset);
  }, [selectedPreset]);

  useEffect(() => {
    saveOutputDirectory("audio", outputDirectory);
  }, [outputDirectory]);

  const totalProgress = useMemo(() => {
    if (items.length === 0) return 0;
    return items.reduce((sum, item) => sum + item.progress.percent, 0) / items.length;
  }, [items]);

  const addAudioPaths = useCallback(
    async (paths: string[]) => {
      const uniquePaths = Array.from(new Set(paths.filter(isSupportedAudio)));
      if (uniquePaths.length === 0) {
        setNotice("没有找到支持的音频文件。");
        return;
      }

      setOutputDirectory((current) => current || directoryFromPath(uniquePaths[0]));

      for (const sourcePath of uniquePaths) {
        if (items.some((item) => item.sourcePath === sourcePath)) {
          continue;
        }

        const id = crypto.randomUUID();
        const baseItem: AudioQueueItem = {
          id,
          sourcePath,
          fileName: fileNameFromPath(sourcePath),
          preset: selectedPreset,
          status: "waiting",
          progress: { percent: 0 },
        };
        setItems((current) => [...current, baseItem]);

        try {
          const metadata = await invoke<AudioMetadata>("get_audio_metadata", { path: sourcePath });
          setItems((current) =>
            current.map((item) => (item.id === id ? { ...item, metadata } : item)),
          );
        } catch (error) {
          setItems((current) =>
            current.map((item) =>
              item.id === id
                ? { ...item, status: "failed", errorMessage: String(error) }
                : item,
            ),
          );
        }
      }
    },
    [items, selectedPreset],
  );

  const selectAudio = async () => {
    try {
      const selected = await open({
        multiple: true,
        directory: false,
        filters: [{ name: "Audio", extensions: audioExtensions }],
      });
      if (Array.isArray(selected)) {
        await addAudioPaths(selected);
      } else if (selected) {
        await addAudioPaths([selected]);
      }
    } catch (error) {
      setNotice(`当前环境无法打开文件选择器：${String(error)}`);
    }
  };

  const selectOutputDirectory = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected === "string") {
        setOutputDirectory(selected);
      }
    } catch (error) {
      setNotice(`当前环境无法选择输出位置：${String(error)}`);
    }
  };

  const updateSelectedPreset = (preset: AudioPreset) => {
    setSelectedPreset(preset);
    setItems((current) =>
      current.map((item) =>
        item.status === "running" || item.status === "completed"
          ? item
          : { ...item, preset },
      ),
    );
  };

  const applyPresetToAll = () => {
    setItems((current) =>
      current.map((item) =>
        item.status === "running" || item.status === "completed"
          ? item
          : { ...item, preset: selectedPreset },
      ),
    );
  };

  const clearQueue = () => {
    setItems([]);
    setNotice("");
    setCompletionMessages([]);
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const retryItem = (id: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status: "waiting", errorMessage: undefined, progress: { percent: 0 } }
          : item,
      ),
    );
  };

  const dismissCompletion = (id: string) => {
    setCompletionMessages((current) => dismissCompletionMessage(current, id));
  };

  const updateItemPreset = (id: string, preset: AudioPreset) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, preset } : item,
      ),
    );
  };

  const cancelExport = async () => {
    try {
      await invoke("cancel_current_audio_export");
    } catch (error) {
      setNotice(`取消导出失败：${String(error)}`);
    }
  };

  const startAll = async () => {
    if (items.length === 0) {
      setNotice("请先添加音频文件。");
      return;
    }
    if (!outputDirectory) {
      setNotice("请先选择输出位置。");
      return;
    }

    setNotice("");
    setCompletionMessages([]);
    setIsExporting(true);
    let completedInRun = 0;
    const queue = items.filter((item) => item.status === "waiting" || item.status === "failed");
    for (const item of queue) {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, status: "running", errorMessage: undefined, progress: { percent: 0.35 } }
            : entry,
        ),
      );

      try {
        const result = await invoke<AudioExportResult>("export_audio", {
          request: {
            id: item.id,
            sourcePath: item.sourcePath,
            outputDirectory,
            preset: item.preset,
            customName: customName || undefined,
          },
        });
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "completed",
                  outputPath: result.outputPath,
                  progress: {
                    percent: 1,
                    outputSizeBytes: result.outputSizeBytes,
                  },
                }
              : entry,
          ),
        );
        completedInRun += 1;
        setCompletionMessages((current) =>
          addCompletionMessage(current, `已完成 ${completedInRun} 个音频导出：${item.fileName}`),
        );
        appCompletionNotifier.playCompletionSound();
      } catch (error) {
        const errorMsg = String(error);
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: "failed", errorMessage: errorMsg }
              : entry,
          ),
        );
        if (errorMsg.includes("导出已取消")) {
          setItems((current) =>
            current.map((entry) =>
              entry.status === "running"
                ? { ...entry, status: "waiting", errorMessage: undefined, progress: { percent: 0 } }
                : entry,
            ),
          );
          break;
        }
        break;
      }
    }
    setIsExporting(false);
  };

  const openOutputPath = async (path?: string) => {
    if (!path) return;
    try {
      await openPath(path);
    } catch (error) {
      setNotice(`无法打开文件：${String(error)}`);
    }
  };

  const openOutputFolder = async (path?: string) => {
    if (!path) return;
    try {
      await openPath(directoryFromPath(path));
    } catch (error) {
      setNotice(`无法打开文件夹：${String(error)}`);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="tool-card flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <Music size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="m-0 text-xl font-black text-slate-950">音频工具</h1>
            <p className="m-0 mt-1 truncate text-sm text-slate-500">
              {outputDirectory ? `输出到 ${outputDirectory}` : "默认输出到第一个音频所在目录"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <PenLine size={14} className="text-slate-400" />
              <input
                className="w-64 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
                type="text"
                placeholder="自定义输出文件名（留空自动生成）"
                value={customName}
                onChange={(e) => setCustomName(e.currentTarget.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">
            {items.length} 个音频
          </span>
          <button className="icon-button" type="button" onClick={selectOutputDirectory}>
            <FolderCog size={16} />
            输出位置
          </button>
        </div>
      </section>

      {notice ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          <span>{notice}</span>
          <button
            className="icon-button h-8 w-8 shrink-0 p-0"
            type="button"
            title="关闭提示"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      ) : null}

      {completionMessages.length > 0 ? (
        <div className="flex flex-col gap-2">
          {completionMessages.map((message) => (
            <div
              className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
              key={message.id}
            >
              <span className="min-w-0 truncate">{message.text}</span>
              <button
                className="icon-button h-8 w-8 shrink-0 p-0"
                type="button"
                title="关闭完成消息"
                onClick={() => dismissCompletion(message.id)}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <section className="tool-main-grid">
        <div className="flex min-w-0 flex-col gap-4">
          <AudioDropZone onAddAudio={selectAudio} onAddPaths={addAudioPaths} />
          <AudioQueueTable
            items={items}
            onOpenOutput={openOutputPath}
            onOpenOutputFolder={openOutputFolder}
            onRemoveItem={removeItem}
            onRetryItem={retryItem}
            onPresetChange={updateItemPreset}
          />
        </div>

        <AudioPresetPanel
          selectedPreset={selectedPreset}
          onPresetChange={updateSelectedPreset}
          onApplyToAll={applyPresetToAll}
        />
      </section>

      <section className="tool-card flex items-center justify-between gap-5 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
            <span>音频导出进度</span>
            <span>{Math.round(totalProgress * 100)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.round(totalProgress * 100)}%` }} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="icon-button danger-button" type="button" onClick={clearQueue}>
            <Trash2 size={16} />
            清空
          </button>
          {isExporting ? (
            <button className="icon-button danger-button" type="button" onClick={cancelExport}>
              <X size={16} />
              取消导出
            </button>
          ) : (
            <button className="icon-button primary-button" type="button" onClick={startAll}>
              <Play size={16} />
              全部导出
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
