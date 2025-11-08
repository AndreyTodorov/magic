# Laravel 12 Migration Guide: Magic Mikes Tournament

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Comparison](#architecture-comparison)
3. [Technology Stack](#technology-stack)
4. [Database Design](#database-design)
5. [Laravel Backend Structure](#laravel-backend-structure)
6. [React Frontend Structure](#react-frontend-structure)
7. [WebSockets Implementation](#websockets-implementation)
8. [Migration Steps](#migration-steps)
9. [Feature Mapping](#feature-mapping)
10. [JavaScript Functions Migration](#javascript-functions-migration)
11. [Testing Strategy](#testing-strategy)
12. [Deployment Checklist](#deployment-checklist)

---

## Project Overview

### Current Architecture
- **Frontend**: Vanilla JavaScript with class-based modules
- **Storage**: Firebase Realtime Database OR localStorage
- **Real-time**: Firebase listeners
- **Hosting**: Static HTML files

### Target Architecture
- **Backend**: Laravel 12 (PHP 8.3+)
- **Frontend**: React 18+ with TypeScript
- **Styling**: Tailwind CSS 4
- **Real-time**: Laravel Reverb (WebSockets)
- **Database**: MySQL 8+ or PostgreSQL 15+
- **Authentication**: Laravel Sanctum (SPA authentication)
- **Caching**: Redis (for session management and real-time state)

---

## Architecture Comparison

### Current Flow
```
User Browser
    ↓
Static HTML/JS/CSS
    ↓
Firebase SDK (Anonymous Auth)
    ↓
Firebase Realtime Database
```

### New Flow
```
User Browser (React SPA)
    ↓
Laravel API (RESTful + WebSockets)
    ↓
MySQL/PostgreSQL Database
    ↓
Laravel Reverb (WebSockets)
    ↓
Redis (Caching & Real-time)
```

---

## Technology Stack

### Backend Dependencies
```json
{
  "laravel/framework": "^12.0",
  "laravel/reverb": "^1.0",
  "laravel/sanctum": "^4.0",
  "predis/predis": "^2.0",
  "laravel/telescope": "^5.0" // Development only
}
```

### Frontend Dependencies
```json
{
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "typescript": "^5.5.0",
  "@vitejs/plugin-react": "^4.3.0",
  "tailwindcss": "^4.0.0",
  "laravel-echo": "^1.16.0",
  "pusher-js": "^8.4.0",
  "axios": "^1.7.0",
  "react-router-dom": "^6.26.0",
  "zustand": "^4.5.0" // State management
}
```

---

## Database Design

### Schema Overview

#### 1. **tournaments** table
```sql
CREATE TABLE tournaments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(8) UNIQUE NOT NULL,
    creator_id BIGINT UNSIGNED NULL,
    player_count TINYINT UNSIGNED NOT NULL,
    matches_per_player TINYINT UNSIGNED NOT NULL,
    status ENUM('active', 'completed', 'archived') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    INDEX idx_code (code),
    INDEX idx_creator (creator_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),

    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
);
```

#### 2. **players** table
```sql
CREATE TABLE players (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tournament_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(30) NOT NULL,
    position TINYINT UNSIGNED NOT NULL, -- Index in players array (0-11)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tournament (tournament_id),
    INDEX idx_position (tournament_id, position),

    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tournament_position (tournament_id, position)
);
```

#### 3. **matches** table
```sql
CREATE TABLE matches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tournament_id BIGINT UNSIGNED NOT NULL,
    match_number TINYINT UNSIGNED NOT NULL, -- 0-based index
    player1_id BIGINT UNSIGNED NOT NULL,
    player2_id BIGINT UNSIGNED NOT NULL,
    winner TINYINT UNSIGNED NULL, -- 1 or 2, NULL if not completed
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tournament (tournament_id),
    INDEX idx_match_number (tournament_id, match_number),
    INDEX idx_player1 (player1_id),
    INDEX idx_player2 (player2_id),
    INDEX idx_completed (tournament_id, completed),

    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (player1_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (player2_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tournament_match (tournament_id, match_number)
);
```

#### 4. **games** table
```sql
CREATE TABLE games (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    match_id BIGINT UNSIGNED NOT NULL,
    game_number TINYINT UNSIGNED NOT NULL, -- 0, 1, 2 (Best of 3)
    winner TINYINT UNSIGNED NULL, -- 1 or 2, NULL if not played
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_match (match_id),
    INDEX idx_game_number (match_id, game_number),

    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    UNIQUE KEY unique_match_game (match_id, game_number)
);
```

#### 5. **tournament_members** table
```sql
CREATE TABLE tournament_members (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tournament_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tournament (tournament_id),
    INDEX idx_user (user_id),
    INDEX idx_last_seen (tournament_id, last_seen_at),

    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tournament_user (tournament_id, user_id)
);
```

#### 6. **users** table (optional - for anonymous auth)
```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    anonymous_id VARCHAR(255) UNIQUE NULL, -- For anonymous sessions
    email VARCHAR(255) UNIQUE NULL,
    password VARCHAR(255) NULL,
    name VARCHAR(255) NULL,
    is_anonymous BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_anonymous (anonymous_id),
    INDEX idx_email (email)
);
```

### Laravel Migration Files

#### Create Tournaments Migration
```php
// database/migrations/2025_01_XX_create_tournaments_table.php
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
            $table->string('code', 8)->unique();
            $table->foreignId('creator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedTinyInteger('player_count');
            $table->unsignedTinyInteger('matches_per_player');
            $table->enum('status', ['active', 'completed', 'archived'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['code']);
            $table->index(['status']);
            $table->index(['created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournaments');
    }
};
```

#### Create Players Migration
```php
// database/migrations/2025_01_XX_create_players_table.php
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
            $table->string('name', 30);
            $table->unsignedTinyInteger('position');
            $table->timestamps();

            $table->index(['tournament_id']);
            $table->unique(['tournament_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('players');
    }
};
```

#### Create Matches Migration
```php
// database/migrations/2025_01_XX_create_matches_table.php
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
            $table->unsignedTinyInteger('match_number');
            $table->foreignId('player1_id')->constrained('players')->cascadeOnDelete();
            $table->foreignId('player2_id')->constrained('players')->cascadeOnDelete();
            $table->unsignedTinyInteger('winner')->nullable();
            $table->boolean('completed')->default(false);
            $table->timestamps();

            $table->index(['tournament_id']);
            $table->index(['tournament_id', 'completed']);
            $table->unique(['tournament_id', 'match_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matches');
    }
};
```

#### Create Games Migration
```php
// database/migrations/2025_01_XX_create_games_table.php
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
            $table->unsignedTinyInteger('game_number');
            $table->unsignedTinyInteger('winner')->nullable();
            $table->timestamps();

            $table->index(['match_id']);
            $table->unique(['match_id', 'game_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('games');
    }
};
```

#### Create Tournament Members Migration
```php
// database/migrations/2025_01_XX_create_tournament_members_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournament_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('joined_at')->useCurrent();
            $table->timestamp('last_seen_at')->useCurrent()->useCurrentOnUpdate();

            $table->index(['tournament_id']);
            $table->index(['user_id']);
            $table->unique(['tournament_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournament_members');
    }
};
```

---

## Laravel Backend Structure

### Directory Structure
```
app/
├── Broadcasting/
│   └── TournamentChannel.php
├── Events/
│   ├── MatchUpdated.php
│   ├── TournamentCreated.php
│   └── TournamentUpdated.php
├── Http/
│   ├── Controllers/
│   │   ├── TournamentController.php
│   │   ├── MatchController.php
│   │   └── StandingsController.php
│   ├── Requests/
│   │   ├── CreateTournamentRequest.php
│   │   ├── JoinTournamentRequest.php
│   │   └── UpdateMatchRequest.php
│   ├── Resources/
│   │   ├── TournamentResource.php
│   │   ├── MatchResource.php
│   │   ├── PlayerResource.php
│   │   └── StandingsResource.php
│   └── Middleware/
│       └── EnsureTournamentAccess.php
├── Models/
│   ├── Tournament.php
│   ├── Player.php
│   ├── Match.php
│   ├── Game.php
│   ├── TournamentMember.php
│   └── User.php
├── Services/
│   ├── TournamentService.php
│   ├── MatchGenerationService.php
│   ├── StandingsCalculator.php
│   └── TournamentCodeGenerator.php
└── Repositories/
    ├── TournamentRepository.php
    └── MatchRepository.php
```

### Core Models

#### Tournament Model
```php
<?php
// app/Models/Tournament.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tournament extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code',
        'creator_id',
        'player_count',
        'matches_per_player',
        'status',
    ];

    protected $casts = [
        'player_count' => 'integer',
        'matches_per_player' => 'integer',
    ];

    /**
     * Get the creator of the tournament
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    /**
     * Get all players in the tournament
     */
    public function players(): HasMany
    {
        return $this->hasMany(Player::class)->orderBy('position');
    }

    /**
     * Get all matches in the tournament
     */
    public function matches(): HasMany
    {
        return $this->hasMany(Match::class)->orderBy('match_number');
    }

    /**
     * Get all members (users) watching this tournament
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'tournament_members')
            ->withPivot(['joined_at', 'last_seen_at'])
            ->withTimestamps();
    }

    /**
     * Check if tournament is complete
     */
    public function isComplete(): bool
    {
        return $this->matches()->where('completed', false)->count() === 0;
    }

    /**
     * Get completion progress
     */
    public function getProgress(): array
    {
        $total = $this->matches()->count();
        $completed = $this->matches()->where('completed', true)->count();

        return [
            'completed' => $completed,
            'total' => $total,
            'percentage' => $total > 0 ? ($completed / $total) * 100 : 0,
        ];
    }

    /**
     * Broadcast channel name
     */
    public function broadcastChannel(): string
    {
        return "tournament.{$this->code}";
    }
}
```

#### Player Model
```php
<?php
// app/Models/Player.php

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
        'name',
        'position',
    ];

    protected $casts = [
        'position' => 'integer',
    ];

    /**
     * Get the tournament this player belongs to
     */
    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    /**
     * Get matches where this player is player1
     */
    public function matchesAsPlayer1(): HasMany
    {
        return $this->hasMany(Match::class, 'player1_id');
    }

    /**
     * Get matches where this player is player2
     */
    public function matchesAsPlayer2(): HasMany
    {
        return $this->hasMany(Match::class, 'player2_id');
    }

    /**
     * Get all matches for this player
     */
    public function allMatches()
    {
        return Match::where('player1_id', $this->id)
            ->orWhere('player2_id', $this->id)
            ->get();
    }
}
```

#### Match Model
```php
<?php
// app/Models/Match.php

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
        'match_number',
        'player1_id',
        'player2_id',
        'winner',
        'completed',
    ];

    protected $casts = [
        'match_number' => 'integer',
        'winner' => 'integer',
        'completed' => 'boolean',
    ];

    /**
     * Get the tournament this match belongs to
     */
    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    /**
     * Get player 1
     */
    public function player1(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'player1_id');
    }

    /**
     * Get player 2
     */
    public function player2(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'player2_id');
    }

    /**
     * Get all games in this match
     */
    public function games(): HasMany
    {
        return $this->hasMany(Game::class)->orderBy('game_number');
    }

    /**
     * Update match based on game results
     */
    public function updateFromGames(): void
    {
        $games = $this->games;
        $player1Wins = $games->where('winner', 1)->count();
        $player2Wins = $games->where('winner', 2)->count();

        if ($player1Wins >= 2) {
            $this->winner = 1;
            $this->completed = true;
        } elseif ($player2Wins >= 2) {
            $this->winner = 2;
            $this->completed = true;
        } else {
            $this->winner = null;
            $this->completed = false;
        }

        $this->save();
    }
}
```

#### Game Model
```php
<?php
// app/Models/Game.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Game extends Model
{
    use HasFactory;

    protected $fillable = [
        'match_id',
        'game_number',
        'winner',
    ];

    protected $casts = [
        'game_number' => 'integer',
        'winner' => 'integer',
    ];

    /**
     * Get the match this game belongs to
     */
    public function match(): BelongsTo
    {
        return $this->belongsTo(Match::class);
    }
}
```

### Core Services

#### Tournament Service
```php
<?php
// app/Services/TournamentService.php

namespace App\Services;

use App\Models\Tournament;
use App\Models\Player;
use App\Events\TournamentCreated;
use Illuminate\Support\Facades\DB;

class TournamentService
{
    public function __construct(
        private TournamentCodeGenerator $codeGenerator,
        private MatchGenerationService $matchGenerator
    ) {}

    /**
     * Create a new tournament
     */
    public function create(array $playerNames, int $matchesPerPlayer, ?int $creatorId = null): Tournament
    {
        return DB::transaction(function () use ($playerNames, $matchesPerPlayer, $creatorId) {
            // Generate unique code
            $code = $this->codeGenerator->generate();

            // Create tournament
            $tournament = Tournament::create([
                'code' => $code,
                'creator_id' => $creatorId,
                'player_count' => count($playerNames),
                'matches_per_player' => $matchesPerPlayer,
                'status' => 'active',
            ]);

            // Create players
            foreach ($playerNames as $position => $name) {
                Player::create([
                    'tournament_id' => $tournament->id,
                    'name' => $this->sanitizePlayerName($name),
                    'position' => $position,
                ]);
            }

            // Generate matches
            $this->matchGenerator->generateMatches($tournament);

            // Add creator as member
            if ($creatorId) {
                $tournament->members()->attach($creatorId);
            }

            // Broadcast event
            broadcast(new TournamentCreated($tournament))->toOthers();

            return $tournament->fresh(['players', 'matches.games']);
        });
    }

    /**
     * Sanitize player name (from tournament.js)
     */
    private function sanitizePlayerName(string $name): string
    {
        $sanitized = trim($name);
        $sanitized = substr($sanitized, 0, 30);
        $sanitized = preg_replace('/[^a-zA-Z0-9\s\'\-\.]/', '', $sanitized);
        $sanitized = preg_replace('/\s+/', ' ', $sanitized);

        return trim($sanitized);
    }

    /**
     * Join tournament
     */
    public function join(Tournament $tournament, int $userId): void
    {
        $tournament->members()->syncWithoutDetaching([$userId]);
    }

    /**
     * Leave tournament
     */
    public function leave(Tournament $tournament, int $userId): void
    {
        $tournament->members()->detach($userId);
    }
}
```

#### Match Generation Service (Porting tournament.js logic)
```php
<?php
// app/Services/MatchGenerationService.php

namespace App\Services;

use App\Models\Tournament;
use App\Models\Match;
use App\Models\Game;

class MatchGenerationService
{
    /**
     * Generate matches for tournament (ported from tournament.js)
     */
    public function generateMatches(Tournament $tournament): void
    {
        $playerCount = $tournament->player_count;
        $matchesPerPlayer = $tournament->matches_per_player;
        $players = $tournament->players()->orderBy('position')->get();

        // Validate (from tournament.js validation)
        if (($playerCount * $matchesPerPlayer) % 2 !== 0) {
            throw new \InvalidArgumentException('Invalid match configuration: total games must be even');
        }

        // Generate match structure
        $matchStructure = $this->generateMatchStructure($playerCount, $matchesPerPlayer);

        // Create matches and games
        foreach ($matchStructure as $matchNumber => $pairing) {
            [$player1Index, $player2Index] = $pairing;

            $match = Match::create([
                'tournament_id' => $tournament->id,
                'match_number' => $matchNumber,
                'player1_id' => $players[$player1Index]->id,
                'player2_id' => $players[$player2Index]->id,
                'winner' => null,
                'completed' => false,
            ]);

            // Create 3 games (Best of 3)
            for ($gameNum = 0; $gameNum < 3; $gameNum++) {
                Game::create([
                    'match_id' => $match->id,
                    'game_number' => $gameNum,
                    'winner' => null,
                ]);
            }
        }
    }

    /**
     * Generate match structure (ported from tournament.js)
     */
    private function generateMatchStructure(int $numPlayers, int $matchesPerPerson): array
    {
        $matchCount = array_fill(0, $numPlayers, 0);
        $selectedMatches = [];
        $targetMatches = ($numPlayers * $matchesPerPerson) / 2;

        // Generate all possible pairings
        $allPossibleMatches = [];
        for ($i = 0; $i < $numPlayers; $i++) {
            for ($j = $i + 1; $j < $numPlayers; $j++) {
                $allPossibleMatches[] = [$i, $j];
            }
        }

        // Shuffle for randomization
        shuffle($allPossibleMatches);

        $attempts = 0;
        $maxAttempts = 1000;

        while (count($selectedMatches) < $targetMatches && $attempts < $maxAttempts) {
            $attempts++;

            foreach ($allPossibleMatches as $pairing) {
                if (count($selectedMatches) >= $targetMatches) {
                    break;
                }

                [$p1, $p2] = $pairing;

                // Check if both players haven't exceeded quota
                if ($matchCount[$p1] < $matchesPerPerson && $matchCount[$p2] < $matchesPerPerson) {
                    $alreadySelected = false;
                    foreach ($selectedMatches as $selected) {
                        if (($selected[0] === $p1 && $selected[1] === $p2) ||
                            ($selected[0] === $p2 && $selected[1] === $p1)) {
                            $alreadySelected = true;
                            break;
                        }
                    }

                    if (!$alreadySelected) {
                        $selectedMatches[] = [$p1, $p2];
                        $matchCount[$p1]++;
                        $matchCount[$p2]++;
                    }
                }
            }

            // Retry with reshuffling if needed
            if (count($selectedMatches) < $targetMatches && $attempts < $maxAttempts) {
                $selectedMatches = [];
                $matchCount = array_fill(0, $numPlayers, 0);
                shuffle($allPossibleMatches);
            }
        }

        return $selectedMatches;
    }
}
```

#### Standings Calculator (Porting tournament.js)
```php
<?php
// app/Services/StandingsCalculator.php

namespace App\Services;

use App\Models\Tournament;
use Illuminate\Support\Collection;

class StandingsCalculator
{
    private const MATCH_WIN_POINTS = 3;
    private const GAME_WIN_POINTS = 1;
    private const GAME_LOSS_POINTS = -0.5;

    /**
     * Calculate standings (ported from tournament.js)
     */
    public function calculate(Tournament $tournament): array
    {
        $players = $tournament->players;
        $matches = $tournament->matches()->with(['games', 'player1', 'player2'])->get();

        // Calculate player stats
        $stats = $this->calculatePlayerStats($players, $matches);

        // Sort players with tiebreaking
        $rankedStats = $this->rankPlayers($stats, $matches);

        // Assign ranks
        return $this->assignRanks($rankedStats);
    }

    /**
     * Calculate player statistics (ported from tournament.js)
     */
    private function calculatePlayerStats(Collection $players, Collection $matches): array
    {
        $stats = [];

        foreach ($players as $player) {
            $playerMatches = $matches->filter(function ($match) use ($player) {
                return $match->player1_id === $player->id || $match->player2_id === $player->id;
            });

            $wins = 0;
            $losses = 0;
            $gamesWon = 0;
            $gamesLost = 0;
            $opponents = ['beaten' => [], 'lostTo' => []];

            foreach ($playerMatches as $match) {
                if ($match->winner !== null) {
                    $isPlayer1 = $match->player1_id === $player->id;
                    $playerNum = $isPlayer1 ? 1 : 2;
                    $opponentId = $isPlayer1 ? $match->player2_id : $match->player1_id;

                    if ($match->winner === $playerNum) {
                        $wins++;
                        $opponents['beaten'][] = $opponentId;
                    } else {
                        $losses++;
                        $opponents['lostTo'][] = $opponentId;
                    }

                    foreach ($match->games as $game) {
                        if ($game->winner === $playerNum) {
                            $gamesWon++;
                        } elseif ($game->winner !== null) {
                            $gamesLost++;
                        }
                    }
                }
            }

            $points = ($wins * self::MATCH_WIN_POINTS) +
                     ($gamesWon * self::GAME_WIN_POINTS) +
                     ($gamesLost * self::GAME_LOSS_POINTS);

            $stats[$player->id] = [
                'player_id' => $player->id,
                'player_name' => $player->name,
                'position' => $player->position,
                'wins' => $wins,
                'losses' => $losses,
                'games_won' => $gamesWon,
                'games_lost' => $gamesLost,
                'points' => $points,
                'matches_played' => $wins + $losses,
                'opponents' => $opponents,
                'quality_score' => 0, // Calculated later
            ];
        }

        // Calculate quality scores
        foreach ($stats as $playerId => &$stat) {
            $qualityScore = 0;
            foreach ($stat['opponents']['beaten'] as $opponentId) {
                $qualityScore += $stats[$opponentId]['points'] ?? 0;
            }
            $stat['quality_score'] = $qualityScore;
        }

        return array_values($stats);
    }

    /**
     * Sort players with tiebreaking (ported from tournament.js)
     */
    private function rankPlayers(array $stats, Collection $matches): array
    {
        usort($stats, function ($a, $b) use ($matches) {
            // Primary: Total points
            if (abs($b['points'] - $a['points']) > 0.01) {
                return $b['points'] <=> $a['points'];
            }

            // Secondary: Head-to-head
            $h2hMatch = $matches->first(function ($match) use ($a, $b) {
                return ($match->player1_id === $a['player_id'] && $match->player2_id === $b['player_id']) ||
                       ($match->player1_id === $b['player_id'] && $match->player2_id === $a['player_id']);
            });

            if ($h2hMatch && $h2hMatch->winner !== null) {
                if ($h2hMatch->player1_id === $a['player_id']) {
                    return $h2hMatch->winner === 1 ? -1 : 1;
                } else {
                    return $h2hMatch->winner === 1 ? 1 : -1;
                }
            }

            // Tertiary: Quality score
            if (abs($b['quality_score'] - $a['quality_score']) > 0.01) {
                return $b['quality_score'] <=> $a['quality_score'];
            }

            // Quaternary: Win percentage
            $aWinPct = $a['matches_played'] > 0 ? $a['wins'] / $a['matches_played'] : 0;
            $bWinPct = $b['matches_played'] > 0 ? $b['wins'] / $b['matches_played'] : 0;
            if (abs($bWinPct - $aWinPct) > 0.01) {
                return $bWinPct <=> $aWinPct;
            }

            // Quinary: Game differential
            $aGameDiff = $a['games_won'] - $a['games_lost'];
            $bGameDiff = $b['games_won'] - $b['games_lost'];
            if ($bGameDiff !== $aGameDiff) {
                return $bGameDiff <=> $aGameDiff;
            }

            // Final: Total games won
            return $b['games_won'] <=> $a['games_won'];
        });

        return $stats;
    }

    /**
     * Assign ranks and detect ties (ported from tournament.js)
     */
    private function assignRanks(array $sortedStats): array
    {
        $currentRank = 1;
        $rankedStats = [];
        $tiedRanks = [];

        foreach ($sortedStats as $index => $stat) {
            if ($index > 0) {
                $prev = $sortedStats[$index - 1];
                $pointsTied = abs($stat['points'] - $prev['points']) < 0.01;
                $qualityTied = abs($stat['quality_score'] - $prev['quality_score']) < 0.01;

                if (!$pointsTied || !$qualityTied) {
                    $currentRank = $index + 1;
                }
            }

            $stat['rank'] = $currentRank;
            $rankedStats[] = $stat;
        }

        // Identify tied ranks
        for ($i = 0; $i < count($rankedStats) - 1; $i++) {
            if ($rankedStats[$i]['rank'] === $rankedStats[$i + 1]['rank']) {
                $tiedRanks[] = $rankedStats[$i]['rank'];
            }
        }

        return [
            'ranked_stats' => $rankedStats,
            'tied_ranks' => array_unique($tiedRanks),
        ];
    }
}
```

#### Tournament Code Generator
```php
<?php
// app/Services/TournamentCodeGenerator.php

namespace App\Services;

use App\Models\Tournament;

class TournamentCodeGenerator
{
    private const CODE_LENGTH = 8;
    private const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    /**
     * Generate unique tournament code (ported from tournament.js)
     */
    public function generate(): string
    {
        $maxAttempts = 100;
        $attempts = 0;

        do {
            $code = $this->generateRandomCode();
            $exists = Tournament::where('code', $code)->exists();
            $attempts++;
        } while ($exists && $attempts < $maxAttempts);

        if ($exists) {
            throw new \RuntimeException('Unable to generate unique tournament code');
        }

        return $code;
    }

    /**
     * Generate random code
     */
    private function generateRandomCode(): string
    {
        $code = '';
        $length = strlen(self::CHARACTERS);

        for ($i = 0; $i < self::CODE_LENGTH; $i++) {
            $code .= self::CHARACTERS[random_int(0, $length - 1)];
        }

        return $code;
    }
}
```

### Core Controllers

#### Tournament Controller
```php
<?php
// app/Http/Controllers/TournamentController.php

namespace App\Http\Controllers;

use App\Models\Tournament;
use App\Services\TournamentService;
use App\Http\Requests\CreateTournamentRequest;
use App\Http\Requests\JoinTournamentRequest;
use App\Http\Resources\TournamentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentController extends Controller
{
    public function __construct(
        private TournamentService $tournamentService
    ) {}

    /**
     * Create new tournament
     */
    public function store(CreateTournamentRequest $request): JsonResponse
    {
        $tournament = $this->tournamentService->create(
            playerNames: $request->validated('player_names'),
            matchesPerPlayer: $request->validated('matches_per_player'),
            creatorId: $request->user()?->id
        );

        return response()->json([
            'data' => new TournamentResource($tournament),
            'message' => 'Tournament created successfully',
        ], 201);
    }

    /**
     * Get tournament by code
     */
    public function show(string $code): JsonResponse
    {
        $tournament = Tournament::with(['players', 'matches.games', 'matches.player1', 'matches.player2'])
            ->where('code', $code)
            ->firstOrFail();

        return response()->json([
            'data' => new TournamentResource($tournament),
        ]);
    }

    /**
     * Join tournament
     */
    public function join(JoinTournamentRequest $request, string $code): JsonResponse
    {
        $tournament = Tournament::where('code', $code)->firstOrFail();

        $this->tournamentService->join($tournament, $request->user()->id);

        return response()->json([
            'message' => 'Joined tournament successfully',
            'data' => new TournamentResource($tournament->fresh(['players', 'matches.games'])),
        ]);
    }

    /**
     * Leave tournament
     */
    public function leave(Request $request, string $code): JsonResponse
    {
        $tournament = Tournament::where('code', $code)->firstOrFail();

        $this->tournamentService->leave($tournament, $request->user()->id);

        return response()->json([
            'message' => 'Left tournament successfully',
        ]);
    }

    /**
     * Check if tournament exists
     */
    public function exists(string $code): JsonResponse
    {
        $exists = Tournament::where('code', $code)->exists();

        return response()->json([
            'exists' => $exists,
        ]);
    }

    /**
     * Get tournament progress
     */
    public function progress(string $code): JsonResponse
    {
        $tournament = Tournament::where('code', $code)->firstOrFail();

        return response()->json([
            'data' => $tournament->getProgress(),
        ]);
    }
}
```

#### Match Controller
```php
<?php
// app/Http/Controllers/MatchController.php

namespace App\Http\Controllers;

use App\Models\Tournament;
use App\Models\Match;
use App\Models\Game;
use App\Events\MatchUpdated;
use App\Http\Requests\UpdateMatchRequest;
use App\Http\Resources\MatchResource;
use Illuminate\Http\JsonResponse;

class MatchController extends Controller
{
    /**
     * Update game result
     */
    public function updateGame(UpdateMatchRequest $request, string $code, int $matchId): JsonResponse
    {
        $tournament = Tournament::where('code', $code)->firstOrFail();
        $match = Match::where('tournament_id', $tournament->id)
            ->where('match_number', $matchId)
            ->with(['games', 'player1', 'player2'])
            ->firstOrFail();

        $gameNumber = $request->validated('game_number');
        $winner = $request->validated('winner');

        // Validate previous games are completed
        if ($gameNumber > 0) {
            for ($i = 0; $i < $gameNumber; $i++) {
                $prevGame = $match->games->firstWhere('game_number', $i);
                if (!$prevGame || $prevGame->winner === null) {
                    return response()->json([
                        'error' => "Please complete Game " . ($i + 1) . " first!",
                    ], 422);
                }
            }
        }

        // Don't allow updating locked games
        if ($match->completed) {
            $game = $match->games->firstWhere('game_number', $gameNumber);
            if ($game && $game->winner === null) {
                return response()->json([
                    'error' => 'Match already completed',
                ], 422);
            }
        }

        // Toggle game result
        $game = Game::where('match_id', $match->id)
            ->where('game_number', $gameNumber)
            ->firstOrFail();

        if ($game->winner === $winner) {
            // Toggle off
            $game->winner = null;
            $game->save();

            // Reset subsequent games
            Game::where('match_id', $match->id)
                ->where('game_number', '>', $gameNumber)
                ->update(['winner' => null]);
        } else {
            // Set winner
            $game->winner = $winner;
            $game->save();
        }

        // Update match status based on games
        $this->updateMatchFromGames($match);

        // Broadcast update
        broadcast(new MatchUpdated($match->fresh(['games', 'player1', 'player2'])))->toOthers();

        return response()->json([
            'data' => new MatchResource($match->fresh(['games', 'player1', 'player2'])),
            'message' => 'Game updated successfully',
        ]);
    }

    /**
     * Update match based on game results (ported from tournament.js)
     */
    private function updateMatchFromGames(Match $match): void
    {
        $games = $match->games()->orderBy('game_number')->get();
        $player1Wins = 0;
        $player2Wins = 0;
        $decidedAt = null;

        foreach ($games as $index => $game) {
            if ($game->winner === 1) {
                $player1Wins++;
            } elseif ($game->winner === 2) {
                $player2Wins++;
            }

            if ($player1Wins >= 2) {
                $match->winner = 1;
                $match->completed = true;
                $decidedAt = $index;
                break;
            }

            if ($player2Wins >= 2) {
                $match->winner = 2;
                $match->completed = true;
                $decidedAt = $index;
                break;
            }
        }

        if ($decidedAt !== null) {
            // Clear any games after the decisive game
            Game::where('match_id', $match->id)
                ->where('game_number', '>', $decidedAt)
                ->update(['winner' => null]);
        } else {
            $match->winner = null;
            $match->completed = false;
        }

        $match->save();
    }
}
```

#### Standings Controller
```php
<?php
// app/Http/Controllers/StandingsController.php

namespace App\Http\Controllers;

use App\Models\Tournament;
use App\Services\StandingsCalculator;
use Illuminate\Http\JsonResponse;

class StandingsController extends Controller
{
    public function __construct(
        private StandingsCalculator $calculator
    ) {}

    /**
     * Get tournament standings
     */
    public function index(string $code): JsonResponse
    {
        $tournament = Tournament::with(['players', 'matches.games', 'matches.player1', 'matches.player2'])
            ->where('code', $code)
            ->firstOrFail();

        $standings = $this->calculator->calculate($tournament);

        return response()->json([
            'data' => $standings,
        ]);
    }
}
```

### API Routes
```php
<?php
// routes/api.php

use App\Http\Controllers\TournamentController;
use App\Http\Controllers\MatchController;
use App\Http\Controllers\StandingsController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::prefix('tournaments')->group(function () {
    Route::post('/', [TournamentController::class, 'store']);
    Route::get('/{code}/exists', [TournamentController::class, 'exists']);
    Route::get('/{code}', [TournamentController::class, 'show']);
    Route::get('/{code}/progress', [TournamentController::class, 'progress']);
    Route::get('/{code}/standings', [StandingsController::class, 'index']);
});

// Authenticated routes (using Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('tournaments')->group(function () {
        Route::post('/{code}/join', [TournamentController::class, 'join']);
        Route::post('/{code}/leave', [TournamentController::class, 'leave']);
        Route::post('/{code}/matches/{matchId}/games', [MatchController::class, 'updateGame']);
    });
});
```

### Broadcasting Channels
```php
<?php
// routes/channels.php

use App\Models\Tournament;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('tournament.{code}', function ($user, string $code) {
    // Anyone can listen to public tournaments
    return Tournament::where('code', $code)->exists();
});
```

### WebSocket Events

#### Match Updated Event
```php
<?php
// app/Events/MatchUpdated.php

namespace App\Events;

use App\Models\Match;
use App\Http\Resources\MatchResource;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Match $match
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("tournament.{$this->match->tournament->code}");
    }

    public function broadcastWith(): array
    {
        return [
            'match' => new MatchResource($this->match),
        ];
    }

    public function broadcastAs(): string
    {
        return 'match.updated';
    }
}
```

#### Tournament Created Event
```php
<?php
// app/Events/TournamentCreated.php

namespace App\Events;

use App\Models\Tournament;
use App\Http\Resources\TournamentResource;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TournamentCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Tournament $tournament
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("tournament.{$this->tournament->code}");
    }

    public function broadcastWith(): array
    {
        return [
            'tournament' => new TournamentResource($this->tournament),
        ];
    }

    public function broadcastAs(): string
    {
        return 'tournament.created';
    }
}
```

---

## React Frontend Structure

### Directory Structure
```
resources/
└── js/
    ├── src/
    │   ├── components/
    │   │   ├── common/
    │   │   │   ├── Button.tsx
    │   │   │   ├── Input.tsx
    │   │   │   ├── Alert.tsx
    │   │   │   ├── Badge.tsx
    │   │   │   └── ProgressBar.tsx
    │   │   ├── tournament/
    │   │   │   ├── TournamentHeader.tsx
    │   │   │   ├── TournamentCode.tsx
    │   │   │   ├── ViewTabs.tsx
    │   │   │   └── ConnectionStatus.tsx
    │   │   ├── matches/
    │   │   │   ├── MatchCard.tsx
    │   │   │   ├── MatchesList.tsx
    │   │   │   ├── GameResult.tsx
    │   │   │   └── PlayerRow.tsx
    │   │   ├── schedule/
    │   │   │   ├── ScheduleGrid.tsx
    │   │   │   └── ScheduleItem.tsx
    │   │   ├── standings/
    │   │   │   ├── StandingsTable.tsx
    │   │   │   ├── StandingRow.tsx
    │   │   │   └── ScoringLegend.tsx
    │   │   └── forms/
    │   │       ├── CreateTournamentForm.tsx
    │   │       ├── JoinTournamentForm.tsx
    │   │       └── PlayerInputs.tsx
    │   ├── hooks/
    │   │   ├── useTournament.ts
    │   │   ├── useWebSocket.ts
    │   │   ├── useMatchUpdate.ts
    │   │   └── useStandings.ts
    │   ├── services/
    │   │   ├── api.ts
    │   │   ├── websocket.ts
    │   │   └── tournament.ts
    │   ├── stores/
    │   │   ├── useTournamentStore.ts
    │   │   ├── useUIStore.ts
    │   │   └── useAuthStore.ts
    │   ├── types/
    │   │   ├── tournament.ts
    │   │   ├── match.ts
    │   │   └── player.ts
    │   ├── utils/
    │   │   ├── validation.ts
    │   │   ├── formatting.ts
    │   │   └── logger.ts
    │   ├── pages/
    │   │   ├── Home.tsx
    │   │   ├── CreateTournament.tsx
    │   │   ├── JoinTournament.tsx
    │   │   └── Tournament.tsx
    │   ├── App.tsx
    │   └── main.tsx
    └── app.tsx
```

### Core Types (TypeScript)
```typescript
// resources/js/src/types/tournament.ts

export interface Tournament {
  id: number;
  code: string;
  creator_id: number | null;
  player_count: number;
  matches_per_player: number;
  status: 'active' | 'completed' | 'archived';
  players: Player[];
  matches: Match[];
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: number;
  tournament_id: number;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: number;
  tournament_id: number;
  match_number: number;
  player1_id: number;
  player2_id: number;
  player1: Player;
  player2: Player;
  winner: 1 | 2 | null;
  completed: boolean;
  games: Game[];
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: number;
  match_id: number;
  game_number: number;
  winner: 1 | 2 | null;
  created_at: string;
  updated_at: string;
}

export interface Standing {
  player_id: number;
  player_name: string;
  position: number;
  rank: number;
  wins: number;
  losses: number;
  games_won: number;
  games_lost: number;
  points: number;
  matches_played: number;
  quality_score: number;
  opponents: {
    beaten: number[];
    lostTo: number[];
  };
}

export interface StandingsData {
  ranked_stats: Standing[];
  tied_ranks: number[];
}
```

### WebSocket Hook (Porting firebase.js listener logic)
```typescript
// resources/js/src/hooks/useWebSocket.ts

import { useEffect, useRef } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

export const useWebSocket = (tournamentCode: string | null, onUpdate: (data: any) => void) => {
  const echoRef = useRef<Echo | null>(null);

  useEffect(() => {
    if (!tournamentCode) return;

    // Initialize Laravel Echo (if not already initialized)
    if (!echoRef.current) {
      echoRef.current = new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: import.meta.env.VITE_REVERB_PORT,
        wssPort: import.meta.env.VITE_REVERB_PORT,
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
      });
    }

    // Subscribe to tournament channel
    const channel = echoRef.current.channel(`tournament.${tournamentCode}`);

    // Listen for match updates
    channel.listen('.match.updated', (event: any) => {
      onUpdate({ type: 'match.updated', data: event.match });
    });

    // Listen for tournament updates
    channel.listen('.tournament.created', (event: any) => {
      onUpdate({ type: 'tournament.created', data: event.tournament });
    });

    // Cleanup
    return () => {
      if (echoRef.current) {
        echoRef.current.leave(`tournament.${tournamentCode}`);
      }
    };
  }, [tournamentCode, onUpdate]);

  return echoRef.current;
};
```

### Tournament Store (Zustand - replacing app.js state)
```typescript
// resources/js/src/stores/useTournamentStore.ts

import { create } from 'zustand';
import { Tournament, Match } from '../types/tournament';

interface TournamentState {
  tournament: Tournament | null;
  currentView: 'schedule' | 'standings' | 'matches';
  isLoading: boolean;
  error: string | null;

  setTournament: (tournament: Tournament) => void;
  updateMatch: (match: Match) => void;
  setCurrentView: (view: 'schedule' | 'standings' | 'matches') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useTournamentStore = create<TournamentState>((set) => ({
  tournament: null,
  currentView: 'matches',
  isLoading: false,
  error: null,

  setTournament: (tournament) => set({ tournament }),

  updateMatch: (updatedMatch) => set((state) => {
    if (!state.tournament) return state;

    return {
      tournament: {
        ...state.tournament,
        matches: state.tournament.matches.map((match) =>
          match.match_number === updatedMatch.match_number ? updatedMatch : match
        ),
      },
    };
  }),

  setCurrentView: (view) => {
    set({ currentView: view });
    localStorage.setItem('mm_selected_view', view);
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set({ tournament: null, error: null, isLoading: false }),
}));
```

### Tournament Service (API calls - porting app.js methods)
```typescript
// resources/js/src/services/tournament.ts

import api from './api';
import { Tournament, Match, StandingsData } from '../types/tournament';

export const tournamentService = {
  /**
   * Create new tournament (porting createTournament from app.js)
   */
  async create(playerNames: string[], matchesPerPlayer: number): Promise<Tournament> {
    const response = await api.post('/tournaments', {
      player_names: playerNames,
      matches_per_player: matchesPerPlayer,
    });
    return response.data.data;
  },

  /**
   * Join tournament (porting joinTournament from app.js)
   */
  async join(code: string): Promise<Tournament> {
    const response = await api.post(`/tournaments/${code}/join`);
    return response.data.data;
  },

  /**
   * Leave tournament (porting leaveTournament from app.js)
   */
  async leave(code: string): Promise<void> {
    await api.post(`/tournaments/${code}/leave`);
  },

  /**
   * Get tournament data (porting getTournamentData from firebase.js)
   */
  async get(code: string): Promise<Tournament> {
    const response = await api.get(`/tournaments/${code}`);
    return response.data.data;
  },

  /**
   * Check if tournament exists (porting tournamentExists from firebase.js)
   */
  async exists(code: string): Promise<boolean> {
    const response = await api.get(`/tournaments/${code}/exists`);
    return response.data.exists;
  },

  /**
   * Update game result (porting recordGame from app.js)
   */
  async updateGame(
    code: string,
    matchNumber: number,
    gameNumber: number,
    winner: 1 | 2
  ): Promise<Match> {
    const response = await api.post(`/tournaments/${code}/matches/${matchNumber}/games`, {
      game_number: gameNumber,
      winner,
    });
    return response.data.data;
  },

  /**
   * Get standings (porting getStandings from tournament.js)
   */
  async getStandings(code: string): Promise<StandingsData> {
    const response = await api.get(`/tournaments/${code}/standings`);
    return response.data.data;
  },

  /**
   * Get progress (porting getProgress from tournament.js)
   */
  async getProgress(code: string): Promise<{ completed: number; total: number; percentage: number }> {
    const response = await api.get(`/tournaments/${code}/progress`);
    return response.data.data;
  },
};
```

### Validation Utilities (Porting tournament.js validation)
```typescript
// resources/js/src/utils/validation.ts

/**
 * Sanitize player name (ported from tournament.js)
 */
export function sanitizePlayerName(name: string): string {
  if (!name) return '';

  let sanitized = name.trim();
  sanitized = sanitized.substring(0, 30);
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s'\-\.]/g, '');
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized.trim();
}

/**
 * Validate player names (ported from tournament.js)
 */
export function validatePlayerNames(names: string[]): {
  isValid: boolean;
  duplicates: Array<{ name: string; indices: number[] }>;
  empty: number[];
  sanitized: string[];
} {
  const seen = new Map<string, number>();
  const duplicates: Array<{ name: string; indices: number[] }> = [];
  const empty: number[] = [];
  const sanitized: string[] = [];

  names.forEach((name, index) => {
    const clean = sanitizePlayerName(name);
    sanitized.push(clean);

    if (!clean) {
      empty.push(index);
      return;
    }

    const normalized = clean.toLowerCase();
    if (seen.has(normalized)) {
      const existingIndex = seen.get(normalized)!;
      const existing = duplicates.find((d) => d.indices.includes(existingIndex));

      if (existing) {
        existing.indices.push(index);
      } else {
        duplicates.push({
          name: clean,
          indices: [existingIndex, index],
        });
      }
    } else {
      seen.set(normalized, index);
    }
  });

  return {
    isValid: duplicates.length === 0 && empty.length === 0,
    duplicates,
    empty,
    sanitized,
  };
}

/**
 * Get valid matches per player options (ported from tournament.js)
 */
export function getValidMatchesPerPlayer(numPlayers: number): number[] {
  const validOptions: number[] = [];
  const maxPossible = numPlayers - 1;

  for (let m = 1; m <= maxPossible; m++) {
    if ((numPlayers * m) % 2 === 0) {
      validOptions.push(m);
    }
  }

  return validOptions;
}
```

### Logger Utility (Porting logger.js)
```typescript
// resources/js/src/utils/logger.ts

type LogLevel = 0 | 1 | 2 | 3 | 4;

interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  data?: any;
}

class Logger {
  private level: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  constructor() {
    this.level = this.getLogLevel();
  }

  private getLogLevel(): LogLevel {
    try {
      const stored = localStorage.getItem('mm_log_level');
      if (stored) {
        const level = parseInt(stored);
        if (!isNaN(level) && level >= 0 && level <= 4) {
          return level as LogLevel;
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return window.location.hostname === 'localhost' ? 3 : 2;
  }

  setLogLevel(level: LogLevel): void {
    if (level >= 0 && level <= 4) {
      this.level = level;
      try {
        localStorage.setItem('mm_log_level', level.toString());
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }

  private addToHistory(level: string, category: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private format(category: string, message: string): string {
    const timestamp = new Date().toLocaleTimeString();
    return `[${timestamp}] [${category}] ${message}`;
  }

  error(category: string, message: string, data?: any): void {
    if (this.level < 1) return;
    this.addToHistory('error', category, message, data);
    const formatted = this.format(category, message);
    data !== undefined ? console.error(formatted, data) : console.error(formatted);
  }

  warn(category: string, message: string, data?: any): void {
    if (this.level < 2) return;
    this.addToHistory('warn', category, message, data);
    const formatted = this.format(category, message);
    data !== undefined ? console.warn(formatted, data) : console.warn(formatted);
  }

  info(category: string, message: string, data?: any): void {
    if (this.level < 3) return;
    this.addToHistory('info', category, message, data);
    const formatted = this.format(category, message);
    data !== undefined ? console.log(formatted, data) : console.log(formatted);
  }

  debug(category: string, message: string, data?: any): void {
    if (this.level < 4) return;
    this.addToHistory('debug', category, message, data);
    const formatted = this.format(category, message);
    data !== undefined ? console.debug(formatted, data) : console.debug(formatted);
  }

  getHistory(filterLevel?: string): LogEntry[] {
    if (filterLevel) {
      return this.logs.filter((log) => log.level === filterLevel);
    }
    return this.logs;
  }

  exportLogs(): void {
    const dataStr = JSON.stringify(this.logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `magic-mikes-logs-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
    this.info('Logger', 'Logs exported');
  }

  clearHistory(): void {
    this.logs = [];
    this.info('Logger', 'Log history cleared');
  }
}

export const logger = new Logger();

// Add to window for dev tools
if (typeof window !== 'undefined') {
  (window as any).mmLogger = {
    setLevel: (level: LogLevel) => logger.setLogLevel(level),
    getHistory: () => logger.getHistory(),
    exportLogs: () => logger.exportLogs(),
    clearHistory: () => logger.clearHistory(),
    levels: {
      NONE: 0,
      ERROR: 1,
      WARN: 2,
      INFO: 3,
      DEBUG: 4,
    },
  };
}
```

### Main Components

#### Match Card Component (Porting ui.js renderMatches)
```tsx
// resources/js/src/components/matches/MatchCard.tsx

import React from 'react';
import { Match, Player } from '../../types/tournament';
import { GameResult } from './GameResult';

interface MatchCardProps {
  match: Match;
  onGameUpdate: (matchNumber: number, gameNumber: number, winner: 1 | 2) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onGameUpdate }) => {
  const p1Wins = match.games.filter((g) => g.winner === 1).length;
  const p2Wins = match.games.filter((g) => g.winner === 2).length;

  return (
    <div
      className={`rounded-lg border-2 p-4 transition-all ${
        match.completed ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'
      }`}
      data-match-id={match.match_number}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-600">Match {match.match_number + 1}</div>
        <div className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
          Best of 3
        </div>
      </div>

      <div className="mb-3 text-center text-2xl font-bold text-gray-800">
        {p1Wins} - {p2Wins}
      </div>

      <div className="space-y-2">
        <PlayerRow
          player={match.player1}
          playerNum={1}
          match={match}
          isWinner={match.winner === 1}
          onGameUpdate={onGameUpdate}
        />
        <PlayerRow
          player={match.player2}
          playerNum={2}
          match={match}
          isWinner={match.winner === 2}
          onGameUpdate={onGameUpdate}
        />
      </div>

      {match.winner && (
        <div className="mt-3 rounded bg-yellow-100 p-2 text-center font-semibold text-yellow-900">
          {match.winner === 1 ? match.player1.name : match.player2.name} wins!
        </div>
      )}
    </div>
  );
};

const PlayerRow: React.FC<{
  player: Player;
  playerNum: 1 | 2;
  match: Match;
  isWinner: boolean;
  onGameUpdate: (matchNumber: number, gameNumber: number, winner: 1 | 2) => void;
}> = ({ player, playerNum, match, isWinner, onGameUpdate }) => {
  return (
    <div
      className={`flex items-center justify-between rounded p-2 ${
        isWinner ? 'bg-green-100' : 'bg-gray-50'
      }`}
    >
      <div className="flex-1 font-medium text-gray-900">{player.name}</div>
      <div className="flex gap-1">
        {[0, 1, 2].map((gameNum) => (
          <GameResult
            key={gameNum}
            match={match}
            gameNumber={gameNum}
            playerNum={playerNum}
            onUpdate={onGameUpdate}
          />
        ))}
      </div>
    </div>
  );
};
```

#### Connection Status Component (Porting firebase.js connection monitoring)
```tsx
// resources/js/src/components/tournament/ConnectionStatus.tsx

import React, { useEffect, useState } from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (isConnected) {
      // Auto-minimize after 4 seconds
      const timeout = setTimeout(() => {
        setMinimized(true);
      }, 4000);

      return () => clearTimeout(timeout);
    } else {
      // Keep visible when disconnected
      setMinimized(false);
    }
  }, [isConnected]);

  return (
    <div
      className={`fixed right-4 top-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-all ${
        minimized ? 'px-2' : 'px-4'
      } ${
        isConnected
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'
      }`}
    >
      <div
        className={`h-2 w-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      {!minimized && (
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      )}
    </div>
  );
};
```

---

## WebSockets Implementation

### Laravel Reverb Setup

#### Install Reverb
```bash
composer require laravel/reverb
php artisan reverb:install
```

#### Configure `.env`
```bash
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=magic-mikes
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http
```

#### Start Reverb Server
```bash
php artisan reverb:start
```

### Frontend Echo Configuration
```typescript
// resources/js/src/services/websocket.ts

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

export const initializeEcho = () => {
  return new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
  });
};
```

---

## Migration Steps

### Phase 1: Backend Setup (Week 1-2)

1. **Initialize Laravel 12 Project**
   ```bash
   composer create-project laravel/laravel magic-mikes-laravel
   cd magic-mikes-laravel
   ```

2. **Install Dependencies**
   ```bash
   composer require laravel/reverb laravel/sanctum predis/predis
   composer require --dev laravel/telescope
   ```

3. **Configure Database**
   - Update `.env` with database credentials
   - Run migrations:
     ```bash
     php artisan migrate
     ```

4. **Create Models & Migrations**
   - Create all models with relationships
   - Create all migrations
   - Run migrations and verify schema

5. **Implement Services**
   - Port `tournament.js` logic to `TournamentService`, `MatchGenerationService`, `StandingsCalculator`
   - Port `config.js` constants to Laravel config files
   - Implement `TournamentCodeGenerator`

6. **Create Controllers & Routes**
   - Implement all API endpoints
   - Set up API resource transformers
   - Configure CORS for frontend

7. **Setup WebSockets**
   - Install and configure Reverb
   - Create broadcast events
   - Define broadcast channels

8. **Test Backend**
   - Write PHPUnit tests for services
   - Write feature tests for API endpoints
   - Test WebSocket broadcasting

### Phase 2: Frontend Setup (Week 2-3)

1. **Initialize React + Vite**
   ```bash
   npm install
   npm install react react-dom typescript @vitejs/plugin-react
   npm install tailwindcss postcss autoprefixer
   npm install laravel-echo pusher-js axios react-router-dom zustand
   ```

2. **Setup Tailwind CSS**
   ```bash
   npx tailwindcss init -p
   ```

3. **Create Type Definitions**
   - Port all data structures to TypeScript interfaces
   - Create API response types

4. **Implement Services**
   - Port API calls from `app.js` and `firebase.js` to `tournament.ts`
   - Implement WebSocket service with Echo

5. **Create Utility Functions**
   - Port `logger.js` to TypeScript
   - Port validation functions from `tournament.js`
   - Port formatting helpers from `ui.js`

6. **Build Component Library**
   - Create common components (Button, Input, etc.)
   - Port `ui.js` render methods to React components
   - Implement Tailwind styling for all components

7. **Setup State Management**
   - Create Zustand stores (tournament, UI, auth)
   - Port `app.js` state management

8. **Implement Pages**
   - Home page (mode selector)
   - Create tournament page
   - Join tournament page
   - Tournament view page

9. **Connect WebSockets**
   - Implement Echo listeners
   - Handle real-time updates
   - Add connection status indicator

### Phase 3: Integration & Testing (Week 3-4)

1. **End-to-End Testing**
   - Test tournament creation flow
   - Test join tournament flow
   - Test match updates with real-time sync
   - Test standings calculation

2. **Performance Optimization**
   - Implement React.memo for expensive components
   - Add debouncing for rapid updates
   - Optimize WebSocket event handling

3. **Mobile Responsiveness**
   - Test on various screen sizes
   - Optimize touch interactions
   - Ensure Tailwind breakpoints work correctly

4. **Error Handling**
   - Implement global error boundary
   - Add user-friendly error messages
   - Handle WebSocket disconnections gracefully

5. **Session Management**
   - Implement "Rejoin Tournament" feature
   - Store session in localStorage
   - Handle session expiration

### Phase 4: Deployment (Week 4)

1. **Backend Deployment**
   - Set up production database
   - Configure Laravel Octane (optional, for performance)
   - Deploy Reverb WebSocket server
   - Set up Redis for caching

2. **Frontend Build**
   ```bash
   npm run build
   ```

3. **Configure Web Server**
   - Set up Nginx/Apache
   - Configure SSL certificates
   - Set up WebSocket proxy

4. **Environment Configuration**
   - Update production `.env`
   - Set up queue workers
   - Configure caching

---

## Feature Mapping

### Current Feature → New Implementation

| Current Feature | Current Location | New Implementation |
|----------------|------------------|-------------------|
| Tournament Code Generation | `tournament.js` static method | `TournamentCodeGenerator` service |
| Match Generation Algorithm | `tournament.js` method | `MatchGenerationService` |
| Standings Calculation | `tournament.js` method | `StandingsCalculator` service |
| Real-time Sync | Firebase listeners | Laravel Reverb + Echo |
| Anonymous Auth | Firebase Auth | Laravel Sanctum (guest tokens) |
| Player Name Validation | `tournament.js` method | `validation.ts` utility + Laravel validation |
| UI Rendering | `ui.js` methods | React components |
| State Management | `app.js` class properties | Zustand stores |
| Progress Tracking | `tournament.js` method | `Tournament` model method |
| Session Persistence | localStorage | localStorage + Laravel session |
| Connection Monitoring | `firebase.js` | Echo connection events |
| Logging | `logger.js` | TypeScript `logger.ts` |

---

## JavaScript Functions Migration

### Complete Function Mapping

#### From `tournament.js`:

| Function | Purpose | New Location |
|----------|---------|--------------|
| `getValidMatchesPerPlayer()` | Calculate valid match options | `MatchGenerationService::getValidMatchesPerPlayer()` + `validation.ts` |
| `getTotalMatches()` | Calculate total matches | `MatchGenerationService::getTotalMatches()` |
| `generateMatchStructure()` | Generate match pairings | `MatchGenerationService::generateMatchStructure()` |
| `shuffleArray()` | Fisher-Yates shuffle | PHP `shuffle()` in service |
| `createTournament()` | Create tournament with matches | `TournamentService::create()` |
| `loadTournament()` | Load from Firebase | `TournamentController::show()` |
| `sanitizePlayerName()` | Clean player names | `TournamentService::sanitizePlayerName()` + `validation.ts` |
| `validatePlayerNames()` | Check duplicates/empty | `validation.ts::validatePlayerNames()` |
| `calculatePlayerStats()` | Calculate player statistics | `StandingsCalculator::calculatePlayerStats()` |
| `calculateQualityScore()` | Calculate opponent quality | `StandingsCalculator::calculateQualityScore()` |
| `rankPlayers()` | Sort with tiebreakers | `StandingsCalculator::rankPlayers()` |
| `assignRanks()` | Assign rank numbers | `StandingsCalculator::assignRanks()` |
| `getStandings()` | Get complete standings | `StandingsController::index()` |
| `getProgress()` | Calculate completion % | `Tournament::getProgress()` |
| `getPlayerSchedule()` | Get player's matches | React component logic |
| `updateMatchGame()` | Record game result | `MatchController::updateGame()` |
| `getMatchesForFirebase()` | Convert to Firebase format | Not needed (Eloquent handles) |
| `generateTournamentCode()` | Generate unique code | `TournamentCodeGenerator::generate()` |

#### From `ui.js`:

| Function | Purpose | New Location |
|----------|---------|--------------|
| `cacheElements()` | Cache DOM references | React refs (minimal usage) |
| `showSection()` | Show/hide sections | React Router navigation |
| `switchView()` | Switch tournament tabs | `useTournamentStore::setCurrentView()` |
| `showError()` | Display error message | `Alert` component |
| `showAlert()` | Display popup alert | `Alert` component |
| `setButtonLoading()` | Loading button state | Button component state |
| `updateMatchesPerPlayerOptions()` | Update dropdown | `CreateTournamentForm` component |
| `updateTournamentInfo()` | Update info display | React component state |
| `renderPlayerInputs()` | Render input fields | `PlayerInputs` component |
| `checkDuplicateNames()` | Validate names | `validation.ts` + component state |
| `displayTournamentCode()` | Show tournament code | `TournamentCode` component |
| `setCodeDisplayCollapsed()` | Collapse code display | Component state |
| `copyTournamentCode()` | Copy to clipboard | `TournamentCode` component |
| `renderSchedule()` | Render player schedule | `ScheduleGrid` component |
| `renderMatches()` | Render all matches | `MatchesList` component |
| `updateSingleMatch()` | Update one match card | `MatchCard` component re-render |
| `createMatchCard()` | Create match card HTML | `MatchCard` component JSX |
| `createPlayerRow()` | Create player row | `PlayerRow` component JSX |
| `createGameResult()` | Create game button | `GameResult` component JSX |
| `renderStandings()` | Render standings table | `StandingsTable` component |
| `createStandingRow()` | Create standing row | `StandingRow` component JSX |
| `createOpponentList()` | Create opponent list | `StandingRow` component logic |
| `toggleStandingDetails()` | Expand/collapse row | Component state |
| `updateProgress()` | Update progress bar | `ProgressBar` component |
| `escapeHtml()` | Prevent XSS | React auto-escapes JSX |
| `resetToInitialState()` | Reset UI | `useTournamentStore::reset()` |

#### From `app.js`:

| Function | Purpose | New Location |
|----------|---------|--------------|
| `init()` | Initialize app | `App.tsx` useEffect |
| `setupEventListeners()` | Attach event handlers | React event props |
| `initializeUIState()` | Initialize UI | Component state initialization |
| `handleModeSelection()` | Handle create/join mode | React Router navigation |
| `handlePlayerCountChange()` | Update player count | Form component state |
| `handleMatchesPerPlayerChange()` | Update matches count | Form component state |
| `handlePlayerInputEnter()` | Enter key navigation | Form component handler |
| `debouncedDuplicateCheck()` | Debounced validation | Custom hook with debounce |
| `validateTournamentCodeInput()` | Real-time validation | Form component validation |
| `handleJoinSubmit()` | Join tournament submit | `JoinTournamentForm` onSubmit |
| `joinTournament()` | Join logic | `tournamentService::join()` |
| `handleGenerateTournament()` | Create tournament | `CreateTournamentForm` onSubmit |
| `createTournament()` | Create logic | `tournamentService::create()` |
| `startTournamentListener()` | Start WebSocket | `useWebSocket` hook |
| `renderTournament()` | Render all views | React component rendering |
| `recordGame()` | Record game result | `tournamentService::updateGame()` |
| `handleLeaveTournament()` | Leave confirmation | Component handler |
| `leaveTournament()` | Leave logic | `tournamentService::leave()` |
| `saveTournamentSession()` | Save to localStorage | `useAuthStore` persist |
| `clearTournamentSession()` | Clear localStorage | `useAuthStore::reset()` |
| `attemptRejoin()` | Auto-rejoin | `App.tsx` useEffect |

#### From `firebase.js`:

| Function | Purpose | New Location |
|----------|---------|--------------|
| `initialize()` | Init Firebase | `initializeEcho()` |
| `setupAuthentication()` | Anonymous auth | Laravel Sanctum guest tokens |
| `monitorConnection()` | Monitor connection | Echo connection events |
| `updateConnectionStatus()` | Update status UI | `ConnectionStatus` component |
| `onConnectionChange()` | Connection callback | Echo event listeners |
| `tournamentExists()` | Check existence | `tournamentService::exists()` |
| `createTournament()` | Create in Firebase | `tournamentService::create()` (API) |
| `joinTournament()` | Join in Firebase | `tournamentService::join()` (API) |
| `getTournamentData()` | Fetch data | `tournamentService::get()` (API) |
| `updateMatch()` | Update match | `tournamentService::updateGame()` (API) |
| `onTournamentUpdate()` | Listen to updates | `useWebSocket` hook with Echo |
| `offTournamentUpdate()` | Stop listening | Echo `leave()` |

#### From `logger.js`:

| Function | Purpose | New Location |
|----------|---------|--------------|
| `getLogLevel()` | Get log level | `logger.ts::getLogLevel()` |
| `setLogLevel()` | Set log level | `logger.ts::setLogLevel()` |
| `addToHistory()` | Add to log history | `logger.ts::addToHistory()` |
| `format()` | Format log message | `logger.ts::format()` |
| `error()` | Error logging | `logger.ts::error()` |
| `warn()` | Warning logging | `logger.ts::warn()` |
| `info()` | Info logging | `logger.ts::info()` |
| `debug()` | Debug logging | `logger.ts::debug()` |
| `getHistory()` | Get log history | `logger.ts::getHistory()` |
| `exportLogs()` | Export to file | `logger.ts::exportLogs()` |
| `clearHistory()` | Clear logs | `logger.ts::clearHistory()` |

---

## Testing Strategy

### Backend Tests

#### Unit Tests
```php
<?php
// tests/Unit/Services/MatchGenerationServiceTest.php

namespace Tests\Unit\Services;

use App\Services\MatchGenerationService;
use Tests\TestCase;

class MatchGenerationServiceTest extends TestCase
{
    public function test_generates_correct_number_of_matches()
    {
        $service = new MatchGenerationService();
        $structure = $service->generateMatchStructure(7, 3);

        $this->assertCount(10, $structure); // (7 * 3) / 2 = 10.5 rounds to 10
    }

    public function test_each_player_gets_correct_matches()
    {
        $service = new MatchGenerationService();
        $structure = $service->generateMatchStructure(7, 3);

        $matchCount = array_fill(0, 7, 0);
        foreach ($structure as [$p1, $p2]) {
            $matchCount[$p1]++;
            $matchCount[$p2]++;
        }

        foreach ($matchCount as $count) {
            $this->assertEquals(3, $count);
        }
    }
}
```

#### Feature Tests
```php
<?php
// tests/Feature/TournamentTest.php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;

class TournamentTest extends TestCase
{
    public function test_can_create_tournament()
    {
        $response = $this->postJson('/api/tournaments', [
            'player_names' => ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace'],
            'matches_per_player' => 3,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'code',
                    'players',
                    'matches',
                ],
            ]);
    }

    public function test_can_join_tournament()
    {
        $user = User::factory()->create();

        // Create tournament first
        $tournament = $this->postJson('/api/tournaments', [
            'player_names' => ['Alice', 'Bob', 'Charlie'],
            'matches_per_player' => 1,
        ])->json('data');

        // Join tournament
        $response = $this->actingAs($user)
            ->postJson("/api/tournaments/{$tournament['code']}/join");

        $response->assertStatus(200);
    }

    public function test_can_update_game_result()
    {
        $user = User::factory()->create();

        // Setup tournament
        $tournament = $this->createTestTournament();

        // Update game
        $response = $this->actingAs($user)
            ->postJson("/api/tournaments/{$tournament->code}/matches/0/games", [
                'game_number' => 0,
                'winner' => 1,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.games.0.winner', 1);
    }
}
```

### Frontend Tests

#### Component Tests (using Vitest + React Testing Library)
```typescript
// resources/js/src/components/matches/__tests__/MatchCard.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MatchCard } from '../MatchCard';

describe('MatchCard', () => {
  const mockMatch = {
    id: 1,
    match_number: 0,
    player1: { id: 1, name: 'Alice', position: 0 },
    player2: { id: 2, name: 'Bob', position: 1 },
    games: [
      { id: 1, game_number: 0, winner: null },
      { id: 2, game_number: 1, winner: null },
      { id: 3, game_number: 2, winner: null },
    ],
    winner: null,
    completed: false,
  };

  it('renders match information correctly', () => {
    render(<MatchCard match={mockMatch} onGameUpdate={vi.fn()} />);

    expect(screen.getByText('Match 1')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('calls onGameUpdate when game button clicked', () => {
    const onGameUpdate = vi.fn();
    render(<MatchCard match={mockMatch} onGameUpdate={onGameUpdate} />);

    const gameButtons = screen.getAllByRole('button');
    fireEvent.click(gameButtons[0]);

    expect(onGameUpdate).toHaveBeenCalledWith(0, 0, 1);
  });
});
```

---

## Deployment Checklist

### Backend
- [ ] Set up production database
- [ ] Configure `.env` for production
- [ ] Set up Redis for caching & sessions
- [ ] Deploy Reverb WebSocket server
- [ ] Configure queue workers
- [ ] Set up scheduled tasks (if any)
- [ ] Configure SSL certificates
- [ ] Set up monitoring (Laravel Telescope, Sentry)
- [ ] Configure rate limiting
- [ ] Set up database backups

### Frontend
- [ ] Build production bundle (`npm run build`)
- [ ] Optimize images and assets
- [ ] Configure CDN (if needed)
- [ ] Set up error tracking (Sentry)
- [ ] Configure analytics (if needed)
- [ ] Test on multiple browsers
- [ ] Test on mobile devices
- [ ] Verify PWA functionality (optional)

### Infrastructure
- [ ] Configure Nginx/Apache
- [ ] Set up WebSocket proxy
- [ ] Configure firewall rules
- [ ] Set up load balancer (if needed)
- [ ] Configure CDN for static assets
- [ ] Set up CI/CD pipeline
- [ ] Configure environment variables
- [ ] Test disaster recovery plan

### Security
- [ ] Enable CSRF protection
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable SQL injection protection
- [ ] Configure XSS protection
- [ ] Set up CSP headers
- [ ] Audit dependencies for vulnerabilities
- [ ] Set up API authentication
- [ ] Configure secure WebSocket connections

---

## Configuration Files

### Tailwind Config
```javascript
// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./resources/**/*.blade.php",
    "./resources/**/*.js",
    "./resources/**/*.tsx",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#667eea',
        secondary: '#764ba2',
        success: '#48bb78',
        danger: '#f56565',
        warning: '#ed8936',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

### Vite Config
```typescript
// vite.config.ts

import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    laravel({
      input: ['resources/css/app.css', 'resources/js/app.tsx'],
      refresh: true,
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': '/resources/js/src',
    },
  },
});
```

### Laravel Config for Broadcasting
```php
<?php
// config/broadcasting.php

return [
    'default' => env('BROADCAST_CONNECTION', 'reverb'),

    'connections' => [
        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            'options' => [
                'host' => env('REVERB_HOST'),
                'port' => env('REVERB_PORT', 443),
                'scheme' => env('REVERB_SCHEME', 'https'),
            ],
        ],
    ],
];
```

---

## Summary

This migration guide provides a complete roadmap for transitioning the Magic Mikes Tournament application from a Firebase-based vanilla JavaScript app to a modern Laravel 12 + React + WebSockets architecture. All JavaScript functions have been mapped to their new implementations, preserving the original logic while leveraging modern frameworks and best practices.

**Key Benefits:**
- ✅ Full control over data and infrastructure
- ✅ Better performance with optimized queries
- ✅ Type safety with TypeScript
- ✅ Modern component-based architecture
- ✅ Scalable WebSocket implementation
- ✅ Professional deployment options
- ✅ Comprehensive testing capabilities

**Timeline:** 4 weeks for full migration with testing and deployment.
