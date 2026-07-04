-- One friendship row per player pair (regardless of direction)

-- Remove reverse duplicate; keep the older row
delete from friendships newer
using friendships older
where newer.user_id = older.friend_id
  and newer.friend_id = older.user_id
  and newer.created_at > older.created_at;

create unique index if not exists friendships_unique_pair_idx
  on friendships (least(user_id, friend_id), greatest(user_id, friend_id));
