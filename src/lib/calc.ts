// Pure maths behind the calculators, kept separate so it can be tested.

import { round2 } from "./utils";

export function emi(principal: number, annualRate: number, months: number): { emi: number; interest: number; total: number } {
  if (principal <= 0 || months <= 0) return { emi: 0, interest: 0, total: 0 };
  const r = annualRate / 12 / 100;
  const e = r === 0 ? principal / months : (principal * r * (1 + r) ** months) / ((1 + r) ** months - 1);
  return { emi: round2(e), interest: round2(e * months - principal), total: round2(e * months) };
}

/** SIP with an optional yearly step-up (increase the SIP by x% every year). */
export function sip(monthly: number, annualReturn: number, years: number, stepUp = 0): { invested: number; value: number; gain: number } {
  const r = annualReturn / 12 / 100;
  let value = 0;
  let invested = 0;
  let amount = monthly;
  for (let m = 0; m < Math.round(years * 12); m++) {
    if (m > 0 && m % 12 === 0) amount *= 1 + stepUp / 100;
    value = (value + amount) * (1 + r);
    invested += amount;
  }
  return { invested: Math.round(invested), value: Math.round(value), gain: Math.round(value - invested) };
}

export function lumpsum(amount: number, annualReturn: number, years: number) {
  const value = amount * (1 + annualReturn / 100) ** years;
  return { invested: Math.round(amount), value: Math.round(value), gain: Math.round(value - amount) };
}

/** Interest on a loan between people. `ratePerMonth` is ₹ per ₹100 per month (sankda). */
export function byaaj(principal: number, ratePerMonth: number, months: number, compound: boolean): { interest: number; total: number } {
  if (compound) {
    // Compounded yearly, the common practice for private loans.
    const years = months / 12;
    const total = principal * (1 + (ratePerMonth * 12) / 100) ** years;
    return { interest: round2(total - principal), total: round2(total) };
  }
  const interest = (principal * ratePerMonth * months) / 100;
  return { interest: round2(interest), total: round2(principal + interest) };
}

export function gst(amount: number, rate: number, mode: "add" | "remove") {
  if (mode === "add") {
    const tax = (amount * rate) / 100;
    return { base: round2(amount), tax: round2(tax), total: round2(amount + tax) };
  }
  const base = amount / (1 + rate / 100);
  return { base: round2(base), tax: round2(amount - base), total: round2(amount) };
}

/** Months needed to reach a goal with monthly saving and an expected return. */
export function monthsToGoal(target: number, saved: number, monthly: number, annualReturn: number): number | null {
  if (saved >= target) return 0;
  if (monthly <= 0 && annualReturn <= 0) return null;
  const r = annualReturn / 12 / 100;
  let value = saved;
  for (let m = 1; m <= 1200; m++) {
    value = value * (1 + r) + monthly;
    if (value >= target) return m;
  }
  return null;
}

/** Rent split: a common part shared equally per person, the rest by room size. */
export function rentSplit(rent: number, commonPct: number, rooms: { size: number; people: number }[]): number[] {
  const totalPeople = rooms.reduce((s, r) => s + r.people, 0);
  const totalSize = rooms.reduce((s, r) => s + r.size, 0);
  if (totalPeople <= 0 || totalSize <= 0) return rooms.map(() => 0);
  const common = (rent * commonPct) / 100;
  const priv = rent - common;
  return rooms.map((r) => round2((common * r.people) / totalPeople + (priv * r.size) / totalSize));
}

// ------------------------------------------------------------ amount in words (Indian system, for cheques)

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
}
function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", rest ? twoDigits(rest) : ""].filter(Boolean).join(" ");
}

/** 120500.5 -> "Rupees One Lakh Twenty Thousand Five Hundred and Fifty Paise Only" */
export function amountInWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "";
  let rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Rupees Zero Only";
  const parts: string[] = [];
  const crore = Math.floor(rupees / 1e7);
  rupees %= 1e7;
  const lakh = Math.floor(rupees / 1e5);
  rupees %= 1e5;
  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;
  if (crore) parts.push(`${crore >= 1000 ? amountInWords(crore).replace(/^Rupees | Only$/g, "") : crore >= 100 ? threeDigits(crore) : twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rupees) parts.push(threeDigits(rupees));
  const r = parts.join(" ");
  return `Rupees ${r || "Zero"}${paise ? ` and ${twoDigits(paise)} Paise` : ""} Only`;
}
