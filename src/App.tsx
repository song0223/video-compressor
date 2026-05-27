import { useMemo, useState } from "react";
import { FooterProgress } from "./components/FooterProgress";
import { DropZone } from "./components/DropZone";
import { PresetPanel } from "./components/PresetPanel";
import { QueueTable } from "./components/QueueTable";
import { Toolbar } from "./components/Toolbar";
import { getDefaultPreset } from "./lib/presets";
import type { QueueItem, VideoPreset } from "./types/video";

function App() {
  const [selectedPreset, setSelectedPreset] = useState<VideoPreset>(getDefaultPreset());
  const [items, setItems] = useState<QueueItem[]>([
    {
      id: "sample-1",
      sourcePath: "/Users/songxiang/Downloads/Sicily_Slow_tv_4k.mp4",
      fileName: "Sicily_Slow_tv_4k.mp4",
      metadata: {
        width: 1920,
        height: 1080,
        durationSeconds: 3599,
        codec: "HEVC",
        sizeBytes: 2.1 * 1024 * 1024 * 1024,
      },
      preset: { resolution: "720p", quality: "balanced" },
      status: "running",
      progress: {
        percent: 0.68,
        speedText: "18.4x",
        etaSeconds: 112,
        outputSizeBytes: 433 * 1024 * 1024,
      },
    },
    {
      id: "sample-2",
      sourcePath: "/Users/songxiang/Downloads/BOTSWANA LONG SHOTS FINAL-4K.mp4",
      fileName: "BOTSWANA LONG SHOTS FINAL-4K.mp4",
      metadata: {
        width: 3840,
        height: 2160,
        durationSeconds: 1260,
        codec: "H.264",
        sizeBytes: 4.7 * 1024 * 1024 * 1024,
      },
      preset: { resolution: "2k", quality: "high" },
      status: "waiting",
      progress: { percent: 0 },
    },
    {
      id: "sample-3",
      sourcePath: "/Users/songxiang/Downloads/travel_clip.mov",
      fileName: "travel_clip.mov",
      metadata: {
        width: 1920,
        height: 1080,
        durationSeconds: 284,
        codec: "ProRes",
        sizeBytes: 968 * 1024 * 1024,
      },
      preset: { resolution: "1080p", quality: "small" },
      status: "completed",
      progress: { percent: 1, outputSizeBytes: 86 * 1024 * 1024 },
      outputPath: "/Users/songxiang/Downloads/travel_clip_1080p.mp4",
    },
  ]);

  const totalProgress = useMemo(() => {
    if (items.length === 0) return 0;
    return items.reduce((sum, item) => sum + item.progress.percent, 0) / items.length;
  }, [items]);

  const applyPresetToAll = () => {
    setItems((current) => current.map((item) => ({ ...item, preset: selectedPreset })));
  };

  return (
    <main className="min-h-screen px-8 py-7">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-5">
        <Toolbar itemCount={items.length} />

        <section className="grid grid-cols-[minmax(0,1fr)_300px] gap-5">
          <div className="flex min-w-0 flex-col gap-4">
            <DropZone />
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
