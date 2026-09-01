"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { CartItem } from "@/lib/types";

const KEY = "pp-cart-v1";

// The cart, kept in the browser rather than in one page's memory.
//
// This became necessary the moment About and Contact turned into their own
// routes: the cart used to be plain component state, so a shopper who added
// three pieces, tapped "About", and came back would have found it empty.
// Silently losing a full cart is about the most expensive bug a small shop
// can have. It also survives a reload and a closed tab, which is a real
// behaviour on phones — people wander off mid-shop and come back later.
//
// Only ids, quantities and notes are stored. Names and prices are resolved
// live from the database on render, so a price change or a sold-out piece is
// always reflected, never served from a stale copy in someone's browser.
//
// localStorage is genuinely an external store, so useSyncExternalStore is the
// right tool: it keeps every component reading the same value, updates them
// all on a change, and renders nothing on the server.

const EMPTY: CartItem[] = [];

// getSnapshot must return the same reference while nothing has changed, or
// React re-renders forever. Parse only when the raw string actually differs.
let cachedRaw: string | null = null;
let cachedValue: CartItem[] = EMPTY;

function parse(raw: string | null): CartItem[] {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    // Anything hand-edited or left over from an older shape is dropped rather
    // than trusted — this value comes from the shopper's own machine.
    const clean = parsed.filter(
      (l): l is CartItem =>
        l &&
        typeof l.lineId === "string" &&
        typeof l.productId === "string" &&
        typeof l.qty === "number" &&
        l.qty > 0 &&
        typeof l.note === "string"
    );
    return clean.length ? clean : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Private mode or blocked storage. An empty cart is the honest answer.
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

// The server has no cart, and the first client render must agree with it.
function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  // 'storage' only fires in OTHER tabs, so writes in this one notify directly.
  // Someone with the shop open twice shouldn't be able to check out a cart
  // they emptied in the other window.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function write(value: CartItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage full or unavailable. The cart still works for this page view,
    // it just won't survive navigation — better than throwing mid-purchase.
  }
  listeners.forEach((l) => l());
}

export function useCart() {
  const cart = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setCart = useCallback(
    (next: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
      const value = typeof next === "function" ? next(getSnapshot()) : next;
      write(value);
    },
    []
  );

  return { cart, setCart };
}

// Just the count, for the header on pages that don't load the product list.
export function useCartCount(): number {
  const { cart } = useCart();
  return cart.reduce((s, l) => s + l.qty, 0);
}
