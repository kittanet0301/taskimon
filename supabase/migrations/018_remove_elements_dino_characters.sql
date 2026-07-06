-- Migration 018: remove elemental combat; store dino character ids in pets.species

-- Element advantage no longer applies
create or replace function public.battle_element_mult(attacker_elem text, defender_elem text)
returns numeric
language sql
immutable
security invoker
set search_path = public
as $$
  select 1.0::numeric;
$$;

revoke all on function public.battle_element_mult(text, text) from public;
grant execute on function public.battle_element_mult(text, text) to authenticated;

-- Map legacy species to dino characters
update public.pets set species = 'mono' where species = 'mamono';
update public.pets set species = 'doux' where species = 'avian';
update public.pets set species = 'kira' where species = 'aquatic';
update public.pets set species = 'loki' where species = 'mythic';

-- Clear elemental data (column kept for schema compatibility)
update public.pets set element = 'none';
