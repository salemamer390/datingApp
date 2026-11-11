<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversation_trashes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('member_id')->constrained('users')->cascadeOnDelete();
            $t->timestamps();
            $t->unique(['user_id', 'member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_trashes');
    }
};
