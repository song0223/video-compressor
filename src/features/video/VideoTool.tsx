import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DropZone } from "../../components/DropZone";
import { FooterProgress } from "../../components/FooterProgress";
import { PresetPanel } from "../../components/PresetPanel";
import { QueueTable } from "../../components/QueueTable";
import { Toolbar } from "../../components/Toolbar";
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
import { getDefaultPreset } from "../../lib/presets";
import { applyPresetToEditableItems } from "../../lib/queueItems";
import type { QueueItem, VideoMetadata, VideoPreset } from "../../types/video";

const videoExtensions = ["mp4", "mov", "mkv", "avi", "webm", "m4v"];

function isSupportedVideo(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase();
  return extension ? videoExtensions.includes(extension) : false;
}

interface ExportProgressPayload {
  id: string;
  percent: number;
  outputSizeBytes?: number;
  speedText?: string;
  etaSeconds?: number;
}

interface ExportResult {
  outputPath: string;
  outputSizeBytes: number;
}

export function VideoTool() {
  const [selectedPreset, setSelectedPreset] = useState<VideoPreset>(getDefaultPreset());
  const [items, setItems] = useState<QueueItem[]>([]);
  const [outputDirectory, setOutputDirectory] = useState("");
  const [notice, setNotice] = useState("");
  const [completionMessages, setCompletionMessages] = useState<CompletionMessage[]>([]);

  const completionNotificationCount = useMemo(
    () => completionBadgeCount(completionMessages),
    [completionMessages],
  );

  useEffect(() => {
    void setExportCompletionBadge(completionNotificationCount, appCompletionNotifier);
  }, [completionNotificationCount]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<ExportProgressPayload>("export-progress", (event) => {
      setItems((current) =>
        current.map((item) =>
          item.id === event.payload.id
            ? {
                ...item,
                progress: {
                  ...item.progress,
                  percent: event.payload.percent,
                  outputSizeBytes: event.payload.outputSizeBytes ?? item.progress.outputSizeBytes,
                  speedText: event.payload.speedText ?? item.progress.speedText,
                  etaSeconds: event.payload.etaSeconds ?? item.progress.etaSeconds,
                },
              }
            : item,
        ),
      );
    })
      .then((dispose) => {
        unlisten = dispose;
      })
      .catch(() => undefined);

    return () => {
      unlisten?.();
    };
  }, []);

  const totalProgress = useMemo(() => {
    if (items.length === 0) return 0;
    return items.reduce((sum, item) => sum + item.progress.percent, 0) / items.length;
  }, [items]);

  const updateSelectedPreset = (preset: VideoPreset) => {
    setSelectedPreset(preset);
    setItems((current) => applyPresetToEditableItems(current, preset));
  };

  const applyPresetToAll = () => {
    setItems((current) => applyPresetToEditableItems(current, selectedPreset));
  };

  const addVideoPaths = useCallback(
    async (paths: string[]) => {
      const uniquePaths = Array.from(new Set(paths.filter(isSupportedVideo)));
      if (uniquePaths.length === 0) {
        setNotice("没有找到支持的视频文件。");
        return;
      }

      setOutputDirectory((current) => current || directoryFromPath(uniquePaths[0]));

      for (const sourcePath of uniquePaths) {
        if (items.some((item) => item.sourcePath === sourcePath)) {
          continue;
        }

        const id = crypto.randomUUID();
        const baseItem: QueueItem = {
          id,
          sourcePath,
          fileName: fileNameFromPath(sourcePath),
          preset: selectedPreset,
          status: "waiting",
          progress: { percent: 0 },
        };
        setItems((current) => [...current, baseItem]);

        try {
          const metadata = await invoke<VideoMetadata>("get_video_metadata", { path: sourcePath });
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

  const selectVideos = async () => {
    try {
      const selected = await open({
        multiple: true,
        directory: false,
        filters: [{ name: "Videos", extensions: videoExtensions }],
      });
      if (Array.isArray(selected)) {
        await addVideoPaths(selected);
      } else if (selected) {
        await addVideoPaths([selected]);
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

  const clearQueue = () => {
    setItems([]);
    setNotice("");
    setCompletionMessages([]);
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const dismissCompletion = (id: string) => {
    setCompletionMessages((current) => dismissCompletionMessage(current, id));
  };

  const startAll = async () => {
    if (items.length === 0) {
      setNotice("请先添加视频。");
      return;
    }
    if (!outputDirectory) {
      setNotice("请先选择输出位置。");
      return;
    }

    setNotice("");
    setCompletionMessages([]);
    let completedInRun = 0;
    const queue = items.filter((item) => item.status === "waiting" || item.status === "failed");
    for (const item of queue) {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, status: "running", errorMessage: undefined, progress: { percent: 0 } }
            : entry,
        ),
      );

      try {
        const result = await invoke<ExportResult>("export_video", {
          request: {
            id: item.id,
            sourcePath: item.sourcePath,
            outputDirectory,
            preset: item.preset,
            durationSeconds: item.metadata?.durationSeconds ?? 0,
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
                    ...entry.progress,
                    percent: 1,
                    outputSizeBytes: result.outputSizeBytes,
                  },
                }
              : entry,
          ),
        );
        completedInRun += 1;
        setCompletionMessages((current) =>
          addCompletionMessage(current, `已完成 ${completedInRun} 个导出：${item.fileName}`),
        );
        appCompletionNotifier.playCompletionSound();
      } catch (error) {
        const message = String(error);
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: message.includes("取消") ? "canceled" : "failed",
                  errorMessage: message,
                }
              : entry,
          ),
        );
        break;
      }
    }
  };

  const cancelCurrent = async () => {
    try {
      await invoke("cancel_current_export");
    } catch (error) {
      setNotice(`取消失败：${String(error)}`);
    }
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
      <Toolbar
        itemCount={items.length}
        outputDirectory={outputDirectory}
        onAddVideos={selectVideos}
        onChooseOutput={selectOutputDirectory}
      />

      {notice ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          {notice}
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
          <DropZone onAddVideos={selectVideos} onAddPaths={addVideoPaths} />
          <QueueTable
            items={items}
            onOpenOutput={openOutputPath}
            onOpenOutputFolder={openOutputFolder}
            onRemoveItem={removeItem}
          />
        </div>

        <PresetPanel
          selectedPreset={selectedPreset}
          onPresetChange={updateSelectedPreset}
          onApplyToAll={applyPresetToAll}
        />
      </section>

      <FooterProgress
        items={items}
        progress={totalProgress}
        onClearQueue={clearQueue}
        onStartAll={startAll}
        onCancelCurrent={cancelCurrent}
      />
    </div>
  );
}
