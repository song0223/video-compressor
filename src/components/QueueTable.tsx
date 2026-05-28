import { CheckCircle2, Clock3, ExternalLink, FolderOpen, RotateCcw, Trash2, XCircle } from "lucide-react";
import { formatBytes, formatDuration, formatPercent } from "../lib/format";
import {
  estimateExportDurationSeconds,
  estimateOutputSizeBytes,
  formatCompressionSummary,
} from "../lib/outputStats";
import { qualityPresets, resolutionPresets } from "../lib/presets";
import type { QueueItem, QueueStatus } from "../types/video";

export const queueRowGridClass = "grid grid-cols-[minmax(0,1fr)_124px]";

interface QueueTableProps {
  items: QueueItem[];
  onOpenOutput: (path?: string) => void;
  onOpenOutputFolder: (path?: string) => void;
  onRemoveItem: (id: string) => void;
}

const statusLabels: Record<QueueStatus, string> = {
  waiting: "等待中",
  running: "导出中",
  paused: "已暂停",
  completed: "已完成",
  failed: "失败",
  canceled: "已取消",
};

function StatusIcon({ status }: { status: QueueStatus }) {
  if (status === "completed") return <CheckCircle2 size={17} className="text-emerald-600" />;
  if (status === "failed" || status === "canceled") return <XCircle size={17} className="text-red-600" />;
  if (status === "running") return <RotateCcw size={17} className="text-blue-700" />;
  return <Clock3 size={17} className="text-slate-400" />;
}

export function QueueTable({
  items,
  onOpenOutput,
  onOpenOutputFolder,
  onRemoveItem,
}: QueueTableProps) {
  if (items.length === 0) {
    return (
      <section className="tool-card flex min-h-[260px] items-center justify-center p-8 text-center">
        <div>
          <h2 className="m-0 text-xl font-bold text-slate-950">队列还是空的</h2>
          <p className="m-0 mt-2 text-sm text-slate-500">
            点击“添加视频”手动多选，或直接拖入多个视频文件。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="tool-card overflow-hidden">
      <div
        className={`${queueRowGridClass} border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500`}
      >
        <span>文件与状态</span>
        <span className="text-right">操作</span>
      </div>

      <div className="divide-y divide-slate-200">
        {items.map((item) => {
          const resolution = resolutionPresets.find((preset) => preset.id === item.preset.resolution);
          const quality = qualityPresets.find((preset) => preset.id === item.preset.quality);
          const estimatedOutputSize = item.metadata
            ? estimateOutputSizeBytes(item.metadata, item.preset)
            : undefined;
          const estimatedExportDuration = item.metadata
            ? estimateExportDurationSeconds(item.metadata, item.preset)
            : undefined;
          const finalOutputSize = item.progress.outputSizeBytes;
          const outputSizeLabel =
            finalOutputSize !== undefined
              ? `输出 ${formatBytes(finalOutputSize)}`
              : estimatedOutputSize !== undefined
                ? `预计 ${formatBytes(estimatedOutputSize)}`
                : "输出 -";
          const completedSummary =
            item.status === "completed" && item.metadata && finalOutputSize !== undefined
              ? formatCompressionSummary(item.metadata.sizeBytes, finalOutputSize)
              : undefined;
          return (
            <article
              className={`${queueRowGridClass} items-center gap-3 px-4 py-4`}
              key={item.id}
            >
              <div className="min-w-0 pr-4">
                <h3 className="m-0 truncate text-[15px] font-bold text-slate-950">{item.fileName}</h3>
                <p className="m-0 mt-1 text-sm text-slate-500">
                  {item.metadata
                    ? `${item.metadata.width}x${item.metadata.height} · ${item.metadata.codec} · ${formatDuration(
                        item.metadata.durationSeconds,
                      )} · ${formatBytes(item.metadata.sizeBytes)}`
                    : "等待读取信息"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
                  <span className="rounded-md bg-slate-100 px-2 py-1">
                    {resolution?.label} · {quality?.label}
                  </span>
                  <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                    <StatusIcon status={item.status} />
                    {statusLabels[item.status]}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-1">
                    {outputSizeLabel}
                  </span>
                  {estimatedExportDuration !== undefined && item.status !== "completed" ? (
                    <span className="rounded-md bg-slate-100 px-2 py-1">
                      预计用时 {formatDuration(estimatedExportDuration)}
                    </span>
                  ) : null}
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
                    ? item.errorMessage || "读取失败"
                    : item.status === "running"
                    ? `${item.progress.speedText ?? "-"} · 剩余 ${formatDuration(item.progress.etaSeconds)}`
                    : item.status === "completed"
                      ? completedSummary ?? "可以打开文件位置"
                      : "准备就绪"}
                </p>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-2">
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
            </article>
          );
        })}
      </div>
    </section>
  );
}
