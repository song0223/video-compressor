import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { FolderCog, Images, PenLine, Play, Trash2, X } from "lucide-react";
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
import { ImageCompareView } from "../../components/ImageCompareView";
import { directoryFromPath, fileNameFromPath } from "../../lib/filePaths";
import { getDefaultImagePreset } from "../../lib/imagePresets";
import { imageExtensions, isSupportedImage } from "../../lib/imageStats";
import { loadImagePreset, saveImagePreset, loadOutputDirectory, saveOutputDirectory } from "../../lib/settingsStorage";
import type { ImageMetadata, ImagePreset, ImageQueueItem } from "../../types/image";
import { ImageDropZone } from "./ImageDropZone";
import { ImagePresetPanel } from "./ImagePresetPanel";
import { ImageQueueTable } from "./ImageQueueTable";

interface ImageExportResult {
  outputPath: string;
  outputSizeBytes: number;
}

export function ImageTool() {
  const [selectedPreset, setSelectedPreset] = useState<ImagePreset>(() => {
    return loadImagePreset() ?? getDefaultImagePreset();
  });
  const [items, setItems] = useState<ImageQueueItem[]>([]);
  const [outputDirectory, setOutputDirectory] = useState(() => loadOutputDirectory("images"));
  const [notice, setNotice] = useState("");
  const [completionMessages, setCompletionMessages] = useState<CompletionMessage[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [customName, setCustomName] = useState("");
  const [comparePaths, setComparePaths] = useState<{ original: string; compressed: string } | null>(null);

  const completionNotificationCount = useMemo(
    () => completionBadgeCount(completionMessages),
    [completionMessages],
  );

  useEffect(() => {
    void setExportCompletionBadge(completionNotificationCount, appCompletionNotifier);
  }, [completionNotificationCount]);

  useEffect(() => {
    saveImagePreset(selectedPreset);
  }, [selectedPreset]);

  useEffect(() => {
    saveOutputDirectory("images", outputDirectory);
  }, [outputDirectory]);

  const totalProgress = useMemo(() => {
    if (items.length === 0) return 0;
    return items.reduce((sum, item) => sum + item.progress.percent, 0) / items.length;
  }, [items]);

  const addImagePaths = useCallback(
    async (paths: string[]) => {
      const uniquePaths = Array.from(new Set(paths.filter(isSupportedImage)));
      if (uniquePaths.length === 0) {
        setNotice("没有找到支持的图片文件。");
        return;
      }

      setOutputDirectory((current) => current || directoryFromPath(uniquePaths[0]));

      for (const sourcePath of uniquePaths) {
        if (items.some((item) => item.sourcePath === sourcePath)) {
          continue;
        }

        const id = crypto.randomUUID();
        const baseItem: ImageQueueItem = {
          id,
          sourcePath,
          fileName: fileNameFromPath(sourcePath),
          preset: selectedPreset,
          status: "waiting",
          progress: { percent: 0 },
        };
        setItems((current) => [...current, baseItem]);

        try {
          const metadata = await invoke<ImageMetadata>("get_image_metadata", { path: sourcePath });
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

  const selectImages = async () => {
    try {
      const selected = await open({
        multiple: true,
        directory: false,
        filters: [{ name: "Images", extensions: imageExtensions }],
      });
      if (Array.isArray(selected)) {
        await addImagePaths(selected);
      } else if (selected) {
        await addImagePaths([selected]);
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

  const updateSelectedPreset = (preset: ImagePreset) => {
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

  const cancelExport = async () => {
    try {
      await invoke("cancel_current_image_export");
    } catch (error) {
      setNotice(`取消导出失败：${String(error)}`);
    }
  };

  const startAll = async () => {
    if (items.length === 0) {
      setNotice("请先添加图片。");
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
        const result = await invoke<ImageExportResult>("export_image", {
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
          addCompletionMessage(current, `已完成 ${completedInRun} 张图片导出：${item.fileName}`),
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
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Images size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="m-0 text-xl font-black text-slate-950">图片工具</h1>
            <p className="m-0 mt-1 truncate text-sm text-slate-500">
              {outputDirectory ? `输出到 ${outputDirectory}` : "默认输出到第一张图片所在目录"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <PenLine size={14} className="text-slate-400" />
              <input
                className="w-64 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
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
            {items.length} 张图片
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
          <ImageDropZone onAddImages={selectImages} onAddPaths={addImagePaths} />
          <ImageQueueTable
            items={items}
            onOpenOutput={openOutputPath}
            onOpenOutputFolder={openOutputFolder}
            onRemoveItem={removeItem}
            onRetryItem={retryItem}
            onCompare={(original, compressed) => setComparePaths({ original, compressed })}
          />
        </div>

        <ImagePresetPanel
          selectedPreset={selectedPreset}
          onPresetChange={updateSelectedPreset}
          onApplyToAll={applyPresetToAll}
        />
      </section>

      <section className="tool-card flex items-center justify-between gap-5 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
            <span>图片导出进度</span>
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

      {comparePaths ? (
        <ImageCompareView
          originalPath={comparePaths.original}
          compressedPath={comparePaths.compressed}
          onClose={() => setComparePaths(null)}
        />
      ) : null}
    </div>
  );
}
