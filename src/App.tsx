import { useState } from "react";
import { AppShell, type ToolId } from "./components/AppShell";
import { ImageTool } from "./features/images/ImageTool";
import { VideoTool } from "./features/video/VideoTool";

function App() {
  const [activeTool, setActiveTool] = useState<ToolId>("video");

  return (
    <AppShell activeTool={activeTool} onToolChange={setActiveTool}>
      {activeTool === "video" ? <VideoTool /> : <ImageTool />}
    </AppShell>
  );
}

export default App;
