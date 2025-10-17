import AuthGate from "@/components/AuthGate";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/types";
import { deleteInteraction, createInteraction } from "@/app/actions/interactions";
import { createReminderForContact, toggleReminderDone, deleteReminder } from "@/app/actions/reminders";

export const dynamic = "force-dynamic";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type Tag = Database["public"]["Tables"]["tags"]["Row"];
type ContactTag = Database["public"]["Tables"]["contact_tags"]["Row"];
type Interaction = Database["public"]["Tables"]["interactions"]["Row"];
type Reminder = Database["public"]["Tables"]["reminders"]["Row"];

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  await supabase.auth.getUser();

  // ---- Contact ----
  const { data: contact, error: cErr } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", params.id)
    .single()
    .returns<Contact>();
  if (cErr || !contact) notFound();
  const c = contact as Contact;

  // ---- Tags for contact ----
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

  // ---- Interactions timeline ----
  const { data: interactions } = await supabase
    .from("interactions")
    .select("*")
    .eq("contact_id", params.id)
    .order("occurred_at", { ascending: false })
    .returns<Interaction[]>();

  // ---- Reminders for this contact (overdue first, then upcoming) ----
  const { data: reminders } = await supabase
    .from("reminders")
    .select("*")
    .eq("contact_id", params.id)
    .order("done", { ascending: true }) // incomplete first
    .order("due_at", { ascending: true })
    .returns<Reminder[]>();

  // Inline server action to add an interaction
  async function addInteractionAction(formData: FormData) {
    "use server";
    const occurred_at = String(formData.get("occurred_at") ?? "");
    const channel = String(formData.get("channel") ?? "");
    const summary = String(formData.get("summary") ?? "").trim();

    await createInteraction({
      contact_id: params.id,
      occurred_at,
      channel: channel || null,
      summary: summary || null,
    });

    revalidatePath(`/contacts/${params.id}`);
  }

  // Inline server action to add a reminder for this contact
  async function addReminderAction(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    const date = String(formData.get("date") ?? "");   // YYYY-MM-DD
    const time = String(formData.get("time") ?? "09:00"); // HH:mm (default 9am)
    const iso = new Date(`${date}T${time}`).toISOString();

    await createReminderForContact({
      contact_id: params.id,
      title,
      due_at: iso,
      revalidate: `/contacts/${params.id}`,
    });
  }

  return (
    <AuthGate>
      <section className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{c.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              {c.email && (
                <span>
                  <span className="text-gray-700 dark:text-gray-300">Email:</span> {c.email}
                </span>
              )}
              {c.phone && (
                <span>
                  <span className="text-gray-700 dark:text-gray-300">Phone:</span> {c.phone}
                </span>
              )}
            </div>
            {c.notes && (
              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{c.notes}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/contacts/${c.id}/edit`} className="btn">Edit</Link>
            <Link href="/contacts" className="btn">Back to contacts</Link>
          </div>
        </div>

        {/* 2-column: LEFT Reminders / RIGHT Tags + Add Interaction + Timeline */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Reminders */}
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Reminders</h2>
              <Link href="/reminders" className="text-sm text-gray-700 hover:underline dark:text-gray-300">
                View all
              </Link>
            </div>

            <form action={addReminderAction} className="mb-4 grid gap-3 md:grid-cols-5">
              <div className="md:col-span-2">
                <label className="label mb-1 block">Title</label>
                <input
                  name="title"
                  className="input"
                  placeholder="Follow up"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="label mb-1 block">Date</label>
                <input
                  type="date"
                  name="date"
                  className="input"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                />
              </div>
              <div className="md:col-span-1">
                <label className="label mb-1 block">Time</label>
                <input type="time" name="time" className="input" defaultValue="09:00" />
              </div>
              <div className="md:col-span-5 flex justify-end">
                <button className="btn btn-primary" type="submit">Add reminder</button>
              </div>
            </form>

            {!reminders || reminders.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">No reminders yet.</div>
            ) : (
              <ul className="space-y-2">
                {reminders.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 px-3 py-2 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <form
                        action={async () => {
                          "use server";
                          await toggleReminderDone(r.id, !r.done, `/contacts/${params.id}`);
                        }}
                      >
                        <button
                          type="submit"
                          className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-300 text-sm dark:border-gray-700"
                          title={r.done ? "Mark as not done" : "Mark as done"}
                        >
                          {r.done ? "✓" : ""}
                        </button>
                      </form>
                      <div className="text-sm">
                        <span className={`font-medium ${r.done ? "line-through text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"}`}>
                          {r.title}
                        </span>{" "}
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(r.due_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <form
                      action={async () => {
                        "use server";
                        await deleteReminder(r.id, `/contacts/${params.id}`);
                      }}
                    >
                      <button className="btn" type="submit">Delete</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right column: Tags, Add Interaction, Timeline */}
          <div className="space-y-6">
            {/* Tags */}
            <div className="card p-4">
              <div className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">Tags</div>
              {(!tags || tags.length === 0) ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">No tags yet.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags!.map((t) => (
                    <span
                      key={t.id}
                      className="rounded-full border border-gray-200 px-2 py-0.5 text-xs dark:border-gray-700"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Add Interaction */}
            <div className="card p-4">
              <div className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                Log an interaction
              </div>
              <form action={addInteractionAction} className="grid gap-3 md:grid-cols-5">
                <div className="md:col-span-1">
                  <label className="label mb-1 block">Date</label>
                  <input
                    type="date"
                    name="occurred_at"
                    className="input"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="label mb-1 block">Channel</label>
                  <select name="channel" className="input">
                    <option value="">—</option>
                    <option>Email</option>
                    <option>Call</option>
                    <option>Meeting</option>
                    <option>DM</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="label mb-1 block">Summary</label>
                  <input
                    type="text"
                    name="summary"
                    className="input"
                    placeholder="e.g. Coffee catch-up, discussed Q4 plans"
                  />
                </div>
                <div className="md:col-span-5 flex justify-end">
                  <button className="btn btn-primary" type="submit">
                    Add interaction
                  </button>
                </div>
              </form>
            </div>

            {/* Timeline */}
            <div className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Interaction timeline</h2>
                <Link href="/interactions" className="text-sm text-gray-700 hover:underline dark:text-gray-300">
                  View all
                </Link>
              </div>

              {!interactions || interactions.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">No interactions yet.</div>
              ) : (
                <ul className="space-y-2">
                  {interactions.map((i) => {
                    const occurred = new Date(i.occurred_at);
                    return (
                      <li
                        key={i.id}
                        className="flex items-center justify-between rounded-2xl border border-gray-200 px-3 py-2 dark:border-gray-800"
                      >
                        <div className="text-sm">
                          <span className="text-gray-900 dark:text-gray-100">
                            {occurred.toLocaleDateString()}
                          </span>{" "}
                          {i.channel ? (
                            <span className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-300">
                              {i.channel}
                            </span>
                          ) : null}
                          {i.summary ? (
                            <span className="ml-2 text-gray-700 dark:text-gray-300">— {i.summary}</span>
                          ) : null}
                        </div>

                        <form
                          action={async () => {
                            "use server";
                            await deleteInteraction(i.id);
                            revalidatePath(`/contacts/${params.id}`);
                          }}
                        >
                          <button className="btn" type="submit">Delete</button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </AuthGate>
  );
}
