<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Tournament extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'creator_id',
        'player_count',
        'matches_per_player',
        'status', // 'setup', 'active', 'completed', 'archived'
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    // Relationships
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function players(): HasMany
    {
        return $this->hasMany(Player::class);
    }

    public function matches(): HasMany
    {
        return $this->hasMany(Match::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'tournament_members')
            ->withTimestamps()
            ->withPivot('joined_at', 'left_at');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeByCode($query, string $code)
    {
        return $query->where('code', $code);
    }

    // Business Logic
    public function generateMatches(): void
    {
        // Port your tournament.js generateMatches logic here
        $players = $this->players()->orderBy('position')->get();

        // Validation: ensure (players × matches) % 2 === 0
        if (($players->count() * $this->matches_per_player) % 2 !== 0) {
            throw new \InvalidArgumentException('Invalid player/match combination');
        }

        // Generate pairings (simplified - full logic would be ported)
        // This would use your round-robin algorithm from tournament.js
    }

    public function calculateStandings(): array
    {
        // Port your tournament.js calculateStandings logic
        return $this->players()
            ->with(['matchesAsPlayer1', 'matchesAsPlayer2'])
            ->get()
            ->map(function ($player) {
                $stats = $player->calculateStats();
                return [
                    'player' => $player,
                    'points' => $stats['points'],
                    'match_wins' => $stats['match_wins'],
                    'match_losses' => $stats['match_losses'],
                    'game_wins' => $stats['game_wins'],
                    'game_losses' => $stats['game_losses'],
                    'match_win_percentage' => $stats['match_win_percentage'],
                    'game_win_percentage' => $stats['game_win_percentage'],
                    'omw' => $stats['omw'],
                    'ogw' => $stats['ogw'],
                ];
            })
            ->sortByDesc('points')
            ->sortByDesc('match_win_percentage')
            ->sortByDesc('omw')
            ->sortByDesc('game_win_percentage')
            ->sortByDesc('ogw')
            ->values()
            ->toArray();
    }

    public function isComplete(): bool
    {
        return $this->matches()->incomplete()->count() === 0;
    }

    public function start(): void
    {
        $this->update([
            'status' => 'active',
            'started_at' => now(),
        ]);

        $this->generateMatches();
    }

    public function complete(): void
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }
}
