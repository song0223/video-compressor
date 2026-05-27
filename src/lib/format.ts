export function formatBytes(bytes?: number): string {
  if (bytes === undefined || Number.isNaN(bytes)) return "-";
  const mb = bytes / 1024 / 1024;
  if (mb < 1024) return `${Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || Number.isNaN(seconds)) return "-";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.max(0, Math.floor(seconds % 60));
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}
