"use client";

import { createClient } from "@/lib/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace("/");
      }
    });
    return () => {
      sub.data.subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold">Welcome back</h1>
      <div className="card p-4">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          redirectTo={typeof window !== "undefined" ? `${window.location.origin}/` : undefined}
        />
      </div>
      <p className="mt-4 text-sm text-gray-500">
        Tip: You can sign up, then you’ll be redirected to the Dashboard.
      </p>
    </div>
  );
}
