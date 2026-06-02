import { FolderOutput, PenLine, Plus, Video } from "lucide-react";

interface ToolbarProps {
  itemCount: number;
  outputDirectory: string;
  customName: string;
  onAddVideos: () => void;
  onChooseOutput: () => void;
  onCustomNameChange: (name: string) => void;
}

export function Toolbar({
  itemCount,
  outputDirectory,
  customName,
  onAddVideos,
  onChooseOutput,
  onCustomNameChange,
}: ToolbarProps) {
  return (
    <header className="tool-card flex items-center justify-between px-5 py-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <Video size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-[22px] font-bold tracking-normal text-slate-950">
            视频压缩
          </h1>
          <p className="m-0 mt-1 text-sm text-slate-500">
            {itemCount} 个视频 · MP4 / H.264 · {outputDirectory || "未选择输出位置"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <PenLine size={14} className="text-slate-400" />
            <input
              className="w-64 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
              type="text"
              placeholder="自定义输出文件名（留空自动生成）"
              value={customName}
              onChange={(e) => onCustomNameChange(e.currentTarget.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button className="icon-button" type="button" title="添加视频" onClick={onAddVideos}>
          <Plus size={17} />
          添加视频
        </button>
        <button className="icon-button" type="button" title="选择输出位置" onClick={onChooseOutput}>
          <FolderOutput size={17} />
          输出位置
        </button>
      </div>
    </header>
  );
}
