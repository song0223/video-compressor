import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useMemo, useState } from "react";
import { FooterProgress } from "./components/FooterProgress";
import { DropZone } from "./components/DropZone";
import { PresetPanel } from "./components/PresetPanel";
import { QueueTable } from "./components/QueueTable";
import { Toolbar } from "./components/Toolbar";
import { getDefaultPreset } from "./lib/presets";
import type { QueueItem, VideoMetadata, VideoPreset } from "./types/video";

const videoExtensions = ["mp4", "mov", "mkv", "avi", "webm", "m4v"];

function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

function isSupportedVideo(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase();
  return extension ? videoExtensions.includes(extension) : false;
}

function App() {
  const [selectedPreset, setSelectedPreset] = useState<VideoPreset>(getDefaultPreset());
  const [items, setItems] = useState<QueueItem[]>([]);
  const [outputDirectory, setOutputDirectory] = useState("");
  const [notice, setNotice] = useState("");

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

  return (
    <main className="min-h-screen px-8 py-7">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-5">
        <Toolbar
          itemCount={items.length}
          outputDirectory={outputDirectory}
          onAddVideos={selectVideos}
          onChooseOutput={selectOutputDirectory}
          onClearQueue={clearQueue}
        />

        {notice ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {notice}
          </div>
        ) : null}

        <section className="grid grid-cols-[minmax(0,1fr)_300px] gap-5">
          <div className="flex min-w-0 flex-col gap-4">
            <DropZone onAddVideos={selectVideos} onAddPaths={addVideoPaths} />
            <QueueTable items={items} />
          </div>

          <PresetPanel
            selectedPreset={selectedPreset}
            onPresetChange={setSelectedPreset}
            onApplyToAll={applyPresetToAll}
          />
        </section>

        <FooterProgress items={items} progress={totalProgress} />
      </div>
    </main>
  );
}

export default App;
