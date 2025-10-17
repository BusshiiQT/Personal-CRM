"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/types";

// Keep the Row type for reads
type InteractionRow = Database["public"]["Tables"]["interactions"]["Row"];

// Local Insert shape (matches your schema)
type InteractionInsert = {
  contact_id: string;       // FK -> contacts.id
  occurred_at: string;      // YYYY-MM-DD (DATE)
  channel: string | null;   // nullable
  summary: string | null;   // nullable
  user_id?: string;         // set explicitly
};

function assertUuid(id: string, label = "id") {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(`Invalid ${label}`);
  }
}

export async function createInteraction(input: {
  contact_id: string;
  occurred_at: string; // YYYY-MM-DD
  channel: string | null;
  summary: string | null;
}) {
  const supabase = await createClient();

  // Require auth
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Unauthorized");

  // Validate inputs
  const contact_id = String(input.contact_id);
  assertUuid(contact_id, "contact_id");

  const occurred_at = String(input.occurred_at).slice(0, 10); // DATE
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurred_at)) {
    throw new Error("Invalid occurred_at date");
  }

  const values: InteractionInsert = {
    contact_id,
    occurred_at,
    channel: input.channel ? String(input.channel) : null,
    summary: input.summary ? String(input.summary).slice(0, 500) : null,
    user_id: user.id,
  };

  // ---- Insert (bypass broken TS inference by locally casting supabase) ----
  // This avoids the "never" generic constraint coming from your generated types.
  const sb: any = supabase;
  const { error } = await sb.from("interactions").insert(values);
  if (error) throw new Error(error.message);

  // Revalidate common views (caller can revalidate specific pages too)
  revalidatePath("/interactions");
}

export async function deleteInteraction(id: string) {
  const supabase = await createClient();

  // Require auth
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Unauthorized");

  assertUuid(id, "interaction id");

  const { error } = await supabase.from("interactions").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/interactions");
}
