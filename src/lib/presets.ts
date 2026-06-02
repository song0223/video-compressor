import type { QualityPresetId, ResolutionPresetId, VideoFormatPresetId, VideoPreset } from "../types/video";

export const resolutionPresets: Array<{ id: ResolutionPresetId; label: string; height?: number }> = [
  { id: "480p", label: "480p", height: 480 },
  { id: "720p", label: "720p", height: 720 },
  { id: "1080p", label: "1080p", height: 1080 },
  { id: "2k", label: "2K", height: 1440 },
  { id: "4k", label: "4K", height: 2160 },
  { id: "original", label: "原尺寸" },
];

export const qualityPresets: Array<{ id: QualityPresetId; label: string }> = [
  { id: "small", label: "小体积" },
  { id: "balanced", label: "均衡" },
  { id: "high", label: "高清优先" },
];

export const videoFormatPresets: Array<{ id: VideoFormatPresetId; label: string }> = [
  { id: "mp4", label: "MP4" },
  { id: "mov", label: "MOV" },
  { id: "mkv", label: "MKV" },
  { id: "webm", label: "WebM" },
];

export function getDefaultPreset(): VideoPreset {
  return { resolution: "720p", quality: "balanced", format: "mp4" };
}
