<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('gender', 10)->nullable()->index();
            $t->unsignedTinyInteger('age')->nullable()->index();
            $t->string('city')->nullable()->index();
            $t->string('country')->nullable()->index();
            $t->string('region')->nullable();
            $t->string('goal', 20)->default('serious')->index();
            $t->text('bio')->nullable();
            $t->string('interests')->nullable();
            $t->string('phone')->nullable();
            $t->string('language', 5)->default('en');
            $t->string('photo_url')->nullable();
            $t->boolean('is_demo')->default(false)->index();
            $t->timestamp('last_seen_at')->nullable()->index();
            $t->json('settings')->nullable();
        });

        Schema::create('photos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('path');
            $t->unsignedTinyInteger('position')->default(0);
            $t->timestamps();
        });

        foreach (['likes', 'favorites', 'blocks'] as $name) {
            Schema::create($name, function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->constrained()->cascadeOnDelete();
                $t->foreignId('target_id')->constrained('users')->cascadeOnDelete();
                $t->timestamps();
                $t->unique(['user_id', 'target_id']);
                $t->index('target_id');
            });
        }

        Schema::create('profile_views', function (Blueprint $t) {
            $t->id();
            $t->foreignId('viewer_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('viewed_id')->constrained('users')->cascadeOnDelete();
            $t->timestamps();
            $t->unique(['viewer_id', 'viewed_id']);
            $t->index('viewed_id');
        });

        Schema::create('messages', function (Blueprint $t) {
            $t->id();
            $t->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('recipient_id')->constrained('users')->cascadeOnDelete();
            $t->string('body', 1000);
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
            $t->index(['sender_id', 'recipient_id']);
            $t->index(['recipient_id', 'read_at']);
        });

        Schema::create('notifications_feed', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('actor_id')->nullable()->constrained('users')->cascadeOnDelete();
            $t->string('type', 20); // like, match, message, favorite, view, safety
            $t->string('title');
            $t->string('body')->nullable();
            $t->string('href')->nullable();
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
            $t->index(['user_id', 'read_at']);
        });

        Schema::create('reports', function (Blueprint $t) {
            $t->id();
            $t->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('target_id')->constrained('users')->cascadeOnDelete();
            $t->string('reason', 500)->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['reports', 'notifications_feed', 'messages', 'profile_views', 'blocks', 'favorites', 'likes', 'photos'] as $n) {
            Schema::dropIfExists($n);
        }
    }
};
