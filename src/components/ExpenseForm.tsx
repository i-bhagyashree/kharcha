import { useMemo, useState } from "react";
import { CATEGORIES, guessCategory } from "../lib/categories";
import { computeShares } from "../lib/split";
import { deleteEntry, nameOf, saveEntry, useData } from "../lib/store";
import { ME, type BillItem, type Expense, type PayMode, type SplitType, type Who } from "../lib/types";
import { closeSheet, showToast } from "../lib/ui";
import { evalAmount, inr, round2, today, uid } from "../lib/utils";
import { Icon } from "./Icon";
import { PeoplePicker } from "./PeoplePicker";
import { AmountInput, Avatar, Button, cx, Field, inputClass, Segmented, Select, Sheet, TextInput, Toggle } from "./ui";

export const MODES: { value: PayMode; label: string }[] = [
  { value: "cash", label: "💵 Cash" },
  { value: "upi", label: "📱 UPI" },
  { value: "card", label: "💳 Card" },
  { value: "other", label: "Aur" },
];

const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: "equal", label: "Barabar" },
  { value: "exact", label: "₹ Exact" },
  { value: "percent", label: "%" },
  { value: "shares", label: "Hisse" },
  { value: "items", label: "Item-wise" },
];

export function ExpenseForm({ expense, preset }: { expense?: Expense; preset?: Partial<Expense> }) {
  const data = useData();
  const init = { ...preset, ...expense };
  const [amountText, setAmountText] = useState(init.amount ? String(init.amount) : "");
  const [title, setTitle] = useState(init.title ?? "");
  const [cat, setCat] = useState(init.category ?? "");
  const [catTouched, setCatTouched] = useState(Boolean(init.category));
  const [date, setDate] = useState(init.date ?? today());
  const [mode, setMode] = useState<PayMode>(init.mode ?? "upi");
  const [paidBy, setPaidBy] = useState<Who>(init.paidBy ?? ME);
  const [groupId, setGroupId] = useState(init.groupId ?? "");
  const [note, setNote] = useState(init.note ?? "");
  const initialPeople = init.shares?.map((s) => s.who) ?? [ME];
  const [splitOn, setSplitOn] = useState(Boolean(init.splitType && init.splitType !== "none") || initialPeople.length > 1 || (init.paidBy !== undefined && init.paidBy !== ME));
  const [splitType, setSplitType] = useState<SplitType>(init.splitType && init.splitType !== "none" ? init.splitType : "equal");
  const [people, setPeople] = useState<Who[]>(initialPeople.includes(ME) || !expense ? [...new Set([ME, ...initialPeople])] : initialPeople);
  const [values, setValues] = useState<Record<Who, number>>(() => Object.fromEntries((init.shares ?? []).filter((s) => s.value !== undefined).map((s) => [s.who, s.value!])));
  const [items, setItems] = useState<BillItem[]>(init.items ?? [{ id: uid(), name: "", price: 0, who: [ME] }]);
  const [extra, setExtra] = useState(init.extra ?? { tax: 0, tip: 0, discount: 0 });
  const [showMore, setShowMore] = useState(Boolean(init.note || init.groupId));

  const amount = evalAmount(amountText) ?? 0;
  const category = catTouched ? cat : guessCategory(title) !== "Other" ? guessCategory(title) : cat || "Other";
  const group = data.groups.find((g) => g.id === groupId);

  const result = useMemo(
    () => computeShares({ amount, splitOn, type: splitType, people, values, items, extra }),
    [amount, splitOn, splitType, people, values, items, extra],
  );
  const finalAmount = splitOn && splitType === "items" ? result.amount : amount;
  const myPart = result.shares.find((s) => s.who === ME)?.amount ?? 0;
  const { settings } = data;
  const hourly = settings.monthlyIncome > 0 ? settings.monthlyIncome / (settings.workHoursPerMonth || 208) : 0;

  const canSave = finalAmount > 0 && !result.error && result.shares.length > 0 && (paidBy === ME || result.shares.some((s) => s.who !== paidBy));

  function save() {
    if (!canSave) return;
    const e: Expense = {
      kind: "expense",
      id: expense?.id ?? uid(),
      title: title.trim() || category,
      amount: round2(finalAmount),
      category,
      date,
      mode,
      note: note.trim() || undefined,
      groupId: groupId || undefined,
      paidBy,
      splitType: splitOn ? splitType : "none",
      shares: result.shares,
      items: splitOn && splitType === "items" ? items.filter((i) => i.price > 0) : undefined,
      extra: splitOn && splitType === "items" ? extra : undefined,
      createdAt: expense?.createdAt ?? new Date().toISOString(),
    };
    saveEntry(e);
    closeSheet();
    showToast(expense ? "Badlav save ho gaya ✓" : `${inr(e.amount)} ka kharcha jud gaya ✓`);
  }

  function remove() {
    if (!expense) return;
    deleteEntry(expense.id);
    closeSheet();
    showToast("Kharcha hata diya", () => saveEntry(expense));
  }

  const setItem = (id: string, patch: Partial<BillItem>) => setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <Sheet
      title={expense ? "Kharcha badlo" : "Naya kharcha"}
      onClose={closeSheet}
      footer={
        <div className="flex items-center gap-2">
          {expense && <Button variant="danger" icon="trash" onClick={remove} className="w-12 px-0" />}
          <Button onClick={save} disabled={!canSave} className="flex-1" size="lg">
            {expense ? "Save karo" : `Jodo${finalAmount > 0 ? ` · ${inr(finalAmount)}` : ""}`}
          </Button>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {!(splitOn && splitType === "items") && (
          <div>
            <AmountInput big text={amountText} onText={(t) => setAmountText(t)} autoFocus={!expense} />
            {hourly > 0 && settings.showWorkHours && amount > 0 && (
              <p className="-mt-1 px-1 text-xs text-amber-700 dark:text-amber-400">⏱️ Yeh aapki lagbhag {formatHours(amount / hourly)} ki kamaai hai</p>
            )}
          </div>
        )}

        <Field label="Kya liya?">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chai, sabzi, petrol, movie..." />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Category</p>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  setCat(c.name);
                  setCatTouched(true);
                }}
                className={cx(
                  "flex shrink-0 flex-col items-center gap-1 rounded-2xl border px-2.5 py-2 text-xs font-medium transition",
                  category === c.name ? "border-transparent text-white shadow" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
                )}
                style={category === c.name ? { background: c.color } : undefined}
                aria-pressed={category === c.name}
              >
                <span className="text-xl">{c.emoji}</span>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Kab?">
            <input type="date" value={date} max="2100-12-31" onChange={(e) => setDate(e.target.value || today())} className={inputClass} />
          </Field>
          <Field label="Kisne pay kiya?">
            <Select
              value={paidBy}
              onChange={(v) => {
                setPaidBy(v);
                if (v !== ME && !people.includes(v)) setPeople([...people, v]);
              }}
              ariaLabel="Kisne pay kiya"
            >
              <option value={ME}>Maine (Aap)</option>
              {data.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Segmented value={mode} onChange={setMode} options={MODES} />

        {/* ---------------- split */}
        <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
          <Toggle checked={splitOn} onChange={setSplitOn} label={<span className="font-semibold">👥 Doston ke saath baantna hai?</span>} />
          {splitOn && (
            <div className="mt-3 space-y-3">
              {data.groups.length > 0 && (
                <Select
                  value={groupId}
                  ariaLabel="Group"
                  onChange={(v) => {
                    setGroupId(v);
                    const g = data.groups.find((x) => x.id === v);
                    if (g) setPeople(g.members);
                  }}
                >
                  <option value="">Koi group nahi</option>
                  {data.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.emoji} {g.name}
                    </option>
                  ))}
                </Select>
              )}
              <Segmented value={splitType} onChange={setSplitType} options={SPLIT_TYPES} className="text-xs" />

              {splitType !== "items" && (
                <>
                  <PeoplePicker selected={people} onChange={setPeople} only={group?.members.filter((m) => m !== ME)} />
                  {people.length > 0 && (
                    <ul className="divide-y divide-slate-100 rounded-xl bg-slate-50 px-3 dark:divide-slate-800 dark:bg-slate-800/50">
                      {people.map((who) => {
                        const share = result.shares.find((s) => s.who === who)?.amount ?? 0;
                        return (
                          <li key={who} className="flex items-center gap-2 py-2">
                            <Avatar who={who} size={28} />
                            <span className="min-w-0 flex-1 truncate text-sm">{nameOf(who, data)}</span>
                            {splitType !== "equal" && (
                              <input
                                type="number"
                                inputMode="decimal"
                                aria-label={`${nameOf(who, data)} ka hissa`}
                                value={values[who] ?? (splitType === "shares" ? 1 : "")}
                                onChange={(e) => setValues({ ...values, [who]: Number(e.target.value) })}
                                placeholder={splitType === "percent" ? "%" : splitType === "shares" ? "1" : "₹"}
                                className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950"
                              />
                            )}
                            <span className="w-20 text-right text-sm font-semibold tabular">{inr(share)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {splitType === "equal" && people.length > 1 && amount > 0 && (
                    <p className="text-center text-sm text-slate-500">Har ek ka {inr(amount / people.length)}</p>
                  )}
                </>
              )}

              {splitType === "items" && (
                <ItemsEditor items={items} setItem={setItem} setItems={setItems} extra={extra} setExtra={setExtra} people={people} setPeople={setPeople} groupMembers={group?.members} />
              )}

              {result.error ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">⚠️ {result.error}</p>
              ) : (
                finalAmount > 0 && (
                  <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:bg-brand-950/40 dark:text-brand-200">
                    {paidBy === ME
                      ? `Aapka hissa ${inr(myPart)} · doston se ${inr(finalAmount - myPart)} lena hai`
                      : `${nameOf(paidBy, data)} ne pay kiya · aapko ${inr(myPart)} dena hai`}
                  </p>
                )
              )}
            </div>
          )}
          {!splitOn && paidBy !== ME && amount > 0 && (
            <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
              {nameOf(paidBy, data)} ne aapke liye pay kiya, toh aapko {inr(amount)} dena hai.
            </p>
          )}
        </div>

        {showMore ? (
          <Field label="Note (optional)">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kuch yaad rakhna ho toh..." />
          </Field>
        ) : (
          <button type="button" onClick={() => setShowMore(true)} className="text-sm font-medium text-brand-600 dark:text-brand-400">
            + Note jodo
          </button>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}

function ItemsEditor({
  items,
  setItem,
  setItems,
  extra,
  setExtra,
  people,
  setPeople,
  groupMembers,
}: {
  items: BillItem[];
  setItem: (id: string, patch: Partial<BillItem>) => void;
  setItems: (i: BillItem[]) => void;
  extra: { tax: number; tip: number; discount: number };
  setExtra: (e: { tax: number; tip: number; discount: number }) => void;
  people: Who[];
  setPeople: (p: Who[]) => void;
  groupMembers?: Who[];
}) {
  const data = useData();
  const subtotal = items.reduce((s, i) => s + (i.price || 0), 0);
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-500">Kaun kaun tha?</p>
        <PeoplePicker selected={people} onChange={setPeople} only={groupMembers?.filter((m) => m !== ME)} />
      </div>
      {items.map((item, idx) => (
        <div key={item.id} className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
          <div className="flex gap-2">
            <input
              value={item.name}
              onChange={(e) => setItem(item.id, { name: e.target.value })}
              placeholder={`Item ${idx + 1} (Paneer tikka)`}
              aria-label="Item ka naam"
              className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950"
            />
            <input
              inputMode="decimal"
              value={item.price || ""}
              onChange={(e) => setItem(item.id, { price: evalAmount(e.target.value) ?? 0 })}
              placeholder="₹"
              aria-label="Item ka daam"
              className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950"
            />
            <button type="button" onClick={() => setItems(items.filter((i) => i.id !== item.id))} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:text-rose-500" aria-label="Item hatao">
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {people.map((w) => {
              const on = item.who.includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setItem(item.id, { who: on ? item.who.filter((x) => x !== w) : [...item.who, w] })}
                  className={cx("rounded-full px-2.5 py-0.5 text-xs font-medium", on ? "bg-brand-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700")}
                >
                  {nameOf(w, data)}
                </button>
              );
            })}
            {people.length > 1 && (
              <button type="button" onClick={() => setItem(item.id, { who: [...people] })} className="px-1.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                Sab
              </button>
            )}
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" icon="plus" onClick={() => setItems([...items, { id: uid(), name: "", price: 0, who: [...people] }])}>
        Item jodo
      </Button>
      <div className="grid grid-cols-3 gap-2">
        {(["tax", "tip", "discount"] as const).map((k) => (
          <label key={k} className="text-xs text-slate-500">
            {k === "tax" ? "Tax / GST ₹" : k === "tip" ? "Tip ₹" : "Discount ₹"}
            <input
              inputMode="decimal"
              value={extra[k] || ""}
              onChange={(e) => setExtra({ ...extra, [k]: evalAmount(e.target.value) ?? 0 })}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
        ))}
      </div>
      <div className="flex gap-2 text-xs">
        {[5, 18].map((r) => (
          <button key={r} type="button" onClick={() => setExtra({ ...extra, tax: round2((subtotal * r) / 100) })} className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
            +{r}% GST
          </button>
        ))}
        {[5, 10].map((r) => (
          <button key={r} type="button" onClick={() => setExtra({ ...extra, tip: round2((subtotal * r) / 100) })} className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
            {r}% tip
          </button>
        ))}
      </div>
      <p className="text-right text-sm font-semibold">
        Total: {inr(subtotal + extra.tax + extra.tip - extra.discount)}
      </p>
    </div>
  );
}

export function formatHours(h: number): string {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} minute`;
  if (h < 8) return `${+h.toFixed(1)} ghante`;
  return `${+(h / 8).toFixed(1)} din (8 ghante wale)`;
}
