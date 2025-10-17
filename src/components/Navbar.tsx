"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar() {
  const [email, setEmail] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth/login"); // or your route-grouped path
  }

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold">
          Personal CRM
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-700 hover:underline dark:text-gray-200">
            Dashboard
          </Link>
          <Link href="/contacts" className="text-sm text-gray-700 hover:underline dark:text-gray-200">
            Contacts
          </Link>
          <Link href="/reminders" className="text-sm text-gray-700 hover:underline dark:text-gray-200">
            Reminders
          </Link>
          <Link href="/interactions" className="text-sm text-gray-700 hover:underline dark:text-gray-200">
            Interactions
          </Link>

          {/* Dark mode toggle */}
          <ThemeToggle />

          {email ? (
            <>
              <span className="hidden text-sm text-gray-500 dark:text-gray-400 sm:inline">
                Signed in as {email}
              </span>
              <button onClick={signOut} className="btn">Sign out</button>
            </>
          ) : (
            <Link href="/auth/login" className="btn btn-primary">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
