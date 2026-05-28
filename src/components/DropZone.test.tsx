// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DropZone } from "./DropZone";

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => {
    throw new TypeError("missing Tauri metadata");
  },
}));

describe("DropZone", () => {
  it("still renders in a plain browser without Tauri webview metadata", () => {
    render(<DropZone onAddVideos={vi.fn()} onAddPaths={vi.fn()} />);

    expect(screen.getByText("拖入视频到这里")).toBeVisible();
    expect(screen.getByTitle("手动选择多个视频")).toBeVisible();
  });
});
