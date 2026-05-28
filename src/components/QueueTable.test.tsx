// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { QueueItem } from "../types/video";
import { QueueTable, queueRowGridClass } from "./QueueTable";

const item: QueueItem = {
  id: "video-1",
  sourcePath: "/Users/songxiang/Movies/demo.mp4",
  fileName: "demo.mp4",
  preset: { resolution: "720p", quality: "balanced" },
  status: "waiting",
  progress: { percent: 0 },
  metadata: {
    width: 3840,
    height: 2160,
    durationSeconds: 180,
    codec: "h264",
    sizeBytes: 3 * 1024 * 1024 * 1024,
  },
};

describe("QueueTable", () => {
  it("keeps row actions in a fixed visible column at the default window size", () => {
    render(
      <QueueTable
        items={[item]}
        onOpenOutput={vi.fn()}
        onOpenOutputFolder={vi.fn()}
        onRemoveItem={vi.fn()}
      />,
    );

    expect(queueRowGridClass).toContain("minmax(0,1fr)_124px");
    expect(screen.getByTitle("从列表删除")).toBeVisible();
  });
});
