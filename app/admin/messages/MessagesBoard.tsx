"use client";

import { useState, useTransition } from "react";
import type { Message } from "@/lib/types";
import { deleteMessage, setMessageHandled } from "../actions";

export function MessagesBoard({ messages }: { messages: Message[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const unhandled = messages.filter((m) => !m.handled).length;

  const run = (id: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    setBusyId(id);
    start(async () => {
      const res = await fn();
      if (!res.ok && res.error) setError(res.error);
      setBusyId(null);
    });
  };

  return (
    <>
      <h1 className="ad-h2">Messages</h1>
      <p className="ad-lead">
        Enquiries from the contact form on your website. Tick one off once
        you&apos;ve replied.
      </p>

      {messages.length > 0 && (
        <div className="oa-stats">
          <div className={`oa-stat ${unhandled > 0 ? "hl" : ""}`}>
            <div className="num">{unhandled}</div>
            <div className="lbl">To reply</div>
          </div>
          <div className="oa-stat">
            <div className="num">{messages.length}</div>
            <div className="lbl">Total</div>
          </div>
        </div>
      )}

      {error && <p className="pp-hint">{error}</p>}

      {messages.length === 0 ? (
        <div className="ad-card">
          <div className="ad-empty">
            No messages yet.
            <br />
            They&apos;ll appear here when someone uses the contact form.
          </div>
        </div>
      ) : (
        messages.map((m) => (
          <div key={m.id} className={`oa-card ${m.handled ? "" : "new"}`}>
            <div className="oa-chead">
              <div>
                <div className="oa-onum">{m.dateLabel}</div>
                <div className="oa-name">{m.name}</div>
                <div className="oa-contact">
                  <a href={`mailto:${m.email}`}>{m.email}</a>
                </div>
              </div>
              {m.handled && <span className="oa-pay paid">Replied ✓</span>}
            </div>

            <div className="oa-sec">Message</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {m.body}
            </p>

            <div className="oa-statusrow">
              <a
                className="pp-btn sage"
                style={{ textDecoration: "none", padding: "9px 18px" }}
                href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to Pieces by P")}`}
              >
                Reply by email
              </a>
              <button
                className="oa-undo"
                disabled={busyId === m.id}
                onClick={() => run(m.id, () => setMessageHandled(m.id, !m.handled))}
              >
                {m.handled ? "Mark unreplied" : "Mark replied"}
              </button>
              {confirmId === m.id ? (
                <>
                  <span style={{ fontSize: 12, color: "#C25B4A" }}>Delete?</span>
                  <button
                    className="oa-undo"
                    style={{ color: "#B4472F" }}
                    disabled={busyId === m.id}
                    onClick={() => run(m.id, () => deleteMessage(m.id))}
                  >
                    Yes
                  </button>
                  <button className="oa-undo" onClick={() => setConfirmId(null)}>
                    Keep
                  </button>
                </>
              ) : (
                <button className="oa-undo" onClick={() => setConfirmId(m.id)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </>
  );
}
