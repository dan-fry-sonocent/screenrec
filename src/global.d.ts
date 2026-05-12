// The async-iteration methods on FileSystemDirectoryHandle are part of the
// File System Access spec but are missing from the TypeScript DOM lib.
interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  keys(): AsyncIterableIterator<string>;
  values(): AsyncIterableIterator<FileSystemHandle>;
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]>;
}

// requestVideoFrameCallback is supported in Chromium and Safari but not in
// the default TypeScript DOM lib. Declared minimally — we only use the
// callback form.
interface HTMLVideoElement {
  requestVideoFrameCallback?(callback: (now: number) => void): number;
  cancelVideoFrameCallback?(handle: number): void;
}
