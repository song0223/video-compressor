/**
 * 音频格式预设 ID 类型
 * @description 支持的音频输出格式
 */
export type AudioFormatPresetId = "mp3" | "aac" | "flac" | "wav" | "ogg";

/**
 * 音频预设配置接口
 * @description 定义音频压缩/转换的参数
 */
export interface AudioPreset {
  /** 输出音频格式 */
  format: AudioFormatPresetId;
  /** 目标比特率 (kbps) - 支持 128, 192, 256, 320 */
  bitrateKbps: number;
  /** 采样率 (Hz) - 支持 22050, 44100, 48000 */
  sampleRate: number;
  /** 是否启用音量标准化 */
  normalize: boolean;
  /** 裁剪开始时间 (毫秒) */
  trimStartMs?: number;
  /** 裁剪结束时间 (毫秒) */
  trimEndMs?: number;
}

/**
 * 音频元数据接口
 * @description 描述音频文件的详细信息
 */
export interface AudioMetadata {
  /** 音频时长 (秒) */
  durationSeconds: number;
  /** 音频编码格式 */
  codec: string;
  /** 原始比特率 (kbps) */
  bitrateKbps: number;
  /** 采样率 (Hz) */
  sampleRate: number;
  /** 声道数 */
  channels: number;
  /** 文件大小 (字节) */
  sizeBytes: number;
}

/**
 * 音频队列项状态类型
 * @description 音频处理队列中各项的处理状态
 */
export type AudioQueueStatus = "waiting" | "running" | "completed" | "failed";

/**
 * 音频队列进度接口
 * @description 跟踪音频处理进度
 */
export interface AudioQueueProgress {
  /** 处理进度百分比 (0-100) */
  percent: number;
  /** 输出文件大小 (字节) */
  outputSizeBytes?: number;
}

/**
 * 音频队列项接口
 * @description 表示音频处理队列中的单个项目
 */
export interface AudioQueueItem {
  /** 队列项唯一标识符 */
  id: string;
  /** 源文件路径 */
  sourcePath: string;
  /** 文件名 */
  fileName: string;
  /** 音频元数据 */
  metadata?: AudioMetadata;
  /** 预设配置 */
  preset: AudioPreset;
  /** 当前处理状态 */
  status: AudioQueueStatus;
  /** 处理进度 */
  progress: AudioQueueProgress;
  /** 输出文件路径 */
  outputPath?: string;
  /** 错误信息 */
  errorMessage?: string;
}
