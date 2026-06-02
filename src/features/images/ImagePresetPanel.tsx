import { RefreshCcw } from "lucide-react";
import {
  clampImageQualityPercent,
  imageFormatPresets,
  imageQualityPresets,
} from "../../lib/imagePresets";
import type { ImagePreset } from "../../types/image";

interface ImagePresetPanelProps {
  selectedPreset: ImagePreset;
  onPresetChange: (preset: ImagePreset) => void;
  onApplyToAll: () => void;
}

export function ImagePresetPanel({
  selectedPreset,
  onPresetChange,
  onApplyToAll,
}: ImagePresetPanelProps) {
  const qualityPercent = clampImageQualityPercent(selectedPreset.qualityPercent);

  const setQualityPercent = (value: number) => {
    onPresetChange({ ...selectedPreset, qualityPercent: clampImageQualityPercent(value) });
  };

  return (
    <aside className="tool-card flex flex-col gap-5 p-5">
      <div>
        <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Image</p>
        <h2 className="m-0 mt-1 text-xl font-black text-slate-950">图片设置</h2>
      </div>

      <div>
        <h3 className="m-0 mb-3 text-sm font-bold text-slate-700">输出格式</h3>
        <div className="grid grid-cols-2 gap-2">
          {imageFormatPresets.map((preset) => (
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="m-0 text-sm font-bold text-slate-700">压缩比例</h3>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
            {qualityPercent}%
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {imageQualityPresets.map((preset) => (
            <button
              className={`icon-button justify-center ${
                qualityPercent === preset.percent ? "primary-button" : ""
              }`}
              key={preset.percent}
              type="button"
              onClick={() => setQualityPercent(preset.percent)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-xs font-bold text-slate-500">
          自定义压缩百分比
          <input
            aria-label="自定义压缩百分比"
            className="mt-3 w-full accent-emerald-600"
            type="range"
            min="1"
            max="99"
            step="1"
            value={qualityPercent}
            onChange={(event) => setQualityPercent(Number(event.currentTarget.value))}
          />
        </label>
      </div>

      <button className="icon-button mt-auto" type="button" onClick={onApplyToAll}>
        <RefreshCcw size={16} />
        应用到全部图片
      </button>
    </aside>
  );
}
