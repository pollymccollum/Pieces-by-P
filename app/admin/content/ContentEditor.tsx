"use client";

import { useState, useTransition } from "react";
import {
  ACCENTS,
  GRID_SIZES,
  HERO_LAYOUTS,
  HERO_SIZES,
  PHOTO_FITS,
  PHOTO_SHAPES,
  type AccentKey,
  type GridSize,
  type HeroLayout,
  type HeroSize,
  type PhotoFit,
  type PhotoShape,
  type SectionId,
  type SiteSettingsData,
} from "@/lib/types";
import { saveSettings, uploadAboutPhoto, uploadHeroPhoto, uploadLogo } from "../actions";
import { FontPicker } from "./FontPicker";
import type { FontKey, FontSlot } from "@/lib/fonts";

// About and Contact are their own pages now, so there is nothing here to
// order or hide — they are always in the nav on every page.
const SECTION_LABELS: Record<SectionId, string> = {
  hero: "Hero banner",
  shop: "Shop grid",
};

// The shop grid is the store itself — reorderable, but not hideable.
const LOCKED: SectionId[] = ["shop"];

export function ContentEditor({ initial }: { initial: SiteSettingsData }) {
  const [s, setS] = useState<SiteSettingsData>(initial);
  const [newCategory, setNewCategory] = useState("");
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const patch = (o: Partial<SiteSettingsData>) => {
    setS((c) => ({ ...c, ...o }));
    setStatus("idle");
  };

  const save = () => {
    setError(null);
    start(async () => {
      const res = await saveSettings(s);
      if (res.ok) setStatus("saved");
      else setError(res.error);
    });
  };

  // Per-field font override. Stored under settings.fonts keyed by slot.
  const setFont = (slot: FontSlot, key: FontKey) =>
    patch({ fonts: { ...(s.fonts ?? {}), [slot]: key } });

  const moveSection = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= s.sections.length) return;
    const next = [...s.sections];
    [next[index], next[j]] = [next[j], next[index]];
    patch({ sections: next });
  };

  const toggleSection = (index: number) => {
    const next = s.sections.map((sec, i) => (i === index ? { ...sec, show: !sec.show } : sec));
    patch({ sections: next });
  };

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name || s.categories.includes(name)) return;
    patch({ categories: [...s.categories, name] });
    setNewCategory("");
  };

  const uploadHero = (file: File) => {
    setError(null);
    const fd = new FormData();
    fd.set("photo", file);
    start(async () => {
      const res = await uploadHeroPhoto(fd);
      if (res.ok && res.url) patch({ heroImageUrl: res.url });
      else if (!res.ok) setError(res.error);
    });
  };

  const uploadAbout = (file: File) => {
    setError(null);
    const fd = new FormData();
    fd.set("photo", file);
    start(async () => {
      const res = await uploadAboutPhoto(fd);
      if (res.ok && res.url) patch({ aboutImageUrl: res.url });
      else if (!res.ok) setError(res.error);
    });
  };

  const uploadLogoFile = (file: File) => {
    setError(null);
    const fd = new FormData();
    fd.set("photo", file);
    start(async () => {
      const res = await uploadLogo(fd);
      if (res.ok && res.url) patch({ logoUrl: res.url });
      else if (!res.ok) setError(res.error);
    });
  };

  return (
    <>
      <h1 className="ad-h2">Your site</h1>
      <p className="ad-lead">
        Every word on the shop lives here. Change something, then press Save at
        the bottom — it goes live straight away.
      </p>

      {/* ---- basics ---- */}
      <div className="ad-card">
        <p className="ad-sec">The basics</p>
        <div className="ad-field">
          <span className="ad-lbl">Shop name</span>
          <input className="pp-input" value={s.brand} onChange={(e) => patch({ brand: e.target.value })} />
          <FontPicker slot="brand" value={s.fonts?.brand} sample={s.brand} onChange={setFont} />
        </div>
        <div className="ad-field" style={{ marginTop: 12 }}>
          <span className="ad-lbl">Announcement bar</span>
          <input className="pp-input" value={s.announce} onChange={(e) => patch({ announce: e.target.value })} />
          <FontPicker slot="announce" value={s.fonts?.announce} sample={s.announce} onChange={setFont} />
          <span className="ad-help">The thin green strip across the very top.</span>
        </div>

        {/* ---- logo ---- */}
        <div className="ad-field" style={{ marginTop: 18 }}>
          <span className="ad-lbl">Logo</span>
          <span className="ad-help" style={{ marginBottom: 8 }}>
            Replaces the &ldquo;P&rdquo; circle and shop name at the top of every page. A PNG with a
            see-through background works best. No logo keeps the original design.
          </span>

          {/* Preview on the real header background, so what she sees is what ships. */}
          <div
            style={{
              background: "var(--cream)",
              border: "1px solid var(--hair)",
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 11,
              minHeight: 72,
            }}
          >
            {s.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.logoUrl}
                alt="Your logo"
                style={{ height: s.logoHeight, width: "auto", maxWidth: 240, objectFit: "contain", display: "block" }}
              />
            ) : (
              <>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "var(--surface)",
                    border: "1.5px solid var(--sage)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--script)",
                    fontWeight: 700,
                    color: "var(--sage-deep)",
                    fontSize: 20,
                  }}
                >
                  P
                </span>
                <span
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: 22,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  {s.brand}
                </span>
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
            <label className="pp-btn ghost" style={{ padding: "10px 16px", cursor: "pointer" }}>
              {s.logoUrl ? "Replace logo" : "Upload logo"}
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={pending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadLogoFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            {s.logoUrl && (
              <button
                type="button"
                className="pp-btn danger"
                style={{ padding: "10px 16px" }}
                onClick={() => patch({ logoUrl: null })}
              >
                Remove logo
              </button>
            )}
          </div>

          {s.logoUrl && (
            <div style={{ marginTop: 14 }}>
              <span className="ad-lbl">Logo size</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                <input
                  type="range"
                  min={24}
                  max={56}
                  step={2}
                  value={s.logoHeight}
                  onChange={(e) => patch({ logoHeight: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: "var(--sage-deep)" }}
                />
                <span style={{ fontSize: 12, color: "var(--ink-soft)", minWidth: 44 }}>
                  {s.logoHeight}px
                </span>
              </div>
              <span className="ad-help">
                Drag to fit — the preview above updates as you go.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ---- hero ---- */}
      <div className="ad-card">
        <p className="ad-sec">Hero banner</p>
        <div className="ad-grid2">
          <div className="ad-field">
            <span className="ad-lbl">Small line above</span>
            <input className="pp-input" value={s.hero.eyebrow} onChange={(e) => patch({ hero: { ...s.hero, eyebrow: e.target.value } })} />
          <FontPicker slot="heroEyebrow" value={s.fonts?.heroEyebrow} sample={s.hero.eyebrow} onChange={setFont} />
          </div>
          <div className="ad-field">
            <span className="ad-lbl">…in handwriting</span>
            <input className="pp-input" value={s.hero.eyebrowScript} onChange={(e) => patch({ hero: { ...s.hero, eyebrowScript: e.target.value } })} />
          <FontPicker slot="heroEyebrowScript" value={s.fonts?.heroEyebrowScript} sample={s.hero.eyebrowScript} onChange={setFont} />
          </div>
          <div className="ad-field">
            <span className="ad-lbl">Big headline</span>
            <input className="pp-input" value={s.hero.title} onChange={(e) => patch({ hero: { ...s.hero, title: e.target.value } })} />
          <FontPicker slot="heroTitle" value={s.fonts?.heroTitle} sample={s.hero.title} onChange={setFont} />
          </div>
          <div className="ad-field">
            <span className="ad-lbl">…in handwriting</span>
            <input className="pp-input" value={s.hero.titleScript} onChange={(e) => patch({ hero: { ...s.hero, titleScript: e.target.value } })} />
          <FontPicker slot="heroTitleScript" value={s.fonts?.heroTitleScript} sample={s.hero.titleScript} onChange={setFont} />
          </div>
        </div>
        <div className="ad-field" style={{ marginTop: 12 }}>
          <span className="ad-lbl">Intro paragraph</span>
          <textarea className="pp-textarea" value={s.hero.lede} onChange={(e) => patch({ hero: { ...s.hero, lede: e.target.value } })} />
          <FontPicker slot="heroLede" value={s.fonts?.heroLede} sample={s.hero.lede} onChange={setFont} />
        </div>
        <div className="ad-field" style={{ marginTop: 12 }}>
          <span className="ad-lbl">Button text</span>
          <input className="pp-input" value={s.hero.cta} onChange={(e) => patch({ hero: { ...s.hero, cta: e.target.value } })} />
          <FontPicker slot="heroCta" value={s.fonts?.heroCta} sample={s.hero.cta} onChange={setFont} />
        </div>

        <div className="ad-field" style={{ marginTop: 12 }}>
          <span className="ad-lbl">Hero photo</span>
          <div className="ad-photos">
            {s.heroImageUrl && (
              <div className="ad-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.heroImageUrl} alt="" />
                <button type="button" className="rm" title="Remove" onClick={() => patch({ heroImageUrl: null })}>
                  ×
                </button>
              </div>
            )}
            <label className="ad-upload" title="Upload hero photo">
              +
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={pending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadHero(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <span className="ad-help">
            Export from Canva as <b>PNG</b> or JPG — not PDF. A PDF is a document,
            not an image, and browsers can&apos;t show one inside a page.
            No image shows the beaded illustration instead.
          </span>

          <div style={{ marginTop: 16 }}>
            <span className="ad-lbl">How it sits on the page</span>
            <div className="ad-optrow">
              {(Object.keys(HERO_LAYOUTS) as HeroLayout[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`ad-opt wide ${s.heroLayout === key ? "on" : ""}`}
                  onClick={() => patch({ heroLayout: key })}
                >
                  <strong style={{ fontWeight: 400 }}>{HERO_LAYOUTS[key].label}</strong>
                  <span className="ad-opt-help">{HERO_LAYOUTS[key].help}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <span className="ad-lbl">If the image isn&apos;t the right shape</span>
            <div className="ad-optrow">
              {(Object.keys(PHOTO_FITS) as PhotoFit[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`ad-opt wide ${s.heroFit === key ? "on" : ""}`}
                  onClick={() => patch({ heroFit: key })}
                >
                  <strong style={{ fontWeight: 400 }}>{PHOTO_FITS[key].label}</strong>
                  <span className="ad-opt-help">{PHOTO_FITS[key].help}</span>
                </button>
              ))}
            </div>
            <span className="ad-help" style={{ marginTop: 6 }}>
              A collage needs <b>Show the whole photo</b> — otherwise the edges get
              cut off and pieces disappear.
            </span>
          </div>
        </div>
      </div>

      {/* ---- about ---- */}
      <div className="ad-card">
        <p className="ad-sec">About page</p>
        <p className="ad-help" style={{ marginBottom: 14 }}>
          This is its own page now, at <b>/about</b>, linked from the menu at
          the top and bottom of every page.
        </p>
        <div className="ad-grid2">
          <div className="ad-field">
            <span className="ad-lbl">Handwritten label</span>
            <input className="pp-input" value={s.about.eyebrowScript} onChange={(e) => patch({ about: { ...s.about, eyebrowScript: e.target.value } })} />
          <FontPicker slot="aboutEyebrowScript" value={s.fonts?.aboutEyebrowScript} sample={s.about.eyebrowScript} onChange={setFont} />
          </div>
          <div className="ad-field">
            <span className="ad-lbl">Heading</span>
            <input className="pp-input" value={s.about.title} onChange={(e) => patch({ about: { ...s.about, title: e.target.value } })} />
          <FontPicker slot="aboutTitle" value={s.fonts?.aboutTitle} sample={s.about.title} onChange={setFont} />
          </div>
        </div>
        <div className="ad-field" style={{ marginTop: 12 }}>
          <span className="ad-lbl">Your story</span>
          <textarea className="pp-textarea" style={{ minHeight: 200 }} value={s.about.body} onChange={(e) => patch({ about: { ...s.about, body: e.target.value } })} />
          <span className="ad-help">
            Who you are, what your brand is about, and how you started. Leave a
            blank line between paragraphs and they&apos;ll appear as separate
            paragraphs on the page. Write as much as you like.
          </span>
          <FontPicker slot="aboutBody" value={s.fonts?.aboutBody} sample={s.about.body} onChange={setFont} />
        </div>

        <div className="ad-field" style={{ marginTop: 14 }}>
          <span className="ad-lbl">Photo of you</span>
          <div className="ad-photos">
            {s.aboutImageUrl && (
              <div className="ad-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.aboutImageUrl} alt="" />
                <button type="button" className="rm" title="Remove" onClick={() => patch({ aboutImageUrl: null })}>
                  ×
                </button>
              </div>
            )}
            <label className="ad-upload" title="Upload a photo of yourself">
              +
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={pending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAbout(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <span className="ad-help">
            Sits beside your story. A portrait photo works best — roughly
            800×1000 or larger.
          </span>
        </div>
      </div>

      {/* ---- contact ---- */}
      <div className="ad-card">
        <p className="ad-sec">Contact page</p>
        <p className="ad-help" style={{ marginBottom: 14 }}>
          Its own page at <b>/contact</b>, with your message form. Instagram
          and email become tappable links.
        </p>
        <div className="ad-field">
          <span className="ad-lbl">Heading</span>
          <input className="pp-input" value={s.contact.heading} onChange={(e) => patch({ contact: { ...s.contact, heading: e.target.value } })} />
          <FontPicker slot="contactHeading" value={s.fonts?.contactHeading} sample={s.contact.heading} onChange={setFont} />
        </div>
        <div className="ad-grid2" style={{ marginTop: 12 }}>
          {(
            [
              ["instagram", "Instagram"],
              ["email", "Email"],
              ["maker", "Made by"],
              ["location", "Based in"],
              ["findus", "Find us"],
            ] as const
          ).map(([key, label]) => (
            <div className="ad-field" key={key}>
              <span className="ad-lbl">{label}</span>
              <input
                className="pp-input"
                value={s.contact[key]}
                onChange={(e) => patch({ contact: { ...s.contact, [key]: e.target.value } })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ---- the "make it yours" box ---- */}
      {/* Sits between Contact and Emails so the cards a customer actually
          reads run together, rather than being buried among the layout
          controls. */}
      <div className="ad-card">
        <p className="ad-sec">Make it yours box</p>
        <p className="ad-help" style={{ marginBottom: 14 }}>
          The box a customer types their colors or an initial into. It shows on
          any piece where you&apos;ve ticked <b>Show the &ldquo;make it
          yours&rdquo; box</b> over on Pieces.
        </p>

        <div className="ad-grid2">
          <div className="ad-field">
            <span className="ad-lbl">Heading above the box</span>
            <input
              className="pp-input"
              maxLength={40}
              value={s.customBox.label}
              onChange={(e) => patch({ customBox: { ...s.customBox, label: e.target.value } })}
            />
          </div>
          <div className="ad-field">
            <span className="ad-lbl">Faded example inside it</span>
            <input
              className="pp-input"
              maxLength={90}
              value={s.customBox.placeholder}
              onChange={(e) =>
                patch({ customBox: { ...s.customBox, placeholder: e.target.value } })
              }
            />
          </div>
        </div>
        <span className="ad-help" style={{ marginTop: 8, display: "block" }}>
          The faded example disappears the moment they start typing — it&apos;s a
          hint, not an answer. Naming the things you can actually do (&ldquo;team
          colors, an initial, a longer chain&rdquo;) gets you far more useful
          requests than leaving it empty.
        </span>

        {/* Exactly what a customer sees, so she doesn't have to open the shop
            in another tab and click into a piece to check her wording. */}
        <div className="ad-boxprev">
          <span className="ad-boxprev-lbl">{s.customBox.label.trim() || "Make it yours"}</span>
          <div className="ad-boxprev-field">
            {s.customBox.placeholder.trim() || "\u00a0"}
          </div>
          <div className="ad-boxprev-note">Preview</div>
        </div>
      </div>

      {/* ---- emails ---- */}
      {/* Only the friendly wording is editable. Order numbers, items, totals,
          the address, and the Venmo instructions stay generated, so nothing
          she types here can leave a customer without the facts. */}
      <div className="ad-card">
        <p className="ad-sec">Emails</p>
        <p className="ad-help" style={{ marginBottom: 14 }}>
          What your automatic emails say. Everything else — order number, the
          pieces, the total, the address, the Venmo instructions — is filled in
          for you and can&apos;t be deleted by accident.
        </p>

        <div className="ad-field">
          <span className="ad-lbl">Order confirmation — your message</span>
          <textarea
            className="pp-textarea"
            style={{ minHeight: 90 }}
            value={s.emails.confirmationNote}
            onChange={(e) => patch({ emails: { ...s.emails, confirmationNote: e.target.value } })}
          />
          <span className="ad-help">
            Sits right under &ldquo;Thank you, [their first name]!&rdquo;. Leave a
            blank line between paragraphs.
          </span>
        </div>

        <div className="ad-field" style={{ marginTop: 14 }}>
          <span className="ad-lbl">Order confirmation — sign-off</span>
          <textarea
            className="pp-textarea"
            style={{ minHeight: 70 }}
            value={s.emails.signoff}
            onChange={(e) => patch({ emails: { ...s.emails, signoff: e.target.value } })}
          />
          <span className="ad-help">The last thing they read. Leave it empty to skip it.</span>
        </div>

        <div className="ad-field" style={{ marginTop: 14 }}>
          <span className="ad-lbl">Custom order reply</span>
          <textarea
            className="pp-textarea"
            style={{ minHeight: 90 }}
            value={s.emails.contactReply}
            onChange={(e) => patch({ emails: { ...s.emails, contactReply: e.target.value } })}
          />
          <span className="ad-help">
            Goes back automatically to anyone who sends you a message, along with
            a copy of what they wrote.
          </span>
        </div>

        <EmailPreview
          brand={s.brand}
          note={s.emails.confirmationNote}
          signoff={s.emails.signoff}
        />
      </div>

      {/* ---- shipping + categories ---- */}
      <div className="ad-card">
        <p className="ad-sec">Shipping &amp; payment</p>
        <div className="ad-grid2">
          <div className="ad-field">
            <span className="ad-lbl">Free shipping over ($)</span>
            <input
              className="pp-input"
              type="number"
              min="0"
              value={s.freeShipOver}
              onChange={(e) => patch({ freeShipOver: Number(e.target.value) })}
            />
          </div>
          <div className="ad-field">
            <span className="ad-lbl">Flat shipping ($)</span>
            <input
              className="pp-input"
              type="number"
              min="0"
              value={s.flatShip}
              onChange={(e) => patch({ flatShip: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="ad-field" style={{ marginTop: 14 }}>
          <span className="ad-lbl">Venmo handle</span>
          <input
            className="pp-input"
            value={s.venmoHandle}
            placeholder="@your-venmo"
            onChange={(e) => patch({ venmoHandle: e.target.value })}
          />
          <span className="ad-help">
            Shown on your Orders page so you know which account to check when a Venmo
            payment comes in. Leave blank if you don&apos;t take Venmo.
          </span>
        </div>

        <div className="ad-field" style={{ marginTop: 14 }}>
          <span className="ad-lbl">Categories</span>
          <div className="pp-chips" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {s.categories.map((c) => (
              <span
                key={c}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--surface)",
                  border: "1px solid var(--hair)",
                  borderRadius: 16,
                  padding: "5px 10px",
                  fontSize: 12,
                }}
              >
                {c}
                <button
                  type="button"
                  onClick={() => patch({ categories: s.categories.filter((x) => x !== c) })}
                  style={{ background: "none", border: "none", color: "#B4472F", fontSize: 13, lineHeight: 1 }}
                  title={`Remove ${c}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              className="pp-input"
              placeholder="Add a category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCategory();
                }
              }}
            />
            <button type="button" className="pp-btn ghost" style={{ padding: "10px 16px" }} onClick={addCategory}>
              Add
            </button>
          </div>
          <span className="ad-help">
            Removing a category doesn&apos;t delete pieces — they stay, and you can move them to
            another category.
          </span>
        </div>
      </div>

      {/* ---- photo display ---- */}
      <div className="ad-card">
        <p className="ad-sec">Photo size &amp; shape</p>
        <p className="ad-help" style={{ marginBottom: 14 }}>
          How your pieces are shown in the shop. These apply to every piece at once,
          so the grid always stays neat.
        </p>

        <div className="ad-field">
          <span className="ad-lbl">Photo shape</span>
          <div className="ad-optrow">
            {(Object.keys(PHOTO_SHAPES) as PhotoShape[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`ad-opt ${s.photoShape === key ? "on" : ""}`}
                onClick={() => patch({ photoShape: key })}
              >
                <span
                  className="ad-opt-shape"
                  style={{ aspectRatio: PHOTO_SHAPES[key].ratio }}
                />
                {PHOTO_SHAPES[key].label}
              </button>
            ))}
          </div>
        </div>

        <div className="ad-field" style={{ marginTop: 16 }}>
          <span className="ad-lbl">If a photo isn&apos;t that shape</span>
          <div className="ad-optrow">
            {(Object.keys(PHOTO_FITS) as PhotoFit[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`ad-opt wide ${s.photoFit === key ? "on" : ""}`}
                onClick={() => patch({ photoFit: key })}
              >
                <strong style={{ fontWeight: 400 }}>{PHOTO_FITS[key].label}</strong>
                <span className="ad-opt-help">{PHOTO_FITS[key].help}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ad-field" style={{ marginTop: 16 }}>
          <span className="ad-lbl">How many per row</span>
          <div className="ad-optrow">
            {(Object.keys(GRID_SIZES) as GridSize[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`ad-opt ${s.gridSize === key ? "on" : ""}`}
                onClick={() => patch({ gridSize: key })}
              >
                <span className="ad-opt-cols">
                  {Array.from({ length: GRID_SIZES[key].cols[2] }).map((_, i) => (
                    <span key={i} />
                  ))}
                </span>
                {GRID_SIZES[key].label}
                <span className="ad-opt-help">{GRID_SIZES[key].help}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ad-field" style={{ marginTop: 16 }}>
          <span className="ad-lbl">Hero banner height</span>
          <div className="ad-optrow">
            {(Object.keys(HERO_SIZES) as HeroSize[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`ad-opt ${s.heroSize === key ? "on" : ""}`}
                onClick={() => patch({ heroSize: key })}
              >
                {HERO_SIZES[key].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- layout ---- */}
      <div className="ad-card">
        <p className="ad-sec">Page layout</p>
        <p className="ad-help" style={{ marginBottom: 8 }}>
          Turn sections off or change the order they appear down the page.
        </p>
        {s.sections.map((sec, i) => (
          <div key={sec.id} className="ad-srow">
            <span className="ad-sname">{SECTION_LABELS[sec.id]}</span>
            {LOCKED.includes(sec.id) ? (
              <span className="ad-slocked">Always on</span>
            ) : (
              <label className="ad-toggle">
                <input type="checkbox" checked={sec.show} onChange={() => toggleSection(i)} />
                {sec.show ? "Shown" : "Hidden"}
              </label>
            )}
            <button className="ad-icon" title="Move up" disabled={i === 0} onClick={() => moveSection(i, -1)}>
              ↑
            </button>
            <button
              className="ad-icon"
              title="Move down"
              disabled={i === s.sections.length - 1}
              onClick={() => moveSection(i, 1)}
            >
              ↓
            </button>
          </div>
        ))}

        <div className="ad-field" style={{ marginTop: 18 }}>
          <span className="ad-lbl">Accent colour</span>
          <p className="ad-help" style={{ marginBottom: 8 }}>
            Used for the handwritten headline, the &ldquo;New&rdquo; badge, and the cart count.
          </p>
          <div className="ad-swatches">
            {(Object.keys(ACCENTS) as AccentKey[]).map((key) => (
              <button
                key={key}
                type="button"
                title={ACCENTS[key].label}
                aria-label={ACCENTS[key].label}
                className={`ad-swatch ${s.accent === key ? "on" : ""}`}
                style={{ background: ACCENTS[key].hex }}
                onClick={() => patch({ accent: key })}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="ad-savebar">
        {error ? (
          <span className="ad-err">{error}</span>
        ) : status === "saved" ? (
          <span className="ad-saved">Saved ✓ — your shop is updated</span>
        ) : (
          <span className="ad-saved" style={{ color: "var(--ink-soft)" }}>
            Unsaved changes
          </span>
        )}
        <button className="pp-btn sage" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </>
  );
}

// Shows Polly her words sitting inside the parts she doesn't control, so
// "what does the customer actually get?" is answered on the page rather than
// by placing a test order.
function EmailPreview({
  brand,
  note,
  signoff,
}: {
  brand: string;
  note: string;
  signoff: string;
}) {
  const blocks = (text: string) =>
    text
      .trim()
      .split(/\n\s*\n/)
      .filter(Boolean);

  return (
    <div className="ad-mailprev">
      <div className="ad-mailprev-brand">{brand || "Pieces by P"}</div>
      <div className="ad-mailprev-sheet">
        <div className="ad-mailprev-h">Thank you, Sarah!</div>
        <p className="ad-mailprev-fixed">
          Your order <b>PBP-K7QM2</b> is in.
        </p>
        {blocks(note).map((b, i) => (
          <p className="ad-mailprev-yours" key={i}>
            {b}
          </p>
        ))}
        <div className="ad-mailprev-rest">
          Your pieces, the total, and the shipping address go here
          {"\u2014"} filled in automatically.
        </div>
        {blocks(signoff).map((b, i) => (
          <p className="ad-mailprev-yours" key={i} style={{ marginTop: 10 }}>
            {b}
          </p>
        ))}
      </div>
      <div className="ad-mailprev-note">
        Preview. Sage text is yours; grey is filled in for you.
      </div>
    </div>
  );
}
