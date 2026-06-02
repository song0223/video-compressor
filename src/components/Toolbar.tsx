import { FolderOutput, Plus } from "lucide-react";

interface ToolbarProps {
  itemCount: number;
  outputDirectory: string;
  onAddVideos: () => void;
  onChooseOutput: () => void;
}

export function Toolbar({
  itemCount,
  outputDirectory,
  onAddVideos,
  onChooseOutput,
}: ToolbarProps) {
  return (
    <header className="tool-card flex items-center justify-between px-5 py-4">
      <div>
        <h1 className="m-0 text-[22px] font-bold tracking-normal text-slate-950">
          视频压缩
        </h1>
        <p className="m-0 mt-1 text-sm text-slate-500">
          {itemCount} 个视频 · MP4 / H.264 · {outputDirectory || "未选择输出位置"}
        </p>
      </div>

      <div className="flex items-center gap-2">
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
