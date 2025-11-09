<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournaments', function (Blueprint $table) {
            $table->id();
            $table->string('code', 6)->unique(); // e.g., "ABC123"
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();
            $table->integer('player_count')->default(0);
            $table->integer('matches_per_player')->default(3);
            $table->enum('status', ['setup', 'active', 'completed', 'archived'])->default('setup');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index('code');
            $table->index('status');
            $table->index('creator_id');
        });

        // Pivot table for tournament members
        Schema::create('tournament_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('joined_at')->useCurrent();
            $table->timestamp('left_at')->nullable();
            $table->timestamps();

            $table->unique(['tournament_id', 'user_id']);
            $table->index(['tournament_id', 'left_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournament_members');
        Schema::dropIfExists('tournaments');
    }
};
