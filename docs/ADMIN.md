# Admin dashboard

`admin.html` is a separate dashboard for managing the site. It is not part of the member pages:
guests are asked to log in and ordinary members get a 404. All admin API endpoints return
`403 Admin access required` for non-admins. Every number and row in the dashboard is live
database data; there is no sample content.

## What it covers

- **Overview** - real counters: members (total, new 7/30 days, online now, suspended, demo),
  activity (messages, likes, matches, favorites, blocks, profile views, photos) and report counts.
- **Reports** - review member reports, filter by status, add an admin note, mark `resolved` or
  `dismissed`, or reopen to `pending`. Each reviewed report records who reviewed it and when.
- **Members** - search by name or email, filter (real / pending reports / suspended / admins /
  demo), open a member's details with their report history, and suspend or reactivate an account.
  Suspending is reversible: the member can no longer log in and every API call answers 403 until
  reactivated. Admin accounts cannot be suspended, and an admin cannot suspend themselves.
  Every suspension records which admin applied it (`suspended_by`) and when (`suspended_at`),
  and every reviewed report records the reviewer and time.

Member accounts are never deleted from this screen on purpose.

## Database

`php artisan migrate` adds the columns. On a no-SSH host (for example InfinityFree), import
`database/admin_mysql.sql` in phpMyAdmin instead (it is guarded and safe to skip when applied).

## Granting admin access

Nobody becomes an admin automatically - not the first signup and not any existing member.
Admin access is granted deliberately per account email:

- With shell access: `php artisan loveconnect:make-admin you@example.com`
  (revoke with `php artisan loveconnect:make-admin you@example.com --remove`;
  the command refuses to remove the last admin).
- On a no-SSH host: run the commented `UPDATE` at the bottom of `database/admin_mysql.sql`
  in phpMyAdmin with the chosen account's email.

The account does not need to complete onboarding to use the dashboard. Open `/admin.html`
after logging in.

## Suspended members

A suspended member cannot log in (clear message), is redirected away from member pages, and
their API calls return 403. Reactivating restores full access immediately.
