-- For hosts without Artisan/SSH (for example a phpMyAdmin-managed MySQL database).
-- Back up the database, select the correct existing LoveConnect database,
-- and FIRST run: SHOW COLUMNS FROM users LIKE 'onboarding_completed_at';
-- If it returns a row, this update is already installed: do NOT import this file.
-- Use either this SQL route OR php artisan migrate, not both on the same DB.
-- No DROP/DELETE statements and no real member data are included.

ALTER TABLE `users` ADD COLUMN `onboarding_completed_at` TIMESTAMP NULL DEFAULT NULL;

UPDATE `users`
SET `onboarding_completed_at` = CURRENT_TIMESTAMP
WHERE `is_demo` = 1 OR (
    `age` BETWEEN 18 AND 100
    AND `gender` IN ('man', 'woman')
    AND `country` IS NOT NULL AND `country` <> ''
    AND `city` IS NOT NULL AND `city` <> ''
    AND `interests` IS NOT NULL AND `interests` <> ''
);

-- Artisan migration tracking is intentionally not changed by a manual SQL import.
-- If later switching to Artisan, reconcile this already-installed schema update
-- before running the matching 2026_11_11_180000 migration. Do not re-add the column.
