// Terminal backend for the workbench. For now a minimal in-browser echo shell so
// the integrated terminal is functional; the next stage swaps this for a bridge
// to our real PTY (the Rust `terminal_*` commands), giving a true system shell.

import {
  type ITerminalChildProcess,
  SimpleTerminalBackend,
  SimpleTerminalProcess,
} from "@codingame/monaco-vscode-terminal-service-override";
import * as vscode from "vscode";

const PROMPT = "\x1b[32mnexcode\x1b[0m $ ";

export class TerminalBackend extends SimpleTerminalBackend {
  override getDefaultSystemShell = async (): Promise<string> => "nexcode";

  override createProcess = async (): Promise<ITerminalChildProcess> => {
    const dataEmitter = new vscode.EventEmitter<string>();

    class EchoProcess extends SimpleTerminalProcess {
      private column = 0;

      async start(): Promise<undefined> {
        dataEmitter.fire(`NexCode terminal (PTY bridge coming next)\r\n${PROMPT}`);
        this.column = PROMPT.length;
        return undefined;
      }

      override shutdown(): void {}

      override input(data: string): void {
        for (const c of data) {
          const code = c.charCodeAt(0);
          if (code === 13) {
            dataEmitter.fire(`\r\n${PROMPT}`);
          } else if (code === 127) {
            dataEmitter.fire("\b \b");
          } else {
            dataEmitter.fire(c);
          }
        }
      }

      resize(): void {}
      override clearBuffer(): void {}
      override sendSignal(): void {}
    }

    return new EchoProcess(1, 1, "/workspace", dataEmitter.event);
  };
}
