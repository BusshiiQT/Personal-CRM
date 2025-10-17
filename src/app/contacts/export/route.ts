import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type ContactTag = Database["public"]["Tables"]["contact_tags"]["Row"];
type Tag = Database["public"]["Tables"]["tags"]["Row"];

/**
 * GET /contacts/export
 * Streams a CSV of the current user's contacts, including a comma-separated "tags" column.
 */
export async function GET() {
  const supabase = await createClient();

  // Auth required
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch contacts
  const { data: contacts, error: cErr } = await supabase
    .from("contacts")
    .select("*")
    .order("name", { ascending: true })
    .returns<Contact[]>();

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  // If none, still return a valid CSV with header
  if (!contacts || contacts.length === 0) {
    const emptyCsv = toCsv([["name", "email", "phone", "notes", "tags"]], { includeBom: true });
    return new NextResponse(emptyCsv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contacts.csv"`,
      },
    });
  }

  // Build tag map for these contacts
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

  const tagsByContact = new Map<string, string[]>();
  (links ?? []).forEach((l) => {
    const t = tagMap.get(l.tag_id);
    if (!t) return;
    const arr = tagsByContact.get(l.contact_id) ?? [];
    arr.push(t.name);
    tagsByContact.set(l.contact_id, arr);
  });

  // CSV rows
  const rows: string[][] = [];
  rows.push(["name", "email", "phone", "notes", "tags"]);

  for (const c of contacts) {
    const tagCsv = (tagsByContact.get(c.id) ?? []).join(", ");
    rows.push([
      c.name ?? "",
      c.email ?? "",
      c.phone ?? "",
      c.notes ?? "",
      tagCsv,
    ]);
  }

  const csv = toCsv(rows, { includeBom: true });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacts.csv"`,
    },
  });
}

/** Convert 2D string array -> CSV text. Escapes quotes and wraps if needed. */
function toCsv(rows: string[][], opts?: { includeBom?: boolean }) {
  const escape = (val: string) => {
    if (val == null) return "";
    const needsWrap = /[",\n]/.test(val);
    const out = val.replace(/"/g, '""');
    return needsWrap ? `"${out}"` : out;
  };

  const body = rows.map((r) => r.map(escape).join(",")).join("\n");
  // BOM ensures Excel opens UTF-8 properly
  return (opts?.includeBom ? "\uFEFF" : "") + body;
}
