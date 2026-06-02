import type { AudioFormatPresetId, AudioPreset, AudioMetadata } from "../types/audio";

/**
 * 音频格式预设列表
 * @description 可用的音频输出格式选项
 */
export const audioFormatPresets: Array<{ id: AudioFormatPresetId; label: string }> = [
  { id: "mp3", label: "MP3" },
  { id: "aac", label: "AAC" },
  { id: "flac", label: "FLAC" },
  { id: "wav", label: "WAV" },
  { id: "ogg", label: "OGG" },
];

/**
 * 音频比特率预设列表
 * @description 可用的音频比特率选项
 */
export const audioBitratePresets: Array<{ value: number; label: string }> = [
  { value: 128, label: "128 kbps" },
  { value: 192, label: "192 kbps" },
  { value: 256, label: "256 kbps" },
  { value: 320, label: "320 kbps" },
];

/**
 * 音频采样率预设列表
 * @description 可用的音频采样率选项
 */
export const audioSampleRatePresets: Array<{ value: number; label: string }> = [
  { value: 22050, label: "22050 Hz" },
  { value: 44100, label: "44100 Hz" },
  { value: 48000, label: "48000 Hz" },
];

/**
 * 支持的音频文件扩展名列表
 * @description 系统能够处理的音频文件格式
 */
export const audioExtensions = ["mp3", "aac", "flac", "wav", "ogg", "wma", "m4a", "opus"];

/**
 * 检查文件是否为支持的音频格式
 * @param path - 文件路径
 * @returns 是否为支持的音频格式
 */
export function isSupportedAudio(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase();
  return extension ? audioExtensions.includes(extension) : false;
}

/**
 * 将比特率值限制在有效范围内
 * @param value - 输入的比特率值
 * @returns 最接近的有效比特率值 (128, 192, 256, 320)
 */
export function clampAudioBitrate(value: number): number {
  if (!Number.isFinite(value)) return 192;
  const valid = [128, 192, 256, 320];
  return valid.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

/**
 * 获取默认音频预设
 * @returns 默认的音频预设配置
 */
export function getDefaultAudioPreset(): AudioPreset {
  return {
    format: "mp3",
    bitrateKbps: 192,
    sampleRate: 44100,
    normalize: false,
  };
}

/**
 * 格式化音频时长为可读字符串
 * @param seconds - 时长（秒）
 * @returns 格式化后的时长字符串 (如 "3:45")
 */
export function formatAudioDuration(seconds?: number): string {
  if (seconds === undefined || Number.isNaN(seconds)) return "-";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.max(0, Math.floor(seconds % 60));
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * 估算音频输出文件大小
 * @param metadata - 音频元数据
 * @param preset - 音频预设配置
 * @returns 估算的输出文件大小 (字节)
 */
export function estimateAudioOutputSizeBytes(metadata: AudioMetadata, preset: AudioPreset): number {
  // FLAC 通常是无损压缩，大小约为原始的 55%
  if (preset.format === "flac") {
    return Math.round(metadata.sizeBytes * 0.55);
  }

  // WAV 是无压缩格式，根据采样率和时长计算
  if (preset.format === "wav") {
    return Math.round(metadata.durationSeconds * preset.sampleRate * 2 * (metadata.channels || 2));
  }

  // 有损格式 (MP3, AAC, OGG) 根据比特率估算
  const targetBitrate = preset.bitrateKbps;
  const originalBitrate = metadata.bitrateKbps || 192;
  const ratio = targetBitrate / originalBitrate;
  return Math.max(Math.round(metadata.sizeBytes * ratio), 16 * 1024);
}
