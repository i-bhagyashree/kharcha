import { useState } from "react";
import { addPerson, update } from "../lib/store";
import { ME, type Group, type Person, type Who } from "../lib/types";
import { closeSheet, navigate, showToast } from "../lib/ui";
import { today, uid } from "../lib/utils";
import { PeoplePicker } from "./PeoplePicker";
import { Button, cx, Field, Sheet, TextInput } from "./ui";

export function PersonForm({ person }: { person?: Person }) {
  const [name, setName] = useState(person?.name ?? "");
  const [phone, setPhone] = useState(person?.phone ?? "");

  function save() {
    if (!name.trim()) return;
    if (person) {
      update((d) => ({ ...d, people: d.people.map((p) => (p.id === person.id ? { ...p, name: name.trim(), phone: phone.trim() || undefined } : p)) }));
      showToast("Save ho gaya ✓");
      closeSheet();
    } else {
      const p = addPerson(name, phone);
      closeSheet();
      navigate(`/person/${p.id}`);
    }
  }

  return (
    <Sheet title={person ? "Naam / number badlo" : "Naya insaan jodo"} onClose={closeSheet} footer={<Button onClick={save} disabled={!name.trim()} className="w-full" size="lg">Save karo</Button>}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Naam">
          <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul, Doodhwala bhaiya, Sharma ji..." />
        </Field>
        <Field label="WhatsApp number (optional)" hint="Reminder seedha WhatsApp pe bhejne ke liye">
          <TextInput inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98xxxxxxxx" />
        </Field>
      </form>
    </Sheet>
  );
}

const GROUP_EMOJIS = ["🏖️", "🏠", "🎉", "🍕", "✈️", "🏔️", "🎓", "💼", "👨‍👩‍👧", "🚗", "💍", "⚽"];

export function GroupForm({ group }: { group?: Group }) {
  const [name, setName] = useState(group?.name ?? "");
  const [emoji, setEmoji] = useState(group?.emoji ?? "🏖️");
  const [members, setMembers] = useState<Who[]>(group?.members ?? [ME]);

  function save() {
    if (!name.trim()) return;
    const m = [...new Set([ME, ...members])];
    if (group) {
      update((d) => ({ ...d, groups: d.groups.map((g) => (g.id === group.id ? { ...g, name: name.trim(), emoji, members: m } : g)) }));
      closeSheet();
      showToast("Group save ho gaya ✓");
    } else {
      const g: Group = { id: uid(), name: name.trim(), emoji, members: m, createdAt: today() };
      update((d) => ({ ...d, groups: [...d.groups, g] }));
      closeSheet();
      navigate(`/group/${g.id}`);
    }
  }

  return (
    <Sheet title={group ? "Group badlo" : "Naya group / trip"} onClose={closeSheet} footer={<Button onClick={save} disabled={!name.trim() || members.length < 2} className="w-full" size="lg">Save karo</Button>}>
      <div className="space-y-4">
        <Field label="Group ka naam">
          <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Goa Trip, Flat 302, Office lunch..." />
        </Field>
        <div className="flex flex-wrap gap-2">
          {GROUP_EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => setEmoji(e)} className={cx("grid h-11 w-11 place-items-center rounded-xl text-2xl", emoji === e ? "bg-brand-100 ring-2 ring-brand-500 dark:bg-brand-950" : "bg-slate-100 dark:bg-slate-800")} aria-pressed={emoji === e}>
              {e}
            </button>
          ))}
        </div>
        <Field group label="Kaun kaun hai?">
          <PeoplePicker selected={members} onChange={(v) => setMembers([...new Set([ME, ...v])])} />
        </Field>
      </div>
    </Sheet>
  );
}
