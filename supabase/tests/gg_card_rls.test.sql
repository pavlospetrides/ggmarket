begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(26);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'gg-card-a@example.invalid', '{"username":"carda","display_name":"Card A"}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'gg-card-b@example.invalid', '{"username":"cardb","display_name":"Card B"}'::jsonb),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'gg-card-c@example.invalid', '{"username":"cardc","display_name":"Card C"}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select lives_ok(
  $$insert into public.gg_cards (user_id, slogan, theme_id, is_public)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Private A', 'gg-purple', false)$$,
  'active owner can insert their own private card'
);
select throws_ok(
  $$insert into public.gg_cards (user_id, slogan, theme_id, is_public)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Forged owner', 'gg-purple', false)$$,
  '42501', null,
  'owner cannot insert a card for another account'
);

select throws_ok(
  $$update public.gg_cards set theme_id = 'arbitrary-css' where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'database rejects an unknown theme identifier'
);
select throws_ok(
  $$update public.gg_cards set slogan = repeat('x', 81) where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'database rejects an oversized slogan'
);
select throws_ok(
  $$update public.gg_cards set slogan = '' where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'database rejects an empty slogan'
);
select throws_ok(
  $$update public.gg_cards set slogan = E'unsafe\ncontrol' where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'database rejects control characters'
);
select lives_ok(
  $$update public.gg_cards set slogan = $payload$'); drop table public.gg_cards; --$payload$
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'SQL-like slogan is stored as data'
);
select is(
  (select slogan from public.gg_cards where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  $payload$'); drop table public.gg_cards; --$payload$,
  'SQL-like slogan round-trips unchanged'
);
select ok(to_regclass('public.gg_cards') is not null, 'SQL-like slogan cannot alter the schema');
select lives_ok(
  $$update public.gg_cards set slogan = '<img src=x onerror=alert(1)>'
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'HTML-like slogan remains inert stored text'
);

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
select lives_ok(
  $$insert into public.gg_cards (user_id, slogan, theme_id, is_public)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Private B', 'midnight-black', false)$$,
  'second active owner can insert their own card'
);
select is(
  (select count(*) from public.gg_cards where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  0::bigint,
  'another account cannot read a private card'
);
select is(
  (select count(*) from public.gg_cards where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  1::bigint,
  'owner can read their own private card'
);
select results_eq(
  $$update public.gg_cards set slogan = 'Cross-account update'
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning user_id$$,
  $$values (null::uuid) limit 0$$,
  'another account cannot update an owner card'
);
select throws_ok(
  $$delete from public.gg_cards where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  '42501', null,
  'owners have no card delete permission'
);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select throws_ok(
  $$update public.gg_cards set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501', null,
  'card ownership is immutable'
);
select lives_ok(
  $$update public.gg_cards set slogan = 'Public A', is_public = true
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'owner can publish and update their own card'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select is(
  (select count(*) from public.gg_cards where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  1::bigint,
  'anonymous visitor can read a public card'
);
select is(
  (select count(*) from public.gg_cards where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0::bigint,
  'anonymous visitor cannot read a private card'
);
select throws_ok(
  $$select created_at from public.gg_cards where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501', null,
  'anonymous visitor cannot select non-approved card columns'
);
select throws_ok(
  $$insert into public.gg_cards (user_id, slogan, theme_id, is_public)
    values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Anonymous write', 'gg-purple', true)$$,
  '42501', null,
  'anonymous visitor cannot insert a card'
);
select throws_ok(
  $$update public.gg_cards set slogan = 'Anonymous update'
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501', null,
  'anonymous visitor cannot update a card'
);
select throws_ok(
  $$delete from public.gg_cards where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501', null,
  'anonymous visitor cannot delete a card'
);

reset role;
update public.profiles set suspended_at = now()
where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
select throws_ok(
  $$insert into public.gg_cards (user_id, slogan, theme_id, is_public)
    values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Suspended write', 'gg-purple', true)$$,
  '42501', null,
  'suspended account cannot insert a card'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
insert into public.gg_cards (user_id, slogan, theme_id, is_public)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Suspended public card', 'crimson', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
select results_eq(
  $$update public.gg_cards set slogan = 'Suspended update'
    where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' returning user_id$$,
  $$values (null::uuid) limit 0$$,
  'suspended account cannot update an existing card'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select is(
  (select count(*) from public.gg_cards where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  0::bigint,
  'public card is hidden when its profile is suspended'
);

select * from finish();
rollback;
