<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
            $table->foreignId('player1_id')->constrained('players')->cascadeOnDelete();
            $table->foreignId('player2_id')->constrained('players')->cascadeOnDelete();
            $table->integer('round_number')->nullable(); // Optional: for round-based tournaments
            $table->integer('table_number')->nullable(); // Optional: physical table assignment
            $table->boolean('completed')->default(false);
            $table->foreignId('winner_id')->nullable()->constrained('players')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['tournament_id', 'completed']);
            $table->index(['tournament_id', 'round_number']);
            $table->index('player1_id');
            $table->index('player2_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matches');
    }
};
