import AuthGate from "@/components/AuthGate";
import ContactForm from "@/components/ContactForm";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Database } from "@/lib/supabase/types";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type ContactTag = Database["public"]["Tables"]["contact_tags"]["Row"];
type Tag = Database["public"]["Tables"]["tags"]["Row"];

export default async function EditContactPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string };
}) {
  const supabase = await createClient();
  await supabase.auth.getUser();

  // Get the contact, with explicit typing
  const { data: contactData, error: contactErr } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", params.id)
    .single()
    .returns<Contact>();

  if (contactErr || !contactData) notFound();
  const contact: Contact = contactData;

  // Fetch current tag links for this contact
  const { data: links } = await supabase
    .from("contact_tags")
    .select("*")
    .eq("contact_id", params.id)
    .returns<ContactTag[]>();

  const tagIds = Array.from(new Set((links ?? []).map((l) => l.tag_id)));

  const { data: tags } = await supabase
    .from("tags")
    .select("*")
    .in("id", tagIds.length ? tagIds : ["00000000-0000-0000-0000-000000000000"])
    .returns<Tag[]>();

  const tagsCsv = (tags ?? []).map((t) => t.name).join(", ");

  return (
    <AuthGate>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Edit contact</h1>

        {searchParams?.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {decodeURIComponent(searchParams.error)}
          </div>
        )}

        <div className="card p-6">
          <ContactForm
            mode="edit"
            defaultValues={{
              id: contact.id,
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              notes: contact.notes,
              tagsCsv,
            }}
          />
        </div>
      </div>
    </AuthGate>
  );
}
