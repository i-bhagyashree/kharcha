// The whole app's data in one object, saved to IndexedDB on this device after every change.

import { openDB } from "idb";
import { useSyncExternalStore } from "react";
import { ME, type AppData, type Entry, type Person, type Settings, type Who } from "./types";
import { PERSON_COLORS, today, uid } from "./utils";

export const DEFAULT_SETTINGS: Settings = {
  name: "",
  upiId: "",
  monthlyIncome: 0,
  workHoursPerMonth: 208,
  showWorkHours: false,
  theme: "system",
  monthlyBudget: 0,
  categoryBudgets: {},
};

export const emptyData = (): AppData => ({
  version: 1,
  people: [],
  groups: [],
  entries: [],
  bills: [],
  daily: [],
  shopping: [],
  settings: { ...DEFAULT_SETTINGS },
});

const dbPromise = openDB("kharcha-app", 1, {
  upgrade(db) {
    db.createObjectStore("kv");
  },
});

let data: AppData = emptyData();
let loaded = false;
const listeners = new Set<() => void>();

/** Fills in anything missing, so older backups and saves still load. */
export function normalize(raw: Partial<AppData> | null | undefined): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: 1,
    people: Array.isArray(raw.people) ? raw.people : [],
    groups: Array.isArray(raw.groups) ? raw.groups : [],
    entries: Array.isArray(raw.entries) ? raw.entries : [],
    bills: Array.isArray(raw.bills) ? raw.bills : [],
    daily: Array.isArray(raw.daily) ? raw.daily : [],
    shopping: Array.isArray(raw.shopping) ? raw.shopping : [],
    settings: { ...base.settings, ...(raw.settings ?? {}) },
  };
}

export async function loadData(): Promise<void> {
  try {
    const db = await dbPromise;
    data = normalize(await db.get("kv", "data"));
  } catch {
    // Storage blocked (private mode etc.): the app still works for this visit.
  }
  loaded = true;
  emit();
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const db = await dbPromise;
      await db.put("kv", data, "data");
    } catch {
      /* ignore: nothing else we can do */
    }
  }, 150);
}

function emit() {
  for (const l of listeners) l();
}

export function update(fn: (d: AppData) => AppData) {
  data = fn(data);
  persist();
  emit();
}

export function replaceAll(next: AppData) {
  update(() => normalize(next));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useData(): AppData {
  return useSyncExternalStore(subscribe, () => data);
}
export const useLoaded = () => useSyncExternalStore(subscribe, () => loaded);
export const getData = () => data;

// ------------------------------------------------------------ common actions

export function addPerson(name: string, phone = ""): Person {
  const existing = data.people.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (existing) return existing;
  const person: Person = {
    id: uid(),
    name: name.trim(),
    phone: phone.trim() || undefined,
    color: PERSON_COLORS[data.people.length % PERSON_COLORS.length],
    createdAt: today(),
  };
  update((d) => ({ ...d, people: [...d.people, person] }));
  return person;
}

export function saveEntry(entry: Entry) {
  update((d) => {
    const exists = d.entries.some((e) => e.id === entry.id);
    return { ...d, entries: exists ? d.entries.map((e) => (e.id === entry.id ? entry : e)) : [...d.entries, entry] };
  });
}

export function deleteEntry(id: string) {
  update((d) => ({
    ...d,
    entries: d.entries.filter((e) => e.id !== id),
    // Un-mark bills / daily items paid by this expense.
    bills: d.bills.map((b) => ({ ...b, paid: Object.fromEntries(Object.entries(b.paid).filter(([, v]) => v !== id)) })),
    daily: d.daily.map((x) => ({ ...x, paid: Object.fromEntries(Object.entries(x.paid).filter(([, v]) => v !== id)) })),
  }));
}

export function updateSettings(patch: Partial<Settings>) {
  update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
}

export function nameOf(who: Who, d: AppData = data): string {
  if (who === ME) return "Aap";
  return d.people.find((p) => p.id === who)?.name ?? "Koi";
}
export function personOf(who: Who, d: AppData = data): Person | undefined {
  return d.people.find((p) => p.id === who);
}
