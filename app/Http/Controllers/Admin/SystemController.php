<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Read-only health checks so the owner can verify a no-SSH deployment without shell access. */
class SystemController extends Controller
{
    public function show()
    {
        try {
            DB::select('select 1');
            $db = ['ok' => true, 'driver' => DB::connection()->getDriverName()];
        } catch (\Throwable $e) {
            $db = ['ok' => false, 'driver' => config('database.default')];
        }
        $checks = [
            'users.is_admin column' => Schema::hasColumn('users', 'is_admin'),
            'users.suspended_at column' => Schema::hasColumn('users', 'suspended_at'),
            'reports.status column' => Schema::hasColumn('reports', 'status'),
            'site_settings table' => Schema::hasTable('site_settings'),
            'announcements table' => Schema::hasTable('announcements'),
            'conversation_trashes table' => Schema::hasTable('conversation_trashes'),
            'storage symlink (photo uploads)' => is_link(public_path('storage')),
        ];
        return [
            'php' => PHP_VERSION,
            'laravel' => app()->version(),
            'environment' => app()->environment(),
            'debug' => (bool) config('app.debug'),
            'database' => $db,
            'checks' => $checks,
            'registrations_open' => SiteSetting::registrationsOpen(),
            'mailer' => config('mail.default'),
            'mail_note' => 'Transactional mail is not configured yet: no email verification or password reset emails.',
        ];
    }
}
