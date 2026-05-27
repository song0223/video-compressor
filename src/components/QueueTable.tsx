import { CheckCircle2, Clock3, ExternalLink, FolderOpen, RotateCcw, XCircle } from "lucide-react";
import { formatBytes, formatDuration, formatPercent } from "../lib/format";
import { qualityPresets, resolutionPresets } from "../lib/presets";
import type { QueueItem, QueueStatus } from "../types/video";

interface QueueTableProps {
  items: QueueItem[];
  onOpenOutput: (path?: string) => void;
  onOpenOutputFolder: (path?: string) => void;
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

export function QueueTable({ items, onOpenOutput, onOpenOutputFolder }: QueueTableProps) {
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
      <div className="grid grid-cols-[minmax(260px,1fr)_145px_150px_145px_116px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        <span>文件</span>
        <span>预设</span>
        <span>状态</span>
        <span>输出大小</span>
        <span>操作</span>
      </div>

      <div className="divide-y divide-slate-200">
        {items.map((item) => {
          const resolution = resolutionPresets.find((preset) => preset.id === item.preset.resolution);
          const quality = qualityPresets.find((preset) => preset.id === item.preset.quality);
          return (
            <article
              className="grid grid-cols-[minmax(260px,1fr)_145px_150px_145px_116px] items-center gap-0 px-4 py-4"
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
              </div>

              <div className="text-sm font-semibold text-slate-700">
                {resolution?.label} · {quality?.label}
              </div>

              <div className="flex flex-col gap-1 text-sm">
                <span className="flex items-center gap-2 font-bold text-slate-800">
                  <StatusIcon status={item.status} />
                  {statusLabels[item.status]}
                </span>
                <span className="text-slate-500">
                  {item.status === "failed"
                    ? item.errorMessage || "读取失败"
                    : item.status === "running"
                    ? `${item.progress.speedText ?? "-"} · 剩余 ${formatDuration(item.progress.etaSeconds)}`
                    : item.status === "completed"
                      ? "可以打开文件位置"
                      : "准备就绪"}
                </span>
              </div>

              <div className="text-sm font-semibold text-slate-700">
                {formatBytes(item.progress.outputSizeBytes)}
              </div>

              <div className="flex items-center gap-2">
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
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
