create or replace function get_recurring()
returns table (
  merchant text, n_charges bigint, avg_gap numeric, avg_amount numeric,
  last_seen date, annualized numeric, status text
)
language sql stable security invoker as $$
  with gaps as (
    select merchant, txn_date, amount,
           txn_date - lag(txn_date) over (partition by merchant order by txn_date) as gap_days
    from transactions
    where direction = 'debit' and user_id = auth.uid()
  ),
  agg as (
    select merchant, count(*) as n, avg(gap_days) as g, stddev_samp(gap_days) as sd,
           avg(amount) as a, stddev_samp(amount) / nullif(avg(amount), 0) as cv,
           max(txn_date) as ls
    from gaps group by merchant
  )
  select merchant, n, round(g, 1), round(a, 2), ls,
         round(a * 365.0 / g, 0),
         case when ls >= (select max(txn_date) from transactions where user_id = auth.uid()) - 45
              then 'active' else 'lapsed' end
  from agg
  where n >= 3 and g between 25 and 35
    and coalesce(sd, 0) < 5 and coalesce(cv, 0) < 0.15
  order by 6 desc;
$$;

create or replace function get_rfm()
returns table (
  merchant text, recency_days int, frequency bigint, monetary numeric,
  r int, f int, m int, segment text
)
language sql stable security invoker as $$
  with base as (
    select merchant,
           (select max(txn_date) from transactions where user_id = auth.uid()) - max(txn_date) as rec,
           count(*) as fr, sum(amount) as mo
    from transactions
    where direction = 'debit' and user_id = auth.uid()
    group by merchant
  ),
  scored as (
    select *, ntile(4) over (order by rec desc) as r,
              ntile(4) over (order by fr)       as f,
              ntile(4) over (order by mo)       as m
    from base
  )
  select merchant, rec, fr, mo, r, f, m,
         case when r >= 3 and f >= 3 and m >= 3 then 'Habitual high spend'
              when r <= 2 and f >= 2           then 'Lapsed'
              when f <= 2 and m >= 3           then 'One-off big hits'
              else 'Occasional' end
  from scored
  order by mo desc;
$$;