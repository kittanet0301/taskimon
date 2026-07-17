-- Remove unused columns:
-- - profiles.birth_date (signup no longer collects it)
-- - profiles.avatar_url (never used by the app)
-- - pets.element (always 'none'; combat no longer uses elements)

-- 1) Profiles cleanup
alter table public.profiles drop column if exists birth_date;
alter table public.profiles drop column if exists avatar_url;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
begin
  code := upper(substr(md5(random()::text), 1, 6));
  insert into public.profiles (id, username, friend_code)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1)),
    code
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop function if exists public.reset_password_by_birthdate(text);

-- 2) Battle: stop reading pets.element, then drop the column
create or replace function public.battle_submit_action(p_session_id uuid, p_action text)
returns battle_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sess battle_sessions;
  is_challenger boolean;
  actor_name text;
  opp_name text;
  base_dmg int;
  random_factor numeric;
  dmg int;
  effective_action text;
  msg text;
  winner uuid;
  winner_name text;
  opp_defending boolean;
  opp_avoiding boolean;
  actor_energy int;
  new_energy int;
  energy_gain int := 0;
  dodged boolean := false;
  shield_reduction numeric;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_action not in ('bite', 'jump', 'tailwhip', 'shield', 'avoid', 'ultimate', 'flee') then
    raise exception 'Invalid action';
  end if;

  select * into sess from battle_sessions where id = p_session_id for update;

  if sess.id is null then
    raise exception 'Session not found';
  end if;

  if sess.status <> 'active' then
    raise exception 'Session not active';
  end if;

  if sess.turn_user_id <> uid then
    raise exception 'Not your turn';
  end if;

  is_challenger := uid = sess.challenger_user_id;

  if is_challenger then
    select name into actor_name from pets where id = sess.challenger_pet_id;
    select name into opp_name from pets where id = sess.defender_pet_id;
    opp_defending := sess.defender_defending;
    opp_avoiding := sess.defender_avoiding;
    actor_energy := sess.challenger_energy;
  else
    select name into actor_name from pets where id = sess.defender_pet_id;
    select name into opp_name from pets where id = sess.challenger_pet_id;
    opp_defending := sess.challenger_defending;
    opp_avoiding := sess.challenger_avoiding;
    actor_energy := sess.defender_energy;
  end if;

  if p_action = 'flee' then
    update battle_sessions
    set
      status = 'fled',
      fled_user_id = uid,
      winner_user_id = case when is_challenger then sess.defender_user_id else sess.challenger_user_id end
    where id = p_session_id
    returning * into sess;

    msg := actor_name || ' หลบหนีจากการต่อสู้';

    insert into battle_turns (
      session_id, actor_user_id, action, damage,
      challenger_hp_after, defender_hp_after, message
    ) values (
      p_session_id, uid, 'flee', 0,
      sess.challenger_hp, sess.defender_hp, msg
    );

    if sess.winner_user_id = sess.challenger_user_id then
      select name into winner_name from pets where id = sess.challenger_pet_id;
    else
      select name into winner_name from pets where id = sess.defender_pet_id;
    end if;

    insert into battle_turns (
      session_id, actor_user_id, action, damage,
      challenger_hp_after, defender_hp_after, message
    ) values (
      p_session_id, sess.winner_user_id, 'bite', 0,
      sess.challenger_hp, sess.defender_hp, 'ผู้ชนะ: ' || winner_name
    );

    perform public.battle_finalize(p_session_id);
    return sess;
  end if;

  if p_action = 'shield' then
    energy_gain := 10 + floor(random() * 21)::int;
    new_energy := least(100, actor_energy + energy_gain);

    if is_challenger then
      update battle_sessions
      set
        challenger_defending = true,
        challenger_avoiding = false,
        challenger_energy = new_energy,
        turn_user_id = sess.defender_user_id
      where id = p_session_id returning * into sess;
    else
      update battle_sessions
      set
        defender_defending = true,
        defender_avoiding = false,
        defender_energy = new_energy,
        turn_user_id = sess.challenger_user_id
      where id = p_session_id returning * into sess;
    end if;

    msg := actor_name || ' ตั้งเกราะป้องกัน (+' || energy_gain || '% พลัง)';

    insert into battle_turns (
      session_id, actor_user_id, action, damage,
      challenger_hp_after, defender_hp_after, message
    ) values (
      p_session_id, uid, 'shield', 0,
      sess.challenger_hp, sess.defender_hp, msg
    );

    return sess;
  end if;

  if p_action = 'avoid' then
    energy_gain := 5 + floor(random() * 11)::int;
    new_energy := least(100, actor_energy + energy_gain);

    if is_challenger then
      update battle_sessions
      set
        challenger_avoiding = true,
        challenger_defending = false,
        challenger_energy = new_energy,
        turn_user_id = sess.defender_user_id
      where id = p_session_id returning * into sess;
    else
      update battle_sessions
      set
        defender_avoiding = true,
        defender_defending = false,
        defender_energy = new_energy,
        turn_user_id = sess.challenger_user_id
      where id = p_session_id returning * into sess;
    end if;

    msg := actor_name || ' ตั้งท่าหลบหลีก (+' || energy_gain || '% พลัง)';

    insert into battle_turns (
      session_id, actor_user_id, action, damage,
      challenger_hp_after, defender_hp_after, message
    ) values (
      p_session_id, uid, 'avoid', 0,
      sess.challenger_hp, sess.defender_hp, msg
    );

    return sess;
  end if;

  if p_action = 'ultimate' then
    if actor_energy < 100 then
      raise exception 'ท่าไม้ตายยังไม่พร้อม (ต้องการพลัง 100%%)';
    end if;
    effective_action := 'ultimate';
    new_energy := 0;
    base_dmg := 30;
  else
    effective_action := p_action;
    if p_action = 'jump' then
      energy_gain := 20 + floor(random() * 21)::int;
      base_dmg := 22;
    elsif p_action = 'tailwhip' then
      energy_gain := 10 + floor(random() * 16)::int;
      base_dmg := 10;
    else
      energy_gain := 15 + floor(random() * 21)::int;
      base_dmg := 15;
    end if;
    new_energy := least(100, actor_energy + energy_gain);
  end if;

  random_factor := 0.9 + random() * 0.2;
  dmg := round(base_dmg * random_factor)::int;

  if opp_avoiding then
    if random() < 0.35 then
      dodged := true;
      dmg := 0;
    end if;
  end if;

  if not dodged and opp_defending then
    shield_reduction := case when effective_action = 'tailwhip' then 0.75 else 0.5 end;
    dmg := round(dmg * shield_reduction)::int;
  end if;

  if is_challenger then
    update battle_sessions
    set
      defender_hp = greatest(0, sess.defender_hp - dmg),
      challenger_energy = new_energy,
      defender_defending = false,
      defender_avoiding = false,
      turn_user_id = sess.defender_user_id
    where id = p_session_id
    returning * into sess;
  else
    update battle_sessions
    set
      challenger_hp = greatest(0, sess.challenger_hp - dmg),
      defender_energy = new_energy,
      challenger_defending = false,
      challenger_avoiding = false,
      turn_user_id = sess.challenger_user_id
    where id = p_session_id
    returning * into sess;
  end if;

  if dodged then
    msg := opp_name || ' หลบการโจมตีของ ' || actor_name || ' ได้สำเร็จ!';
  elsif effective_action = 'ultimate' then
    msg := actor_name || ' ใช้ท่าไม้ตาย ' || opp_name || ' -' || dmg || ' HP';
  elsif effective_action = 'jump' then
    msg := actor_name || ' กระโดดกระแทก ' || opp_name || ' -' || dmg || ' HP (+' || energy_gain || '% พลัง)';
  elsif effective_action = 'tailwhip' then
    msg := actor_name || ' ฟาดหาง ' || opp_name || ' -' || dmg || ' HP (+' || energy_gain || '% พลัง)';
  else
    msg := actor_name || ' กัด ' || opp_name || ' -' || dmg || ' HP (+' || energy_gain || '% พลัง)';
  end if;

  insert into battle_turns (
    session_id, actor_user_id, action, damage,
    challenger_hp_after, defender_hp_after, message
  ) values (
    p_session_id, uid, p_action, dmg,
    sess.challenger_hp, sess.defender_hp, msg
  );

  if sess.challenger_hp <= 0 or sess.defender_hp <= 0 then
    if sess.challenger_hp <= 0 and sess.defender_hp <= 0 then
      winner := case when random() < 0.5 then sess.challenger_user_id else sess.defender_user_id end;
    elsif sess.defender_hp <= 0 then
      winner := sess.challenger_user_id;
    else
      winner := sess.defender_user_id;
    end if;

    update battle_sessions
    set status = 'completed', winner_user_id = winner
    where id = p_session_id
    returning * into sess;

    if winner = sess.challenger_user_id then
      select name into winner_name from pets where id = sess.challenger_pet_id;
    else
      select name into winner_name from pets where id = sess.defender_pet_id;
    end if;

    insert into battle_turns (
      session_id, actor_user_id, action, damage,
      challenger_hp_after, defender_hp_after, message
    ) values (
      p_session_id, winner, 'bite', 0,
      sess.challenger_hp, sess.defender_hp, 'ผู้ชนะ: ' || winner_name
    );

    perform public.battle_finalize(p_session_id);
  end if;

  return sess;
end;
$$;

alter table public.pets drop constraint if exists pets_element_check;
alter table public.pets drop column if exists element;
drop function if exists public.battle_element_mult(text, text);
