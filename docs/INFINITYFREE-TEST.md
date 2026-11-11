# Small test on InfinityFree (not a launch setup)

This prepares a limited trial. It does not remove InfinityFree's limits (about 50,000 hits per day, no SSH, no cron, no queue workers), and InfinityFree's terms on adult content have not been confirmed for dating sites. Check their current terms before using it.

## What changed for this test build
- Chat refreshes every 30 seconds instead of 5, only while the tab is visible, plus once when you return to the tab. Sending a message still refreshes immediately.
- Notifications are also checked only while the tab is visible.
- `.env.infinityfree.example` uses MySQL, no queue workers (`QUEUE_CONNECTION=sync`), production mode.
- The design, images and demo photo URLs are unchanged.

## Steps (done on your computer, then uploaded)
1. `composer install --no-dev --optimize-autoloader`
2. Copy `.env.infinityfree.example` to `.env`, fill in the MySQL host, name, user and password from the InfinityFree panel, set `APP_URL`, then run `php artisan key:generate`.
3. Upload everything (including `vendor/`) to a folder, with only `public/` contents reachable as the web root, or use a root `.htaccess` that rewrites to `public/`.
4. Create the tables: run `php artisan migrate --force` locally against the remote MySQL if the host allows remote connections. If it does not, export the schema from a local MySQL (`php artisan schema:dump` or phpMyAdmin) and import it in phpMyAdmin.
5. Make `storage/` and `bootstrap/cache/` writable.

Email verification, password reset emails and moderation are not built yet.
