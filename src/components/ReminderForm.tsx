"use client";

import { createReminder } from "@/app/actions/reminders";
import ContactSelect, { type ContactOption } from "@/components/ContactSelect";
import { useState } from "react";

type Props = {
  contacts: ContactOption[];
  defaultValues?: {
    title?: string;
    contact_id?: string | null;
    due_at?: string; // ISO or "YYYY-MM-DDTHH:mm"
  };
};

export default function ReminderForm({ contacts, defaultValues }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    defaultValues?.contact_id ?? null
  );

  return (
    <form action={createReminder} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="title" className="label">Title*</label>
        <input
          id="title"
          name="title"
          required
          className="input"
          placeholder="Follow up with John"
          defaultValue={defaultValues?.title ?? ""}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="due_at" className="label">Due date & time*</label>
          <input
            id="due_at"
            name="due_at"
            type="datetime-local"
            required
            className="input"
            defaultValue={
              defaultValues?.due_at
                ? toLocalInput(defaultValues.due_at)
                : toLocalInput(new Date().toISOString())
            }
          />
        </div>

        <div className="space-y-1">
          <ContactSelect
            options={contacts}
            value={selectedId}
            onChange={setSelectedId}
            label="Linked contact (optional)"
            placeholder="Search contacts…"
          />
          {/* Server action reads this hidden input */}
          <input type="hidden" name="contact_id" value={selectedId ?? ""} />
        </div>
      </div>

      <button type="submit" className="btn btn-primary">Create reminder</button>
    </form>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
