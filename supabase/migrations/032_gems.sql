-- Migration 032: Gems currency (soft currency, earned from mission claims for now — no shop yet)

alter table player_activity
  add column if not exists gems int not null default 0;
