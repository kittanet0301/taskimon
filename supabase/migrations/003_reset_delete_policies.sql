-- Allow users to delete battle logs tied to their pets (needed for "clear all data")

create policy "battles delete own pets" on battles
  for delete using (
    exists (
      select 1 from pets
      where pets.id = battles.challenger_pet_id and pets.owner_id = auth.uid()
    )
    or exists (
      select 1 from pets
      where pets.id = battles.defender_pet_id and pets.owner_id = auth.uid()
    )
    or exists (
      select 1 from pets
      where pets.id = battles.winner_pet_id and pets.owner_id = auth.uid()
    )
  );
