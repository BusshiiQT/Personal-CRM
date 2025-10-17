"use client";

import ContactSelect, { type ContactOption } from "@/components/ContactSelect";
import { createInteraction } from "@/app/actions/interactions";
import { useState } from "react";

type Props = {
  contacts: ContactOption[];
  defaultValues?: {
    contact_id?: string | null;
    occurred_at?: string; // ISO date string (YYYY-MM-DD) or full ISO
    channel?: string | null;
    summary?: string | null;
  };
};

export default function InteractionForm({ contacts, defaultValues }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    defaultValues?.contact_id ?? null
  );

  return (
    <form action={createInteraction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <ContactSelect
            options={contacts}
            value={selectedId}
            onChange={setSelectedId}
            label="Contact (optional)"
            placeholder="Search contacts…"
          />
          <input type="hidden" name="contact_id" value={selectedId ?? ""} />
        </div>

        <div className="space-y-1">
          <label className="label" htmlFor="occurred_at">Date*</label>
          <input
            id="occurred_at"
            name="occurred_at"
            type="date"
            className="input"
            required
            defaultValue={toLocalDate(defaultValues?.occurred_at ?? new Date().toISOString())}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="label" htmlFor="channel">Channel</label>
          <select id="channel" name="channel" className="input" defaultValue={defaultValues?.channel ?? ""}>
            <option value="">—</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="dm">DM</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="label" htmlFor="summary">Summary</label>
          <input
            id="summary"
            name="summary"
            className="input"
            placeholder="What happened?"
            defaultValue={defaultValues?.summary ?? ""}
          />
        </div>
      </div>

      <button type="submit" className="btn btn-primary">Log interaction</button>
    </form>
  );
}

function toLocalDate(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
