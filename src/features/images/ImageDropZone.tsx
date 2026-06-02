import { Image, MousePointerClick } from "lucide-react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useEffect, useState } from "react";

interface ImageDropZoneProps {
  onAddImages: () => void;
  onAddPaths: (paths: string[]) => void;
}

export function ImageDropZone({ onAddImages, onAddPaths }: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    try {
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
    } catch {
      setIsDragging(false);
    }

    return () => {
      unlisten?.();
    };
  }, [onAddPaths]);

  return (
    <section
      className={`tool-card flex min-h-[128px] items-center justify-between gap-5 border-dashed px-5 py-4 ${
        isDragging ? "border-emerald-500 bg-emerald-50" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Image size={28} />
        </div>
        <div>
          <h2 className="m-0 text-lg font-bold text-slate-950">拖入图片到这里</h2>
          <p className="m-0 mt-1 text-sm text-slate-500">
            支持 JPG、PNG、WebP，可以一次选择或拖入多张图片。
          </p>
        </div>
      </div>

      <button className="icon-button" type="button" title="手动选择多张图片" onClick={onAddImages}>
        <MousePointerClick size={17} />
        手动多选
      </button>
    </section>
  );
}
