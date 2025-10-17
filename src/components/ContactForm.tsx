import { createContact, updateContact } from "@/app/actions/contacts";

type Props = {
  mode: "create" | "edit";
  defaultValues?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
    tagsCsv?: string; // comma-separated tags for the input
  };
};

/**
 * For "edit", we wrap updateContact in an inline server action so it can accept the id.
 */
export default function ContactForm({ mode, defaultValues }: Props) {
  const createAction = createContact;

  const updateAction = async (formData: FormData) => {
    "use server";
    await updateContact(defaultValues?.id!, formData);
  };

  const action = mode === "create" ? createAction : updateAction;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label className="label" htmlFor="name">Full name*</label>
        <input
          id="name"
          name="name"
          className="input"
          required
          defaultValue={defaultValues?.name ?? ""}
          placeholder="Ada Lovelace"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            defaultValue={defaultValues?.email ?? ""}
            placeholder="ada@example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="label" htmlFor="phone">Phone</label>
          <input
            id="phone"
            name="phone"
            className="input"
            defaultValue={defaultValues?.phone ?? ""}
            placeholder="+1 555 555 1234"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="label" htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          className="input min-h-28"
          defaultValue={defaultValues?.notes ?? ""}
          placeholder="Context, how you met, interests…"
        />
      </div>

      <div className="space-y-1">
        <label className="label" htmlFor="tags">Tags (comma-separated)</label>
        <input
          id="tags"
          name="tags"
          className="input"
          placeholder="client, boston, investor"
          defaultValue={defaultValues?.tagsCsv ?? ""}
        />
        <p className="text-xs text-gray-500">Example: <em>client, boston, investor</em></p>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary">
          {mode === "create" ? "Create contact" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
