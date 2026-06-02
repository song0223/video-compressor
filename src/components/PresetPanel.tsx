import { Settings2 } from "lucide-react";
import { qualityPresets, resolutionPresets, videoFormatPresets } from "../lib/presets";
import type { QualityPresetId, ResolutionPresetId, VideoFormatPresetId, VideoPreset } from "../types/video";

interface PresetPanelProps {
  selectedPreset: VideoPreset;
  onPresetChange: (preset: VideoPreset) => void;
  onApplyToAll: () => void;
}

export function PresetPanel({ selectedPreset, onPresetChange, onApplyToAll }: PresetPanelProps) {
  const setResolution = (resolution: ResolutionPresetId) => {
    onPresetChange({ ...selectedPreset, resolution });
  };

  const setQuality = (quality: QualityPresetId) => {
    onPresetChange({ ...selectedPreset, quality });
  };

  const setFormat = (format: VideoFormatPresetId) => {
    onPresetChange({ ...selectedPreset, format });
  };

  return (
    <aside className="tool-card flex h-fit flex-col gap-5 p-5">
      <div className="flex items-center gap-2">
        <Settings2 size={19} className="text-blue-700" />
        <h2 className="m-0 text-lg font-bold text-slate-950">导出预设</h2>
      </div>

      <section>
        <p className="mb-2 mt-0 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          输出格式
        </p>
        <div className="grid grid-cols-2 gap-2">
          {videoFormatPresets.map((preset) => (
            <button
              className={`icon-button min-h-10 ${
                selectedPreset.format === preset.id ? "primary-button" : ""
              }`}
              key={preset.id}
              type="button"
              onClick={() => setFormat(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 mt-0 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          分辨率
        </p>
        <div className="grid grid-cols-2 gap-2">
          {resolutionPresets.map((preset) => (
            <button
              className={`icon-button min-h-10 ${
                selectedPreset.resolution === preset.id ? "primary-button" : ""
              }`}
              key={preset.id}
              type="button"
              onClick={() => setResolution(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 mt-0 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          质量
        </p>
        <div className="flex flex-col gap-2">
          {qualityPresets.map((preset) => (
            <button
              className={`icon-button justify-start ${
                selectedPreset.quality === preset.id ? "primary-button" : ""
              }`}
              key={preset.id}
              type="button"
              onClick={() => setQuality(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <button className="icon-button w-full primary-button" type="button" onClick={onApplyToAll}>
        应用到全部视频
      </button>
    </aside>
  );
}
