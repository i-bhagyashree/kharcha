// "Bolo ya likho": turns a Hinglish / English sentence into an entry.
//   "chai 20"                         -> expense ₹20, Khana-Peena
//   "petrol 500 upi kal"              -> expense, paid by UPI, yesterday
//   "Rahul ko 500 udhaar diye"        -> I lent Rahul ₹500
//   "Rahul se 300 liye"               -> I borrowed ₹300 from Rahul
//   "Rahul ne 500 wapas diye"         -> Rahul paid me back ₹500
//   "dinner 1200 Rahul Amit ke saath" -> ₹1200 split equally between me, Rahul, Amit
//   "Rahul ne movie 900 pay kiya split" -> Rahul paid, split between Rahul and me
// Everything runs on the device; nothing is sent anywhere.

import { guessCategory } from "./categories";
import { ME, type PayMode } from "./types";
import { addDays, evalAmount, today } from "./utils";

export type QuickResult =
  | {
      kind: "expense";
      title: string;
      amount: number;
      category: string;
      date: string;
      mode: PayMode;
      paidBy: string; // ME or a person's name
      splitWith: string[]; // names (other than me / payer)
    }
  | {
      kind: "transfer";
      from: string; // ME or a name
      to: string;
      amount: number;
      date: string;
      mode: PayMode;
      /** "auto" = "X ne 500 diye": a payback if X owed me, otherwise a new udhaar. */
      purpose: "udhaar" | "settle" | "auto";
      note: string;
    };

const MODES: [RegExp, PayMode][] = [
  [/\b(upi|gpay|google pay|phonepe|phone pe|paytm|bhim|online)\b/, "upi"],
  [/\b(cash|nakad|nagad|naqad)\b/, "cash"],
  [/\b(card|credit card|debit card)\b/, "card"],
];
const GIVE = /\b(diye|diya|di|de diye|de diya|bheje|bheja|bhej diye|transfer|kiye|kiya|lent|gave|paid|sent|lautaye|lautaya|chukaye|chukaya)\b/;
const TAKE = /\b(liye|liya|li|le liye|mile|mila|aaye|aaya|borrowed|got|received|took)\b/;
const BACK = /\b(wapas|vapas|wapis|lautaye|lautaya|lauta|chukaye|chukaya|return|returned|back|settle|settled|clear)\b/;
const FILLER = new Set(
  "ko se ne ka ke ki me mein main maine mene mujhe hamne humne i me my to from for ka ke liye pe par rupaye rupay rupees rs inr kharcha kharche kiya kiye diya diye pay paid udhaar udhar udhari loan wapas vapas the tha thi hai hain aur and with saath sath split share sab sabke between among ke saath".split(
    " ",
  ),
);

const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const cleanName = (s: string) =>
  cap(
    s
      .replace(/\b(maine|mene|mai|main|i|humne|hamne|mera|meri|mere|dost|bhai|didi)\b/gi, " ")
      .replace(/[^a-z\u0900-\u097f .'-]/giu, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

function splitNames(text: string): string[] {
  return text
    .split(/,|&|\+|\baur\b|\band\b|\bke\b|\bsaath\b|\bsath\b|\bwith\b|\bsplit\b|\bsabke\b|\bbetween\b|\bamong\b|\s+/i)
    .map((w) => cleanName(w))
    .filter((w) => w.length > 1 && !FILLER.has(w.toLowerCase()));
}

export function parseQuick(input: string): QuickResult | null {
  let text = ` ${input.trim()} `;
  let lower = text.toLowerCase();
  if (!lower.trim()) return null;

  let mode: PayMode = "cash";
  for (const [re, m] of MODES) {
    if (re.test(lower)) {
      mode = m;
      text = text.replace(new RegExp(re.source, "i"), " ");
      lower = text.toLowerCase();
      break;
    }
  }

  let date = today();
  const dateWord = /\b(aaj|today|kal|yesterday|parso|parson)\b/i.exec(text);
  if (dateWord) {
    const w = dateWord[1].toLowerCase();
    date = w === "kal" || w === "yesterday" ? addDays(today(), -1) : w.startsWith("pars") ? addDays(today(), -2) : today();
    text = text.replace(dateWord[0], " ");
  }

  // Amount: first number, which may be a little sum like "20*3" or "450+120".
  const amountMatch = /(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d+)?(?:\s*[+\-*x×/]\s*\d[\d,]*(?:\.\d+)?)*)\s*(?:k\b)?/i.exec(text);
  if (!amountMatch) return null;
  let amount = evalAmount(amountMatch[1]);
  if (amount === null || amount <= 0) return null;
  if (/k\s*$/i.test(amountMatch[0])) amount *= 1000; // "2k"
  text = text.replace(amountMatch[0], " ").replace(/\b(rupaye|rupay|rupees|rupee|rs|inr)\b/gi, " ");
  lower = text.toLowerCase().replace(/\s+/g, " ");
  const isBack = BACK.test(lower);

  // ---- money between people
  const ko = /^\s*(.+?)\s+ko\s+(.*)$/i.exec(text);
  if (ko && (GIVE.test(ko[2].toLowerCase()) || /\budh?aa?r/i.test(ko[2]) || !ko[2].trim())) {
    const name = cleanName(ko[1]);
    if (name) return { kind: "transfer", from: ME, to: name, amount, date, mode, purpose: isBack ? "settle" : "udhaar", note: "" };
  }
  const se = /^\s*(.+?)\s+se\s+(.*)$/i.exec(text);
  if (se && (TAKE.test(se[2].toLowerCase()) || /\budh?aa?r/i.test(se[2]))) {
    const name = cleanName(se[1]);
    if (name) return { kind: "transfer", from: name, to: ME, amount, date, mode, purpose: isBack ? "settle" : "udhaar", note: "" };
  }
  const en = /\b(?:lent|gave|paid|sent|returned)\s+(?:to\s+)?([a-z][a-z .]*?)\s*$/i.exec(text);
  if (en) {
    const name = cleanName(en[1].replace(/\b(back|it)\b/gi, ""));
    if (name) return { kind: "transfer", from: ME, to: name, amount, date, mode, purpose: isBack ? "settle" : "udhaar", note: "" };
  }
  const enFrom = /\b(?:borrowed|got|received|took)\s+(?:back\s+)?from\s+([a-z][a-z .]*?)\s*$/i.exec(text);
  if (enFrom) {
    const name = cleanName(enFrom[1]);
    if (name) return { kind: "transfer", from: name, to: ME, amount, date, mode, purpose: isBack ? "settle" : "udhaar", note: "" };
  }
  const enPaidMe = /^\s*([a-z][a-z .]*?)\s+(?:paid|gave|sent|returned)\s+(?:me|back)/i.exec(text);
  if (enPaidMe) {
    const name = cleanName(enPaidMe[1]);
    if (name) return { kind: "transfer", from: name, to: ME, amount, date, mode, purpose: isBack || /paid me back|returned/i.test(text) ? "settle" : "auto", note: "" };
  }

  // ---- "X ne ..." : X paid. Either X gave me money, or X paid for something.
  let paidBy: string = ME;
  const ne = /^\s*(.+?)\s+ne\s+(.*)$/i.exec(text);
  if (ne) {
    const name = cleanName(ne[1]);
    const rest = ne[2];
    const restWords = rest
      .toLowerCase()
      .replace(BACK, " ")
      .replace(GIVE, " ")
      .replace(/\b(mujhe|muje|humko|hame|hume|pay|kiya|kiye|karaya|karaye|bill)\b/g, " ")
      .trim();
    if (name && !restWords) {
      return { kind: "transfer", from: name, to: ME, amount, date, mode, purpose: isBack ? "settle" : "auto", note: "" };
    }
    if (name) {
      paidBy = name;
      text = rest.replace(/\b(pay kiya|pay kiye|diya|diye|karaya|karaye|bhara|bhare)\b/gi, " ");
    }
  }

  // ---- expense, maybe split
  let splitWith: string[] = [];
  const split = /\b(ke saath|ke sath|saath|sath|split|with|share|sabke|between|among)\b(.*)$/i.exec(text);
  let titlePart = text;
  if (split) {
    const before = text.slice(0, split.index);
    // "Rahul Amit ke saath dinner": the names are before "ke saath"
    const after = split[2];
    const namesAfter = splitNames(after);
    if (namesAfter.length) {
      splitWith = namesAfter;
      titlePart = before;
    } else {
      const words = before.trim().split(/\s+/);
      // names are the capitalised words right before "ke saath"
      const names: string[] = [];
      while (words.length > 1 && /^[A-Z\u0900-\u097f]/u.test(words[words.length - 1])) names.unshift(words.pop()!);
      splitWith = names.map(cleanName).filter(Boolean);
      titlePart = words.join(" ");
    }
  } else if (paidBy !== ME) {
    splitWith = []; // "Rahul ne dinner 900 pay kiya" -> Rahul paid, split Rahul + me
  }
  if (paidBy !== ME) splitWith = splitWith.filter((n) => n.toLowerCase() !== paidBy.toLowerCase());

  const title = cap(
    titlePart
      .replace(/\b(ka|ke|ki|liye|pe|par|me|mein|kharcha|kharche|kharch|paid|pay|kiya|kiye|bill|for|on)\b/gi, " ")
      .replace(/[^\p{L}\p{N} &'-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim(),
  ) || "Kharcha";

  return {
    kind: "expense",
    title,
    amount,
    category: guessCategory(`${title} ${input}`),
    date,
    mode,
    paidBy,
    splitWith,
  };
}

export const QUICK_EXAMPLES = [
  "chai samosa 40",
  "petrol 500 upi",
  "Rahul ko 2000 udhaar diye",
  "Amit se 500 liye",
  "Rahul ne 1000 wapas diye",
  "dinner 1800 Rahul Amit ke saath",
  "sabzi 120+80+45 kal",
];
