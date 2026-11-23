-- GENEAddict — table qui reçoit les réponses des études de cas.
-- À coller dans Supabase : SQL Editor → New query → Run.
-- Les participants peuvent seulement AJOUTER des réponses : ils ne peuvent ni les lire,
-- ni les modifier, ni les effacer. Vous les lisez depuis le tableau de bord Supabase.

create table if not exists public.reponses_etudes (
  id          uuid primary key default gen_random_uuid(),
  recu_le     timestamptz not null default now(),
  annee       text not null check (char_length(annee) between 4 and 10),
  tp          text not null check (char_length(tp) between 1 and 20),
  tp_titre    text check (char_length(tp_titre) <= 200),
  defi        integer not null check (defi between 0 and 50),        -- 0 = question bonus
  question    text check (char_length(question) <= 2000),
  participant text not null check (char_length(participant) between 1 and 100),
  reponse     text not null check (char_length(reponse) between 1 and 5000)
);

comment on table public.reponses_etudes is 'Réponses envoyées depuis GENEAddict (onglet Études de cas)';

-- Sécurité : RLS activée, une seule règle — l'ajout anonyme.
alter table public.reponses_etudes enable row level security;

drop policy if exists "ajout anonyme des réponses" on public.reponses_etudes;
create policy "ajout anonyme des réponses"
  on public.reponses_etudes
  for insert
  to anon
  with check (true);

revoke all on public.reponses_etudes from anon, authenticated;
grant insert on public.reponses_etudes to anon;

-- Vue pratique pour la correction : la dernière réponse de chaque participant à chaque défi
-- (un participant peut renvoyer ses réponses après correction).
create or replace view public.reponses_etudes_dernieres
with (security_invoker = true) as
select distinct on (annee, tp, participant, defi, question)
       annee, tp, tp_titre, participant, defi, question, reponse, recu_le
from public.reponses_etudes
order by annee, tp, participant, defi, question, recu_le desc;

revoke all on public.reponses_etudes_dernieres from anon, authenticated;
