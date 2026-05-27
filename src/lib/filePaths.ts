export function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

export function directoryFromPath(path: string): string {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return index > 0 ? path.slice(0, index) : path;
}
