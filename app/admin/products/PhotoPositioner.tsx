"use client";

import { useRef, useState, useTransition } from "react";
import { setPhotoFocus } from "../actions";
import { focalStyle, type ProductImage } from "@/lib/types";

const MIN_ZOOM = 100;
const MAX_ZOOM = 300;

// Lets the owner say how a photo sits inside its tile.
//
// Deliberately not a crop tool. Nothing is written to the uploaded file —
// the three numbers become CSS — so she can reframe a photo as many times
// as she likes without ever degrading it or losing the original.
//
// She drags the photo inside a frame shaped like the real tile, so what she
// sees while dragging is what the shop will show.
//
// Why zoom matters here: at 100% a portrait photo in a square tile is
// already exactly as wide as the frame, so there is nothing hidden to the
// left or right to slide into view and only the vertical crop can be
// chosen. Zooming past 100 overflows both axes and unlocks movement in
// every direction. The panel says so, because "why won't it move sideways?"
// is otherwise a completely reasonable thing to wonder.
export function PhotoPositioner({
  image,
  shapeRatio,
  onDone,
}: {
  image: ProductImage;
  shapeRatio: string; // CSS aspect-ratio matching her chosen tile shape
  onDone: () => void;
}) {
  const [x, setX] = useState(image.focal_x);
  const [y, setY] = useState(image.focal_y);
  const [zoom, setZoom] = useState(image.zoom);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  const clamp = (n: number) => Math.min(100, Math.max(0, n));

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x, y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const box = frame.current;
    if (!d || !box) return;

    // Dragging the photo right should reveal what's on its left, so the
    // focal point moves opposite to the pointer. One frame-width of travel
    // covers the full range, which feels neither sticky nor twitchy.
    const rect = box.getBoundingClientRect();
    setX(clamp(d.x - ((e.clientX - d.px) / rect.width) * 100));
    setY(clamp(d.y - ((e.clientY - d.py) / rect.height) * 100));
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const save = () => {
    setError(null);
    start(async () => {
      const res = await setPhotoFocus(image.id, Math.round(x), Math.round(y), Math.round(zoom));
      if (res.ok) onDone();
      else setError(res.error);
    });
  };

  const changed =
    Math.round(x) !== image.focal_x ||
    Math.round(y) !== image.focal_y ||
    Math.round(zoom) !== image.zoom;

  const isDefault = x === 50 && y === 50 && zoom === MIN_ZOOM;

  return (
    <div className="ad-poswrap">
      <p className="ad-help" style={{ marginBottom: 8 }}>
        Drag the photo to choose what shows in the shop.
      </p>

      <div
        ref={frame}
        className="ad-posframe"
        style={{ aspectRatio: shapeRatio }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Same helper the shop grid uses, so this preview cannot lie. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt=""
          style={focalStyle({ focal_x: x, focal_y: y, zoom })}
          draggable={false}
        />
      </div>

      <label className="ad-poszoom">
        <span className="ad-lbl">Zoom · {Math.round(zoom)}%</span>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
      </label>

      {zoom === MIN_ZOOM && (
        <p className="ad-help" style={{ marginTop: 6 }}>
          At 100% the photo exactly fills the frame one way, so it will only
          slide in the other direction. Zoom in a little to move it any way you
          like.
        </p>
      )}

      {error && <p className="pp-hint">{error}</p>}

      <div className="ad-posbtns">
        <button type="button" className="oa-markpaid" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save position"}
        </button>
        <button
          type="button"
          className="ad-linkbtn"
          disabled={pending || isDefault}
          onClick={() => {
            setX(50);
            setY(50);
            setZoom(MIN_ZOOM);
          }}
        >
          Reset
        </button>
        <button type="button" className="ad-linkbtn" disabled={pending} onClick={onDone}>
          {changed ? "Cancel" : "Close"}
        </button>
      </div>
    </div>
  );
}
