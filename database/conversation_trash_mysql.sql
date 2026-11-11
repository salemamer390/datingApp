-- LoveConnect conversation Trash (Messages > Trash tab).
-- No-SSH hosts (for example InfinityFree): import this file in phpMyAdmin for the LoveConnect database.
-- Idempotent guard: check first with  SHOW TABLES LIKE 'conversation_trashes';  and skip if it exists.

CREATE TABLE `conversation_trashes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `member_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `conversation_trashes_user_id_member_id_unique` (`user_id`,`member_id`),
  KEY `conversation_trashes_member_id_foreign` (`member_id`),
  CONSTRAINT `conversation_trashes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversation_trashes_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
