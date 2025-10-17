import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /contacts/fix-orphans
 * Assigns the current auth user's id to any rows whose user_id is NULL.
 * Useful after you first enable RLS and previously-inserted rows had no user_id.
 *
 * NOTE: This endpoint mutates data. You can remove it after running once.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // We’ll try these tables; if a table doesn’t have user_id, we skip it cleanly.
  const candidateTables = [
    "contacts",
    "interactions",
    "reminders",
    "tags",          // only if you added user_id to tags
    "contact_tags",  // only if you added user_id to this junction
  ];

  const sb: any = supabase; // 👈 local any-cast to avoid TS `never` issues on update()

  const results: Record<
    string,
    { nullsBefore: number; updated: boolean; error?: string }
  > = {};

  for (const table of candidateTables) {
    try {
      // Count NULL user_id rows first
      const { count, error: countErr } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .is("user_id", null);

      if (countErr) {
        // If the table has no user_id column, Postgrest will error; record & continue
        results[table] = {
          nullsBefore: 0,
          updated: false,
          error: countErr.message,
        };
        continue;
      }

      // Update those rows to the current user
      const { error: upErr } = await sb
        .from(table)
        .update({ user_id: user.id })
        .is("user_id", null);

      if (upErr) {
        results[table] = {
          nullsBefore: count ?? 0,
          updated: false,
          error: upErr.message,
        };
      } else {
        results[table] = {
          nullsBefore: count ?? 0,
          updated: true,
        };
      }
    } catch (e: any) {
      results[table] = {
        nullsBefore: 0,
        updated: false,
        error: e?.message ?? String(e),
      };
    }
  }

  return NextResponse.json({
    ok: true,
    user_id: user.id,
    results,
    hint:
      "If contacts were hidden by RLS, revisit /contacts now. You can delete this route after fixing orphans.",
  });
}
