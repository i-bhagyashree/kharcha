// Ready-to-send reminder messages ("yaad dilao") in three tones and three languages,
// with the hisaab breakdown and a UPI pay link so the friend can pay in one tap.

import { effectWith } from "./balances";
import type { Entry, Who } from "./types";
import { dateLabel, inr } from "./utils";

export type Tone = "pyaar" | "seedha" | "sakht";
export type Lang = "hinglish" | "hindi" | "english";

export function upiLink(upiId: string, payeeName: string, amount: number, note = "Kharcha hisaab"): string {
  const p = new URLSearchParams({ pa: upiId.trim(), pn: payeeName || "Friend", am: amount.toFixed(2), cu: "INR", tn: note });
  return `upi://pay?${p.toString().replace(/\+/g, "%20")}`;
}

export function breakdown(entries: Entry[], person: Who, limit = 6): { date: string; text: string; effect: number }[] {
  return entries
    .map((e) => ({ e, effect: effectWith(e, person) }))
    .filter((x) => Math.abs(x.effect) > 0.009)
    .sort((a, b) => b.e.date.localeCompare(a.e.date))
    .slice(0, limit)
    .map(({ e, effect }) => ({
      date: e.date,
      effect,
      text: e.kind === "expense" ? e.title : e.purpose === "settle" ? "Wapas / chukta" : e.note || "Udhaar",
    }));
}

const T = {
  hinglish: {
    pyaar: (n: string, a: string) => `Hi ${n} 😊\nBas ek chhota sa reminder — hamara ${a} ka hisaab baaki hai. Jab time mile tab bhej dena, koi jaldi nahi 🙏`,
    seedha: (n: string, a: string) => `Hi ${n},\nHisaab ke hisaab se ${a} baaki hain. Please bhej dena.`,
    sakht: (n: string, a: string) => `${n}, ${a} kaafi time se pending hain. Aaj ya kal tak bhej do please, warna next party tumhari 😄`,
    list: "Hisaab:",
    pay: "Ek tap me pay karo:",
    owe: (n: string, a: string) => `Hi ${n}, maine hisaab dekha — mujhe tumhe ${a} dene hain. Jaldi bhejta/bhejti hoon 👍`,
  },
  hindi: {
    pyaar: (n: string, a: string) => `नमस्ते ${n} 😊\nबस एक छोटी सी याद — हमारा ${a} का हिसाब बाकी है। जब समय मिले तब भेज देना, कोई जल्दी नहीं 🙏`,
    seedha: (n: string, a: string) => `नमस्ते ${n},\nहिसाब के अनुसार ${a} बाकी हैं। कृपया भेज दीजिए।`,
    sakht: (n: string, a: string) => `${n}, ${a} काफ़ी समय से बाकी हैं। कृपया आज या कल तक भेज दें।`,
    list: "हिसाब:",
    pay: "एक टैप में भुगतान करें:",
    owe: (n: string, a: string) => `नमस्ते ${n}, मैंने हिसाब देखा — मुझे आपको ${a} देने हैं। जल्दी भेजता/भेजती हूँ 👍`,
  },
  english: {
    pyaar: (n: string, a: string) => `Hey ${n} 😊\nJust a gentle reminder — ${a} is pending from our hisaab. Send it whenever you can, no rush 🙏`,
    seedha: (n: string, a: string) => `Hi ${n},\nAs per our hisaab, ${a} is pending. Please send it across.`,
    sakht: (n: string, a: string) => `Hi ${n}, ${a} has been pending for a while now. Please clear it by tomorrow.`,
    list: "Breakdown:",
    pay: "Pay in one tap:",
    owe: (n: string, a: string) => `Hi ${n}, I checked our hisaab — I owe you ${a}. Will send it soon 👍`,
  },
};

export function reminderText(opts: {
  name: string;
  balance: number; // positive: they owe me
  tone: Tone;
  lang: Lang;
  items: { date: string; text: string; effect: number }[];
  myName: string;
  upiId: string;
  withList: boolean;
}): string {
  const t = T[opts.lang];
  const first = opts.name.split(" ")[0];
  const amount = inr(Math.abs(opts.balance));
  if (opts.balance < 0) return t.owe(first, amount) + "\n\n— via Kharcha app";
  const lines = [t[opts.tone](first, amount)];
  if (opts.withList && opts.items.length) {
    lines.push("", t.list);
    for (const i of opts.items) lines.push(`• ${dateLabel(i.date)} — ${i.text}: ${i.effect > 0 ? "+" : "−"}${inr(Math.abs(i.effect))}`);
  }
  if (opts.upiId.trim()) {
    lines.push("", `${t.pay} ${upiLink(opts.upiId, opts.myName, opts.balance)}`, `UPI ID: ${opts.upiId.trim()}`);
  }
  lines.push("", "— via Kharcha app");
  return lines.join("\n");
}

export function whatsappUrl(text: string, phone?: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  const num = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
