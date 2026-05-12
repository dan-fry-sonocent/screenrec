import { CSSProperties, PointerEvent, RefObject, useEffect, useRef, useState } from 'react';
import { CropRect } from '../types';
import { computeContentRect, ContentRect } from '../utils/video';

interface CropOverlayProps {
  videoRef: RefObject<HTMLVideoElement>;
  cropRect: CropRect | null;
  editable: boolean;
  onCropChange: (rect: CropRect | null) => void;
}

const MIN_NORMALIZED = 0.02; // 2% of the frame in either dimension

function normalizedRectStyle(
  r: { x: number; y: number; width: number; height: number },
  cr: ContentRect,
): CSSProperties {
  return {
    left:   cr.x + r.x * cr.w,
    top:    cr.y + r.y * cr.h,
    width:  r.width  * cr.w,
    height: r.height * cr.h,
  };
}

export function CropOverlay({ videoRef, cropRect, editable, onCropChange }: CropOverlayProps) {
  const [contentRect, setContentRect] = useState<ContentRect | null>(null);
  const [drag, setDrag] = useState<{ sx: number; sy: number; cx: number; cy: number } | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);

  // Keep contentRect in sync with the video's intrinsic size and the layout.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => setContentRect(computeContentRect(video));
    update();
    video.addEventListener('loadedmetadata', update);
    video.addEventListener('resize', update);
    const ro = new ResizeObserver(update);
    ro.observe(video);
    return () => {
      video.removeEventListener('loadedmetadata', update);
      video.removeEventListener('resize', update);
      ro.disconnect();
    };
  }, [videoRef]);

  function pointToNormalized(e: PointerEvent<HTMLDivElement>): { nx: number; ny: number } | null {
    if (!contentRect || !layerRef.current) return null;
    const r = layerRef.current.getBoundingClientRect();
    const px = e.clientX - r.left - contentRect.x;
    const py = e.clientY - r.top  - contentRect.y;
    const nx = Math.max(0, Math.min(1, px / contentRect.w));
    const ny = Math.max(0, Math.min(1, py / contentRect.h));
    return { nx, ny };
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!editable || !contentRect) return;
    // Reject pointer downs outside the rendered video content (letterboxed area).
    const r = layerRef.current!.getBoundingClientRect();
    const px = e.clientX - r.left - contentRect.x;
    const py = e.clientY - r.top  - contentRect.y;
    if (px < 0 || py < 0 || px > contentRect.w || py > contentRect.h) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointToNormalized(e)!;
    setDrag({ sx: p.nx, sy: p.ny, cx: p.nx, cy: p.ny });
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const p = pointToNormalized(e);
    if (!p) return;
    setDrag({ ...drag, cx: p.nx, cy: p.ny });
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    const x = Math.min(drag.sx, drag.cx);
    const y = Math.min(drag.sy, drag.cy);
    const w = Math.abs(drag.cx - drag.sx);
    const h = Math.abs(drag.cy - drag.sy);
    setDrag(null);
    // A click without an appreciable drag clears the crop.
    if (w < MIN_NORMALIZED || h < MIN_NORMALIZED) {
      if (cropRect) onCropChange(null);
      return;
    }
    onCropChange({ x, y, width: w, height: h });
  };

  const showDragPreview = !!(drag && contentRect);
  const showCommitted   = !!(cropRect && contentRect && !drag);

  // Active drag rectangle (normalized) for preview rendering.
  const dragRect = drag ? {
    x: Math.min(drag.sx, drag.cx),
    y: Math.min(drag.sy, drag.cy),
    width:  Math.abs(drag.cx - drag.sx),
    height: Math.abs(drag.cy - drag.sy),
  } : null;

  return (
    <div
      ref={layerRef}
      className={`crop-layer${editable ? ' editable' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {showDragPreview && dragRect && contentRect && (
        <div
          className="crop-rect drawing"
          style={normalizedRectStyle(dragRect, contentRect)}
        />
      )}
      {showCommitted && cropRect && contentRect && (
        <div
          className="crop-rect"
          style={normalizedRectStyle(cropRect, contentRect)}
        />
      )}
    </div>
  );
}
