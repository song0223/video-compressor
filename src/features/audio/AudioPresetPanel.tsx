import { RefreshCcw } from "lucide-react";
import {
  audioFormatPresets,
  audioBitratePresets,
  audioSampleRatePresets,
} from "../../lib/audioPresets";
import type { AudioPreset } from "../../types/audio";

interface AudioPresetPanelProps {
  selectedPreset: AudioPreset;
  onPresetChange: (preset: AudioPreset) => void;
  onApplyToAll: () => void;
}

export function AudioPresetPanel({
  selectedPreset,
  onPresetChange,
  onApplyToAll,
}: AudioPresetPanelProps) {
  const isLossless = selectedPreset.format === "flac" || selectedPreset.format === "wav";

  return (
    <aside className="tool-card flex flex-col gap-5 p-5">
      <div>
        <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Audio</p>
        <h2 className="m-0 mt-1 text-xl font-black text-slate-950">音频设置</h2>
      </div>

      <div>
        <h3 className="m-0 mb-3 text-sm font-bold text-slate-700">输出格式</h3>
        <div className="grid grid-cols-2 gap-2">
          {audioFormatPresets.map((preset) => (
            <button
              className={`icon-button justify-center ${
                selectedPreset.format === preset.id ? "primary-button" : ""
              }`}
              key={preset.id}
              type="button"
              onClick={() => onPresetChange({ ...selectedPreset, format: preset.id })}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="m-0 mb-3 text-sm font-bold text-slate-700">比特率</h3>
        <div className="grid grid-cols-2 gap-2">
          {audioBitratePresets.map((preset) => (
            <button
              className={`icon-button justify-center ${
                selectedPreset.bitrateKbps === preset.value ? "primary-button" : ""
              } ${isLossless ? "opacity-50 cursor-not-allowed" : ""}`}
              key={preset.value}
              type="button"
              disabled={isLossless}
              onClick={() => onPresetChange({ ...selectedPreset, bitrateKbps: preset.value })}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {isLossless && (
          <p className="m-0 mt-2 text-xs text-slate-500">无损格式不需要选择比特率</p>
        )}
      </div>

      <div>
        <h3 className="m-0 mb-3 text-sm font-bold text-slate-700">采样率</h3>
        <div className="grid grid-cols-3 gap-2">
          {audioSampleRatePresets.map((preset) => (
            <button
              className={`icon-button justify-center ${
                selectedPreset.sampleRate === preset.value ? "primary-button" : ""
              }`}
              key={preset.value}
              type="button"
              onClick={() => onPresetChange({ ...selectedPreset, sampleRate: preset.value })}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="m-0 mb-3 text-sm font-bold text-slate-700">音量标准化</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={selectedPreset.normalize}
              onChange={(e) =>
                onPresetChange({ ...selectedPreset, normalize: e.currentTarget.checked })
              }
            />
            <div
              className={`block w-14 h-8 rounded-full transition-colors ${
                selectedPreset.normalize ? "bg-violet-600" : "bg-slate-300"
              }`}
            />
            <div
              className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                selectedPreset.normalize ? "transform translate-x-6" : ""
              }`}
            />
          </div>
          <span className="text-sm text-slate-700">
            {selectedPreset.normalize ? "已启用" : "未启用"}
          </span>
        </label>
      </div>

      <button className="icon-button mt-auto" type="button" onClick={onApplyToAll}>
        <RefreshCcw size={16} />
        应用到全部音频
      </button>
    </aside>
  );
}
