import AuthGate from "@/components/AuthGate";
import ContactForm from "@/components/ContactForm";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  return (
    <AuthGate>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">New contact</h1>

        {searchParams?.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {decodeURIComponent(searchParams.error)}
          </div>
        )}

        <div className="card p-6">
          <ContactForm mode="create" />
        </div>
      </div>
    </AuthGate>
  );
}
