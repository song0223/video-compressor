import type { VideoPreset } from "../types/video";
import type { ImagePreset } from "../types/image";
import type { AudioPreset } from "../types/audio";

const STORAGE_PREFIX = "compression-toolbox";

export function loadSetting<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function saveSetting<T>(key: string, value: T): void {
  localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(value));
}

export function loadVideoPreset() {
  return loadSetting<VideoPreset | null>("video-preset", null);
}

export function saveVideoPreset(preset: VideoPreset) {
  saveSetting("video-preset", preset);
}

export function loadImagePreset() {
  return loadSetting<ImagePreset | null>("image-preset", null);
}

export function saveImagePreset(preset: ImagePreset) {
  saveSetting("image-preset", preset);
}

export function loadAudioPreset() {
  return loadSetting<AudioPreset | null>("audio-preset", null);
}

export function saveAudioPreset(preset: AudioPreset) {
  saveSetting("audio-preset", preset);
}

export function loadOutputDirectory(tool: string) {
  return loadSetting(`${tool}-output-dir`, "");
}

export function saveOutputDirectory(tool: string, dir: string) {
  if (dir) {
    saveSetting(`${tool}-output-dir`, dir);
  }
}
