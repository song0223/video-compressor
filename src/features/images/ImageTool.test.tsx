// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageTool } from "./ImageTool";

const invokeMock = vi.fn();
const openMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (...args: unknown[]) => openMock(...args),
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
  invokeMock.mockReset();
  openMock.mockReset();
});

describe("ImageTool", () => {
  it("renders image-only controls", () => {
    render(<ImageTool />);

    expect(screen.getByTitle("手动选择多张图片")).toBeVisible();
    expect(screen.getByText("拖入图片到这里")).toBeVisible();
    expect(screen.getByText("输出格式")).toBeVisible();
    expect(screen.getByText("图片列表还是空的")).toBeVisible();
  });

  it("uses image metadata commands when images are selected", async () => {
    openMock.mockResolvedValue(["/Users/songxiang/Pictures/demo.jpg"]);
    invokeMock.mockResolvedValue({
      width: 1200,
      height: 800,
      format: "jpeg",
      sizeBytes: 1024 * 1024,
    });

    render(<ImageTool />);
    fireEvent.click(screen.getByTitle("手动选择多张图片"));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("get_image_metadata", {
        path: "/Users/songxiang/Pictures/demo.jpg",
      });
    });
    expect(invokeMock).not.toHaveBeenCalledWith("get_video_metadata", expect.anything());
  });

  it("updates pending image size estimates immediately when quality changes", async () => {
    openMock.mockResolvedValue(["/Users/songxiang/Pictures/website.jpg"]);
    invokeMock.mockResolvedValue({
      width: 2400,
      height: 1600,
      format: "jpeg",
      sizeBytes: 2 * 1024 * 1024,
    });

    render(<ImageTool />);
    fireEvent.click(screen.getByTitle("手动选择多张图片"));

    expect(await screen.findByText("预计 882 KB")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "10%" }));

    await waitFor(() => {
      expect(screen.getByText("预计 83 KB")).toBeVisible();
    });
  });

  it("supports a custom image compression percentage from the slider", async () => {
    openMock.mockResolvedValue(["/Users/songxiang/Pictures/custom.jpg"]);
    invokeMock.mockResolvedValue({
      width: 2400,
      height: 1600,
      format: "jpeg",
      sizeBytes: 2 * 1024 * 1024,
    });

    render(<ImageTool />);
    fireEvent.click(screen.getByTitle("手动选择多张图片"));
    await screen.findByText("预计 882 KB");

    fireEvent.change(screen.getByLabelText("自定义压缩百分比"), { target: { value: "37" } });

    expect(screen.getByDisplayValue("37")).toBeVisible();
    expect(screen.getByText("保持原格式 · 37%")).toBeVisible();
  });
});
