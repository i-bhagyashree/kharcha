import { useState } from "react";
import { balancesWithMe } from "../lib/balances";
import { category } from "../lib/categories";
import { parseQuick, QUICK_EXAMPLES, type QuickResult } from "../lib/quickAdd";
import { addPerson, getData, saveEntry, useData } from "../lib/store";
import { ME, type Expense, type Transfer, type Who } from "../lib/types";
import { closeSheet, openSheet, showToast } from "../lib/ui";
import { relativeDay, inr, splitEqually, uid } from "../lib/utils";
import { useVoice, voiceSupported } from "../lib/voice";
import { Icon } from "./Icon";
import { Button, CategoryIcon, cx, Sheet } from "./ui";

/** Finds a person by name (case-insensitive, also first-name match) or creates them. */
function resolve(name: string, create: boolean): Who | null {
  if (name === ME) return ME;
  const people = getData().people;
  const lower = name.toLowerCase();
  const exact = people.find((p) => p.name.toLowerCase() === lower);
  if (exact) return exact.id;
  const first = people.filter((p) => p.name.toLowerCase().split(" ")[0] === lower);
  if (first.length === 1) return first[0].id;
  return create ? addPerson(name).id : null;
}
const displayName = (name: string) => {
  if (name === ME) return "Aap";
  const id = resolve(name, false);
  return id ? getData().people.find((p) => p.id === id)!.name : name;
};

/** Turns a parsed sentence into a real entry (creating people as needed). */
export function buildEntry(q: QuickResult): Expense | Transfer {
  const now = new Date().toISOString();
  if (q.kind === "transfer") {
    const from = resolve(q.from, true)!;
    const to = resolve(q.to, true)!;
    let purpose: Transfer["purpose"] = q.purpose === "auto" ? "udhaar" : q.purpose;
    if (q.purpose === "auto") {
      const other = from === ME ? to : from;
      const bal = balancesWithMe(getData().entries).get(other) ?? 0;
      // They gave me money while owing me -> it is a payback. Same the other way.
      if ((to === ME && bal > 0) || (from === ME && bal < 0)) purpose = "settle";
    }
    return { kind: "transfer", id: uid(), from, to, amount: q.amount, date: q.date, purpose, mode: q.mode, note: q.note || undefined, createdAt: now };
  }
  const paidBy = resolve(q.paidBy, true)!;
  const others = q.splitWith.map((n) => resolve(n, true)!).filter((w) => w !== ME && w !== paidBy);
  const people: Who[] = [...new Set([ME, ...(paidBy !== ME ? [paidBy] : []), ...others])];
  const split = people.length > 1;
  const parts = splitEqually(q.amount, people.length);
  return {
    kind: "expense",
    id: uid(),
    title: q.title,
    amount: q.amount,
    category: q.category,
    date: q.date,
    mode: q.mode,
    paidBy,
    splitType: split ? "equal" : "none",
    shares: people.map((who, i) => ({ who, amount: parts[i] })),
    createdAt: now,
  };
}

export function QuickAddSheet({ text: initial = "" }: { text?: string }) {
  useData(); // re-render when people change
  const [text, setText] = useState(initial);
  const parsed = parseQuick(text);
  const voice = useVoice((t) => setText(t));

  function save() {
    if (!parsed) return;
    const entry = buildEntry(parsed);
    saveEntry(entry);
    setText("");
    showToast(`${inr(entry.amount)} likh liya ✓ — aur likho ya band karo`);
  }
  function edit() {
    if (!parsed) return;
    const entry = buildEntry(parsed);
    if (entry.kind === "expense") openSheet({ type: "expense", preset: { ...entry, id: undefined } as Partial<Expense> });
    else openSheet({ type: "transfer", preset: { ...entry, id: undefined } as Partial<Transfer> });
  }

  return (
    <Sheet title="✨ Bolo ya likho" onClose={closeSheet}>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Jaise aap dost ko batate ho, waise hi likho. Kharcha app khud samajh lega.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex items-center gap-2"
      >
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="chai 20 · Rahul ko 500 diye"
          aria-label="Kharcha likho"
          className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-brand-200 bg-white px-4 text-lg outline-none focus:border-brand-500 dark:border-brand-900 dark:bg-slate-950"
        />
        {voiceSupported() && (
          <button
            type="button"
            onClick={voice.listening ? voice.stop : voice.start}
            className={cx("grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white", voice.listening ? "animate-listening bg-rose-500" : "bg-brand-600")}
            aria-label={voice.listening ? "Sunna band karo" : "Bol kar likho"}
          >
            <Icon name="mic" className="h-6 w-6" />
          </button>
        )}
      </form>
      {voice.listening && <p className="mt-2 text-sm font-medium text-rose-600">🎙️ Sun raha hoon... boliye</p>}
      {voice.error && <p className="mt-2 text-sm text-amber-700">{voice.error}</p>}

      {parsed ? (
        <Preview q={parsed} onSave={save} onEdit={edit} />
      ) : text.trim() ? (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Amount nahi mila. Rupaye bhi likho, jaise "chai 20".</p>
      ) : (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Aise likh sakte ho</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => setText(ex)} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300">
                {ex}
              </button>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button variant="secondary" icon="list" onClick={() => openSheet({ type: "expense" })}>
              Poora form
            </Button>
            <Button variant="secondary" icon="swap" onClick={() => openSheet({ type: "transfer" })}>
              Udhaar / Lena-dena
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Preview({ q, onSave, onEdit }: { q: QuickResult; onSave: () => void; onEdit: () => void }) {
  let line: string;
  let sub: string;
  let emoji: React.ReactNode;
  if (q.kind === "transfer") {
    const from = displayName(q.from);
    const to = displayName(q.to);
    emoji = <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-2xl dark:bg-emerald-950">{q.from === ME ? "↗️" : "↙️"}</span>;
    if (q.from === ME) line = q.purpose === "settle" ? `${to} ka udhaar chukaya` : `${to} ko udhaar diya`;
    else line = q.purpose === "settle" ? `${from} ne paisa wapas kiya` : q.purpose === "auto" ? `${from} ne paise diye` : `${from} se udhaar liya`;
    sub = q.from === ME ? (q.purpose === "settle" ? "Aapka dena kam hoga" : `${to} aapko dega`) : q.purpose === "udhaar" ? `Aapko ${from} ko dena hai` : "Lena kam hoga / hisaab hoga";
  } else {
    const people = [...new Set([...(q.paidBy !== ME ? [q.paidBy] : []), ...q.splitWith])].map(displayName);
    emoji = <CategoryIcon name={q.category} size={48} />;
    line = q.title;
    const n = people.length + 1;
    sub =
      people.length === 0
        ? `${category(q.category).name}`
        : `${q.paidBy !== ME ? `${displayName(q.paidBy)} ne pay kiya · ` : ""}${n} logon me baraabar: ${people.join(", ")} + aap · har ek ${inr(q.amount / n)}`;
  }
  return (
    <div className="animate-fade mt-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-900 dark:bg-brand-950/30">
      <div className="flex items-center gap-3">
        {emoji}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{line}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{sub}</p>
          <p className="text-xs text-slate-500">
            {relativeDay(q.date)} · {q.mode.toUpperCase()}
          </p>
        </div>
        <p className="text-xl font-bold tabular">{inr(q.amount)}</p>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" icon="edit" onClick={onEdit} className="flex-1">
          Badlo
        </Button>
        <Button icon="check" onClick={onSave} className="flex-[2]">
          Sahi hai, save karo
        </Button>
      </div>
    </div>
  );
}
