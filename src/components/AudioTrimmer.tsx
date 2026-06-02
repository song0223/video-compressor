import { useCallback, useEffect, useRef, useState } from "react";
import { readFile } from "@tauri-apps/plugin-fs";
import { Pause, Play } from "lucide-react";

interface AudioTrimmerProps {
  sourcePath: string;
  durationMs: number;
  trimStartMs: number;
  trimEndMs: number;
  onTrimChange: (startMs: number, endMs: number) => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AudioTrimmer({
  sourcePath,
  durationMs,
  trimStartMs,
  trimEndMs,
  onTrimChange,
}: AudioTrimmerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playPositionMs, setPlayPositionMs] = useState(0);

  const duration = Math.max(durationMs, 1000);
  const startPercent = (trimStartMs / duration) * 100;
  const endPercent = (trimEndMs / duration) * 100;

  const selectedDuration = trimEndMs - trimStartMs;
  const playProgressPercent = isPlaying && selectedDuration > 0
    ? Math.max(0, Math.min(100, ((playPositionMs - trimStartMs) / selectedDuration) * 100))
    : 0;

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
    setPlayPositionMs(0);
  }, []);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    try {
      const data = await readFile(sourcePath);
      const blob = new Blob([data], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener("canplay", () => {
        audio.currentTime = trimStartMs / 1000;
        audio.play().catch(() => stopPlayback());
      }, { once: true });

      audio.addEventListener("ended", () => {
        URL.revokeObjectURL(url);
        stopPlayback();
      });

      intervalRef.current = setInterval(() => {
        const currentMs = audio.currentTime * 1000;
        setPlayPositionMs(currentMs);
        if (currentMs >= trimEndMs) {
          URL.revokeObjectURL(url);
          stopPlayback();
        }
      }, 50);

      setIsPlaying(true);
    } catch {
      stopPlayback();
    }
  }, [isPlaying, sourcePath, trimStartMs, trimEndMs, stopPlayback]);

  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);

  useEffect(() => {
    stopPlayback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimStartMs, trimEndMs]);

  const getTimeFromX = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      return Math.round((x / rect.width) * duration);
    },
    [duration],
  );

  const handleMouseDown = useCallback(
    (handle: "start" | "end") => (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(handle);
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setHoverX(x);
      setHoverTime(getTimeFromX(e.clientX));

      if (!dragging) return;

      const time = getTimeFromX(e.clientX);
      if (dragging === "start") {
        const newStart = Math.max(0, Math.min(time, trimEndMs - 500));
        onTrimChange(newStart, trimEndMs);
      } else {
        const newEnd = Math.min(duration, Math.max(time, trimStartMs + 500));
        onTrimChange(trimStartMs, newEnd);
      }
    },
    [dragging, duration, trimStartMs, trimEndMs, getTimeFromX, onTrimChange],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) return;
      const time = getTimeFromX(e.clientX);
      const distToStart = Math.abs(time - trimStartMs);
      const distToEnd = Math.abs(time - trimEndMs);
      if (distToStart < distToEnd) {
        onTrimChange(time, trimEndMs);
      } else {
        onTrimChange(trimStartMs, time);
      }
    },
    [dragging, trimStartMs, trimEndMs, getTimeFromX, onTrimChange],
  );

  const markers: number[] = [];
  if (duration > 0) {
    const markerCount = Math.min(Math.floor(duration / 10000), 10);
    const step = duration / (markerCount + 1);
    for (let i = 0; i <= markerCount + 1; i++) {
      markers.push(Math.round(i * step));
    }
  }

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>拖动两端手柄选择裁剪范围，或点击轨道跳转</span>
        <span className="font-bold text-violet-600">
          选中 {formatTime(selectedDuration)}
        </span>
      </div>

      <div
        ref={trackRef}
        className="relative h-16 cursor-pointer rounded-lg bg-slate-100"
        onClick={handleTrackClick}
        onMouseMove={(e) => {
          if (!dragging) {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoverX(e.clientX - rect.left);
            setHoverTime(getTimeFromX(e.clientX));
          }
        }}
        onMouseLeave={() => {
          if (!dragging) {
            setHoverTime(null);
          }
        }}
      >
        <div className="absolute inset-0 flex items-center justify-around px-1 opacity-30">
          {Array.from({ length: 60 }, (_, i) => {
            const height = 20 + Math.sin(i * 0.5) * 15 + Math.random() * 10;
            return (
              <div
                key={i}
                className="w-[2px] rounded-full bg-violet-400"
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        <div
          className="absolute inset-y-0 left-0 rounded-l-lg bg-slate-900/20"
          style={{ width: `${startPercent}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 rounded-r-lg bg-slate-900/20"
          style={{ width: `${100 - endPercent}%` }}
        />

        <div
          className="absolute inset-y-0 border-y-2 border-violet-400 bg-violet-500/10"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`,
          }}
        />

        {/* Playback progress inside selected region */}
        {isPlaying && (
          <div
            className="absolute inset-y-0 bg-emerald-500/30"
            style={{
              left: `${startPercent}%`,
              width: `${(playProgressPercent * (endPercent - startPercent)) / 100}%`,
            }}
          />
        )}

        <div
          className="absolute inset-y-0 z-20 flex w-4 cursor-col-resize items-center justify-center"
          style={{ left: `calc(${startPercent}% - 8px)` }}
          onMouseDown={handleMouseDown("start")}
        >
          <div
            className={`h-full w-2 rounded-l-md transition-colors ${
              dragging === "start"
                ? "bg-violet-600"
                : "bg-violet-500 hover:bg-violet-600"
            }`}
          >
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col gap-[3px]">
                <div className="h-1 w-0.5 rounded-full bg-white/80" />
                <div className="h-1 w-0.5 rounded-full bg-white/80" />
                <div className="h-1 w-0.5 rounded-full bg-white/80" />
              </div>
            </div>
          </div>
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {formatTime(trimStartMs)}
          </div>
        </div>

        <div
          className="absolute inset-y-0 z-20 flex w-4 cursor-col-resize items-center justify-center"
          style={{ left: `calc(${endPercent}% - 8px)` }}
          onMouseDown={handleMouseDown("end")}
        >
          <div
            className={`h-full w-2 rounded-r-md transition-colors ${
              dragging === "end"
                ? "bg-violet-600"
                : "bg-violet-500 hover:bg-violet-600"
            }`}
          >
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col gap-[3px]">
                <div className="h-1 w-0.5 rounded-full bg-white/80" />
                <div className="h-1 w-0.5 rounded-full bg-white/80" />
                <div className="h-1 w-0.5 rounded-full bg-white/80" />
              </div>
            </div>
          </div>
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {formatTime(trimEndMs)}
          </div>
        </div>

        {hoverTime !== null && !dragging && (
          <div
            className="absolute bottom-0 z-10 h-full w-px bg-slate-400/50"
            style={{ left: `${hoverX}px` }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-700 px-1 py-0.5 text-[10px] text-white">
              {formatTime(hoverTime)}
            </div>
          </div>
        )}
      </div>

      <div className="relative mt-1 h-4">
        {markers.map((time, i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 text-[10px] text-slate-400"
            style={{ left: `${(time / duration) * 100}%` }}
          >
            {formatTime(time)}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              isPlaying
                ? "bg-violet-600 text-white hover:bg-violet-700"
                : "bg-violet-100 text-violet-700 hover:bg-violet-200"
            }`}
            type="button"
            title={isPlaying ? "暂停" : "播放选中区域"}
            onClick={togglePlay}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          <div className="flex gap-1">
            <button
              className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
              type="button"
              onClick={() => onTrimChange(0, duration)}
            >
              重置
            </button>
            <button
              className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
              type="button"
              onClick={() => onTrimChange(0, Math.round(duration * 0.5))}
            >
              前半段
            </button>
            <button
              className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
              type="button"
              onClick={() => onTrimChange(Math.round(duration * 0.5), duration)}
            >
              后半段
            </button>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          {formatTime(trimStartMs)} → {formatTime(trimEndMs)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
