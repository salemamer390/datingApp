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
- **Announcements** - write a title and message, preview exactly what members will see, then
  confirm the send. Every real member gets it as an in-app notification in the existing feed;
  demo accounts and members who switched off "Website updates" in their notification settings
  are skipped. Sent announcements are listed with their recipient count, sender and time.
- **Site controls** - open or close new member registration. When closed, the signup form
  refuses new accounts with a friendly message; existing members are unaffected. The setting
  lives in the `site_settings` key-value table, ready for future controls without schema changes.
- **System** - read-only health of the deployment: PHP and Laravel versions, database
  connectivity and driver, a `debug ON` warning, registration status, the mailer state
  (transactional mail is not configured yet: no email verification or password reset emails),
  and setup checks (admin/report/site tables present, storage symlink for photo uploads).

The Overview "Site-wide activity" counters are aggregate usage across all members.
Conversation contents are never shown anywhere in the dashboard.

Member accounts are never deleted from this screen on purpose.

## Translation widget

The site-wide Google Translate widget does not load on `admin.html` (the page carries
`data-no-translate`): admin data such as member emails and reports must not leave the browser
for Google, and the floating pill would overlap admin controls. Member pages are unchanged.

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

The account does not need to complete onboarding to use the dashboard. Open
`/admin-login.html` and sign in with that account.

## Suspended members

A suspended member cannot log in (clear message), is redirected away from member pages, and
their API calls return 403. Reactivating restores full access immediately.
