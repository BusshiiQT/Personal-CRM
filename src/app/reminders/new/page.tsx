import AuthGate from "@/components/AuthGate";
import ReminderForm from "@/components/ReminderForm";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];

export default async function NewReminderPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const supabase = await createClient();
  await supabase.auth.getUser();

  const { data } = await supabase
    .from("contacts")
    .select("id, name")
    .order("name", { ascending: true });

  const contacts: Pick<Contact, "id" | "name">[] = (data as any) ?? [];

  return (
    <AuthGate>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">New reminder</h1>

        {searchParams?.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {decodeURIComponent(searchParams.error)}
          </div>
        )}

        <div className="card p-6">
          <ReminderForm
            contacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
          />
        </div>
      </div>
    </AuthGate>
  );
}
