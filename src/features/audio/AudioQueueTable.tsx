import { CheckCircle2, Clock3, ExternalLink, FolderOpen, RotateCcw, Scissors, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { AudioTrimmer } from "../../components/AudioTrimmer";
import { formatBytes, formatPercent } from "../../lib/format";
import {
  audioFormatPresets,
  audioBitratePresets,
  formatAudioDuration,
  estimateAudioOutputSizeBytes,
} from "../../lib/audioPresets";
import type { AudioPreset, AudioQueueItem, AudioQueueStatus } from "../../types/audio";

export const audioQueueRowGridClass = "grid grid-cols-[minmax(0,1fr)_124px]";

interface AudioQueueTableProps {
  items: AudioQueueItem[];
  onOpenOutput: (path?: string) => void;
  onOpenOutputFolder: (path?: string) => void;
  onRemoveItem: (id: string) => void;
  onRetryItem: (id: string) => void;
  onPresetChange: (id: string, preset: AudioPreset) => void;
}

const statusLabels: Record<AudioQueueStatus, string> = {
  waiting: "等待中",
  running: "处理中",
  completed: "已完成",
  failed: "失败",
};

function StatusIcon({ status }: { status: AudioQueueStatus }) {
  if (status === "completed") return <CheckCircle2 size={17} className="text-emerald-600" />;
  if (status === "failed") return <XCircle size={17} className="text-red-600" />;
  if (status === "running") return <RotateCcw size={17} className="text-blue-700 animate-spin" />;
  return <Clock3 size={17} className="text-slate-400" />;
}

export function AudioQueueTable({
  items,
  onOpenOutput,
  onOpenOutputFolder,
  onRemoveItem,
  onRetryItem,
  onPresetChange,
}: AudioQueueTableProps) {
  const [expandedTrimmer, setExpandedTrimmer] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <section className="tool-card flex min-h-[260px] items-center justify-center p-8 text-center">
        <div>
          <h2 className="m-0 text-xl font-bold text-slate-950">音频列表还是空的</h2>
          <p className="m-0 mt-2 text-sm text-slate-500">点击"手动多选"，或直接拖入多个音频文件。</p>
        </div>
      </section>
    );
  }

  return (
    <section className="tool-card overflow-hidden">
      <div
        className={`${audioQueueRowGridClass} border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500`}
      >
        <span>音频与状态</span>
        <span className="text-right">操作</span>
      </div>

      <div className="divide-y divide-slate-200">
        {items.map((item) => {
          const format = audioFormatPresets.find((preset) => preset.id === item.preset.format);
          const bitrate = audioBitratePresets.find((preset) => preset.value === item.preset.bitrateKbps);
          const estimatedOutputSize = item.metadata
            ? estimateAudioOutputSizeBytes(item.metadata, item.preset)
            : undefined;
          const finalOutputSize = item.progress.outputSizeBytes;
          const outputSizeLabel =
            finalOutputSize !== undefined
              ? `输出 ${formatBytes(finalOutputSize)}`
              : estimatedOutputSize !== undefined
                ? `预计 ${formatBytes(estimatedOutputSize)}`
                : "输出 -";

          const metadataSummary = item.metadata
            ? `${formatAudioDuration(item.metadata.durationSeconds)} · ${item.metadata.codec} · ${item.metadata.bitrateKbps}kbps · ${formatBytes(item.metadata.sizeBytes)}`
            : "等待读取信息";

          const durationMs = item.metadata ? Math.round(item.metadata.durationSeconds * 1000) : 0;
          const hasTrim =
            (item.preset.trimStartMs !== undefined && item.preset.trimStartMs > 0) ||
            (item.preset.trimEndMs !== undefined && item.preset.trimEndMs > 0 && item.preset.trimEndMs < durationMs);
          const isTrimmerOpen = expandedTrimmer === item.id;

          return (
            <article key={item.id}>
              <div className={`${audioQueueRowGridClass} items-center gap-3 px-4 py-4`}>
                <div className="min-w-0 pr-4">
                  <h3 className="m-0 truncate text-[15px] font-bold text-slate-950">{item.fileName}</h3>
                  <p className="m-0 mt-1 text-sm text-slate-500">{metadataSummary}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
                    <span className="rounded-md bg-slate-100 px-2 py-1">
                      {format?.label} · {bitrate?.label || `${item.preset.bitrateKbps}kbps`}
                    </span>
                    <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                      <StatusIcon status={item.status} />
                      {statusLabels[item.status]}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-1">{outputSizeLabel}</span>
                    {hasTrim && (
                      <span className="rounded-md bg-violet-100 px-2 py-1 text-violet-700">
                        已裁剪
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="progress-track flex-1">
                      <div
                        className={`progress-fill ${item.status === "completed" ? "done" : ""}`}
                        style={{ width: formatPercent(item.progress.percent) }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-bold text-slate-700">
                      {formatPercent(item.progress.percent)}
                    </span>
                  </div>
                  <p className="m-0 mt-2 text-sm text-slate-500">
                    {item.status === "failed"
                      ? item.errorMessage || "处理失败"
                      : item.status === "running"
                        ? "正在处理"
                        : item.status === "completed"
                          ? "可以打开文件位置"
                          : "准备就绪"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2">
                  <button
                    className={`icon-button h-9 w-9 p-0 ${hasTrim ? "border-violet-300 bg-violet-50 text-violet-700" : ""}`}
                    type="button"
                    title="裁剪音频"
                    disabled={item.status === "running" || item.status === "completed" || !item.metadata}
                    onClick={() => setExpandedTrimmer(isTrimmerOpen ? null : item.id)}
                  >
                    <Scissors size={16} />
                  </button>
                  <button
                    className="icon-button h-9 w-9 p-0"
                    type="button"
                    title="打开输出文件"
                    disabled={!item.outputPath}
                    onClick={() => onOpenOutput(item.outputPath)}
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    className="icon-button h-9 w-9 p-0"
                    type="button"
                    title="打开文件位置"
                    disabled={!item.outputPath}
                    onClick={() => onOpenOutputFolder(item.outputPath)}
                  >
                    <FolderOpen size={16} />
                  </button>
                  {item.status === "failed" ? (
                    <button
                      className="icon-button h-9 w-9 p-0"
                      type="button"
                      title="重试"
                      onClick={() => onRetryItem(item.id)}
                    >
                      <RotateCcw size={16} />
                    </button>
                  ) : null}
                  <button
                    className="icon-button danger-button h-9 w-9 p-0"
                    type="button"
                    title="从列表删除"
                    disabled={item.status === "running"}
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {isTrimmerOpen && durationMs > 0 && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
                  <AudioTrimmer
                    sourcePath={item.sourcePath}
                    durationMs={durationMs}
                    trimStartMs={item.preset.trimStartMs ?? 0}
                    trimEndMs={item.preset.trimEndMs ?? durationMs}
                    onTrimChange={(startMs, endMs) => {
                      onPresetChange(item.id, {
                        ...item.preset,
                        trimStartMs: startMs > 0 ? startMs : undefined,
                        trimEndMs: endMs < durationMs ? endMs : undefined,
                      });
                    }}
                  />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
