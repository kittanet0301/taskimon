-- Migration 049: remove ember-sail species; migrate existing pets to garden

update public.pets set species = 'garden' where species = 'ember-sail';

alter table public.pets drop constraint if exists pets_species_check;
alter table public.pets add constraint pets_species_check check (
  species in (
    'cole', 'doux', 'kira', 'kuro', 'loki', 'mono', 'mort', 'nico', 'olaf', 'sena', 'tard', 'vita',
    'garden', 'horned',
    'crag-shell', 'tide-fin', 'volt-wing'
  )
);
