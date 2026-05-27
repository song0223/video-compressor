import { FolderOutput, ListX, Pause, Play, Plus, Square } from "lucide-react";

interface ToolbarProps {
  itemCount: number;
}

export function Toolbar({ itemCount }: ToolbarProps) {
  return (
    <header className="tool-card flex items-center justify-between px-5 py-4">
      <div>
        <h1 className="m-0 text-[22px] font-bold tracking-normal text-slate-950">
          Video Compressor
        </h1>
        <p className="m-0 mt-1 text-sm text-slate-500">
          {itemCount} 个视频 · MP4 / H.264 · 内置 FFmpeg
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button className="icon-button" type="button" title="添加视频">
          <Plus size={17} />
          添加视频
        </button>
        <button className="icon-button" type="button" title="选择输出位置">
          <FolderOutput size={17} />
          输出位置
        </button>
        <button className="icon-button" type="button" title="清空队列">
          <ListX size={17} />
          清空
        </button>
        <div className="mx-1 h-7 w-px bg-slate-200" />
        <button className="icon-button primary-button" type="button" title="开始全部导出">
          <Play size={17} />
          全部导出
        </button>
        <button className="icon-button" type="button" title="暂停当前任务">
          <Pause size={17} />
        </button>
        <button className="icon-button danger-button" type="button" title="取消当前任务">
          <Square size={16} />
        </button>
      </div>
    </header>
  );
}
