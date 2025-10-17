"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** Narrow local types to avoid 'never' from generated types. */
type ReminderInsert = {
  contact_id: string;      // FK -> contacts.id
  title: string;
  due_at: string;          // ISO datetime
  done?: boolean | null;   // default false
  user_id?: string;
};

function assertUuid(id: string, label = "id") {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(`Invalid ${label}`);
  }
}

/** Create a reminder for a specific contact */
export async function createReminderForContact(input: {
  contact_id: string;
  title: string;
  due_at: string; // e.g., "2025-10-16T14:00"
  revalidate?: string; // path to revalidate after insert
}) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Unauthorized");

  const contact_id = String(input.contact_id);
  assertUuid(contact_id, "contact_id");

  const title = String(input.title).trim().slice(0, 140);
  if (!title) throw new Error("Title required");

  const due_at = new Date(String(input.due_at)).toISOString();

  const values: ReminderInsert = {
    contact_id,
    title,
    due_at,
    done: false,
    user_id: user.id,
  };

  const sb: any = supabase; // pragmatic cast for Supabase generics
  const { error } = await sb.from("reminders").insert(values);
  if (error) throw new Error(error.message);

  revalidatePath("/reminders");
  if (input.revalidate) revalidatePath(input.revalidate);
}

/** Toggle done/undone.
 *  Overload allows calling with just (id) to auto-toggle. */
export function markReminderDone(id: string): Promise<void>;
export function markReminderDone(id: string, done: boolean, revalidate?: string): Promise<void>;
export async function markReminderDone(id: string, done?: boolean, revalidate?: string) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Unauthorized");

  assertUuid(id, "reminder id");

  const sb: any = supabase;

  // If 'done' not provided, read current value and flip it.
  let newDone = done;
  if (typeof newDone === "undefined") {
    const { data: row, error: readErr } = await sb
      .from("reminders")
      .select("done")
      .eq("id", id)
      .single();
    if (readErr) throw new Error(readErr.message);
    newDone = !Boolean(row?.done);
  }

  const { error } = await sb.from("reminders").update({ done: newDone }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/reminders");
  if (revalidate) revalidatePath(revalidate);
}

/** Delete a reminder */
export async function deleteReminder(id: string, revalidate?: string) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Unauthorized");

  assertUuid(id, "reminder id");

  const sb: any = supabase;
  const { error } = await sb.from("reminders").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/reminders");
  if (revalidate) revalidatePath(revalidate);
}

/** Snooze: push due_at forward by N minutes (default: 60) */
export async function snoozeReminder(id: string, minutes = 60, revalidate?: string) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Unauthorized");

  assertUuid(id, "reminder id");

  const sb: any = supabase;

  // Read current due_at
  const { data: row, error: readErr } = await sb
    .from("reminders")
    .select("due_at")
    .eq("id", id)
    .single();
  if (readErr) throw new Error(readErr.message);

  const current = new Date(String(row?.due_at ?? Date.now()));
  const next = new Date(current.getTime() + minutes * 60_000).toISOString();

  const { error } = await sb.from("reminders").update({ due_at: next }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/reminders");
  if (revalidate) revalidatePath(revalidate);
}

/* ------------------------------------------------------------------ */
/* Compatibility exports so existing imports keep working              */
/* ------------------------------------------------------------------ */

// Legacy alias some files still import:
export const createReminder = createReminderForContact;
// NEW: provide the old name so pages importing it don't break
export const toggleReminderDone = markReminderDone;
