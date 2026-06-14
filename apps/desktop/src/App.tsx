import { Editor } from "@/editor";
import "./App.css";

function App() {
  return (
    <div className="app-shell">
      <header className="app-titlebar">
        <span className="app-brand">NexCode</span>
        <span className="app-subtitle">Foundation build</span>
      </header>
      <main className="app-editor">
        <Editor language="typescript" />
      </main>
      <footer className="app-statusbar">
        <span>Ready</span>
        <span className="app-statusbar-right">UTF-8 · LF · TypeScript</span>
      </footer>
    </div>
  );
}

export default App;
