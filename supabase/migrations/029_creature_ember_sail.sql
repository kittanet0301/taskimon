-- Migration 029: allow ember-sail creature species in pets.species check

alter table public.pets drop constraint if exists pets_species_check;
alter table public.pets add constraint pets_species_check check (
  species in (
    'cole', 'doux', 'kira', 'kuro', 'loki', 'mono', 'mort', 'nico', 'olaf', 'sena', 'tard', 'vita',
    'ember-sail'
  )
);
