# LoveConnect (Laravel backend)

Your original HTML/Bootstrap front end, served unchanged by Laravel and connected to a real database.

## What is real now
- Sign up / log in / log out (hashed passwords, server sessions, CSRF, login throttling)
- Profiles: name, age, gender, city, country, bio, goal, interests, extra profile questions
- Photo upload (up to 9, jpg/png/webp, 5 MB each), remove, main photo
- Discover: server-side filters and pagination (24 per page)
- Likes (with mutual-match detection), favorites, profile views, blocking, reporting
- Messages: real conversations between members (chat dock on Discover, Messages page, chat page; refreshes every 30 s while the tab is visible and right after you send a message)
- Notifications: likes, matches, messages, favorites, profile views, with unread badge and mark-all-read
- Settings: account (email, phone, language, password), privacy and notification switches, preferences
- Delete account (asks for password)
- Admin area (`/admin-login.html` then `/admin.html`, admins only, separate sign-in and shell): live site stats, report review with statuses and notes, member search and reversible account suspension - see `docs/ADMIN.md`

## Not built (on purpose)
- Subscriptions and payments (parked)
- Email verification and password reset emails
- Real-time sockets (polling is used), image moderation. The "Trash" tab in Messages stays empty: the original UI has no control that moves a conversation to Trash.
- No "forgot password" link exists in the original UI, so no reset flow was added
- Language switching still only changes direction/labels like the original; no translations were added

## How the front end was preserved
- `resources/frontend/*.html` are byte-identical to your files. `public/css`, `public/assets` and all JS files except two are byte-identical too.
- Laravel serves each page and adds only: a small bootstrap script (session state + CSRF) and `<script src="/js/backend.js">` at the end. No markup, class or style was edited.
- `public/js/backend.js` (new) connects forms and buttons to the API and fills the same markup with real rows.
- `public/js/demo-members.js` (changed): the 3,000 browser-generated profiles are replaced by `GET /api/members`. Card markup, pagination and chat dock are the same.
- The default static Sophia demo profile keeps its original portrait and wording. A specific member profile uses that member's data and does not show a verified badge unless actually verified. Original photo URLs and demo member mappings are preserved. Other original sample notes remain; optional wording updates are off by default.

## Run locally
```
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate
php artisan serve
```
The example configuration uses MySQL (`loveconnect`). If you prefer SQLite for a quick local run, change `DB_CONNECTION` back to `sqlite` and create `database/database.sqlite`. Open http://127.0.0.1:8000. Optional, development only: `php artisan db:seed --class=DemoMembersSeeder` adds 3,000 fictional members (refuses to run in production). Do not launch with fake members.

## تشغيل التطبيق على XAMPP مع MySQL

هذا المشروع يستخدم Laravel 12، وهو متوافق مع PHP 8.2 الموجود في XAMPP لديك.

1. شغّل Apache و MySQL من XAMPP.
2. افتح phpMyAdmin على `http://localhost/phpmyadmin` وأنشئ قاعدة بيانات باسم `loveconnect` بترميز `utf8mb4_unicode_ci`، أو نفّذ الملف `database/create_loveconnect_database.sql`.
3. انسخ `.env.example` إلى `.env` وعدّل `DB_USERNAME` و`DB_PASSWORD` إذا كان حساب MySQL لديك يستخدم كلمة مرور.
4. من مجلد المشروع نفّذ:

   ```bash
   composer install
   php artisan key:generate
   php artisan migrate
   php artisan storage:link
   ```

5. افتح `http://localhost/datingApp/public`.

   إذا كان Apache مضبوطًا على VirtualHost يشير مباشرة إلى مجلد `public`، استخدم رابط الـ VirtualHost بدل `/datingApp/public`. لا تجعل DocumentRoot يشير إلى جذر المشروع، لأن مجلد `public` هو نقطة الدخول الآمنة.

لإضافة بيانات تجريبية محليًا فقط: `php artisan db:seed --class=DemoMembersSeeder`.

## Before going live
- Use MySQL/Postgres, `APP_ENV=production`, `APP_DEBUG=false`, HTTPS, a real `APP_KEY`
- Add email verification and password reset, a moderation screen for `reports`, and age/consent and privacy-policy text that fits your target countries
- Tests: `php artisan test` (13 access-control tests)

## Messaging rule
A member with "Allow messages from everyone" switched off (the default) can only be messaged by people they have liked or already written to. Blocked members can neither message nor see each other.
