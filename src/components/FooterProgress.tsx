import { Activity, ListX, Pause, Play, Square } from "lucide-react";
import { formatPercent } from "../lib/format";
import type { QueueItem } from "../types/video";

interface FooterProgressProps {
  items: QueueItem[];
  progress: number;
  onClearQueue: () => void;
  onStartAll: () => void;
  onCancelCurrent: () => void;
}

export function FooterProgress({
  items,
  progress,
  onClearQueue,
  onStartAll,
  onCancelCurrent,
}: FooterProgressProps) {
  const completed = items.filter((item) => item.status === "completed").length;
  const running = items.find((item) => item.status === "running");

  return (
    <footer className="tool-card flex items-center gap-5 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Activity size={21} />
        </div>
        <div>
          <p className="m-0 text-sm font-bold text-slate-950">总进度 {formatPercent(progress)}</p>
          <p className="m-0 mt-1 text-sm text-slate-500">
            {completed} / {items.length} 完成{running ? ` · 当前：${running.fileName}` : ""}
          </p>
        </div>
      </div>

      <div className="progress-track h-3 flex-1">
        <div className="progress-fill" style={{ width: formatPercent(progress) }} />
      </div>

      <div className="flex items-center gap-2">
        <button className="icon-button" type="button" title="清空队列" onClick={onClearQueue}>
          <ListX size={17} />
          清空
        </button>
        <button className="icon-button primary-button" type="button" title="开始全部导出" onClick={onStartAll}>
          <Play size={17} />
          全部导出
        </button>
        <button className="icon-button" type="button" title="暂停当前任务" disabled>
          <Pause size={17} />
          暂停
        </button>
        <button className="icon-button danger-button" type="button" title="取消当前任务" onClick={onCancelCurrent}>
          <Square size={16} />
        </button>
      </div>
    </footer>
  );
}
