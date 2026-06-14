import { useEffect } from "react";
import { Editor } from "@/editor";
import { FileExplorer, QuickOpen, TabBar } from "@/workspace";
import { TerminalPanel, useTerminal } from "@/terminal";
import { StatusBar } from "@/components/StatusBar";
import "./App.css";

function App() {
  const togglePanel = useTerminal((s) => s.togglePanel);

  // Ctrl+` toggles the integrated terminal (VSCode-compatible).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        togglePanel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePanel]);

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
          <TerminalPanel />
        </main>
      </div>

      <StatusBar />
      <QuickOpen />
    </div>
  );
}

export default App;
