import AuthGate from "@/components/AuthGate";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { deleteInteraction } from "@/app/actions/interactions";

export const dynamic = "force-dynamic";

type Interaction = Database["public"]["Tables"]["interactions"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];

export default async function InteractionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  await supabase.auth.getUser();

  const sp = await searchParams;

  // Fetch recent interactions
  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .order("occurred_at", { ascending: false });

  const interactions: Interaction[] = data ?? [];

  // Map contact id -> name
  const contactIds = Array.from(
    new Set(interactions.map((i) => i.contact_id).filter(Boolean) as string[])
  );

  const nameById = new Map<string, string>();
  if (contactIds.length > 0) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id,name")
      .in("id", contactIds)
      .returns<Pick<Contact, "id" | "name">[]>();
    (contacts ?? []).forEach((c) => nameById.set(c.id, c.name));
  }

  return (
    <AuthGate>
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Interactions</h1>
          <Link href="/interactions/new" className="btn btn-primary">
            New interaction
          </Link>
        </div>

        {(sp?.error || error) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
            {sp?.error ? decodeURIComponent(sp.error) : error?.message}
          </div>
        )}

        {interactions.length === 0 ? (
          <div className="card p-6 text-sm text-gray-600 dark:text-gray-400">
            Nothing logged yet. Click <span className="font-medium">New interaction</span> to add one.
          </div>
        ) : (
          <ul className="space-y-3">
            {interactions.map((i) => {
              const occurred = new Date(i.occurred_at);
              const contactName = nameById.get(i.contact_id ?? "") ?? "— Unlinked —";
              return (
                <li key={i.id} className="card p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {contactName}{" "}
                        {i.channel ? (
                          <span className="text-gray-600 dark:text-gray-400">({i.channel})</span>
                        ) : null}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {occurred.toLocaleDateString()}
                        {i.summary ? <span> — {i.summary}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <form
                        action={async () => {
                          "use server";
                          await deleteInteraction(i.id);
                        }}
                      >
                        <button className="btn" type="submit">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AuthGate>
  );
}
