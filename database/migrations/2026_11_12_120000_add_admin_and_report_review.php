<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->boolean('is_admin')->default(false)->index()->after('is_demo');
            $t->timestamp('suspended_at')->nullable()->after('last_seen_at');
            $t->foreignId('suspended_by')->nullable()->after('suspended_at')->constrained('users')->nullOnDelete();
        });
        Schema::table('reports', function (Blueprint $t) {
            $t->string('status', 20)->default('pending')->index()->after('reason');
            $t->string('admin_note', 500)->nullable()->after('status');
            $t->foreignId('reviewed_by')->nullable()->after('admin_note')->constrained('users')->nullOnDelete();
            $t->timestamp('reviewed_at')->nullable()->after('reviewed_by');
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $t) {
            $t->dropConstrainedForeignId('reviewed_by');
            $t->dropColumn(['status', 'admin_note', 'reviewed_at']);
        });
        Schema::table('users', function (Blueprint $t) {
            $t->dropConstrainedForeignId('suspended_by');
            $t->dropColumn(['is_admin', 'suspended_at']);
        });
    }
};
