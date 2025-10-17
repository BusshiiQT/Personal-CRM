import AuthGate from "@/components/AuthGate";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
// replace imports with:
import { toggleReminderDone as markReminderDone, snoozeReminder } from "@/app/actions/reminders";


export const dynamic = "force-dynamic";

type Reminder = Database["public"]["Tables"]["reminders"]["Row"];

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  await supabase.auth.getUser();

  const sp = await searchParams;

  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .order("due_at", { ascending: true });

  const reminders: Reminder[] = data ?? [];

  return (
    <AuthGate>
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Reminders</h1>
          <Link href="/reminders/new" className="btn btn-primary">New reminder</Link>
        </div>

        {(sp?.error || error) && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {sp?.error ? decodeURIComponent(sp.error) : error?.message}
          </div>
        )}

        {reminders.length === 0 ? (
          <div className="card p-6 text-sm text-gray-600">
            No reminders yet. Click <span className="font-medium">New reminder</span> to add one.
          </div>
        ) : (
          <ul className="space-y-3">
            {reminders.map((r) => {
              const due = new Date(r.due_at);
              const overdue = !r.done && due.getTime() < Date.now();
              return (
                <li key={r.id} className="card p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">
                        {r.title} {r.done && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">Done</span>}
                      </div>
                      <div className="text-sm text-gray-600">
                        Due {due.toLocaleString()} {overdue && !r.done && <span className="ml-2 text-red-600">• Overdue</span>}
                      </div>
                    </div>
                    {!r.done && (
                      <div className="flex items-center gap-2">
                        <form action={async () => { "use server"; await markReminderDone(r.id); }}>
                          <button className="btn" type="submit">Mark done</button>
                        </form>
                        <form action={async () => { "use server"; await snoozeReminder(r.id, 3); }}>
                          <button className="btn" type="submit">Snooze 3d</button>
                        </form>
                        <form action={async () => { "use server"; await snoozeReminder(r.id, 7); }}>
                          <button className="btn" type="submit">Snooze 7d</button>
                        </form>
                      </div>
                    )}
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
