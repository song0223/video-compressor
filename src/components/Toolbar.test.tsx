// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toolbar } from "./Toolbar";

afterEach(() => {
  cleanup();
});

describe("Toolbar", () => {
  it("uses the video tool title instead of the old app name", () => {
    render(
      <Toolbar
        itemCount={0}
        outputDirectory=""
        onAddVideos={vi.fn()}
        onChooseOutput={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "视频压缩" })).toBeVisible();
    expect(screen.queryByText("Video Compressor")).not.toBeInTheDocument();
  });
});
