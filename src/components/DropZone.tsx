import { FileVideo, MousePointerClick } from "lucide-react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useEffect, useState } from "react";

interface DropZoneProps {
  onAddVideos: () => void;
  onAddPaths: (paths: string[]) => void;
}

export function DropZone({ onAddVideos, onAddPaths }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "enter" || event.payload.type === "over") {
          setIsDragging(true);
        } else if (event.payload.type === "drop") {
          setIsDragging(false);
          onAddPaths(event.payload.paths);
        } else {
          setIsDragging(false);
        }
      })
      .then((dispose) => {
        unlisten = dispose;
      })
      .catch(() => {
        setIsDragging(false);
      });

    return () => {
      unlisten?.();
    };
  }, [onAddPaths]);

  return (
    <section
      className={`tool-card flex min-h-[128px] items-center justify-between gap-5 border-dashed px-5 py-4 ${
        isDragging ? "border-blue-500 bg-blue-50" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <FileVideo size={28} />
        </div>
        <div>
          <h2 className="m-0 text-lg font-bold text-slate-950">拖入视频到这里</h2>
          <p className="m-0 mt-1 text-sm text-slate-500">
            支持手动多选或一次拖入多个视频；第一版不扫描文件夹。
          </p>
        </div>
      </div>

      <button className="icon-button" type="button" title="手动选择多个视频" onClick={onAddVideos}>
        <MousePointerClick size={17} />
        手动多选
      </button>
    </section>
  );
}
