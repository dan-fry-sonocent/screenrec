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

// Crop region, expressed in normalized 0..1 coordinates of the source frame.
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Filled redaction rectangle drawn over the recorded video.
// Coordinates are normalized 0..1 against the source frame, matching CropRect.
export interface CensorRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export type EditMode = 'crop' | 'censor';
