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

export async function createReminderForContact(input: {
  contact_id: string;
  title: string;
  due_at: string; // e.g., "2025-10-16T14:00"
  revalidate?: string; // path to revalidate after insert
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
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

  // Use local any-cast to bypass broken TS inference
  const sb: any = supabase;
  const { error } = await sb.from("reminders").insert(values);
  if (error) throw new Error(error.message);

  revalidatePath("/reminders");
  if (input.revalidate) revalidatePath(input.revalidate);
}

export async function toggleReminderDone(id: string, done: boolean, revalidate?: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Unauthorized");

  assertUuid(id, "reminder id");

  // Use local any-cast on update to avoid 'never' error
  const sb: any = supabase;
  const { error } = await sb.from("reminders").update({ done }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/reminders");
  if (revalidate) revalidatePath(revalidate);
}

export async function deleteReminder(id: string, revalidate?: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Unauthorized");

  assertUuid(id, "reminder id");

  // Use local any-cast on delete as well to be consistent
  const sb: any = supabase;
  const { error } = await sb.from("reminders").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/reminders");
  if (revalidate) revalidatePath(revalidate);
}
