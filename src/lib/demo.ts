// Example data to explore the app. Dates are relative to today.

import { emptyData } from "./store";
import { ME, type AppData, type Entry, type Expense, type Person, type Who } from "./types";
import { addDays, addMonths, PERSON_COLORS, splitEqually, thisMonth, today } from "./utils";

export function demoData(settingsName = ""): AppData {
  const d = emptyData();
  const t = today();
  const names = ["Rahul Sharma", "Priya", "Amit", "Neha"];
  const people: Person[] = names.map((name, i) => ({ id: `demo-p${i}`, name, color: PERSON_COLORS[i], createdAt: addDays(t, -60), phone: undefined }));
  const [rahul, priya, amit, neha] = people.map((p) => p.id);
  let n = 0;
  const ex = (daysAgo: number, title: string, amount: number, cat: string, opts: { paidBy?: Who; with?: Who[]; mode?: Expense["mode"]; groupId?: string } = {}): Expense => {
    const people: Who[] = [...new Set([ME, ...(opts.paidBy && opts.paidBy !== ME ? [opts.paidBy] : []), ...(opts.with ?? [])])];
    const parts = splitEqually(amount, people.length);
    return {
      kind: "expense",
      id: `demo-e${n++}`,
      title,
      amount,
      category: cat,
      date: addDays(t, -daysAgo),
      mode: opts.mode ?? "upi",
      paidBy: opts.paidBy ?? ME,
      splitType: people.length > 1 ? "equal" : "none",
      shares: people.map((who, i) => ({ who, amount: parts[i] })),
      groupId: opts.groupId,
      createdAt: addDays(t, -daysAgo),
    };
  };
  const entries: Entry[] = [
    ex(0, "Chai samosa", 40, "Khana-Peena", { mode: "cash" }),
    ex(0, "Auto", 80, "Safar", { mode: "cash" }),
    ex(1, "Sabzi", 245, "Ration"),
    ex(1, "Dinner — Barbeque Nation", 3200, "Khana-Peena", { with: [rahul, priya, amit] }),
    ex(2, "Petrol", 500, "Petrol"),
    ex(3, "Movie tickets", 900, "Manoranjan", { paidBy: rahul, with: [neha] }),
    ex(4, "Blinkit order", 682, "Ration"),
    ex(5, "Medicine", 340, "Sehat"),
    ex(6, "Pizza", 750, "Khana-Peena", { with: [amit] }),
    ex(7, "Metro card recharge", 300, "Safar"),
    ex(8, "Haircut", 200, "Personal", { mode: "cash" }),
    ex(9, "T-shirt", 799, "Shopping"),
    ex(10, "Mandir prasad", 101, "Daan-Puja", { mode: "cash" }),
    ex(12, "Atta, dal, chawal", 1450, "Ration"),
    ex(13, "Swiggy", 420, "Khana-Peena"),
    ex(15, "Netflix", 199, "Manoranjan", { mode: "card" }),
    ex(16, "Uber", 260, "Safar"),
    ex(18, "Cafe", 560, "Khana-Peena", { paidBy: priya, with: [neha] }),
    ex(20, "Books", 650, "Padhai"),
    ex(22, "Hotel — Goa", 9000, "Safar", { with: [rahul, amit], groupId: "demo-g0" }),
    ex(22, "Scooty rent — Goa", 1800, "Safar", { paidBy: rahul, with: [amit], groupId: "demo-g0" }),
    ex(21, "Seafood dinner — Goa", 2400, "Khana-Peena", { paidBy: amit, with: [rahul], groupId: "demo-g0" }),
    ex(25, "Sabzi", 180, "Ration", { mode: "cash" }),
    ex(28, "Shoes", 1999, "Shopping"),
    ex(32, "Dinner", 1100, "Khana-Peena", { with: [priya] }),
    ex(35, "Petrol", 600, "Petrol"),
    ex(38, "Ration", 2100, "Ration"),
    ex(40, "Movie", 500, "Manoranjan"),
    ex(45, "Gift for mummy", 1500, "Shopping"),
    ex(50, "Doctor", 500, "Sehat"),
    {
      kind: "transfer",
      id: "demo-t0",
      from: ME,
      to: neha,
      amount: 2000,
      date: addDays(t, -20),
      purpose: "udhaar",
      dueDate: addDays(t, -2),
      note: "Phone repair ke liye",
      mode: "upi",
      createdAt: addDays(t, -20),
    },
    { kind: "transfer", id: "demo-t1", from: amit, to: ME, amount: 5000, date: addDays(t, -14), purpose: "udhaar", dueDate: addDays(t, 16), interestRate: 1, note: "Laptop EMI", mode: "upi", createdAt: addDays(t, -14) },
    { kind: "transfer", id: "demo-t2", from: priya, to: ME, amount: 550, date: addDays(t, -25), purpose: "settle", mode: "upi", createdAt: addDays(t, -25) },
  ];
  const month = thisMonth();
  const prev = addMonths(month, -1);
  return {
    ...d,
    people,
    groups: [{ id: "demo-g0", name: "Goa Trip", emoji: "🏖️", members: [ME, rahul, amit], createdAt: addDays(t, -25) }],
    entries,
    bills: [
      { id: "demo-b0", name: "Ghar ka kiraya", emoji: "🏠", amount: 12000, dueDay: 5, category: "Ghar", paid: { [prev]: "x" } },
      { id: "demo-b1", name: "Bijli bill", emoji: "💡", amount: 1400, dueDay: 18, category: "Bills", paid: {} },
      { id: "demo-b2", name: "Jio recharge", emoji: "📱", amount: 349, dueDay: 25, category: "Bills", paid: {} },
      { id: "demo-b3", name: "WiFi", emoji: "📶", amount: 599, dueDay: 10, category: "Bills", paid: {} },
    ],
    daily: [
      { id: "demo-d0", name: "Doodh", emoji: "🥛", unit: "litre", rate: 64, defaultQty: 1, auto: true, startDate: `${prev}-01`, log: { [addDays(t, -3)]: 0, [addDays(t, -9)]: 2 }, paid: {} },
      { id: "demo-d1", name: "Kaamwali", emoji: "🧹", unit: "din", rate: 100, defaultQty: 1, auto: true, startDate: `${prev}-01`, log: { [addDays(t, -6)]: 0, [addDays(t, -13)]: 0 }, paid: {} },
    ],
    shopping: [
      { id: "demo-s0", name: "Aloo", qty: "2 kg", price: 60, done: false, createdAt: t },
      { id: "demo-s1", name: "Pyaaz", qty: "1 kg", price: 40, done: true, createdAt: t },
      { id: "demo-s2", name: "Detergent", qty: "1", price: 220, done: false, createdAt: t },
      { id: "demo-s3", name: "Bread", qty: "1", price: 45, done: false, createdAt: t },
    ],
    settings: { ...d.settings, name: settingsName, monthlyBudget: 20000, categoryBudgets: { "Khana-Peena": 4000, Shopping: 3000 }, monthlyIncome: 50000 },
  };
}
