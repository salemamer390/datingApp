<?php

use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Admin access is granted only by deliberate action here (or the documented SQL in database/admin_mysql.sql).
// Nobody becomes an admin automatically: not the first signup, not any existing member.
Artisan::command('loveconnect:make-admin {email : account email} {--remove : revoke admin instead of granting}', function () {
    $email = strtolower(trim((string) $this->argument('email')));
    $user = User::where('email', $email)->first();
    if (! $user) {
        $this->error("No account found with email {$email}.");
        return 1;
    }
    if ($this->option('remove')) {
        if ($user->is_admin && User::where('is_admin', true)->count() <= 1) {
            $this->error('Refusing to remove the last admin. Grant another account first.');
            return 1;
        }
        $user->forceFill(['is_admin' => false])->save();
        $this->info("{$user->email} is no longer an admin.");
        return 0;
    }
    $user->forceFill(['is_admin' => true])->save();
    $this->info("{$user->email} is now an admin and can open /admin.html.");
    return 0;
})->purpose('Grant or revoke LoveConnect admin access for an account email');
