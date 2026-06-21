// Bridges VSCode's `file:` scheme to the user's real disk through the Tauri
// Rust backend (see src-tauri/src/fs_provider.rs). Registered as a file-system
// overlay so the explorer, editor, and search operate on real files.

import { invoke } from "@tauri-apps/api/core";
import {
  FileType,
  FileSystemProviderCapabilities,
  FileSystemProviderErrorCode,
  FileChangeType,
  type IFileSystemProviderWithFileReadWriteCapability,
  type IStat,
  type IFileChange,
  type IFileDeleteOptions,
  type IFileOverwriteOptions,
  type IFileWriteOptions,
} from "@codingame/monaco-vscode-files-service-override";

interface RawStat {
  fileType: number;
  ctime: number;
  mtime: number;
  size: number;
}
interface RawEntry {
  name: string;
  fileType: number;
}

// Tauri command wrappers (src-tauri/src/fs_provider.rs).
const fsp = {
  stat: (path: string) => invoke<RawStat>("fsp_stat", { path }),
  readdir: (path: string) => invoke<RawEntry[]>("fsp_readdir", { path }),
  read: (path: string) => invoke<string>("fsp_read", { path }),
  write: (path: string, contentBase64: string, create: boolean, overwrite: boolean) =>
    invoke<void>("fsp_write", { path, contentBase64, create, overwrite }),
  mkdir: (path: string) => invoke<void>("fsp_mkdir", { path }),
  delete: (path: string, recursive: boolean) => invoke<void>("fsp_delete", { path, recursive }),
  rename: (from: string, to: string, overwrite: boolean) =>
    invoke<void>("fsp_rename", { from, to, overwrite }),
};

function fsError(message: string): Error {
  const e = new Error(message) as Error & { code: FileSystemProviderErrorCode };
  e.code = /not found|os error 2|cannot find|no such file/i.test(message)
    ? FileSystemProviderErrorCode.FileNotFound
    : /exists/i.test(message)
      ? FileSystemProviderErrorCode.FileExists
      : FileSystemProviderErrorCode.Unknown;
  return e;
}

// --- base64 <-> bytes (chunked to stay off the call stack for big files) ---
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

// Minimal VSCode-compatible event emitter (listener, thisArgs?, disposables?).
type Disposable = { dispose(): void };
class Emitter<T> {
  private readonly listeners = new Set<{ cb: (e: T) => unknown; thisArg?: unknown }>();
  readonly event = (
    cb: (e: T) => unknown,
    thisArg?: unknown,
    disposables?: Disposable[] | { add(d: Disposable): void },
  ): Disposable => {
    const entry = { cb, thisArg };
    this.listeners.add(entry);
    const d: Disposable = { dispose: () => void this.listeners.delete(entry) };
    if (Array.isArray(disposables)) disposables.push(d);
    else if (disposables && typeof disposables.add === "function") disposables.add(d);
    return d;
  };
  fire(e: T): void {
    for (const { cb, thisArg } of [...this.listeners]) cb.call(thisArg, e);
  }
}

export class TauriFileSystemProvider implements IFileSystemProviderWithFileReadWriteCapability {
  readonly capabilities = FileSystemProviderCapabilities.FileReadWrite;
  private readonly _onDidChangeCapabilities = new Emitter<void>();
  readonly onDidChangeCapabilities = this._onDidChangeCapabilities.event;
  private readonly _onDidChangeFile = new Emitter<readonly IFileChange[]>();
  readonly onDidChangeFile = this._onDidChangeFile.event;

  // No native watcher yet — we self-notify after our own mutations so the
  // explorer refreshes. External changes need a manual refresh for now.
  watch(): Disposable {
    return { dispose() {} };
  }

  private fire(resource: { path: string }, type: FileChangeType): void {
    this._onDidChangeFile.fire([{ resource: resource as never, type }]);
  }

  async stat(resource: { path: string }): Promise<IStat> {
    try {
      const s = await fsp.stat(resource.path);
      return { type: s.fileType as FileType, ctime: s.ctime, mtime: s.mtime, size: s.size };
    } catch (e) {
      throw fsError(String(e));
    }
  }

  async readdir(resource: { path: string }): Promise<[string, FileType][]> {
    try {
      const entries = await fsp.readdir(resource.path);
      return entries.map((e) => [e.name, e.fileType as FileType]);
    } catch (e) {
      throw fsError(String(e));
    }
  }

  async readFile(resource: { path: string }): Promise<Uint8Array> {
    try {
      return base64ToBytes(await fsp.read(resource.path));
    } catch (e) {
      throw fsError(String(e));
    }
  }

  async writeFile(
    resource: { path: string },
    content: Uint8Array,
    opts: IFileWriteOptions,
  ): Promise<void> {
    try {
      await fsp.write(resource.path, bytesToBase64(content), opts.create, opts.overwrite);
      this.fire(resource, FileChangeType.UPDATED);
    } catch (e) {
      throw fsError(String(e));
    }
  }

  async mkdir(resource: { path: string }): Promise<void> {
    try {
      await fsp.mkdir(resource.path);
      this.fire(resource, FileChangeType.ADDED);
    } catch (e) {
      throw fsError(String(e));
    }
  }

  async delete(resource: { path: string }, opts: IFileDeleteOptions): Promise<void> {
    try {
      await fsp.delete(resource.path, opts.recursive);
      this.fire(resource, FileChangeType.DELETED);
    } catch (e) {
      throw fsError(String(e));
    }
  }

  async rename(
    from: { path: string },
    to: { path: string },
    opts: IFileOverwriteOptions,
  ): Promise<void> {
    try {
      await fsp.rename(from.path, to.path, opts.overwrite);
      this.fire(from, FileChangeType.DELETED);
      this.fire(to, FileChangeType.ADDED);
    } catch (e) {
      throw fsError(String(e));
    }
  }
}
