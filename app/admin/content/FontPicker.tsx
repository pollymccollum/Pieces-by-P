"use client";

import {
  FONTS,
  FONT_INHERIT,
  fontCssFor,
  type FontKey,
  type FontSlot,
} from "@/lib/fonts";

// Sits under a text field in the site editor and restyles just that field.
//
// Shows a live preview of the field's own words in the chosen face. Without
// it, trying a font means save, reload the shop, look, repeat — twelve times
// over. With it, comparing candidates takes seconds and never touches the
// live site until Save.
//
// Defaults to "Match the design", which applies no font at all, so the
// typography can't drift unless a change is made deliberately.
export function FontPicker({
  slot,
  value,
  sample,
  onChange,
}: {
  slot: FontSlot;
  value: FontKey | undefined;
  sample?: string;
  onChange: (slot: FontSlot, key: FontKey) => void;
}) {
  const current = value ?? FONT_INHERIT;
  const groups = Array.from(new Set(FONTS.map((f) => f.group)));
  const preview = (sample ?? "").trim();

  return (
    <div className="ad-fontblock">
      <div className="ad-fontrow">
        <label className="ad-fontlabel" htmlFor={`font-${slot}`}>
          Font
        </label>
        <select
          id={`font-${slot}`}
          className="pp-select ad-fontselect"
          value={current}
          onChange={(e) => onChange(slot, e.target.value as FontKey)}
        >
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {FONTS.filter((f) => f.group === g).map((f) => (
                // Rendering each entry in its own face works in most desktop
                // browsers and is harmlessly ignored elsewhere — the preview
                // below is the reliable version.
                <option key={f.key} value={f.key} style={{ fontFamily: fontCssFor(f.key, slot) }}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {current !== FONT_INHERIT && (
          <button
            type="button"
            className="ad-fontreset"
            onClick={() => onChange(slot, FONT_INHERIT)}
            title="Back to the design's font"
          >
            reset
          </button>
        )}
      </div>

      {preview && (
        <div className="ad-fontpreview" style={{ fontFamily: fontCssFor(current, slot) }}>
          {preview.length > 70 ? preview.slice(0, 70) + "…" : preview}
        </div>
      )}
    </div>
  );
}
