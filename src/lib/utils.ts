// Small helpers: money, dates, ids, and the calculator that powers every amount box.

const inrFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrFmt2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

/** ₹1,23,456 (paise shown only when there are any) */
export const inr = (n: number) => (Math.abs(n % 1) > 0.004 ? inrFmt2 : inrFmt).format(n);
/** ₹1.2L, ₹45k: for tight spaces */
export function inrShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1e7) return `${sign}₹${+(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${sign}₹${+(a / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `${sign}₹${+(a / 1e3).toFixed(1)}k`;
  return inr(n);
}
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const sum = (values: number[]) => round2(values.reduce((s, v) => s + v, 0));

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ------------------------------------------------------------ dates (local, "YYYY-MM-DD")

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => isoDate(new Date());
export const monthOf = (iso: string) => iso.slice(0, 7);
export const thisMonth = () => monthOf(today());
export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d || 1);
}
export const addDays = (iso: string, days: number) => {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
};
export const addMonths = (month: string, n: number) => {
  const d = parseIso(`${month}-01`);
  d.setMonth(d.getMonth() + n);
  return isoDate(d).slice(0, 7);
};
export const daysBetween = (a: string, b: string) => Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86_400_000);
export const daysInMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};
export const monthName = (month: string, long = false) =>
  parseIso(`${month}-01`).toLocaleDateString("en-IN", { month: long ? "long" : "short", year: "numeric" });
export const dateLabel = (iso: string) => parseIso(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
export const dateLabelFull = (iso: string) =>
  parseIso(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export function relativeDay(iso: string): string {
  const diff = daysBetween(today(), iso);
  if (diff === 0) return "Aaj";
  if (diff === -1) return "Kal";
  if (diff === 1) return "Kal (aane wala)";
  if (diff < 0 && diff > -7) return parseIso(iso).toLocaleDateString("en-IN", { weekday: "long" });
  return dateLabelFull(iso);
}
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Shubh raatri";
  if (h < 12) return "Suprabhat";
  if (h < 17) return "Namaste";
  return "Shubh sandhya";
}

// ------------------------------------------------------------ calculator

/**
 * Evaluates what was typed in an amount box: "120+80*2", "1500/3", "18%" of nothing,
 * "1,200 + 350". Supports + - * / ( ), x for multiply and a trailing "%" meaning /100.
 * Returns null for anything that is not a plain sum.
 */
export function evalAmount(input: string): number | null {
  const text = input.replace(/,/g, "").replace(/₹|rs\.?/gi, "").replace(/[x×]/gi, "*").replace(/÷/g, "/").trim();
  if (!text) return null;
  if (!/^[\d.+\-*/()%\s]+$/.test(text)) return null;
  let pos = 0;
  const peek = () => text[pos];
  const skip = () => {
    while (text[pos] === " ") pos++;
  };
  function number(): number {
    skip();
    if (peek() === "(") {
      pos++;
      const v = expr();
      skip();
      if (peek() !== ")") throw new Error("missing )");
      pos++;
      return v;
    }
    if (peek() === "-") {
      pos++;
      return -number();
    }
    const m = /^\d*\.?\d+/.exec(text.slice(pos));
    if (!m) throw new Error("number expected");
    pos += m[0].length;
    skip();
    let v = parseFloat(m[0]);
    if (peek() === "%") {
      pos++;
      v /= 100;
    }
    return v;
  }
  function term(): number {
    let v = number();
    for (;;) {
      skip();
      const op = peek();
      if (op !== "*" && op !== "/") return v;
      pos++;
      const r = number();
      v = op === "*" ? v * r : v / r;
    }
  }
  function expr(): number {
    let v = term();
    for (;;) {
      skip();
      const op = peek();
      if (op !== "+" && op !== "-") return v;
      pos++;
      // "500 + 18%" means 500 plus 18% of 500, like a shop calculator.
      const save = pos;
      const r = term();
      const isPercent = /%\s*$/.test(text.slice(save, pos));
      const add = isPercent ? v * r : r;
      v = op === "+" ? v + add : v - add;
    }
  }
  try {
    const v = expr();
    skip();
    if (pos !== text.length || !Number.isFinite(v)) return null;
    return round2(v);
  } catch {
    return null;
  }
}

/** True when the text is a sum, not just a number (so the UI can show "= ₹..."). */
export const isExpression = (input: string) => /\d\s*[+\-*/x×%]/.test(input.replace(/,/g, ""));

// ------------------------------------------------------------ split maths

/** Splits an amount into n parts that add up exactly (extra paise go to the first parts). */
export function splitEqually(amount: number, n: number): number[] {
  if (n <= 0) return [];
  const paise = Math.round(amount * 100);
  const base = Math.floor(paise / n);
  return Array.from({ length: n }, (_, i) => (base + (i < paise - base * n ? 1 : 0)) / 100);
}

/** Splits an amount by weights (shares or percentages), adding up exactly. */
export function splitByWeights(amount: number, weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return weights.map(() => 0);
  const paise = Math.round(amount * 100);
  const raw = weights.map((w) => (paise * w) / total);
  const floors = raw.map(Math.floor);
  let left = paise - floors.reduce((s, v) => s + v, 0);
  const order = raw.map((r, i) => [r - floors[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    floors[i]++;
    left--;
  }
  return floors.map((p) => p / 100);
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

export const PERSON_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#84cc16"];

export function download(filename: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
