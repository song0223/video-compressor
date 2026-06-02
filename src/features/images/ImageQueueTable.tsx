import { CheckCircle2, Clock3, ExternalLink, FolderOpen, RotateCcw, Trash2, XCircle } from "lucide-react";
import { formatBytes, formatPercent } from "../../lib/format";
import { clampImageQualityPercent, imageFormatPresets } from "../../lib/imagePresets";
import {
  estimateImageOutputSizeBytes,
  formatImageCompressionSummary,
} from "../../lib/imageStats";
import type { ImageQueueItem, ImageQueueStatus } from "../../types/image";

export const imageQueueRowGridClass = "grid grid-cols-[minmax(0,1fr)_124px]";

interface ImageQueueTableProps {
  items: ImageQueueItem[];
  onOpenOutput: (path?: string) => void;
  onOpenOutputFolder: (path?: string) => void;
  onRemoveItem: (id: string) => void;
}

const statusLabels: Record<ImageQueueStatus, string> = {
  waiting: "等待中",
  running: "导出中",
  completed: "已完成",
  failed: "失败",
};

function StatusIcon({ status }: { status: ImageQueueStatus }) {
  if (status === "completed") return <CheckCircle2 size={17} className="text-emerald-600" />;
  if (status === "failed") return <XCircle size={17} className="text-red-600" />;
  if (status === "running") return <RotateCcw size={17} className="text-blue-700" />;
  return <Clock3 size={17} className="text-slate-400" />;
}

export function ImageQueueTable({
  items,
  onOpenOutput,
  onOpenOutputFolder,
  onRemoveItem,
}: ImageQueueTableProps) {
  if (items.length === 0) {
    return (
      <section className="tool-card flex min-h-[260px] items-center justify-center p-8 text-center">
        <div>
          <h2 className="m-0 text-xl font-bold text-slate-950">图片列表还是空的</h2>
          <p className="m-0 mt-2 text-sm text-slate-500">点击“手动多选”，或直接拖入多张图片。</p>
        </div>
      </section>
    );
  }

  return (
    <section className="tool-card overflow-hidden">
      <div
        className={`${imageQueueRowGridClass} border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500`}
      >
        <span>图片与状态</span>
        <span className="text-right">操作</span>
      </div>

      <div className="divide-y divide-slate-200">
        {items.map((item) => {
          const format = imageFormatPresets.find((preset) => preset.id === item.preset.format);
          const qualityPercent = clampImageQualityPercent(item.preset.qualityPercent);
          const estimatedOutputSize = item.metadata
            ? estimateImageOutputSizeBytes(item.metadata, item.preset)
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
              ? formatImageCompressionSummary(item.metadata.sizeBytes, finalOutputSize)
              : undefined;

          return (
            <article
              className={`${imageQueueRowGridClass} items-center gap-3 px-4 py-4`}
              key={item.id}
            >
              <div className="min-w-0 pr-4">
                <h3 className="m-0 truncate text-[15px] font-bold text-slate-950">{item.fileName}</h3>
                <p className="m-0 mt-1 text-sm text-slate-500">
                  {item.metadata
                    ? `${item.metadata.width}x${item.metadata.height} · ${item.metadata.format.toUpperCase()} · ${formatBytes(
                        item.metadata.sizeBytes,
                      )}`
                    : "等待读取信息"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
                  <span className="rounded-md bg-slate-100 px-2 py-1">
                    {format?.label} · {qualityPercent}%
                  </span>
                  <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                    <StatusIcon status={item.status} />
                    {statusLabels[item.status]}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-1">{outputSizeLabel}</span>
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
                      ? "正在导出"
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
