// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VideoTool } from "./VideoTool";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openPath: vi.fn(),
}));

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => {
    throw new TypeError("missing Tauri metadata");
  },
}));

afterEach(() => {
  cleanup();
});

describe("VideoTool", () => {
  it("keeps the video add action inside the video feature", () => {
    render(<VideoTool />);

    expect(screen.getByTitle("手动选择多个视频")).toBeVisible();
    expect(screen.getByText("拖入视频到这里")).toBeVisible();
  });
});
