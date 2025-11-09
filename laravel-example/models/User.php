<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'dci_number', // Magic-specific
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    // Relationships
    public function createdTournaments(): HasMany
    {
        return $this->hasMany(Tournament::class, 'creator_id');
    }

    public function tournaments(): BelongsToMany
    {
        return $this->belongsToMany(Tournament::class, 'tournament_members')
            ->withTimestamps()
            ->withPivot('joined_at', 'left_at');
    }

    public function players(): HasMany
    {
        return $this->hasMany(Player::class);
    }

    // Helper methods
    public function activeTournaments()
    {
        return $this->tournaments()
            ->where('status', 'active')
            ->whereNull('tournament_members.left_at');
    }

    public function isInTournament(Tournament $tournament): bool
    {
        return $this->tournaments()
            ->where('tournaments.id', $tournament->id)
            ->whereNull('tournament_members.left_at')
            ->exists();
    }

    public function canManageTournament(Tournament $tournament): bool
    {
        return $this->id === $tournament->creator_id;
    }
}
