<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('onboarding_completed_at')->nullable();
        });
        // Keep demo members and already-filled real profiles working, without inventing answers.
        DB::table('users')->where('is_demo', true)->orWhere(function ($q) {
            $q->whereBetween('age', [18, 100])->whereIn('gender', ['man', 'woman'])
                ->whereNotNull('country')->where('country', '!=', '')
                ->whereNotNull('city')->where('city', '!=', '')
                ->whereNotNull('interests')->where('interests', '!=', '');
        })->update(['onboarding_completed_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('onboarding_completed_at'));
    }
};
