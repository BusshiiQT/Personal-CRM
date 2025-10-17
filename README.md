Personal CRM

A “Notion + Contacts” app to stay on top of professional relationships. Built to showcase full-stack product skills: data modeling, secure auth, accessible UI, and pragmatic DX.

Live Demo: https://YOUR-VERCEL-URL.vercel.app

Tech: Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase (Auth + Postgres + RLS) · Vercel

<p> <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" /> <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" /> <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?logo=tailwindcss&logoColor=white" /> <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white" /> <img alt="Vercel" src="https://img.shields.io/badge/Deployed%20on-Vercel-000?logo=vercel" /> </p>
What this shows a recruiter (in ~30 seconds)

Product thinking: focuses on follow-through (reminders + interactions) not just static contacts.

Full-stack execution: Server Actions, secure RLS policies, typed queries, clean UI in dark/light.

DX & maintainability: modern Next 15 patterns, Tailwind v4, minimal config, clear folder structure.

Portfolio-ready polish: CSV export, search & tags, simple analytics, a11y-friendly color system.

Core Features

🔑 Auth – Supabase email/password (extensible to social providers).

📇 Contacts – CRUD (name, email, phone, notes) + tags & search.

🔔 Reminders – due dates, snooze, mark done.

🧾 Interactions – log calls/meetings/emails with summaries.

🏠 Dashboard – upcoming reminders + recent interactions.

🌓 Dark/Light – toggle, class-based (html.dark), accessible colors.

📤 Export – contacts to CSV.

📊 Simple analytics – last-7-days interactions, contacts touched, reminders done.

TL;DR Quick Start (Local)
git clone https://github.com/BusshiiQT/Personal-CRM.git
cd Personal-CRM
npm install
cp .env.example .env.local    # or create manually with the 3 vars below
npm run dev                   # http://localhost:3000


.env.example

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000


Supabase setup (1x):

In Authentication → URL Configuration, add:

http://localhost:3000 and your Vercel domain.

Run the schema SQL in SQL Editor (see Database Schema below).

Screenshots / Demo

Replace with your actual images/GIFs under docs/

Dashboard (Light)	Dashboard (Dark)

	
Contacts	Reminders	Interactions

	
	
Architecture & Decisions

Next.js 15 (App Router)

Server Components by default; Server Actions for mutations (/app/actions/*).

Async searchParams patterns (Next 15 requirement) handled cleanly.

Supabase (Auth + Postgres + RLS)

All tables are owner-scoped via Row Level Security; policies enforce auth.uid() = user_id.

Tailwind CSS v4

Class-based dark mode: html.dark.

No custom config required; utilities only, accessible color pairs.

Type-safety

Narrow, local types for payloads to avoid never / overly broad generics.

Clear interfaces for rows returned from Supabase.

UX

Fast, minimal UI with strong contrast; hover/active states; keyboard-friendly controls.

DX

Organized feature folders; small reusable components (ContactForm, ContactSelect, ReminderForm).

Linters enabled locally; deploy doesn’t block portfolio demos.

Database Schema (Supabase)
<details> <summary>Click to view SQL</summary>
-- Contacts
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tags
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null
);

-- Contact ↔ Tag (many-to-many)
create table if not exists public.contact_tags (
  contact_id uuid references public.contacts(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  primary key (contact_id, tag_id)
);

-- Interactions
create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  channel text,
  summary text,
  created_at timestamptz not null default now()
);

-- Reminders
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  title text not null,
  due_at timestamptz not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table public.contacts enable row level security;
alter table public.tags enable row level security;
alter table public.contact_tags enable row level security;
alter table public.interactions enable row level security;
alter table public.reminders enable row level security;

create policy "contacts_owner" on public.contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tags_owner" on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "contact_tags_owner" on public.contact_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "interactions_owner" on public.interactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reminders_owner" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_contacts_updated_at on public.contacts;
create trigger trg_contacts_updated_at
before update on public.contacts
for each row execute procedure public.set_updated_at();

</details>
Feature Walkthrough (select highlights)

Mark reminder done / Snooze
Server Action (/app/actions/reminders.ts) exposes:

markReminderDone(id, done?) → if done omitted, it toggles safely.

snoozeReminder(id, minutes = 60) → shifts due_at forward.

Dark mode
Toggle sets document.documentElement.classList to dark and data-theme="dark"; utilities include dark: variants across components.

CSV export
A simple route serializes contacts + tag names; streamed to browser with correct Content-Type.

Project Structure
src/
  app/
    (auth)/login/page.tsx
    layout.tsx
    page.tsx                  # Dashboard
    contacts/
      page.tsx                # List, search, tags, export
      [id]/page.tsx           # Detail
      [id]/edit/page.tsx
      new/page.tsx
      export/route.ts
      fix-orphans/route.ts
    interactions/
      page.tsx
      new/page.tsx
    reminders/
      page.tsx
      new/page.tsx
    actions/
      contacts.ts
      interactions.ts
      reminders.ts
  components/
    ContactForm.tsx
    ContactSelect.tsx
    ReminderForm.tsx
    Sparkline.tsx
  lib/
    supabase/
      client.ts
      server.ts

Run Locally (Detailed)

Install

npm install


Env

cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY


Supabase DB & Auth

Paste the SQL from Database Schema into Supabase SQL editor and run.

Add http://localhost:3000 and your Vercel URL to Authentication → URL Configuration (Site URL + Redirect URLs).

Start dev

npm run dev

Deploy (Vercel)

Import the GitHub repo to Vercel.

Add env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL).

Ensure Supabase redirect URLs include your Vercel domain.

Deploy.

For portfolio convenience, builds won’t fail on type/lint errors. Flip those settings in next.config.ts when hardening.

Roadmap (what I’d add next)

Social logins (Google, GitHub)

Calendar sync + auto reminders

Full-text search across notes & interactions

Company entities + relationship map

Tests (unit + a few Playwright E2E paths)

License

MIT © 2025 BusshiiQT
