-- LoveConnect admin dashboard (reports review + member management).
-- No-SSH hosts (for example InfinityFree): import this file in phpMyAdmin for the LoveConnect database.
-- Idempotent guard: check first with  SHOW COLUMNS FROM `users` LIKE 'is_admin';  and skip this file if present.

ALTER TABLE `users`
  ADD COLUMN `is_admin` tinyint(1) NOT NULL DEFAULT 0 AFTER `is_demo`,
  ADD COLUMN `suspended_at` timestamp NULL DEFAULT NULL AFTER `last_seen_at`,
  ADD COLUMN `suspended_by` bigint unsigned NULL DEFAULT NULL AFTER `suspended_at`,
  ADD INDEX `users_is_admin_index` (`is_admin`),
  ADD CONSTRAINT `users_suspended_by_foreign` FOREIGN KEY (`suspended_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

ALTER TABLE `reports`
  ADD COLUMN `status` varchar(20) NOT NULL DEFAULT 'pending' AFTER `reason`,
  ADD COLUMN `admin_note` varchar(500) NULL DEFAULT NULL AFTER `status`,
  ADD COLUMN `reviewed_by` bigint unsigned NULL DEFAULT NULL AFTER `admin_note`,
  ADD COLUMN `reviewed_at` timestamp NULL DEFAULT NULL AFTER `reviewed_by`,
  ADD INDEX `reports_status_index` (`status`),
  ADD CONSTRAINT `reports_reviewed_by_foreign` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

-- Site management tables (announcements + site settings). Same idempotent guard applies:
-- check first with  SHOW TABLES LIKE 'site_settings';  and skip this block if present.

CREATE TABLE `site_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) NOT NULL,
  `value` text NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `site_settings_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `announcements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(120) NOT NULL,
  `body` varchar(1000) NOT NULL,
  `created_by` bigint unsigned NULL DEFAULT NULL,
  `recipient_count` int unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `announcements_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Grant admin access to the site owner's account (replace the email first, then run this line):
-- UPDATE `users` SET `is_admin` = 1 WHERE `email` = 'you@example.com';
