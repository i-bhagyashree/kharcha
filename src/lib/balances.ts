// Lena-dena maths. Every entry becomes a list of "A owes B ₹x" debts:
//  - an expense: everyone in the split owes the person who paid, their share
//  - a transfer (udhaar or paying back): the receiver owes the giver
// Paying back is just a transfer the other way, so it cancels the debt.

import { ME, type Entry, type Expense, type Transfer, type Who } from "./types";
import { daysBetween, round2, today } from "./utils";

export interface Debt {
  from: Who; // owes
  to: Who;
  amount: number;
}

export function debtsOf(entry: Entry): Debt[] {
  if (entry.kind === "transfer") return [{ from: entry.to, to: entry.from, amount: entry.amount }];
  return entry.shares
    .filter((s) => s.who !== entry.paidBy && s.amount > 0)
    .map((s) => ({ from: s.who, to: entry.paidBy, amount: s.amount }));
}

/** How much this entry changes what `person` owes me (positive = they owe me more). */
export function effectWith(entry: Entry, person: Who): number {
  let v = 0;
  for (const d of debtsOf(entry)) {
    if (d.from === person && d.to === ME) v += d.amount;
    if (d.from === ME && d.to === person) v -= d.amount;
  }
  return round2(v);
}

/** Net balance with every person. Positive: they owe me (lena hai). Negative: I owe them (dena hai). */
export function balancesWithMe(entries: Entry[]): Map<Who, number> {
  const out = new Map<Who, number>();
  for (const e of entries) {
    for (const d of debtsOf(e)) {
      if (d.to === ME && d.from !== ME) out.set(d.from, (out.get(d.from) ?? 0) + d.amount);
      if (d.from === ME && d.to !== ME) out.set(d.to, (out.get(d.to) ?? 0) - d.amount);
    }
  }
  for (const [k, v] of out) out.set(k, round2(v));
  return out;
}

export function totals(balances: Map<Who, number>) {
  let lena = 0;
  let dena = 0;
  for (const v of balances.values()) {
    if (v > 0.009) lena += v;
    else if (v < -0.009) dena -= v;
  }
  return { lena: round2(lena), dena: round2(dena), net: round2(lena - dena) };
}

/** Net position of each member inside a group. Positive: should get money back. */
export function groupNet(entries: Entry[], members: Who[]): Map<Who, number> {
  const net = new Map<Who, number>(members.map((m) => [m, 0]));
  for (const e of entries) {
    for (const d of debtsOf(e)) {
      net.set(d.from, (net.get(d.from) ?? 0) - d.amount);
      net.set(d.to, (net.get(d.to) ?? 0) + d.amount);
    }
  }
  for (const [k, v] of net) net.set(k, round2(v));
  return net;
}

/**
 * Fewest payments that settle a group: biggest debtor pays biggest creditor,
 * repeat. (5 friends with tangled debts usually need just 3-4 payments.)
 */
export function simplify(net: Map<Who, number>): Debt[] {
  const debtors = [...net].filter(([, v]) => v < -0.009).map(([who, v]) => ({ who, left: -v }));
  const creditors = [...net].filter(([, v]) => v > 0.009).map(([who, v]) => ({ who, left: v }));
  const out: Debt[] = [];
  for (;;) {
    debtors.sort((a, b) => b.left - a.left);
    creditors.sort((a, b) => b.left - a.left);
    const d = debtors[0];
    const c = creditors[0];
    if (!d || !c || d.left < 0.01 || c.left < 0.01) break;
    const amt = round2(Math.min(d.left, c.left));
    out.push({ from: d.who, to: c.who, amount: amt });
    d.left = round2(d.left - amt);
    c.left = round2(c.left - amt);
    if (d.left < 0.01) debtors.shift();
    if (c.left < 0.01) creditors.shift();
  }
  return out;
}

// ------------------------------------------------------------ my spending

/** My own part of an expense: what I actually consumed, whoever paid. */
export const myShare = (e: Expense) => e.shares.find((s) => s.who === ME)?.amount ?? 0;

export const expensesOnly = (entries: Entry[]) => entries.filter((e): e is Expense => e.kind === "expense");

/** Total I spent on myself in a month (my shares only, not money lent to others). */
export function mySpendIn(entries: Entry[], month: string): number {
  return round2(expensesOnly(entries).filter((e) => e.date.startsWith(month)).reduce((s, e) => s + myShare(e), 0));
}

export function byCategory(expenses: Expense[]): { name: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + myShare(e));
  return [...map].map(([name, amount]) => ({ name, amount: round2(amount) })).filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
}

// ------------------------------------------------------------ udhaar with interest and due dates

export interface OpenLoan {
  transfer: Transfer;
  person: Who;
  direction: "lena" | "dena";
  interest: number; // simple interest so far
  overdueDays: number; // > 0 when the due date has passed
}

/** Simple interest at "₹rate per ₹100 per month" (the Indian "sankda" way). */
export function simpleInterest(amount: number, ratePerMonth: number, fromDate: string, toDate = today()): number {
  const months = Math.max(0, daysBetween(fromDate, toDate)) / 30;
  return round2((amount * ratePerMonth * months) / 100);
}

/**
 * Udhaar entries that are still open, oldest first. A person's loans count as
 * open while the balance with them is still in the same direction.
 */
export function openLoans(entries: Entry[]): OpenLoan[] {
  const balances = balancesWithMe(entries);
  const out: OpenLoan[] = [];
  const now = today();
  for (const e of entries) {
    if (e.kind !== "transfer" || e.purpose !== "udhaar") continue;
    const person = e.from === ME ? e.to : e.to === ME ? e.from : null;
    if (!person) continue;
    const direction = e.from === ME ? "lena" : "dena";
    const bal = balances.get(person) ?? 0;
    if ((direction === "lena" && bal <= 0.009) || (direction === "dena" && bal >= -0.009)) continue;
    out.push({
      transfer: e,
      person,
      direction,
      interest: e.interestRate ? simpleInterest(e.amount, e.interestRate, e.date) : 0,
      overdueDays: e.dueDate ? Math.max(0, daysBetween(e.dueDate, now)) : 0,
    });
  }
  return out.sort((a, b) => a.transfer.date.localeCompare(b.transfer.date));
}
