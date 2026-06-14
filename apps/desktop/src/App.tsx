import { Editor } from "@/editor";
import { FileExplorer, QuickOpen, TabBar } from "@/workspace";
import { StatusBar } from "@/components/StatusBar";
import "./App.css";

function App() {
  return (
    <div className="app-shell">
      <header className="app-titlebar">
        <span className="app-brand">NexCode</span>
        <span className="app-subtitle">Phase 1</span>
      </header>

      <div className="app-body">
        <FileExplorer />
        <main className="app-main">
          <TabBar />
          <div className="app-editor">
            <Editor />
          </div>
        </main>
      </div>

      <StatusBar />
      <QuickOpen />
    </div>
  );
}

export default App;
