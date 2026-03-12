export const CODECS = [
  { label: 'VP9 + Opus (WebM)',  mime: 'video/webm;codecs=vp9,opus',      ext: 'webm' },
  { label: 'VP8 + Opus (WebM)',  mime: 'video/webm;codecs=vp8,opus',      ext: 'webm' },
  { label: 'AV1 + Opus (WebM)',  mime: 'video/webm;codecs=av01,opus',     ext: 'webm' },
  { label: 'H.264 + AAC (MP4)', mime: 'video/mp4;codecs=avc1,mp4a.40.2', ext: 'mp4'  },
  { label: 'WebM (default)',     mime: 'video/webm',                       ext: 'webm' },
  { label: 'MP4 (default)',      mime: 'video/mp4',                        ext: 'mp4'  },
];

export function getSupportedCodecs() {
  if (typeof MediaRecorder === 'undefined') return [];
  return CODECS.filter(c => {
    try { return MediaRecorder.isTypeSupported(c.mime); } catch { return false; }
  });
}
