import { describe, expect, it } from "vitest";
import type { QueueItem, VideoPreset } from "../types/video";
import { applyPresetToEditableItems } from "./queueItems";

const nextPreset: VideoPreset = { resolution: "480p", quality: "small", format: "mp4" };

function item(status: QueueItem["status"]): QueueItem {
  return {
    id: status,
    sourcePath: `/tmp/${status}.mp4`,
    fileName: `${status}.mp4`,
    preset: { resolution: "720p", quality: "balanced", format: "mp4" },
    status,
    progress: { percent: status === "completed" ? 1 : 0 },
  };
}

describe("queue item helpers", () => {
  it("applies preset changes only to editable queue items", () => {
    const updated = applyPresetToEditableItems([
      item("waiting"),
      item("failed"),
      item("canceled"),
      item("running"),
      item("completed"),
    ], nextPreset);

    expect(updated.find((entry) => entry.id === "waiting")?.preset).toEqual(nextPreset);
    expect(updated.find((entry) => entry.id === "failed")?.preset).toEqual(nextPreset);
    expect(updated.find((entry) => entry.id === "canceled")?.preset).toEqual(nextPreset);
    expect(updated.find((entry) => entry.id === "running")?.preset).toEqual({
      resolution: "720p",
      quality: "balanced",
      format: "mp4",
    });
    expect(updated.find((entry) => entry.id === "completed")?.preset).toEqual({
      resolution: "720p",
      quality: "balanced",
      format: "mp4",
    });
  });
});
