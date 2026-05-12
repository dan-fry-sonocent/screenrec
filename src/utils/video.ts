export interface ContentRect { x: number; y: number; w: number; h: number; }

// Compute the actual rendered video content rect inside a <video> element
// that uses object-fit: contain. Returns null if intrinsic dimensions are
// not yet known.
export function computeContentRect(video: HTMLVideoElement): ContentRect | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const ew = video.clientWidth;
  const eh = video.clientHeight;
  if (!vw || !vh || !ew || !eh) return null;
  const videoAspect   = vw / vh;
  const elementAspect = ew / eh;
  if (videoAspect > elementAspect) {
    const h = ew / videoAspect;
    return { x: 0, y: (eh - h) / 2, w: ew, h };
  } else {
    const w = eh * videoAspect;
    return { x: (ew - w) / 2, y: 0, w, h: eh };
  }
}
