import { Activity } from "lucide-react";
import { formatPercent } from "../lib/format";
import type { QueueItem } from "../types/video";

interface FooterProgressProps {
  items: QueueItem[];
  progress: number;
}

export function FooterProgress({ items, progress }: FooterProgressProps) {
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
    </footer>
  );
}
