import { describe, expect, it } from "vitest";
import { balancesWithMe, groupNet, openLoans, simpleInterest, simplify, totals } from "./balances";
import { guessCategory } from "./categories";
import { parseQuick } from "./quickAdd";
import { ME, type Expense, type Transfer } from "./types";
import { addDays, evalAmount, splitByWeights, splitEqually, today } from "./utils";

describe("evalAmount (calculator in every amount box)", () => {
  it.each([
    ["250", 250],
    ["1,250.50", 1250.5],
    ["120+80*2", 280],
    ["(100+50)/3", 50],
    ["20 x 3", 60],
    ["500 + 18%", 590],
    ["1000 - 10%", 900],
    ["₹ 99", 99],
  ])("%s = %s", (input, out) => expect(evalAmount(input)).toBe(out));

  it("rejects text that is not a sum", () => {
    expect(evalAmount("abc")).toBeNull();
    expect(evalAmount("5+")).toBeNull();
    expect(evalAmount("")).toBeNull();
  });
});

describe("splitting money", () => {
  it("splits equally down to the paisa", () => {
    expect(splitEqually(100, 3)).toEqual([33.34, 33.33, 33.33]);
    expect(splitEqually(100, 3).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });
  it("splits by shares", () => {
    expect(splitByWeights(1000, [2, 1, 1])).toEqual([500, 250, 250]);
    expect(splitByWeights(100, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });
});

describe("parseQuick (Hinglish quick add)", () => {
  it("reads a simple expense", () => {
    expect(parseQuick("chai samosa 40")).toMatchObject({ kind: "expense", title: "Chai Samosa", amount: 40, category: "Khana-Peena", paidBy: ME });
  });
  it("reads payment mode, date words and sums", () => {
    const r = parseQuick("sabzi 120+80 upi kal");
    expect(r).toMatchObject({ kind: "expense", amount: 200, mode: "upi", category: "Ration", date: addDays(today(), -1) });
  });
  it("reads '2k'", () => expect(parseQuick("rent 12k")).toMatchObject({ amount: 12000, category: "Ghar" }));
  it("reads lending", () => {
    expect(parseQuick("Rahul ko 500 udhaar diye")).toMatchObject({ kind: "transfer", from: ME, to: "Rahul", amount: 500, purpose: "udhaar" });
  });
  it("reads borrowing", () => {
    expect(parseQuick("Amit Kumar se 300 liye")).toMatchObject({ kind: "transfer", from: "Amit Kumar", to: ME, amount: 300, purpose: "udhaar" });
  });
  it("reads paying back both ways", () => {
    expect(parseQuick("Rahul ne 500 wapas diye")).toMatchObject({ kind: "transfer", from: "Rahul", to: ME, purpose: "settle" });
    expect(parseQuick("Amit ko 300 wapas kiye")).toMatchObject({ kind: "transfer", from: ME, to: "Amit", purpose: "settle" });
  });
  it("reads English", () => {
    expect(parseQuick("lent 500 to Rahul")).toMatchObject({ kind: "transfer", from: ME, to: "Rahul" });
    expect(parseQuick("borrowed 200 from Neha")).toMatchObject({ kind: "transfer", from: "Neha", to: ME });
  });
  it("reads a split with names after or before 'ke saath'", () => {
    expect(parseQuick("dinner 1200 Rahul Amit ke saath")).toMatchObject({ kind: "expense", title: "Dinner", amount: 1200, splitWith: ["Rahul", "Amit"] });
    expect(parseQuick("movie 900 split with Rahul, Neha")).toMatchObject({ title: "Movie", splitWith: ["Rahul", "Neha"] });
  });
  it("reads someone else paying for a shared thing", () => {
    expect(parseQuick("Rahul ne pizza 600 pay kiya")).toMatchObject({ kind: "expense", title: "Pizza", paidBy: "Rahul", amount: 600 });
  });
  it("returns null without an amount", () => expect(parseQuick("chai")).toBeNull());
});

describe("guessCategory", () => {
  it("prefers the longest matching word", () => {
    expect(guessCategory("light bill")).toBe("Bills");
    expect(guessCategory("auto")).toBe("Safar");
    expect(guessCategory("random thing")).toBe("Other");
  });
});

const exp = (paidBy: string, amount: number, shares: [string, number][], groupId?: string): Expense => ({
  kind: "expense",
  id: Math.random().toString(),
  title: "x",
  amount,
  category: "Other",
  date: "2026-01-01",
  mode: "cash",
  paidBy,
  splitType: "equal",
  shares: shares.map(([who, amount]) => ({ who, amount })),
  groupId,
  createdAt: "2026-01-01",
});
const tr = (from: string, to: string, amount: number, purpose: "udhaar" | "settle" = "udhaar", extra: Partial<Transfer> = {}): Transfer => ({
  kind: "transfer",
  id: Math.random().toString(),
  from,
  to,
  amount,
  date: "2026-01-01",
  purpose,
  mode: "cash",
  createdAt: "2026-01-01",
  ...extra,
});

describe("balances", () => {
  it("works out lena-dena from splits, udhaar and paybacks", () => {
    const entries = [
      exp(ME, 900, [[ME, 300], ["r", 300], ["a", 300]]), // r and a owe me 300 each
      exp("r", 600, [[ME, 300], ["r", 300]]), // I owe r 300
      tr(ME, "a", 1000), // a owes me 1000 more
      tr("a", ME, 500, "settle"), // a paid back 500
      tr("n", ME, 200), // I borrowed 200 from n
    ];
    const b = balancesWithMe(entries);
    expect(b.get("r")).toBe(0);
    expect(b.get("a")).toBe(800);
    expect(b.get("n")).toBe(-200);
    expect(totals(b)).toEqual({ lena: 800, dena: 200, net: 600 });
  });

  it("ignores debts between two other people", () => {
    const b = balancesWithMe([exp("r", 400, [["r", 200], ["a", 200]])]);
    expect(b.size).toBe(0);
  });

  it("simplifies a group to few payments", () => {
    const entries = [
      exp(ME, 3000, [[ME, 1000], ["r", 1000], ["a", 1000]]),
      exp("r", 1500, [[ME, 500], ["r", 500], ["a", 500]]),
    ];
    const net = groupNet(entries, [ME, "r", "a"]);
    expect(net.get("a")).toBe(-1500);
    const pay = simplify(net);
    const total = pay.reduce((s, p) => s + p.amount, 0);
    expect(total).toBe(1500);
    expect(pay.every((p) => p.from === "a")).toBe(true);
  });

  it("keeps a loan open until it is paid back, with sankda interest", () => {
    const d = addDays(today(), -60);
    const loan = tr(ME, "r", 10000, "udhaar", { date: d, interestRate: 2, dueDate: addDays(today(), -5) });
    const open = openLoans([loan]);
    expect(open).toHaveLength(1);
    expect(open[0].interest).toBe(400); // 2 months × ₹2 per ₹100
    expect(open[0].overdueDays).toBe(5);
    expect(openLoans([loan, tr("r", ME, 10000, "settle")])).toHaveLength(0);
    expect(simpleInterest(5000, 1.5, "2026-01-01", "2026-01-31")).toBe(75);
  });
});

import { computeShares } from "./split";

describe("computeShares", () => {
  const base = { amount: 1000, splitOn: true, people: [ME, "r"], values: {}, items: [], extra: { tax: 0, tip: 0, discount: 0 } };
  it("not split: all mine", () => {
    expect(computeShares({ ...base, splitOn: false, type: "equal" }).shares).toEqual([{ who: ME, amount: 1000 }]);
  });
  it("percent must add to 100", () => {
    expect(computeShares({ ...base, type: "percent", values: { [ME]: 60, r: 40 } }).shares.map((s) => s.amount)).toEqual([600, 400]);
    expect(computeShares({ ...base, type: "percent", values: { [ME]: 60, r: 30 } }).error).toMatch(/90%/);
  });
  it("exact must add to the bill", () => {
    expect(computeShares({ ...base, type: "exact", values: { [ME]: 700, r: 300 } }).error).toBeUndefined();
    expect(computeShares({ ...base, type: "exact", values: { [ME]: 700, r: 200 } }).error).toMatch(/baaki/);
  });
  it("item-wise: shared items split, tax shared by what you ate", () => {
    const r = computeShares({
      ...base,
      type: "items",
      items: [
        { id: "1", name: "Paneer", price: 300, who: [ME] },
        { id: "2", name: "Biryani", price: 500, who: ["r"] },
        { id: "3", name: "Naan", price: 200, who: [ME, "r"] },
      ],
      extra: { tax: 100, tip: 0, discount: 0 },
    });
    expect(r.amount).toBe(1100);
    // me: 300 + 100 = 400 of 1000 -> 440; r: 600 -> 660
    expect(r.shares).toEqual([
      { who: ME, amount: 440, value: 400 },
      { who: "r", amount: 660, value: 600 },
    ]);
  });
});

import { amountInWords, byaaj, emi, gst, lumpsum, monthsToGoal, rentSplit, sip } from "./calc";

describe("calculators", () => {
  it("EMI matches the standard formula", () => {
    const r = emi(500000, 9, 60);
    expect(r.emi).toBeCloseTo(10379.18, 1);
  });
  it("SIP and lumpsum", () => {
    expect(sip(1000, 0, 1).value).toBe(12000);
    expect(sip(1000, 12, 10).value).toBeGreaterThan(230000);
    expect(sip(1000, 0, 2, 10).invested).toBe(12000 + 13200);
    expect(lumpsum(100000, 10, 2).value).toBe(121000);
  });
  it("byaaj: ₹2 sankda for 6 months on ₹10,000 = ₹1,200", () => {
    expect(byaaj(10000, 2, 6, false)).toEqual({ interest: 1200, total: 11200 });
    expect(byaaj(10000, 1, 24, true).total).toBeCloseTo(12544, 0);
  });
  it("GST add and remove", () => {
    expect(gst(1000, 18, "add")).toEqual({ base: 1000, tax: 180, total: 1180 });
    expect(gst(1180, 18, "remove")).toEqual({ base: 1000, tax: 180, total: 1180 });
  });
  it("goal months", () => {
    expect(monthsToGoal(12000, 0, 1000, 0)).toBe(12);
    expect(monthsToGoal(100, 200, 0, 0)).toBe(0);
    expect(monthsToGoal(100, 0, 0, 0)).toBeNull();
  });
  it("rent split by room size", () => {
    expect(rentSplit(30000, 0, [{ size: 200, people: 1 }, { size: 100, people: 1 }])).toEqual([20000, 10000]);
    expect(rentSplit(30000, 100, [{ size: 200, people: 2 }, { size: 100, people: 1 }])).toEqual([20000, 10000]);
  });
  it("amount in words, Indian style", () => {
    expect(amountInWords(120500)).toBe("Rupees One Lakh Twenty Thousand Five Hundred Only");
    expect(amountInWords(25000000.5)).toBe("Rupees Two Crore Fifty Lakh and Fifty Paise Only");
    expect(amountInWords(99)).toBe("Rupees Ninety Nine Only");
    expect(amountInWords(0)).toBe("Rupees Zero Only");
  });
});

import { nextTheme, resolveTheme } from "./theme";

describe("themes", () => {
  it("auto follows the phone, others are fixed", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("black", false)).toBe("black");
    expect(resolveTheme("light", true)).toBe("light");
  });
  it("header button cycles light → dark → black → light", () => {
    expect([nextTheme("light"), nextTheme("dark"), nextTheme("black")]).toEqual(["dark", "black", "light"]);
  });
});
