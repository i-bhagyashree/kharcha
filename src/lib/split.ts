// Works out each person's share of a bill, for every way of splitting.

import { ME, type BillItem, type SplitShare, type SplitType, type Who } from "./types";
import { inr, round2, splitByWeights, splitEqually } from "./utils";

export interface SplitInput {
  amount: number;
  splitOn: boolean;
  type: SplitType;
  people: Who[];
  values: Record<Who, number>;
  items: BillItem[];
  extra: { tax: number; tip: number; discount: number };
}

export interface SplitResult {
  amount: number; // for item-wise bills this is worked out from the items
  shares: SplitShare[];
  error?: string;
}

export function computeShares(i: SplitInput): SplitResult {
  if (!i.splitOn || i.type === "none") return { amount: i.amount, shares: [{ who: ME, amount: round2(i.amount) }] };
  const people = i.people;
  if (i.type !== "items" && people.length === 0) return { amount: i.amount, shares: [], error: "Kam se kam ek insaan chuno" };

  switch (i.type) {
    case "equal": {
      const parts = splitEqually(i.amount, people.length);
      return { amount: i.amount, shares: people.map((who, k) => ({ who, amount: parts[k] })) };
    }
    case "exact": {
      const shares = people.map((who) => ({ who, amount: round2(i.values[who] ?? 0), value: i.values[who] ?? 0 }));
      const total = round2(shares.reduce((s, x) => s + x.amount, 0));
      const left = round2(i.amount - total);
      return { amount: i.amount, shares, error: Math.abs(left) >= 0.01 ? (left > 0 ? `${inr(left)} abhi baaki hai baantna` : `${inr(-left)} zyada ho gaya`) : undefined };
    }
    case "percent": {
      const weights = people.map((who) => i.values[who] ?? 0);
      const total = round2(weights.reduce((s, w) => s + w, 0));
      const parts = splitByWeights(i.amount, weights);
      return {
        amount: i.amount,
        shares: people.map((who, k) => ({ who, amount: parts[k], value: weights[k] })),
        error: Math.abs(total - 100) >= 0.01 ? `Total ${total}% hai, 100% hona chahiye` : undefined,
      };
    }
    case "shares": {
      const weights = people.map((who) => i.values[who] ?? 1);
      const parts = splitByWeights(i.amount, weights);
      return {
        amount: i.amount,
        shares: people.map((who, k) => ({ who, amount: parts[k], value: weights[k] })),
        error: weights.every((w) => w <= 0) ? "Hisse 0 se zyada hone chahiye" : undefined,
      };
    }
    case "items": {
      // Each item is split between the people who had it. Tax and tip are shared
      // in proportion to what each person ate; so is any discount.
      const sub = new Map<Who, number>();
      for (const item of i.items) {
        if (item.price <= 0 || item.who.length === 0) continue;
        const parts = splitEqually(item.price, item.who.length);
        item.who.forEach((w, k) => sub.set(w, (sub.get(w) ?? 0) + parts[k]));
      }
      const subtotal = round2([...sub.values()].reduce((s, v) => s + v, 0));
      const extra = round2(i.extra.tax + i.extra.tip - i.extra.discount);
      const amount = round2(subtotal + extra);
      if (subtotal <= 0) return { amount: 0, shares: [], error: "Items jodo aur batao kisne kya liya" };
      const whos = [...sub.keys()];
      const parts = splitByWeights(amount, whos.map((w) => sub.get(w)!));
      const unassigned = i.items.some((it) => it.price > 0 && it.who.length === 0);
      return {
        amount,
        shares: whos.map((who, k) => ({ who, amount: parts[k], value: round2(sub.get(who)!) })),
        error: unassigned ? "Kuch items kisi ko assign nahi hue" : undefined,
      };
    }
  }
  return { amount: i.amount, shares: [{ who: ME, amount: i.amount }] };
}
