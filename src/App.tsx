import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FooterProgress } from "./components/FooterProgress";
import { DropZone } from "./components/DropZone";
import { PresetPanel } from "./components/PresetPanel";
import { QueueTable } from "./components/QueueTable";
import { Toolbar } from "./components/Toolbar";
import { directoryFromPath, fileNameFromPath } from "./lib/filePaths";
import { getDefaultPreset } from "./lib/presets";
import type { QueueItem, VideoMetadata, VideoPreset } from "./types/video";

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

function App() {
  const [selectedPreset, setSelectedPreset] = useState<VideoPreset>(getDefaultPreset());
  const [items, setItems] = useState<QueueItem[]>([]);
  const [outputDirectory, setOutputDirectory] = useState("");
  const [notice, setNotice] = useState("");

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

  const applyPresetToAll = () => {
    setItems((current) => current.map((item) => ({ ...item, preset: selectedPreset })));
  };

  const addVideoPaths = useCallback(async (paths: string[]) => {
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
        preset: getDefaultPreset(),
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
  }, [items]);

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
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
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
        const outputPath = await invoke<string>("export_video", {
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
                  outputPath,
                  progress: { ...entry.progress, percent: 1 },
                }
              : entry,
          ),
        );
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
    <main className="min-h-screen px-8 py-7">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-5">
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

        <section className="grid grid-cols-[minmax(0,1fr)_300px] gap-5">
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
            onPresetChange={setSelectedPreset}
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
    </main>
  );
}

export default App;
