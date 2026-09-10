create table transactions (

  id           bigint generated always as identity primary key,

  user_id      uuid references auth.users not null,

  txn_date     date not null,

  description  text not null,

  merchant     text,

  amount       numeric(12,2) not null,

  direction    text check (direction in ('debit','credit')) not null,

  source_bank  text not null,

  raw          jsonb,

  created_at   timestamptz default now(),

  unique (user_id, txn_date, description, amount)

);

alter table transactions enable row level security;

create policy "own rows" on transactions

  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index on transactions (user_id, merchant, txn_date);