"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ContactsRow = Database["public"]["Tables"]["contacts"]["Row"];
type ContactsInsert = Database["public"]["Tables"]["contacts"]["Insert"];
type ContactsUpdate = Database["public"]["Tables"]["contacts"]["Update"];
type TagRow       = Database["public"]["Tables"]["tags"]["Row"];

function parseTags(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20); // basic guard
}

export async function createContact(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) redirect("/auth/login");

  const name = (formData.get("name") as string)?.trim();
  const email = ((formData.get("email") as string) || "").trim() || null;
  const phone = ((formData.get("phone") as string) || "").trim() || null;
  const notes = ((formData.get("notes") as string) || "").trim() || null;
  const tagsInput = (formData.get("tags") as string) ?? "";
  const tagNames = parseTags(tagsInput);

  if (!name) {
    redirect("/contacts/new?error=Name%20is%20required");
  }

  const payload: ContactsInsert = {
    user_id: user.id,
    name,
    email,
    phone,
    notes,
    updated_at: new Date().toISOString(),
  };

  // Insert contact
  const { data: inserted, error: insertErr } = await (supabase.from("contacts") as any)
    .insert(payload)
    .select("*")
    .single();

  if (insertErr || !inserted) {
    redirect(`/contacts/new?error=${encodeURIComponent(insertErr?.message || "Failed to create contact")}`);
  }

  // Upsert tags & join rows
  await upsertTagsAndLinks(user.id, inserted.id, tagNames);

  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function updateContact(contactId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) redirect("/auth/login");

  const name = (formData.get("name") as string)?.trim();
  const email = ((formData.get("email") as string) || "").trim() || null;
  const phone = ((formData.get("phone") as string) || "").trim() || null;
  const notes = ((formData.get("notes") as string) || "").trim() || null;
  const tagsInput = (formData.get("tags") as string) ?? "";
  const tagNames = parseTags(tagsInput);

  if (!name) {
    redirect(`/contacts/${contactId}/edit?error=Name%20is%20required`);
  }

  const patch: ContactsUpdate = {
    name,
    email,
    phone,
    notes,
    updated_at: new Date().toISOString(),
  };

  const { error: updErr } = await (supabase.from("contacts") as any)
    .update(patch)
    .eq("id", contactId);

  if (updErr) {
    redirect(`/contacts/${contactId}/edit?error=${encodeURIComponent(updErr.message)}`);
  }

  // Replace tag links for this contact
  await syncContactTags(user.id, contactId, tagNames);

  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function deleteContact(contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) redirect("/auth/login");

  const { error } = await supabase.from("contacts").delete().eq("id", contactId);
  if (error) {
    redirect(`/contacts?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/contacts");
  redirect("/contacts");
}

/** Upsert tag rows (by name) for a user and create links in contact_tags. */
async function upsertTagsAndLinks(userId: string, contactId: string, tagNames: string[]) {
  if (tagNames.length === 0) return;

  const supabase = await createClient();
  // Upsert tags (unique per user_id + name)
  const toUpsert = tagNames.map((name) => ({ user_id: userId, name }));
  const { data: upserted, error: upErr } = await (supabase.from("tags") as any)
    .upsert(toUpsert, { onConflict: "user_id,name" })
    .select("*");

  if (upErr) return; // silent fail (optional: handle & bubble to UI)

  const tagIds = (upserted as TagRow[]).map((t) => t.id);
  const joinRows = tagIds.map((tag_id) => ({ contact_id: contactId, tag_id }));

  await (supabase.from("contact_tags") as any).upsert(joinRows);
}

/** Replace contact's tag set with the provided names. */
async function syncContactTags(userId: string, contactId: string, tagNames: string[]) {
  const supabase = await createClient();

  // Remove existing links
  await supabase.from("contact_tags").delete().eq("contact_id", contactId);

  if (tagNames.length === 0) return;

  // Ensure tags exist, then (re)link
  await upsertTagsAndLinks(userId, contactId, tagNames);
}
