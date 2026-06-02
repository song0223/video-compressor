import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

interface ImageCompareViewProps {
  originalPath: string;
  compressedPath: string;
  onClose: () => void;
}

export function ImageCompareView({
  originalPath,
  compressedPath,
  onClose,
}: ImageCompareViewProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const originalSrc = convertFileSrc(originalPath);
  const compressedSrc = convertFileSrc(compressedPath);

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  }, []);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging.current) {
        updateSlider(e.clientX);
      }
    },
    [updateSlider],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleTouchStart = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isDragging.current && e.touches.length > 0) {
        updateSlider(e.touches[0].clientX);
      }
    },
    [updateSlider],
  );

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8">
      <div className="relative flex h-full max-h-[90vh] w-full max-w-[1200px] flex-col rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="m-0 text-lg font-bold text-slate-950">压缩对比</h2>
          <button
            className="icon-button h-8 w-8 p-0"
            type="button"
            title="关闭"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
          <div
            ref={containerRef}
            className="relative aspect-video max-h-full w-full cursor-col-resize overflow-hidden rounded-lg bg-slate-100"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={(e) => updateSlider(e.clientX)}
          >
            <img
              className="absolute inset-0 h-full w-full object-contain"
              src={compressedSrc}
              alt="压缩后"
              draggable={false}
            />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                className="h-full w-full object-contain"
                src={originalSrc}
                alt="原图"
                style={{ width: `${containerRef.current?.offsetWidth ?? 1000}px`, maxWidth: "none" }}
                draggable={false}
              />
            </div>

            <div
              className="absolute inset-y-0 z-10 w-0.5 bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)]"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M6 10L2 10M2 10L5 7M2 10L5 13" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 10L18 10M18 10L15 7M18 10L15 13" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-bold text-white">
              原图
            </div>
            <div className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-bold text-white">
              压缩后
            </div>
          </div>
        </div>

        <footer className="border-t border-slate-200 px-5 py-3 text-center text-sm text-slate-500">
          拖动滑块或点击图片对比压缩效果 · 按 ESC 关闭
        </footer>
      </div>
    </div>
  );
}
