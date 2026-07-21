-- Migration 050: allow blaze-crest fire species in pets.species check

alter table public.pets drop constraint if exists pets_species_check;
alter table public.pets add constraint pets_species_check check (
  species in (
    'cole', 'doux', 'kira', 'kuro', 'loki', 'mono', 'mort', 'nico', 'olaf', 'sena', 'tard', 'vita',
    'garden', 'horned', 'blaze-crest',
    'crag-shell', 'tide-fin', 'volt-wing'
  )
);
