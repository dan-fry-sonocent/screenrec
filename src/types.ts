export type RecState = 'idle' | 'acquiring' | 'preview' | 'recording' | 'paused' | 'saving';

export interface CodecOption {
  label: string;
  mime: string;
  ext: string;
}

export interface RecordingEntry {
  name: string;
  handle: FileSystemFileHandle;
  file: File;
}
