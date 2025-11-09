<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Match extends Model
{
    use HasFactory;

    protected $fillable = [
        'tournament_id',
        'player1_id',
        'player2_id',
        'round_number', // Optional: if you want rounds
        'table_number', // Optional: physical table assignment
        'completed',
        'winner_id', // Cached - calculated from games
        'completed_at',
    ];

    protected $casts = [
        'completed' => 'boolean',
        'completed_at' => 'datetime',
    ];

    // Relationships
    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function player1(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'player1_id');
    }

    public function player2(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'player2_id');
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'winner_id');
    }

    public function games(): HasMany
    {
        return $this->hasMany(Game::class);
    }

    // Scopes
    public function scopeIncomplete($query)
    {
        return $query->where('completed', false);
    }

    public function scopeCompleted($query)
    {
        return $query->where('completed', true);
    }

    public function scopeForPlayer($query, Player $player)
    {
        return $query->where('player1_id', $player->id)
            ->orWhere('player2_id', $player->id);
    }

    // Business Logic
    public function recordGame(int $gameNumber, Player $winner): void
    {
        // Ensure game number is 1-3
        if ($gameNumber < 1 || $gameNumber > 3) {
            throw new \InvalidArgumentException('Game number must be 1-3');
        }

        // Ensure winner is one of the players
        if ($winner->id !== $this->player1_id && $winner->id !== $this->player2_id) {
            throw new \InvalidArgumentException('Winner must be one of the match players');
        }

        // Update or create the game
        $this->games()->updateOrCreate(
            ['game_number' => $gameNumber],
            ['winner_id' => $winner->id]
        );

        $this->checkIfComplete();
    }

    public function clearGame(int $gameNumber): void
    {
        $this->games()
            ->where('game_number', $gameNumber)
            ->delete();

        $this->update(['completed' => false, 'winner_id' => null]);
    }

    protected function checkIfComplete(): void
    {
        $games = $this->games()->orderBy('game_number')->get();

        // Need at least 2 games
        if ($games->count() < 2) {
            return;
        }

        // Count wins for each player
        $player1Wins = $games->where('winner_id', $this->player1_id)->count();
        $player2Wins = $games->where('winner_id', $this->player2_id)->count();

        // Match complete if either player has 2 wins
        if ($player1Wins >= 2) {
            $this->complete($this->player1_id);
        } elseif ($player2Wins >= 2) {
            $this->complete($this->player2_id);
        }
    }

    protected function complete(int $winnerId): void
    {
        $this->update([
            'completed' => true,
            'winner_id' => $winnerId,
            'completed_at' => now(),
        ]);

        // Broadcast event for real-time updates
        broadcast(new \App\Events\MatchCompleted($this));

        // Check if tournament is complete
        if ($this->tournament->isComplete()) {
            $this->tournament->complete();
            broadcast(new \App\Events\TournamentCompleted($this->tournament));
        }
    }

    public function getGameResults(): array
    {
        $games = $this->games()->orderBy('game_number')->get();

        return [
            'game1' => $games->where('game_number', 1)->first()?->winner_id,
            'game2' => $games->where('game_number', 2)->first()?->winner_id,
            'game3' => $games->where('game_number', 3)->first()?->winner_id,
        ];
    }

    public function getPlayerGamesWon(Player $player): int
    {
        return $this->games()
            ->where('winner_id', $player->id)
            ->count();
    }
}
