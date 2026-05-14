import { CSSProperties, PointerEvent, RefObject, useEffect, useRef, useState } from 'react';
import { CropRect } from '../types';
import { computeContentRect, ContentRect } from '../utils/video';

interface CropOverlayProps {
  videoRef: RefObject<HTMLVideoElement>;
  cropRect: CropRect | null;
  editable: boolean;
  onCropChange: (rect: CropRect | null) => void;
}

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

type Interaction =
  | { kind: 'creating'; sx: number; sy: number; cx: number; cy: number }
  | { kind: 'resizing'; handle: Handle; startPointerN: { x: number; y: number }; startRect: CropRect };

const MIN_NORMALIZED = 0.02; // 2% of the frame in either dimension

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

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
  const [interaction, setInteraction] = useState<Interaction | null>(null);
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

  function pointToNormalized(e: PointerEvent<HTMLDivElement>): { x: number; y: number } | null {
    if (!contentRect || !layerRef.current) return null;
    const r = layerRef.current.getBoundingClientRect();
    const px = e.clientX - r.left - contentRect.x;
    const py = e.clientY - r.top  - contentRect.y;
    return {
      x: clamp(px / contentRect.w, 0, 1),
      y: clamp(py / contentRect.h, 0, 1),
    };
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!editable || !contentRect) return;
    const target = e.target as HTMLElement;
    const handle = target.dataset.handle as Handle | undefined;

    // If the user grabbed a resize handle on the existing crop rect, start resizing.
    if (handle && cropRect) {
      const p = pointToNormalized(e);
      if (!p) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setInteraction({ kind: 'resizing', handle, startPointerN: p, startRect: cropRect });
      return;
    }

    // Otherwise: reject pointer downs outside the rendered video content
    // (letterboxed area) and start a new draw-from-scratch interaction.
    const r = layerRef.current!.getBoundingClientRect();
    const px = e.clientX - r.left - contentRect.x;
    const py = e.clientY - r.top  - contentRect.y;
    if (px < 0 || py < 0 || px > contentRect.w || py > contentRect.h) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointToNormalized(e)!;
    setInteraction({ kind: 'creating', sx: p.x, sy: p.y, cx: p.x, cy: p.y });
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!interaction) return;
    const p = pointToNormalized(e);
    if (!p) return;

    if (interaction.kind === 'creating') {
      setInteraction({ ...interaction, cx: p.x, cy: p.y });
      return;
    }

    if (interaction.kind === 'resizing') {
      const r = interaction.startRect;
      const dx = p.x - interaction.startPointerN.x;
      const dy = p.y - interaction.startPointerN.y;
      let nx = r.x, ny = r.y, nw = r.width, nh = r.height;
      if (interaction.handle.includes('w')) { nx = r.x + dx; nw = r.width  - dx; }
      if (interaction.handle.includes('e')) { nw = r.width  + dx; }
      if (interaction.handle.includes('n')) { ny = r.y + dy; nh = r.height - dy; }
      if (interaction.handle.includes('s')) { nh = r.height + dy; }
      if (nw < MIN_NORMALIZED) {
        if (interaction.handle.includes('w')) nx = r.x + r.width  - MIN_NORMALIZED;
        nw = MIN_NORMALIZED;
      }
      if (nh < MIN_NORMALIZED) {
        if (interaction.handle.includes('n')) ny = r.y + r.height - MIN_NORMALIZED;
        nh = MIN_NORMALIZED;
      }
      nx = clamp(nx, 0, 1 - nw);
      ny = clamp(ny, 0, 1 - nh);
      onCropChange({ x: nx, y: ny, width: nw, height: nh });
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!interaction) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

    if (interaction.kind === 'creating') {
      const x = Math.min(interaction.sx, interaction.cx);
      const y = Math.min(interaction.sy, interaction.cy);
      const w = Math.abs(interaction.cx - interaction.sx);
      const h = Math.abs(interaction.cy - interaction.sy);
      // A click without an appreciable drag clears the crop.
      if (w < MIN_NORMALIZED || h < MIN_NORMALIZED) {
        if (cropRect) onCropChange(null);
      } else {
        onCropChange({ x, y, width: w, height: h });
      }
    }
    // 'resizing' interactions are committed incrementally via onCropChange.
    setInteraction(null);
  };

  const isResizing  = interaction?.kind === 'resizing';
  const drawingRect = interaction?.kind === 'creating'
    ? {
        x: Math.min(interaction.sx, interaction.cx),
        y: Math.min(interaction.sy, interaction.cy),
        width:  Math.abs(interaction.cx - interaction.sx),
        height: Math.abs(interaction.cy - interaction.sy),
      }
    : null;

  // Show the committed crop while idle and while resizing (handles + outline
  // follow live updates because cropRect is patched on every move).
  const showCommitted = !!(cropRect && contentRect && !drawingRect);

  return (
    <div
      ref={layerRef}
      className={`crop-layer${editable ? ' editable' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {drawingRect && contentRect && (
        <div
          className="crop-rect drawing"
          style={normalizedRectStyle(drawingRect, contentRect)}
        />
      )}
      {showCommitted && cropRect && contentRect && (
        <div
          className={`crop-rect${isResizing ? ' resizing' : ''}`}
          style={normalizedRectStyle(cropRect, contentRect)}
        >
          {editable && HANDLES.map(h => (
            <div key={h} className={`crop-handle ${h}`} data-handle={h} />
          ))}
        </div>
      )}
    </div>
  );
}
