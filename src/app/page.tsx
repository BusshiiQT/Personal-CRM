import AuthGate from "@/components/AuthGate";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import Sparkline from "@/components/Sparkline";

type Reminder = Database["public"]["Tables"]["reminders"]["Row"];
type Interaction = Database["public"]["Tables"]["interactions"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];

function startOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function isoDate(d: Date) {
  // interactions.occurred_at is DATE (YYYY-MM-DD)
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();

  const now = new Date();

  // === Contacts total ===
  const { count: contactsCount } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true });

  // === Reminders: overdue & next 7d ===
  const nowIso = now.toISOString();
  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);
  const in7Iso = in7.toISOString();

  const [{ data: overdueRows }, { data: upcomingRows }] = await Promise.all([
    supabase
      .from("reminders")
      .select("id, due_at, done")
      .eq("done", false)
      .lt("due_at", nowIso),
    supabase
      .from("reminders")
      .select("id, due_at, done")
      .eq("done", false)
      .gte("due_at", nowIso)
      .lte("due_at", in7Iso),
  ]);

  const overdueCount = overdueRows?.length ?? 0;
  const upcomingCount = upcomingRows?.length ?? 0;

  // === Follow-ups this week (via interactions in last 7 days) ===
  const last7 = new Date(startOfLocalDay(now));
  last7.setDate(last7.getDate() - 6); // include today + previous 6 = 7 days total
  const { data: interactions7 } = await supabase
    .from("interactions")
    .select("*")
    .gte("occurred_at", isoDate(last7))
    .order("occurred_at", { ascending: true })
    .returns<Interaction[]>();

  const followupsThisWeek = interactions7?.length ?? 0;

  // === 8-week trend of interactions (weekly bins ending this week) ===
  // Fetch last ~56 days and bin in JS
  const last56 = new Date(startOfLocalDay(now));
  last56.setDate(last56.getDate() - 55);
  const { data: interactions56 } = await supabase
    .from("interactions")
    .select("occurred_at")
    .gte("occurred_at", isoDate(last56))
    .order("occurred_at", { ascending: true });

  // Build week bins (Sun..Sat or local weeks based on startOfLocalDay)
  const bins = Array(8).fill(0);
  if (interactions56 && interactions56.length) {
    const end = startOfLocalDay(now); // end boundary (this morning)
    for (const row of interactions56 as Pick<Interaction, "occurred_at">[]) {
      const d = startOfLocalDay(new Date(row.occurred_at + "T00:00:00"));
      const diffDays = Math.floor((end.getTime() - d.getTime()) / (24 * 3600 * 1000));
      const weekIndexFromNow = Math.floor(diffDays / 7); // 0 = this week, 1 = last week...
      if (weekIndexFromNow >= 0 && weekIndexFromNow < 8) {
        // put into reverse order so bins[7] is oldest, bins[0] is this week?
        // We'll render oldest -> newest for a left->right sparkline.
        const target = 7 - weekIndexFromNow;
        bins[target] += 1;
      }
    }
  }

  // === Upcoming reminders (details list) & recent interactions (details list) for the cards ===
  const [{ data: upcomingData }, { data: recentData }] = await Promise.all([
    supabase
      .from("reminders")
      .select("*")
      .eq("done", false)
      .gte("due_at", nowIso)
      .lte("due_at", in7Iso)
      .order("due_at", { ascending: true })
      .limit(5)
      .returns<Reminder[]>(),
    supabase
      .from("interactions")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(5)
      .returns<Interaction[]>(),
  ]);

  const recent: Interaction[] = recentData ?? [];

  // Map contact names for recent interactions
  const contactIds = Array.from(new Set(recent.map((i) => i.contact_id).filter(Boolean) as string[]));
  const nameById = new Map<string, string>();
  if (contactIds.length) {
    const { data } = await supabase
      .from("contacts")
      .select("id,name")
      .in("id", contactIds)
      .returns<Pick<Contact, "id" | "name">[]>();
    (data ?? []).forEach((c) => nameById.set(c.id, c.name));
  }

  return (
    <AuthGate>
      <section className="space-y-6">
        <h1 className="text-3xl font-semibold">Dashboard</h1>

        {/* KPI row */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">Contacts</div>
            <div className="mt-1 text-2xl font-semibold">{contactsCount ?? 0}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">Overdue</div>
            <div className="mt-1 text-2xl font-semibold">{overdueCount}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">Upcoming (7d)</div>
            <div className="mt-1 text-2xl font-semibold">{upcomingCount}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">Follow-ups (7d)</div>
            <div className="mt-1 text-2xl font-semibold">{followupsThisWeek}</div>
          </div>
        </div>

        {/* Trend + lists */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Trend Card */}
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Interactions — last 8 weeks</h2>
              <Link href="/interactions" className="text-sm text-gray-700 hover:underline dark:text-gray-300">
                View all
              </Link>
            </div>
            <div className="flex items-end gap-4">
              <Sparkline
                data={bins}
                height={48}
                className="w-full text-gray-900 dark:text-gray-100"
                title="Interactions trend (8 weeks)"
              />
              <div className="text-right text-xs text-gray-600 dark:text-gray-400">
                <div>Oldest → Newest</div>
              </div>
            </div>
          </div>

          {/* Upcoming Reminders list (limit 5) */}
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Upcoming Reminders</h2>
              <Link href="/reminders" className="text-sm text-gray-700 hover:underline dark:text-gray-300">
                View all
              </Link>
            </div>
            {(upcomingData?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Nothing due in the next 7 days.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcomingData!.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 px-3 py-2 dark:border-gray-800"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100">{r.title}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(r.due_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Interactions list (limit 5) */}
          <div className="card p-4 md:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Interactions</h2>
              <Link href="/interactions" className="text-sm text-gray-700 hover:underline dark:text-gray-300">
                View all
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Nothing logged yet.{" "}
                <Link href="/interactions/new" className="underline">
                  Log an interaction
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2">
                {recent.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 px-3 py-2 dark:border-gray-800"
                  >
                    <div className="text-sm">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {nameById.get(i.contact_id ?? "") ?? "— Unlinked —"}
                      </span>{" "}
                      {i.channel ? (
                        <span className="text-gray-600 dark:text-gray-400">({i.channel})</span>
                      ) : null}
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(i.occurred_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </AuthGate>
  );
}
