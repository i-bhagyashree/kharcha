// All data lives on this device (IndexedDB). "me" is always the person using the app.

export const ME = "me";
export type Who = string; // ME or a Person id

export interface Person {
  id: string;
  name: string;
  phone?: string;
  color: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  members: Who[]; // always includes ME
  createdAt: string;
}

export type PayMode = "cash" | "upi" | "card" | "other";
export type SplitType = "none" | "equal" | "exact" | "percent" | "shares" | "items";

export interface SplitShare {
  who: Who;
  amount: number; // final rupee share, always filled in
  value?: number; // what was typed: percent, number of shares, or exact amount
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  who: Who[]; // people sharing this item
}

export interface Expense {
  kind: "expense";
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  mode: PayMode;
  note?: string;
  groupId?: string;
  paidBy: Who;
  splitType: SplitType;
  shares: SplitShare[]; // sums to amount
  items?: BillItem[];
  extra?: { tax: number; tip: number; discount: number }; // item-wise bills
  createdAt: string;
}

/**
 * Money handed from one person to another: an udhaar (loan) or paying back
 * (settle). Either way, the receiver now owes the giver this much more.
 */
export interface Transfer {
  kind: "transfer";
  id: string;
  from: Who;
  to: Who;
  amount: number;
  date: string;
  purpose: "udhaar" | "settle";
  note?: string;
  dueDate?: string;
  /** Monthly interest in rupees per ₹100 ("₹2 sankda" = 2). */
  interestRate?: number;
  groupId?: string;
  mode: PayMode;
  createdAt: string;
}

export type Entry = Expense | Transfer;

/** A monthly bill: rent, bijli, recharge, EMI... */
export interface Bill {
  id: string;
  name: string;
  emoji: string;
  amount: number;
  dueDay: number; // 1..31
  category: string;
  paid: Record<string, string>; // "YYYY-MM" -> expense id
}

/** A daily delivery or service: doodh, kaamwali, akhbaar, paani... */
export interface DailyItem {
  id: string;
  name: string;
  emoji: string;
  unit: string; // litre, packet, din...
  rate: number; // per unit
  defaultQty: number;
  /** "YYYY-MM-DD" -> quantity taken (0 = not taken / chhutti). Days without an entry use defaultQty if `auto`. */
  log: Record<string, number>;
  auto: boolean; // assume default quantity every day unless marked
  startDate: string;
  paid: Record<string, string>; // "YYYY-MM" -> expense id
}

export interface ShopItem {
  id: string;
  name: string;
  qty: string;
  price: number; // estimated price
  done: boolean;
  createdAt: string;
}

export interface Settings {
  name: string;
  upiId: string;
  monthlyIncome: number;
  workHoursPerMonth: number;
  showWorkHours: boolean;
  theme: "light" | "dark" | "black" | "system";
  monthlyBudget: number;
  categoryBudgets: Record<string, number>;
}

export interface AppData {
  version: 1;
  people: Person[];
  groups: Group[];
  entries: Entry[];
  bills: Bill[];
  daily: DailyItem[];
  shopping: ShopItem[];
  settings: Settings;
}
