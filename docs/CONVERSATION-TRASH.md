# Conversation Trash (Messages > Trash tab)

Adds a per-user conversation trash so the Messages page Trash tab works: the conversation menu (…) has "Move to trash", trashed conversations appear under the Trash tab, and the same menu restores them. Sending a new message to a trashed conversation restores it automatically for both sides. Messages are never deleted by trashing.

## Database update

With terminal access, after updating the code, run `php artisan migrate --force` on the target database (back it up first). No Composer dependency changes are needed.

### InfinityFree / no SSH or Artisan

1. Back up the existing database and open phpMyAdmin for the correct LoveConnect database.
2. Run `SHOW TABLES LIKE 'conversation_trashes';`. If the table exists, stop: it is already installed. Do not import the SQL again.
3. If it does not exist, import `database/conversation_trash_mysql.sql`. This creates one table matching the Laravel migration.
4. Check the table exists, then on the installed site open Messages, move a conversation to trash from its (…) menu, and confirm it appears under the Trash tab and restores.

Use one database-update route, not both. A manual SQL import does not record an Artisan migration as run; reconcile the migration history if moving to Artisan later. The source files alone do not update an existing hosted database.

## Related change: current password

Settings > Account now asks for the current password before a new password is accepted. No database change is needed for this.
