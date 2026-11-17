import { useState } from "react";
import { balancesWithMe } from "../lib/balances";
import { breakdown, reminderText, whatsappUrl, type Lang, type Tone } from "../lib/reminder";
import { nameOf, personOf, update, updateSettings, useData } from "../lib/store";
import { closeSheet, showToast } from "../lib/ui";
import { Icon } from "./Icon";
import { Field, Segmented, Sheet, TextInput, Toggle, useLocalState } from "./ui";

export function ReminderSheet({ personId }: { personId: string }) {
  const data = useData();
  const person = personOf(personId, data);
  const balance = balancesWithMe(data.entries).get(personId) ?? 0;
  const [tone, setTone] = useLocalState<Tone>("kh-tone", "pyaar");
  const [lang, setLang] = useLocalState<Lang>("kh-lang", "hinglish");
  const [withList, setWithList] = useState(true);
  const [phone, setPhone] = useState(person?.phone ?? "");
  const [upi, setUpi] = useState(data.settings.upiId);

  const text = reminderText({
    name: nameOf(personId, data),
    balance,
    tone,
    lang,
    items: breakdown(data.entries, personId),
    myName: data.settings.name,
    upiId: upi,
    withList,
  });

  function remember() {
    if (upi !== data.settings.upiId) updateSettings({ upiId: upi.trim() });
    if (phone !== (person?.phone ?? "")) update((d) => ({ ...d, people: d.people.map((p) => (p.id === personId ? { ...p, phone: phone.trim() || undefined } : p)) }));
  }

  async function copy() {
    remember();
    try {
      await navigator.clipboard.writeText(text);
      showToast("Message copy ho gaya ✓");
    } catch {
      showToast("Copy nahi hua — text select karke copy karo");
    }
  }
  async function share() {
    remember();
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* cancelled */
      }
    } else copy();
  }

  return (
    <Sheet title={`🔔 ${nameOf(personId, data)} ko yaad dilao`} onClose={closeSheet}>
      <div className="space-y-4">
        {balance >= 0 && (
          <Segmented
            value={tone}
            onChange={setTone}
            options={[
              { value: "pyaar", label: "🙏 Pyaar se" },
              { value: "seedha", label: "👍 Seedha" },
              { value: "sakht", label: "😤 Sakht" },
            ]}
          />
        )}
        <Segmented
          value={lang}
          onChange={setLang}
          options={[
            { value: "hinglish", label: "Hinglish" },
            { value: "hindi", label: "हिंदी" },
            { value: "english", label: "English" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unka WhatsApp no.">
            <TextInput inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98xxxxxxxx" />
          </Field>
          <Field label="Aapki UPI ID">
            <TextInput value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="naam@okaxis" />
          </Field>
        </div>
        <Toggle checked={withList} onChange={setWithList} label="Hisaab ki list bhi bhejo" />
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-2xl bg-[#e7fbe6] p-4 font-sans text-sm text-slate-800 dark:bg-emerald-950/40 dark:text-emerald-50">{text}</pre>
        <div className="grid grid-cols-3 gap-2">
          <a
            href={whatsappUrl(text, phone)}
            target="_blank"
            rel="noreferrer"
            onClick={remember}
            className="col-span-3 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25d366] font-semibold text-white shadow-sm hover:brightness-95"
          >
            <Icon name="whatsapp" /> WhatsApp pe bhejo
          </a>
          <button onClick={copy} className="col-span-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-semibold dark:bg-slate-800">
            <Icon name="copy" className="h-4 w-4" /> Copy
          </button>
          <button onClick={share} className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-semibold dark:bg-slate-800">
            <Icon name="share" className="h-4 w-4" /> Kahin aur share karo
          </button>
        </div>
      </div>
    </Sheet>
  );
}
