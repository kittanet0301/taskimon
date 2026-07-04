-- Track last calendar day a daily mission was claimed (for weekly_daily_5)

alter table player_activity
  add column if not exists last_daily_mission_day text;
