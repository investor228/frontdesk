-- Frontdesk — initial schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Accounts: one row per authenticated user, holds plan + billing
-- ─────────────────────────────────────────────────────────────
create type plan_tier as enum ('free', 'pro', 'business');

create table accounts (
  id                     uuid primary key references auth.users on delete cascade,
  email                  text not null,
  company_name           text,
  plan                   plan_tier not null default 'free',
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  -- start of the current usage window; message counters reset when it rolls over
  period_start           timestamptz not null default date_trunc('month', now()),
  messages_used          integer not null default 0,
  created_at             timestamptz not null default now()
);

alter table accounts enable row level security;

create policy "own account" on accounts
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Create the account row automatically on signup.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.accounts (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Bots
-- ─────────────────────────────────────────────────────────────
create table bots (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references accounts on delete cascade,
  name            text not null,
  -- public key embedded in the customer's <script> tag; safe to expose
  public_key      text not null unique default 'fd_' || encode(gen_random_bytes(16), 'hex'),
  greeting        text not null default 'Hi! Ask me anything about our services.',
  -- extra persona/rules the owner types in; appended to the system prompt
  instructions    text not null default '',
  accent_color    text not null default '#0F766E',
  -- domains allowed to embed the widget; empty array = any origin (free tier default)
  allowed_domains text[] not null default '{}',
  lead_capture    boolean not null default false,
  created_at      timestamptz not null default now()
);

create index bots_account_idx on bots (account_id);

alter table bots enable row level security;

create policy "own bots" on bots
  for all using (
    account_id = auth.uid()
  ) with check (
    account_id = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────
-- Documents + chunks (vector search)
-- ─────────────────────────────────────────────────────────────
create type doc_status as enum ('processing', 'ready', 'failed');

create table documents (
  id          uuid primary key default gen_random_uuid(),
  bot_id      uuid not null references bots on delete cascade,
  title       text not null,
  source      text not null,            -- filename or URL
  kind        text not null,            -- 'pdf' | 'docx' | 'text' | 'url'
  status      doc_status not null default 'processing',
  error       text,
  char_count  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index documents_bot_idx on documents (bot_id);

alter table documents enable row level security;

create policy "own documents" on documents
  for all using (
    bot_id in (select id from bots where account_id = auth.uid())
  ) with check (
    bot_id in (select id from bots where account_id = auth.uid())
  );

create table chunks (
  id          bigserial primary key,
  document_id uuid not null references documents on delete cascade,
  bot_id      uuid not null references bots on delete cascade,
  content     text not null,
  -- OpenAI text-embedding-3-small
  embedding   vector(1536) not null,
  created_at  timestamptz not null default now()
);

create index chunks_bot_idx on chunks (bot_id);
create index chunks_embedding_idx on chunks
  using hnsw (embedding vector_cosine_ops);

alter table chunks enable row level security;

create policy "own chunks" on chunks
  for all using (
    bot_id in (select id from bots where account_id = auth.uid())
  ) with check (
    bot_id in (select id from bots where account_id = auth.uid())
  );

-- Similarity search. SECURITY DEFINER because the widget calls it through the
-- service role on behalf of an anonymous end user — the bot_id filter is the
-- tenancy boundary and is always supplied server-side from a verified public key.
create function match_chunks(
  p_bot_id uuid,
  p_embedding vector(1536),
  p_limit int default 6
)
returns table (content text, document_title text, similarity float)
language sql stable security definer set search_path = public as $$
  select c.content,
         d.title as document_title,
         1 - (c.embedding <=> p_embedding) as similarity
  from chunks c
  join documents d on d.id = c.document_id
  where c.bot_id = p_bot_id
  order by c.embedding <=> p_embedding
  limit p_limit;
$$;

-- ─────────────────────────────────────────────────────────────
-- Conversations + messages
-- ─────────────────────────────────────────────────────────────
create type chat_channel as enum ('playground', 'widget');

create table conversations (
  id         uuid primary key default gen_random_uuid(),
  bot_id     uuid not null references bots on delete cascade,
  channel    chat_channel not null default 'widget',
  created_at timestamptz not null default now()
);

create index conversations_bot_idx on conversations (bot_id, created_at desc);

alter table conversations enable row level security;

create policy "own conversations" on conversations
  for all using (
    bot_id in (select id from bots where account_id = auth.uid())
  ) with check (
    bot_id in (select id from bots where account_id = auth.uid())
  );

create table messages (
  id              bigserial primary key,
  conversation_id uuid not null references conversations on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  -- titles of the documents used to answer, for the "Sources" line
  sources         text[] not null default '{}',
  -- true when the bot could not answer from the knowledge base
  unanswered      boolean not null default false,
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at);

alter table messages enable row level security;

create policy "own messages" on messages
  for all using (
    conversation_id in (
      select c.id from conversations c
      join bots b on b.id = c.bot_id
      where b.account_id = auth.uid()
    )
  ) with check (
    conversation_id in (
      select c.id from conversations c
      join bots b on b.id = c.bot_id
      where b.account_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- Leads captured by the widget
-- ─────────────────────────────────────────────────────────────
create table leads (
  id              uuid primary key default gen_random_uuid(),
  bot_id          uuid not null references bots on delete cascade,
  conversation_id uuid references conversations on delete set null,
  name            text,
  email           text not null,
  question        text,
  created_at      timestamptz not null default now()
);

create index leads_bot_idx on leads (bot_id, created_at desc);

alter table leads enable row level security;

create policy "own leads" on leads
  for all using (
    bot_id in (select id from bots where account_id = auth.uid())
  ) with check (
    bot_id in (select id from bots where account_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- Usage meter. Rolls the monthly window over, then consumes one message
-- if the account is under its limit. Check and increment happen under a
-- row lock so concurrent widget traffic can't overshoot the quota.
-- ─────────────────────────────────────────────────────────────
create function try_consume_message(p_account_id uuid, p_limit integer)
returns table (allowed boolean, used integer)
language plpgsql security definer set search_path = public as $$
declare
  v_used  integer;
  v_start timestamptz;
begin
  select period_start, messages_used
    into v_start, v_used
    from accounts
   where id = p_account_id
     for update;

  if not found then
    return query select false, 0;
    return;
  end if;

  if v_start < date_trunc('month', now()) then
    v_start := date_trunc('month', now());
    v_used  := 0;
  end if;

  if v_used >= p_limit then
    update accounts
       set period_start = v_start, messages_used = v_used
     where id = p_account_id;
    return query select false, v_used;
    return;
  end if;

  v_used := v_used + 1;

  update accounts
     set period_start = v_start, messages_used = v_used
   where id = p_account_id;

  return query select true, v_used;
end;
$$;
