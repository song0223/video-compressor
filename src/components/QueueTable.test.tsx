// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => {
  cleanup();
});

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

  it("shows estimated output size before export starts", () => {
    render(
      <QueueTable
        items={[item]}
        onOpenOutput={vi.fn()}
        onOpenOutputFolder={vi.fn()}
        onRemoveItem={vi.fn()}
      />,
    );

    expect(screen.getByText(/预计 \d+ MB/)).toBeVisible();
  });

  it("shows estimated export duration before export starts", () => {
    render(
      <QueueTable
        items={[item]}
        onOpenOutput={vi.fn()}
        onOpenOutputFolder={vi.fn()}
        onRemoveItem={vi.fn()}
      />,
    );

    expect(screen.getByText(/预计用时/)).toBeVisible();
  });

  it("shows final compression comparison after export completes", () => {
    render(
      <QueueTable
        items={[
          {
            ...item,
            status: "completed",
            outputPath: "/Users/songxiang/Movies/demo_720p_balanced.mp4",
            progress: {
              percent: 1,
              outputSizeBytes: 768 * 1024 * 1024,
            },
          },
        ]}
        onOpenOutput={vi.fn()}
        onOpenOutputFolder={vi.fn()}
        onRemoveItem={vi.fn()}
      />,
    );

    expect(screen.getByText("3.0 GB -> 768 MB，节省 75%")).toBeVisible();
  });
});
