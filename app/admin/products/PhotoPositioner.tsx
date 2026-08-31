"use client";

import { useRef, useState, useTransition } from "react";
import { setPhotoFocus } from "../actions";
import type { ProductImage } from "@/lib/types";

// Lets the owner say which part of a photo has to stay visible when the
// shop grid crops it to a square.
//
// Deliberately not a crop tool. Nothing is written to the uploaded file —
// the two numbers become CSS object-position — so she can move a photo as
// many times as she likes without ever degrading it or losing the original
// framing. The trade-off is that she can reposition but not zoom, which is
// the right one: zoom on a phone photo of a small piece loses detail fast.
//
// She drags the photo inside a frame shaped like the real tile, so what she
// sees while dragging is what the shop will show.
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
    // focal point moves the opposite way to the pointer. One frame-width of
    // travel covers the full range, which feels neither sticky nor twitchy.
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
      const res = await setPhotoFocus(image.id, Math.round(x), Math.round(y));
      if (res.ok) onDone();
      else setError(res.error);
    });
  };

  const moved = Math.round(x) !== image.focal_x || Math.round(y) !== image.focal_y;

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt="" style={{ objectPosition: `${x}% ${y}%` }} draggable={false} />
      </div>

      {error && <p className="pp-hint">{error}</p>}

      <div className="ad-posbtns">
        <button type="button" className="oa-markpaid" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save position"}
        </button>
        <button
          type="button"
          className="ad-linkbtn"
          disabled={pending || (x === 50 && y === 50)}
          onClick={() => {
            setX(50);
            setY(50);
          }}
        >
          Centre it
        </button>
        <button type="button" className="ad-linkbtn" disabled={pending} onClick={onDone}>
          {moved ? "Cancel" : "Close"}
        </button>
      </div>
    </div>
  );
}
