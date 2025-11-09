<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Player extends Model
{
    use HasFactory;

    protected $fillable = [
        'tournament_id',
        'user_id', // nullable - for anonymous players
        'name',
        'position', // Position in players array (for match generation)
        'dropped', // Player dropped from tournament
        'dropped_at',
    ];

    protected $casts = [
        'dropped' => 'boolean',
        'dropped_at' => 'datetime',
    ];

    // Relationships
    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function matchesAsPlayer1(): HasMany
    {
        return $this->hasMany(Match::class, 'player1_id');
    }

    public function matchesAsPlayer2(): HasMany
    {
        return $this->hasMany(Match::class, 'player2_id');
    }

    // Accessor for all matches (player1 or player2)
    public function matches()
    {
        return Match::where('player1_id', $this->id)
            ->orWhere('player2_id', $this->id);
    }

    // Business Logic
    public function calculateStats(): array
    {
        $matches = $this->matches()->with('games')->get();

        $matchWins = 0;
        $matchLosses = 0;
        $gameWins = 0;
        $gameLosses = 0;
        $points = 0;

        foreach ($matches as $match) {
            if (!$match->completed) {
                continue;
            }

            $isPlayer1 = $match->player1_id === $this->id;
            $gamesWon = $match->games()
                ->where('winner_id', $this->id)
                ->count();
            $gamesLost = $match->games()
                ->where('winner_id', '!=', $this->id)
                ->whereNotNull('winner_id')
                ->count();

            $gameWins += $gamesWon;
            $gameLosses += $gamesLost;

            // Match win if 2+ games won
            if ($gamesWon >= 2) {
                $matchWins++;
                $points += config('tournament.scoring.match_win', 3);
            } else {
                $matchLosses++;
            }

            // Game points
            $points += $gamesWon * config('tournament.scoring.game_win', 1);
            $points += $gamesLost * config('tournament.scoring.game_loss', -0.5);
        }

        $totalMatches = $matchWins + $matchLosses;

        return [
            'points' => $points,
            'match_wins' => $matchWins,
            'match_losses' => $matchLosses,
            'game_wins' => $gameWins,
            'game_losses' => $gameLosses,
            'match_win_percentage' => $totalMatches > 0 ? $matchWins / $totalMatches : 0,
            'game_win_percentage' => ($gameWins + $gameLosses) > 0
                ? $gameWins / ($gameWins + $gameLosses)
                : 0,
            'omw' => $this->calculateOpponentMatchWinPercentage(),
            'ogw' => $this->calculateOpponentGameWinPercentage(),
        ];
    }

    protected function calculateOpponentMatchWinPercentage(): float
    {
        $opponents = $this->getOpponents();

        if ($opponents->isEmpty()) {
            return 0;
        }

        $totalMWP = $opponents->sum(function ($opponent) {
            $stats = $opponent->calculateStats();
            return $stats['match_win_percentage'];
        });

        return $totalMWP / $opponents->count();
    }

    protected function calculateOpponentGameWinPercentage(): float
    {
        $opponents = $this->getOpponents();

        if ($opponents->isEmpty()) {
            return 0;
        }

        $totalGWP = $opponents->sum(function ($opponent) {
            $stats = $opponent->calculateStats();
            return $stats['game_win_percentage'];
        });

        return $totalGWP / $opponents->count();
    }

    protected function getOpponents()
    {
        $opponentIds = $this->matches()
            ->where('completed', true)
            ->get()
            ->map(function ($match) {
                return $match->player1_id === $this->id
                    ? $match->player2_id
                    : $match->player1_id;
            })
            ->unique();

        return Player::whereIn('id', $opponentIds)->get();
    }

    public function drop(): void
    {
        $this->update([
            'dropped' => true,
            'dropped_at' => now(),
        ]);
    }
}
