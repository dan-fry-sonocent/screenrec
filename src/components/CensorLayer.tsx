import { CSSProperties, PointerEvent, RefObject, useEffect, useRef, useState } from 'react';
import { CensorRect } from '../types';
import { computeContentRect, ContentRect } from '../utils/video';

interface CensorLayerProps {
  videoRef: RefObject<HTMLVideoElement>;
  rects: CensorRect[];
  selectedId: string | null;
  editable: boolean;
  newColor: string;
  onAdd: (rect: CensorRect) => void;
  onUpdate: (id: string, patch: Partial<CensorRect>) => void;
  onSelect: (id: string | null) => void;
}

type Handle = 'nw' | 'ne' | 'sw' | 'se';

type Interaction =
  | { kind: 'creating'; startN: { x: number; y: number }; currentN: { x: number; y: number } }
  | { kind: 'moving';   id: string; startPointerN: { x: number; y: number }; startRect: CensorRect }
  | { kind: 'resizing'; id: string; handle: Handle; startPointerN: { x: number; y: number }; startRect: CensorRect };

const MIN_NORMALIZED = 0.01;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function rectStyle(
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

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CensorLayer({
  videoRef, rects, selectedId, editable, newColor,
  onAdd, onUpdate, onSelect,
}: CensorLayerProps) {
  const [contentRect, setContentRect] = useState<ContentRect | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);

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
    const rectId = target.dataset.rectId;
    const p = pointToNormalized(e);
    if (!p) return;

    if (handle && selectedId) {
      const startRect = rects.find(r => r.id === selectedId);
      if (!startRect) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setInteraction({ kind: 'resizing', id: selectedId, handle, startPointerN: p, startRect });
      return;
    }

    if (rectId) {
      const startRect = rects.find(r => r.id === rectId);
      if (!startRect) return;
      onSelect(rectId);
      e.currentTarget.setPointerCapture(e.pointerId);
      setInteraction({ kind: 'moving', id: rectId, startPointerN: p, startRect });
      return;
    }

    // Empty area — start drawing a new rect (or, if released without drag, deselect).
    e.currentTarget.setPointerCapture(e.pointerId);
    setInteraction({ kind: 'creating', startN: p, currentN: p });
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!interaction) return;
    const p = pointToNormalized(e);
    if (!p) return;

    if (interaction.kind === 'creating') {
      setInteraction({ ...interaction, currentN: p });
      return;
    }

    if (interaction.kind === 'moving') {
      const r = interaction.startRect;
      const dx = p.x - interaction.startPointerN.x;
      const dy = p.y - interaction.startPointerN.y;
      const nx = clamp(r.x + dx, 0, 1 - r.width);
      const ny = clamp(r.y + dy, 0, 1 - r.height);
      onUpdate(interaction.id, { x: nx, y: ny });
      return;
    }

    if (interaction.kind === 'resizing') {
      const r = interaction.startRect;
      const dx = p.x - interaction.startPointerN.x;
      const dy = p.y - interaction.startPointerN.y;
      let nx = r.x, ny = r.y, nw = r.width, nh = r.height;
      if (interaction.handle.includes('w')) { nx = r.x + dx; nw = r.width - dx; }
      if (interaction.handle.includes('e')) { nw = r.width + dx; }
      if (interaction.handle.includes('n')) { ny = r.y + dy; nh = r.height - dy; }
      if (interaction.handle.includes('s')) { nh = r.height + dy; }
      if (nw < MIN_NORMALIZED) {
        if (interaction.handle.includes('w')) nx = r.x + r.width - MIN_NORMALIZED;
        nw = MIN_NORMALIZED;
      }
      if (nh < MIN_NORMALIZED) {
        if (interaction.handle.includes('n')) ny = r.y + r.height - MIN_NORMALIZED;
        nh = MIN_NORMALIZED;
      }
      nx = clamp(nx, 0, 1 - nw);
      ny = clamp(ny, 0, 1 - nh);
      onUpdate(interaction.id, { x: nx, y: ny, width: nw, height: nh });
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!interaction) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

    if (interaction.kind === 'creating') {
      const x = Math.min(interaction.startN.x, interaction.currentN.x);
      const y = Math.min(interaction.startN.y, interaction.currentN.y);
      const w = Math.abs(interaction.currentN.x - interaction.startN.x);
      const h = Math.abs(interaction.currentN.y - interaction.startN.y);
      if (w < MIN_NORMALIZED || h < MIN_NORMALIZED) {
        // Click without an appreciable drag — deselect.
        onSelect(null);
      } else {
        const rect: CensorRect = { id: newId(), x, y, width: w, height: h, color: newColor };
        onAdd(rect);
        onSelect(rect.id);
      }
    }
    setInteraction(null);
  };

  const drawingPreview =
    interaction?.kind === 'creating' && contentRect
      ? {
          x: Math.min(interaction.startN.x, interaction.currentN.x),
          y: Math.min(interaction.startN.y, interaction.currentN.y),
          width:  Math.abs(interaction.currentN.x - interaction.startN.x),
          height: Math.abs(interaction.currentN.y - interaction.startN.y),
        }
      : null;

  return (
    <div
      ref={layerRef}
      className={`censor-layer${editable ? ' editable' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {contentRect && rects.map(r => {
        const selected = r.id === selectedId && editable;
        return (
          <div
            key={r.id}
            data-rect-id={r.id}
            className={`censor-rect${selected ? ' selected' : ''}`}
            style={{ ...rectStyle(r, contentRect), backgroundColor: r.color }}
          >
            {selected && (
              <>
                <div className="censor-handle nw" data-handle="nw" />
                <div className="censor-handle ne" data-handle="ne" />
                <div className="censor-handle sw" data-handle="sw" />
                <div className="censor-handle se" data-handle="se" />
              </>
            )}
          </div>
        );
      })}
      {contentRect && drawingPreview && (
        <div
          className="censor-rect drawing"
          style={{ ...rectStyle(drawingPreview, contentRect), backgroundColor: newColor }}
        />
      )}
    </div>
  );
}
