// UI state that is not saved: current page (from the URL hash), open sheet, toast.

import { useSyncExternalStore } from "react";
import type { Expense, Group, Person, Transfer } from "./types";

export type SheetState =
  | { type: "quick"; text?: string }
  | { type: "expense"; expense?: Expense; preset?: Partial<Expense> }
  | { type: "transfer"; transfer?: Transfer; preset?: Partial<Transfer> }
  | { type: "reminder"; personId: string }
  | { type: "person"; person?: Person }
  | { type: "group"; group?: Group }
  | null;

export interface Toast {
  id: number;
  text: string;
  undo?: () => void;
}

let sheet: SheetState = null;
let toast: Toast | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const openSheet = (s: SheetState) => {
  sheet = s;
  emit();
};
export const closeSheet = () => openSheet(null);
export const useSheet = () => useSyncExternalStore(subscribe, () => sheet);

// Changing page (a link, or the phone's back button) closes any open sheet.
if (typeof window !== "undefined") window.addEventListener("hashchange", () => sheet && closeSheet());

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function showToast(text: string, undo?: () => void) {
  toast = { id: Date.now(), text, undo };
  emit();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast = null;
    emit();
  }, undo ? 6000 : 3000);
}
export const hideToast = () => {
  toast = null;
  emit();
};
export const useToast = () => useSyncExternalStore(subscribe, () => toast);

// ------------------------------------------------------------ routing

const subscribeHash = (l: () => void) => {
  window.addEventListener("hashchange", l);
  return () => window.removeEventListener("hashchange", l);
};
/** "#/person/abc" -> ["person", "abc"]; home is [] */
export function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash);
  return hash.replace(/^#\/?/, "").split("/").filter(Boolean);
}
export function navigate(path: string) {
  window.location.hash = path.startsWith("/") ? path : `/${path}`;
  window.scrollTo({ top: 0 });
}
