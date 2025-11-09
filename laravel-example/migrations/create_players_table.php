<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name'); // For anonymous players or display override
            $table->integer('position'); // Position in player array (0-indexed)
            $table->boolean('dropped')->default(false);
            $table->timestamp('dropped_at')->nullable();
            $table->timestamps();

            $table->index(['tournament_id', 'position']);
            $table->index(['tournament_id', 'dropped']);
            $table->unique(['tournament_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('players');
    }
};
