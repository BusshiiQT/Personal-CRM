import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { markReminderDone, snoozeReminder, deleteReminder } from "@/app/actions/reminders";
import { format } from "date-fns";

type ReminderRow = {
  id: string;
  user_id: string;
  contact_id: string;
  title: string | null;
  due_at: string; // timestamptz
  done: boolean;
  created_at: string;
  contacts: { id: string; name: string } | null;
};

export const dynamic = "force-dynamic";

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();

  // Touch auth (ensures cookies/session are wired)
  await supabase.auth.getUser();

  // Next 15: searchParams is a Promise; await it before usage
  const sp = await searchParams;
  const errorParam = typeof sp?.error === "string" ? sp.error : undefined;

  const { data: reminders, error } = await supabase
    .from("reminders")
    .select(
      `
        id, user_id, contact_id, title, due_at, done, created_at,
        contacts:contacts ( id, name )
      `
    )
    .order("due_at", { ascending: true })
    .returns<ReminderRow[]>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Reminders
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/reminders/new"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            New Reminder
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {(errorParam || error) && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/50 dark:text-red-200">
          {errorParam ? decodeURIComponent(errorParam) : error?.message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Contact
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Title
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Due
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Status
              </th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
            {(reminders ?? []).map((r) => {
              const contactName = r.contacts?.name ?? "Unknown";
              const due = format(new Date(r.due_at), "PP p");
              return (
                <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/60">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    <Link
                      href={`/contacts/${r.contact_id}`}
                      className="underline decoration-dotted underline-offset-4 hover:decoration-solid"
                    >
                      {contactName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                    {r.title ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                    {due}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.done
                          ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : "inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                      }
                    >
                      {r.done ? "Done" : "Open"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Toggle done/undone — pass id + !done */}
                      <form
                        action={async () => {
                          "use server";
                          await markReminderDone(r.id, !r.done, "/reminders");
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                        >
                          {r.done ? "Mark Open" : "Mark Done"}
                        </button>
                      </form>

                      {/* Snooze 60m */}
                      <form
                        action={async () => {
                          "use server";
                          await snoozeReminder(r.id, 60, "/reminders");
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                        >
                          Snooze 1h
                        </button>
                      </form>

                      {/* Delete */}
                      <form
                        action={async () => {
                          "use server";
                          await deleteReminder(r.id, "/reminders");
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {(reminders ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-300"
                >
                  No reminders yet.{" "}
                  <Link
                    href="/reminders/new"
                    className="underline decoration-dotted underline-offset-4 hover:decoration-solid"
                  >
                    Create one
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
