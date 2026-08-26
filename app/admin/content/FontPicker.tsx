"use client";

import { FONTS, FONT_INHERIT, type FontKey, type FontSlot } from "@/lib/fonts";

// Sits under a text field in the site editor and restyles just that field.
//
// Defaults to "Match the design" so nothing changes unless it's chosen
// deliberately — the shop can't drift into mismatched type on its own.
export function FontPicker({
  slot,
  value,
  onChange,
}: {
  slot: FontSlot;
  value: FontKey | undefined;
  onChange: (slot: FontSlot, key: FontKey) => void;
}) {
  const current = value ?? FONT_INHERIT;
  const groups = Array.from(new Set(FONTS.map((f) => f.group)));

  return (
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
              <option key={f.key} value={f.key}>
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
  );
}
