"use client";

import { useRef, useState, useTransition } from "react";
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
import { downscaleImage } from "@/lib/image-downscale";
import { PLACEHOLDERS, suggestFor, unknownPlaceholders } from "@/lib/email-placeholders";
import type { FontKey, FontSlot } from "@/lib/fonts";

// About and Contact are their own pages now, so there is nothing here to
// order or hide — they are always in the nav on every page.
const SECTION_LABELS: Record<SectionId, string> = {
  hero: "Hero banner",
  shop: "Shop grid",
};

// The shop grid is the store itself — reorderable, but not hideable.
const LOCKED: SectionId[] = ["shop"];

// The five emails a customer can receive, in the order they'd meet them.
//
// `intro` and `after` describe the parts SHE doesn't write — the sentence the
// email opens with and whatever the template fills in below her message. They
// differ per email, which is exactly why each one needs its own preview
// rather than one generic sample at the bottom of the card.
const EMAIL_FIELDS = [
  {
    key: "confirmation" as const,
    label: "Order confirmation",
    when: "Sent the moment someone places an order.",
    intro: "Your order PBP-K7QM2 is in.",
    after: "The pieces, the total and the shipping address — and for a Venmo order, the amount to send and the reference.",
  },
  {
    key: "paymentReceived" as const,
    label: "Payment received",
    when: "Sent when you tap Mark paid on a Venmo order.",
    intro: "We've got your $75.00 for order PBP-K7QM2.",
    after: null,
  },
  {
    key: "shipped" as const,
    label: "Shipped",
    when: "Sent when you tap Shipped on an order.",
    intro: "Order PBP-K7QM2 has shipped.",
    after: "The address it's going to.",
  },
  {
    key: "venmoReminder" as const,
    label: "Venmo reminder",
    when: "Sent only when you tap Send reminder on an unpaid order.",
    intro: null,
    after: "The amount to send, your Venmo handle, and the order number to put in the note.",
  },
  {
    key: "contactReply" as const,
    label: "Reply to a message",
    when: "Sent automatically to anyone who uses your contact form.",
    intro: null,
    after: "A copy of the message they sent you.",
  },
];

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
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("photo", await downscaleImage(file));
        const res = await uploadHeroPhoto(fd);
        if (res.ok && res.url) patch({ heroImageUrl: res.url });
        else if (!res.ok) setError(res.error);
      } catch {
        setError(
          "That image couldn't be uploaded — it may be too large or in a format browsers can't read. Try one saved as JPEG."
        );
      }
    });
  };

  const uploadAbout = (file: File) => {
    setError(null);
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("photo", await downscaleImage(file));
        const res = await uploadAboutPhoto(fd);
        if (res.ok && res.url) patch({ aboutImageUrl: res.url });
        else if (!res.ok) setError(res.error);
      } catch {
        setError(
          "That image couldn't be uploaded — it may be too large or in a format browsers can't read. Try one saved as JPEG."
        );
      }
    });
  };

  const uploadLogoFile = (file: File) => {
    setError(null);
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("photo", await downscaleImage(file));
        const res = await uploadLogo(fd);
        if (res.ok && res.url) patch({ logoUrl: res.url });
        else if (!res.ok) setError(res.error);
      } catch {
        setError(
          "That image couldn't be uploaded — it may be too large or in a format browsers can't read. Try one saved as JPEG."
        );
      }
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
            Replaces the &ldquo;P&rdquo; circle at the top of every page. Your shop
            name still shows, centred beside it. Upload a square image &mdash; it&apos;s
            trimmed to a circle, so anything in the corners won&apos;t show. No logo
            keeps the original design.
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
            {/* The mark, then the name — the same pair the site shows, so this
                preview can't promise something the header won't do. The logo
                used to preview square and without the name, which is exactly
                what it then looked like on the site. */}
            {s.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.logoUrl}
                alt="Your logo"
                style={{
                  height: s.logoHeight,
                  width: s.logoHeight,
                  borderRadius: "50%",
                  objectFit: "cover",
                  display: "block",
                  flex: "none",
                }}
              />
            ) : (
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
            )}
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
                Sets how big the circle is. Drag to fit — the preview above
                updates as you go.
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

      {/* ---- shop headings ---- */}
      {/* Sits between Hero and About because that is the order they appear in
          on the page, and she navigates this editor by scrolling it like the
          site. */}
      <div className="ad-card">
        <p className="ad-sec">Shop heading</p>
        <p className="ad-help" style={{ marginBottom: 14 }}>
          The two lines above your pieces on the home page. Leave either empty
          to hide that line.
        </p>
        <div className="ad-grid2">
          <div className="ad-field">
            <span className="ad-lbl">Handwritten label</span>
            <input
              className="pp-input"
              maxLength={60}
              value={s.shop.eyebrowScript}
              onChange={(e) => patch({ shop: { ...s.shop, eyebrowScript: e.target.value } })}
            />
            <FontPicker
              slot="shopEyebrowScript"
              value={s.fonts?.shopEyebrowScript}
              sample={s.shop.eyebrowScript}
              onChange={setFont}
            />
          </div>
          <div className="ad-field">
            <span className="ad-lbl">Heading</span>
            <input
              className="pp-input"
              maxLength={80}
              value={s.shop.title}
              onChange={(e) => patch({ shop: { ...s.shop, title: e.target.value } })}
            />
            <FontPicker
              slot="shopTitle"
              value={s.fonts?.shopTitle}
              sample={s.shop.title}
              onChange={setFont}
            />
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
          and email become tappable links. <b>Email</b> is also where replies
          go when a customer answers one of your automatic emails — those are
          sent from an address that can&apos;t receive, so put the inbox you
          actually read here.
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
          Every word of every email you send. The facts around them — order
          number, the pieces, the total, the address, the Venmo instructions —
          are filled in for you and can&apos;t be deleted by accident.
        </p>
        <p className="ad-help" style={{ marginBottom: 16 }}>
          Use the <b>Insert</b> buttons to drop in a customer&apos;s name, the
          order number or your shop name. If one ever gets mistyped, the line
          quietly falls back to the original wording rather than sending
          something broken — and it tells you.
        </p>

        {/* Only the two emails addressed to HER are optional. The three sent
            to customers stay on: someone who gets no confirmation assumes
            their order failed. */}
        <div className="ad-notify">
          <span className="ad-lbl">What gets emailed to you</span>
          <span className="ad-help" style={{ marginTop: 4, marginBottom: 10, display: "block" }}>
            Both of these also show up in your admin whatever you choose here —
            orders on the Orders tab, messages under Special requests. These
            switches only decide whether your inbox hears about them too.
          </span>

          <label className="ad-toggle ad-notifyrow">
            <input
              type="checkbox"
              checked={s.emails.notifyOnOrder}
              onChange={(e) => patch({ emails: { ...s.emails, notifyOnOrder: e.target.checked } })}
            />
            <span>
              <b>When an order comes in</b>
              <span className="ad-help">
                Safe to turn off if the emails are burying the messages you
                actually need to answer — the order is already sitting on your
                board. You just won&apos;t know it arrived until you look.
              </span>
            </span>
          </label>

          <label className="ad-toggle ad-notifyrow">
            <input
              type="checkbox"
              checked={s.emails.notifyOnMessage}
              onChange={(e) => patch({ emails: { ...s.emails, notifyOnMessage: e.target.checked } })}
            />
            <span>
              <b>When someone sends you a message</b>
              <span className="ad-help">
                Worth keeping on. Unlike an order, a message is someone waiting
                for a reply — and if you don&apos;t see it for a week, they
                assume you ignored them.
              </span>
            </span>
          </label>
        </div>

        {/* One block per email she sends. Everything factual around her words
            — order number, pieces, totals, address, the Venmo box — is still
            generated, so she can rewrite the voice without being able to
            leave a customer without the details. */}
        {EMAIL_FIELDS.map(({ key, label, when, intro, after }) => (
          <div className="ad-emailblock" key={key}>
            <div className="ad-emailhead">
              <b>{label}</b>
              <span className="ad-help">{when}</span>
            </div>

            {(["subject", "heading", "message"] as const).map((part) => (
              <CopyField
                key={part}
                part={part}
                value={s.emails[key][part]}
                onChange={(next) =>
                  patch({ emails: { ...s.emails, [key]: { ...s.emails[key], [part]: next } } })
                }
              />
            ))}

            <EmailPreview
              brand={s.brand}
              copy={s.emails[key]}
              signoff={s.emails.signoff}
              intro={intro}
              after={after}
            />
          </div>
        ))}

        <div className="ad-field" style={{ marginTop: 4 }}>
          <span className="ad-lbl">Sign-off — used on all five</span>
          <textarea
            className="pp-textarea"
            style={{ minHeight: 64 }}
            value={s.emails.signoff}
            onChange={(e) => patch({ emails: { ...s.emails, signoff: e.target.value } })}
          />
          <span className="ad-help">
            The last thing every customer reads. Leave it empty to skip it.
          </span>
        </div>
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
const PART_LABELS = {
  subject: "Subject line",
  heading: "Heading",
  message: "Message",
} as const;

// One editable part of an email, with the placeholders as buttons rather than
// something to type.
//
// Typing `{name}` by hand is the only way to get it wrong, so the buttons are
// the real fix — she clicks, it lands at the cursor. The warning below is for
// when she edits around one and breaks it anyway, and it names the mistake
// rather than just flagging that one exists.
function CopyField({
  part,
  value,
  onChange,
}: {
  part: "subject" | "heading" | "message";
  value: string;
  onChange: (next: string) => void;
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const bad = unknownPlaceholders(value);

  const insert = (token: string) => {
    const el = ref.current;
    const chip = `{${token}}`;
    if (!el) {
      onChange(value + chip);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const endPos = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + chip + value.slice(endPos));
    // Put the cursor after what was just inserted, so she can keep typing.
    requestAnimationFrame(() => {
      el.focus();
      const at = start + chip.length;
      el.setSelectionRange(at, at);
    });
  };

  return (
    <div className="ad-field" style={{ marginTop: part === "subject" ? 0 : 10 }}>
      <span className="ad-lbl">{PART_LABELS[part]}</span>

      {part === "message" ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          className="pp-textarea"
          style={{ minHeight: 84 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          className="pp-input"
          maxLength={120}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      <div className="ad-chiprow">
        <span className="ad-chiplabel">Insert</span>
        {PLACEHOLDERS.map((ph) => (
          <button
            key={ph.token}
            type="button"
            className="ad-chip"
            title={ph.label}
            onClick={() => insert(ph.token)}
          >
            {ph.label}
          </button>
        ))}
      </div>

      {bad.length > 0 && (
        <p className="ad-chipwarn">
          <b>{bad.map((t) => `{${t}}`).join(", ")}</b>{" "}
          {bad.length === 1 ? "isn't something" : "aren't things"} I can fill in.
          {(() => {
            const guess = suggestFor(bad[0]);
            return guess ? ` Did you mean {${guess}}?` : "";
          })()}{" "}
          Until it&apos;s fixed, this line falls back to the original wording so
          customers never see it — use the Insert buttons above.
        </p>
      )}
    </div>
  );
}

// What the customer actually receives, assembled from her three fields and
// the parts the template fills in. Sage is hers, grey is generated — so the
// boundary between "what I can change" and "what is always there" is visible
// rather than something she has to infer.
function EmailPreview({
  brand,
  copy,
  signoff,
  intro,
  after,
}: {
  brand: string;
  copy: { subject: string; heading: string; message: string };
  signoff: string;
  intro: string | null;
  after: string | null;
}) {
  // The same substitution the email itself does, so the preview can't promise
  // something the send won't produce.
  const fill = (t: string) =>
    (t ?? "")
      .replace(/\{name\}/gi, "Sarah")
      .replace(/\{order\}/gi, "PBP-K7QM2")
      .replace(/\{brand\}/gi, brand || "Pieces by P");

  const blocks = (text: string) =>
    fill(text)
      .trim()
      .split(/\n\s*\n/)
      .filter(Boolean);

  return (
    <div className="ad-mailprev">
      <div className="ad-mailprev-subject">
        <span>Subject</span>
        {fill(copy.subject) || "(no subject)"}
      </div>
      <div className="ad-mailprev-brand">{brand || "Pieces by P"}</div>
      <div className="ad-mailprev-sheet">
        <div className="ad-mailprev-h">{fill(copy.heading) || "\u00a0"}</div>
        {intro && <p className="ad-mailprev-fixed">{intro}</p>}
        {blocks(copy.message).map((b, i) => (
          <p className="ad-mailprev-yours" key={i}>
            {b}
          </p>
        ))}
        {after && <div className="ad-mailprev-rest">{after}</div>}
        {blocks(signoff).map((b, i) => (
          <p className="ad-mailprev-yours" key={i} style={{ marginTop: 10 }}>
            {b}
          </p>
        ))}
      </div>
      <div className="ad-mailprev-note">Sage is yours · grey is filled in for you</div>
    </div>
  );
}
