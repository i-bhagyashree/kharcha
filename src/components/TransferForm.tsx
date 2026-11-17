import { useState } from "react";
import { balancesWithMe } from "../lib/balances";
import { deleteEntry, nameOf, saveEntry, useData } from "../lib/store";
import { ME, type PayMode, type Transfer, type Who } from "../lib/types";
import { closeSheet, showToast } from "../lib/ui";
import { addDays, evalAmount, inr, round2, today, uid } from "../lib/utils";
import { MODES } from "./ExpenseForm";
import { PersonSelect } from "./PeoplePicker";
import { AmountInput, Button, Field, inputClass, NumberInput, Segmented, Sheet, TextInput } from "./ui";

type Direction = "gave" | "got";

export function TransferForm({ transfer, preset }: { transfer?: Transfer; preset?: Partial<Transfer> }) {
  const data = useData();
  const init = { ...preset, ...transfer };
  const [direction, setDirection] = useState<Direction>(init.to === ME ? "got" : "gave");
  const [person, setPerson] = useState<Who | "">((init.to === ME ? init.from : init.to) ?? "");
  const [purpose, setPurpose] = useState<Transfer["purpose"]>(init.purpose ?? "udhaar");
  const [amountText, setAmountText] = useState(init.amount ? String(init.amount) : "");
  const [date, setDate] = useState(init.date ?? today());
  const [mode, setMode] = useState<PayMode>(init.mode ?? "upi");
  const [note, setNote] = useState(init.note ?? "");
  const [dueDate, setDueDate] = useState(init.dueDate ?? "");
  const [rate, setRate] = useState<number | "">(init.interestRate ?? "");

  const amount = evalAmount(amountText) ?? 0;
  const balance = person ? balancesWithMe(data.entries).get(person) ?? 0 : 0;
  const name = person ? nameOf(person, data) : "";

  const explain = !person
    ? ""
    : direction === "gave"
      ? purpose === "udhaar"
        ? `Aapne ${name} ko udhaar diya → ${name} aapko dega`
        : `Aapne ${name} ka udhaar chukaya`
      : purpose === "udhaar"
        ? `${name} se udhaar liya → aapko ${name} ko dena hai`
        : `${name} ne aapka paisa wapas kiya`;

  const after = round2(balance + (direction === "gave" ? amount : -amount));

  function save() {
    if (!person || amount <= 0) return;
    const t: Transfer = {
      kind: "transfer",
      id: transfer?.id ?? uid(),
      from: direction === "gave" ? ME : person,
      to: direction === "gave" ? person : ME,
      amount: round2(amount),
      date,
      purpose,
      mode,
      note: note.trim() || undefined,
      dueDate: purpose === "udhaar" && dueDate ? dueDate : undefined,
      interestRate: purpose === "udhaar" && rate ? Number(rate) : undefined,
      groupId: init.groupId,
      createdAt: transfer?.createdAt ?? new Date().toISOString(),
    };
    saveEntry(t);
    closeSheet();
    showToast(`${inr(t.amount)} ${purpose === "settle" ? "ka hisaab" : "udhaar"} likh liya ✓`);
  }

  function remove() {
    if (!transfer) return;
    deleteEntry(transfer.id);
    closeSheet();
    showToast("Entry hata di", () => saveEntry(transfer));
  }

  return (
    <Sheet
      title={transfer ? "Lena-dena badlo" : "Lena-dena likho"}
      onClose={closeSheet}
      footer={
        <div className="flex gap-2">
          {transfer && <Button variant="danger" icon="trash" onClick={remove} className="w-12 px-0" />}
          <Button onClick={save} disabled={!person || amount <= 0} className="flex-1" size="lg" variant={direction === "gave" ? "primary" : "success"}>
            Save karo{amount > 0 ? ` · ${inr(amount)}` : ""}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Segmented
          value={direction}
          onChange={setDirection}
          options={[
            { value: "gave", label: "↗ Maine diye" },
            { value: "got", label: "↙ Mujhe mile" },
          ]}
        />
        <Segmented
          value={purpose}
          onChange={setPurpose}
          options={[
            { value: "udhaar", label: "🤝 Udhaar" },
            { value: "settle", label: "✅ Wapas / Chukta" },
          ]}
        />
        <Field group label={direction === "gave" ? "Kisko diye?" : "Kisse mile?"}>
          <PersonSelect value={person} onChange={setPerson} />
        </Field>
        {person && Math.abs(balance) > 0.009 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">
              Abhi: {balance > 0 ? `${name} aapko ${inr(balance)} dega` : `aapko ${name} ko ${inr(-balance)} dena hai`}
            </span>
            <button
              type="button"
              className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
              onClick={() => {
                setAmountText(String(Math.abs(balance)));
                setPurpose("settle");
                setDirection(balance > 0 ? "got" : "gave");
              }}
            >
              Poora chukta karo ({inr(Math.abs(balance))})
            </button>
          </div>
        )}
        <AmountInput big text={amountText} onText={(t) => setAmountText(t)} autoFocus={!transfer && Boolean(preset?.to || preset?.from)} />
        {explain && amount > 0 && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
            {explain}.{" "}
            <b>
              {Math.abs(after) < 0.01 ? "Hisaab barabar ho jayega 🎉" : after > 0 ? `Phir ${name} aapko ${inr(after)} dega.` : `Phir aapko ${name} ko ${inr(-after)} dena hoga.`}
            </b>
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kab?">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value || today())} className={inputClass} />
          </Field>
          {purpose === "udhaar" && (
            <Field label="Kab tak lautana hai?">
              <input type="date" value={dueDate} min={date} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </Field>
          )}
        </div>
        {purpose === "udhaar" && !dueDate && (
          <div className="-mt-2 flex gap-2 text-xs">
            {[7, 15, 30].map((d) => (
              <button key={d} type="button" onClick={() => setDueDate(addDays(date, d))} className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                {d} din me
              </button>
            ))}
          </div>
        )}
        <Segmented value={mode} onChange={setMode} options={MODES} />
        {purpose === "udhaar" && (
          <Field label="Byaaj (optional) — ₹ per ₹100 har mahine" hint={rate && amount ? `Har mahine ${inr((amount * Number(rate)) / 100)} byaaj · saal ka ${Number(rate) * 12}%` : "Jaise \"2 rupaye sankda\" = 2"}>
            <NumberInput value={rate} onChange={setRate} placeholder="0" suffix="₹/100" />
          </Field>
        )}
        <Field label="Note (optional)">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kis cheez ke liye?" />
        </Field>
      </div>
    </Sheet>
  );
}
