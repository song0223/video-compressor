import { Image, Video } from "lucide-react";
import type { ReactNode } from "react";

export type ToolId = "video" | "images";

interface AppShellProps {
  activeTool: ToolId;
  children: ReactNode;
  onToolChange: (tool: ToolId) => void;
}

const tools: Array<{ id: ToolId; label: string; icon: typeof Video }> = [
  { id: "video", label: "视频压缩", icon: Video },
  { id: "images", label: "图片工具", icon: Image },
];

export function AppShell({ activeTool, children, onToolChange }: AppShellProps) {
  return (
    <main className="min-h-screen px-6 py-6">
      <div className="app-shell-layout mx-auto max-w-[1440px]">
        <aside className="app-sidebar tool-card flex min-h-[calc(100vh-48px)] flex-col px-3 py-4">
          <div className="px-2 pb-5">
            <div
              aria-label="macOS 窗口控制装饰"
              className="mac-window-dots"
              role="img"
            >
              <span className="mac-window-dot close" />
              <span className="mac-window-dot minimize" />
              <span className="mac-window-dot zoom" />
            </div>
            <p className="m-0 mt-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Toolbox
            </p>
            <h1 className="m-0 mt-2 text-xl font-black text-slate-950">压缩工具箱</h1>
          </div>

          <nav className="app-sidebar-nav flex flex-col gap-2" aria-label="工具导航">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  className={`sidebar-nav-button ${isActive ? "active" : ""}`}
                  key={tool.id}
                  type="button"
                  onClick={() => onToolChange(tool.id)}
                >
                  <Icon size={18} />
                  {tool.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
