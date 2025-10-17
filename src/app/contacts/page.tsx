import AuthGate from "@/components/AuthGate";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteContact } from "@/app/actions/contacts";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type ContactTag = Database["public"]["Tables"]["contact_tags"]["Row"];
type Tag = Database["public"]["Tables"]["tags"]["Row"];

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; tag?: string }>;
}) {
  const supabase = await createClient();
  await supabase.auth.getUser();

  const sp = await searchParams;
  const q = (sp?.q ?? "").trim();
  const tagFilter = (sp?.tag ?? "").trim();

  // Base contacts query
  let query = supabase
    .from("contacts")
    .select("*")
    .order("name", { ascending: true })
    .returns<Contact[]>();

  // Apply search
  if (q) {
    query = supabase
      .from("contacts")
      .select("*")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .order("name", { ascending: true })
      .returns<Contact[]>();
  }

  const { data: dataContacts, error } = await query;
  const contacts: Contact[] = dataContacts ?? [];

  // Build tag map for displayed contacts
  let tagsByContact = new Map<string, Tag[]>();
  if (contacts.length > 0) {
    const contactIds = contacts.map((c) => c.id);

    const { data: links } = await supabase
      .from("contact_tags")
      .select("*")
      .in("contact_id", contactIds)
      .returns<ContactTag[]>();

    const tagIds = Array.from(new Set((links ?? []).map((l) => l.tag_id)));

    const { data: tags } = await supabase
      .from("tags")
      .select("*")
      .in("id", tagIds.length ? tagIds : ["00000000-0000-0000-0000-000000000000"])
      .returns<Tag[]>();

    const tagMap = new Map<string, Tag>();
    (tags ?? []).forEach((t) => tagMap.set(t.id, t));

    (links ?? []).forEach((l) => {
      const t = tagMap.get(l.tag_id);
      if (!t) return;
      const arr = tagsByContact.get(l.contact_id) ?? [];
      arr.push(t);
      tagsByContact.set(l.contact_id, arr);
    });

    // Tag filter
    if (tagFilter) {
      const lowered = tagFilter.toLowerCase();
      const allowedIds = new Set(
        [...tagsByContact.entries()]
          .filter(([, arr]) => arr.some((t) => t.name.toLowerCase() === lowered))
          .map(([contactId]) => contactId)
      );
      contacts.splice(0, contacts.length, ...contacts.filter((c) => allowedIds.has(c.id)));
    }
  }

  return (
    <AuthGate>
      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-semibold">Contacts</h1>

          <div className="flex w-full flex-wrap gap-2 md:w-auto md:flex-nowrap">
            <form className="flex grow gap-2 md:w-auto" action="/contacts" method="get">
              <input
                className="input w-full md:w-72"
                name="q"
                placeholder="Search (name, email, phone)"
                defaultValue={q}
              />
              {tagFilter && <input type="hidden" name="tag" value={tagFilter} />}
              <button className="btn" type="submit">Search</button>
              <Link href="/contacts" className="btn">Clear</Link>
            </form>

            <a href="/contacts/export" className="btn" title="Download CSV">
              Export CSV
            </a>

            <Link className="btn btn-primary ml-auto md:ml-0" href="/contacts/new">
              New contact
            </Link>
          </div>
        </div>

        {(sp?.error || error) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
            {sp?.error ? decodeURIComponent(sp.error) : error?.message}
          </div>
        )}

        {contacts.length === 0 ? (
          <div className="card p-6 text-sm text-gray-600 dark:text-gray-400">
            No contacts found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Tags</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {contacts.map((c) => {
                  const tags = tagsByContact.get(c.id) ?? [];
                  return (
                    <tr key={c.id} className="bg-white dark:bg-gray-900">
                      {/* Name now links to the detail page */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/contacts/${c.id}`}
                          className="text-gray-900 underline-offset-2 hover:underline dark:text-gray-100"
                          title="Open contact"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{c.email ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{c.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {tags.length === 0 ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            tags.map((t) => (
                              <Link
                                key={t.id}
                                href={`/contacts?${new URLSearchParams({ q, tag: t.name }).toString()}`}
                                className="rounded-full border border-gray-200 px-2 py-0.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                                title="Filter by tag"
                              >
                                {t.name}
                              </Link>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link href={`/contacts/${c.id}/edit`} className="btn">Edit</Link>
                          <form action={async () => { "use server"; await deleteContact(c.id); }}>
                            <button className="btn" type="submit">Delete</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AuthGate>
  );
}
