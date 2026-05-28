import type { QueueItem, VideoPreset } from "../types/video";

const editableStatuses: Array<QueueItem["status"]> = ["waiting", "failed", "canceled"];

export function applyPresetToEditableItems(items: QueueItem[], preset: VideoPreset): QueueItem[] {
  return items.map((item) =>
    editableStatuses.includes(item.status)
      ? {
          ...item,
          preset,
        }
      : item,
  );
}
