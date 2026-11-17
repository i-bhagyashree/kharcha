// Monthly bills and daily khaata (doodh, kaamwali, akhbaar...).

import { openLoans, mySpendIn, expensesOnly, myShare } from "./balances";
import { category } from "./categories";
import { nameOf } from "./store";
import type { AppData, Bill, DailyItem } from "./types";
import { addMonths, daysBetween, daysInMonth, inr, monthOf, round2, thisMonth, today } from "./utils";

// ------------------------------------------------------------ bills

export interface BillStatus {
  bill: Bill;
  month: string;
  dueDate: string;
  paid: boolean;
  daysLeft: number; // negative = overdue
}

export function billStatus(bill: Bill, month = thisMonth()): BillStatus {
  const day = Math.min(bill.dueDay, daysInMonth(month));
  const dueDate = `${month}-${String(day).padStart(2, "0")}`;
  return { bill, month, dueDate, paid: Boolean(bill.paid[month]), daysLeft: daysBetween(today(), dueDate) };
}

// ------------------------------------------------------------ daily khaata

export interface DailyDay {
  date: string;
  qty: number;
  marked: boolean; // explicitly set by the user (not the default)
  future: boolean;
}

/** Every day of a month for a daily item, with the quantity counted for it. */
export function dailyMonth(item: DailyItem, month: string): { days: DailyDay[]; qty: number; amount: number; offDays: number } {
  const now = today();
  const days: DailyDay[] = [];
  let qty = 0;
  let offDays = 0;
  for (let d = 1; d <= daysInMonth(month); d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    const future = date > now;
    const before = date < item.startDate;
    const marked = item.log[date] !== undefined;
    const q = marked ? item.log[date] : !future && !before && item.auto ? item.defaultQty : 0;
    if (!future && !before) {
      qty += q;
      if (q === 0) offDays++;
    }
    days.push({ date, qty: before ? 0 : q, marked, future: future || before });
  }
  return { days, qty: round2(qty), amount: round2(qty * item.rate), offDays };
}

/** Hisaab message to match with the doodhwala / kaamwali at month end. */
export function dailySummaryText(item: DailyItem, month: string, monthLabel: string): string {
  const m = dailyMonth(item, month);
  const off = m.days.filter((d) => !d.future && d.qty === 0).map((d) => Number(d.date.slice(8)));
  const extra = m.days.filter((d) => !d.future && d.qty !== item.defaultQty && d.qty > 0).map((d) => `${Number(d.date.slice(8))} (${d.qty})`);
  return [
    `${item.emoji} ${item.name} — ${monthLabel}`,
    `Kul: ${m.qty} ${item.unit} × ${inr(item.rate)} = ${inr(m.amount)}`,
    off.length ? `Nahi aaya / chhutti: ${off.join(", ")} tarikh` : "Ek bhi din chhutti nahi ✓",
    extra.length ? `Alag quantity: ${extra.join(", ")}` : "",
    "— Kharcha app",
  ]
    .filter(Boolean)
    .join("\n");
}

// ------------------------------------------------------------ alerts for the home page

export interface Alert {
  id: string;
  emoji: string;
  text: string;
  tone: "red" | "amber" | "blue";
  link: string;
}

export function alerts(data: AppData): Alert[] {
  const out: Alert[] = [];
  const month = thisMonth();

  for (const l of openLoans(data.entries)) {
    if (l.transfer.dueDate && l.overdueDays > 0) {
      const name = nameOf(l.person, data);
      out.push({
        id: `loan-${l.transfer.id}`,
        emoji: l.direction === "lena" ? "⏰" : "⚠️",
        text: l.direction === "lena" ? `${name} ka ${inr(l.transfer.amount)} lautane ka din ${l.overdueDays} din pehle tha` : `${name} ko ${inr(l.transfer.amount)} lautane the — ${l.overdueDays} din late`,
        tone: "red",
        link: `/person/${l.person}`,
      });
    } else if (l.transfer.dueDate && daysBetween(today(), l.transfer.dueDate) <= 3) {
      out.push({
        id: `loan-${l.transfer.id}`,
        emoji: "📅",
        text: `${nameOf(l.person, data)} ${l.direction === "lena" ? "se" : "ko"} ${inr(l.transfer.amount)} — ${daysBetween(today(), l.transfer.dueDate) === 0 ? "aaj" : `${daysBetween(today(), l.transfer.dueDate)} din me`} lautane hain`,
        tone: "amber",
        link: `/person/${l.person}`,
      });
    }
  }

  for (const b of data.bills) {
    const s = billStatus(b, month);
    if (s.paid) continue;
    if (s.daysLeft < 0) out.push({ id: `bill-${b.id}`, emoji: b.emoji, text: `${b.name} ka bill ${-s.daysLeft} din se due hai (${inr(b.amount)})`, tone: "red", link: "/bills" });
    else if (s.daysLeft <= 5) out.push({ id: `bill-${b.id}`, emoji: b.emoji, text: `${b.name} ${s.daysLeft === 0 ? "aaj" : `${s.daysLeft} din me`} bharna hai · ${inr(b.amount)}`, tone: "amber", link: "/bills" });
  }

  const { monthlyBudget, categoryBudgets } = data.settings;
  const spent = mySpendIn(data.entries, month);
  if (monthlyBudget > 0 && spent > monthlyBudget) out.push({ id: "budget", emoji: "🚨", text: `Is mahine ka budget ${inr(spent - monthlyBudget)} se paar ho gaya`, tone: "red", link: "/budget" });
  else if (monthlyBudget > 0 && spent > monthlyBudget * 0.85) out.push({ id: "budget", emoji: "🟡", text: `Budget ka ${Math.round((spent / monthlyBudget) * 100)}% kharch ho gaya`, tone: "amber", link: "/budget" });
  const monthExp = expensesOnly(data.entries).filter((e) => monthOf(e.date) === month);
  for (const [cat, limit] of Object.entries(categoryBudgets)) {
    if (!limit) continue;
    const s = monthExp.filter((e) => e.category === cat).reduce((t, e) => t + myShare(e), 0);
    if (s > limit) out.push({ id: `cat-${cat}`, emoji: category(cat).emoji, text: `${cat} ka budget paar: ${inr(s)} / ${inr(limit)}`, tone: "amber", link: "/budget" });
  }

  // Last month's daily khaata not paid yet
  const lastMonth = addMonths(month, -1);
  for (const item of data.daily) {
    if (item.paid[lastMonth] || item.startDate > `${lastMonth}-31`) continue;
    const m = dailyMonth(item, lastMonth);
    if (m.amount > 0) out.push({ id: `daily-${item.id}`, emoji: item.emoji, text: `${item.name} ka pichhle mahine ka ${inr(m.amount)} chukana baaki`, tone: "blue", link: "/daily" });
  }
  return out;
}
