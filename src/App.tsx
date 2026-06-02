import { useState } from "react";
import { AppShell, type ToolId } from "./components/AppShell";
import { AudioTool } from "./features/audio/AudioTool";
import { ImageTool } from "./features/images/ImageTool";
import { VideoTool } from "./features/video/VideoTool";

function App() {
  const [activeTool, setActiveTool] = useState<ToolId>("video");

  return (
    <AppShell activeTool={activeTool} onToolChange={setActiveTool}>
      {activeTool === "video" ? <VideoTool /> : activeTool === "images" ? <ImageTool /> : <AudioTool />}
    </AppShell>
  );
}

export default App;
