<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained()->cascadeOnDelete();
            $table->tinyInteger('game_number'); // 1, 2, or 3
            $table->foreignId('winner_id')->constrained('players')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['match_id', 'game_number']);
            $table->index('match_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('games');
    }
};
