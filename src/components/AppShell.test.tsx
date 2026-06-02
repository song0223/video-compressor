// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";

afterEach(() => {
  cleanup();
});

describe("AppShell", () => {
  it("renders separate navigation entries for video and image tools", () => {
    render(
      <AppShell activeTool="video" onToolChange={vi.fn()}>
        <div>当前工具内容</div>
      </AppShell>,
    );

    expect(screen.getByRole("button", { name: "视频压缩" })).toBeVisible();
    expect(screen.getByRole("button", { name: "图片工具" })).toBeVisible();
    expect(screen.getByText("当前工具内容")).toBeVisible();
  });

  it("renders mac-style window dots in the navigation", () => {
    render(
      <AppShell activeTool="video" onToolChange={vi.fn()}>
        <div>当前工具内容</div>
      </AppShell>,
    );

    expect(screen.getByLabelText("macOS 窗口控制装饰")).toBeVisible();
  });
});
