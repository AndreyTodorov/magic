# Database Schema for Laravel Tournament App

## Entity Relationship Diagram

```
┌──────────────────┐
│      users       │
│──────────────────│
│ id               │
│ name             │
│ email            │
│ password         │
│ dci_number       │
│ created_at       │
│ updated_at       │
└────────┬─────────┘
         │
         │ 1:N (creator)
         │
┌────────▼─────────────────────┐
│      tournaments             │
│──────────────────────────────│
│ id                           │
│ code (unique)                │
│ name                         │
│ description                  │
│ creator_id (FK → users)      │
│ player_count                 │
│ matches_per_player           │
│ status (enum)                │
│ started_at                   │
│ completed_at                 │
│ created_at                   │
│ updated_at                   │
└────────┬─────────────────────┘
         │
         │ N:M (members)
         │
┌────────▼──────────────────────┐
│   tournament_members          │
│───────────────────────────────│
│ id                            │
│ tournament_id (FK)            │
│ user_id (FK)                  │
│ joined_at                     │
│ left_at                       │
│ created_at                    │
│ updated_at                    │
└───────────────────────────────┘


         ┌──────────────────────┐
         │    tournaments       │
         └────────┬─────────────┘
                  │
                  │ 1:N
                  │
         ┌────────▼─────────────────────┐
         │        players               │
         │──────────────────────────────│
         │ id                           │
         │ tournament_id (FK)           │
         │ user_id (FK, nullable)       │
         │ name                         │
         │ position                     │
         │ dropped                      │
         │ dropped_at                   │
         │ created_at                   │
         │ updated_at                   │
         └────────┬─────────────────────┘
                  │
         ┌────────┴──────────┐
         │ 1:N               │ 1:N
         │ (player1)         │ (player2)
         │                   │
┌────────▼───────────────────▼──────┐
│           matches                 │
│───────────────────────────────────│
│ id                                │
│ tournament_id (FK)                │
│ player1_id (FK → players)         │
│ player2_id (FK → players)         │
│ round_number                      │
│ table_number                      │
│ completed                         │
│ winner_id (FK → players)          │
│ completed_at                      │
│ created_at                        │
│ updated_at                        │
└────────┬──────────────────────────┘
         │
         │ 1:N
         │
┌────────▼──────────────────────────┐
│            games                  │
│───────────────────────────────────│
│ id                                │
│ match_id (FK → matches)           │
│ game_number (1, 2, or 3)          │
│ winner_id (FK → players)          │
│ created_at                        │
│ updated_at                        │
└───────────────────────────────────┘
```

## Key Relationships

### One-to-Many
- `User` → `Tournament` (creator_id) - One user creates many tournaments
- `Tournament` → `Player` - One tournament has many players
- `Tournament` → `Match` - One tournament has many matches
- `Match` → `Game` - One match has many games (max 3)
- `Player` → `Match` (as player1) - One player is player1 in many matches
- `Player` → `Match` (as player2) - One player is player2 in many matches

### Many-to-Many
- `User` ↔ `Tournament` (via tournament_members) - Users can join multiple tournaments

### Self-referencing
- `Match` → `Player` (winner_id) - Match references its winner (optional until completed)
- `Game` → `Player` (winner_id) - Game references its winner

## Indexes

```sql
-- tournaments
INDEX idx_tournaments_code ON tournaments(code)
INDEX idx_tournaments_status ON tournaments(status)
INDEX idx_tournaments_creator ON tournaments(creator_id)

-- tournament_members
UNIQUE idx_tm_unique ON tournament_members(tournament_id, user_id)
INDEX idx_tm_tournament_left ON tournament_members(tournament_id, left_at)

-- players
INDEX idx_players_tournament_position ON players(tournament_id, position)
INDEX idx_players_tournament_dropped ON players(tournament_id, dropped)
UNIQUE idx_players_unique_position ON players(tournament_id, position)

-- matches
INDEX idx_matches_tournament_completed ON matches(tournament_id, completed)
INDEX idx_matches_tournament_round ON matches(tournament_id, round_number)
INDEX idx_matches_player1 ON matches(player1_id)
INDEX idx_matches_player2 ON matches(player2_id)

-- games
UNIQUE idx_games_match_number ON games(match_id, game_number)
INDEX idx_games_match ON games(match_id)
```

## Data Flow Example

### Creating a Tournament

```
1. User creates tournament
   └→ INSERT INTO tournaments (creator_id, code, name, ...)

2. User joins as member
   └→ INSERT INTO tournament_members (tournament_id, user_id, joined_at)

3. Players are added
   └→ INSERT INTO players (tournament_id, name, position)

4. Tournament starts
   └→ UPDATE tournaments SET status='active', started_at=NOW()
   └→ Generate matches algorithm runs
      └→ INSERT INTO matches (tournament_id, player1_id, player2_id, ...)
```

### Recording Match Results

```
1. Player wins Game 1
   └→ INSERT INTO games (match_id, game_number=1, winner_id)
   └→ Check if match complete: No (need 2 wins)

2. Player wins Game 2
   └→ INSERT INTO games (match_id, game_number=2, winner_id)
   └→ Check if match complete: Yes (2 wins)
      └→ UPDATE matches SET completed=true, winner_id=X, completed_at=NOW()
      └→ BROADCAST MatchCompleted event

3. Check tournament completion
   └→ SELECT COUNT(*) FROM matches WHERE tournament_id=X AND completed=false
   └→ If 0: UPDATE tournaments SET status='completed', completed_at=NOW()
```

## Data Integrity Constraints

### Database-level
```sql
-- Foreign keys with cascade
ALTER TABLE tournaments
    ADD CONSTRAINT fk_tournaments_creator
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE players
    ADD CONSTRAINT fk_players_tournament
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;

ALTER TABLE matches
    ADD CONSTRAINT fk_matches_player1
    FOREIGN KEY (player1_id) REFERENCES players(id) ON DELETE CASCADE;

-- Unique constraints
ALTER TABLE tournaments
    ADD CONSTRAINT uq_tournaments_code UNIQUE (code);

ALTER TABLE players
    ADD CONSTRAINT uq_players_position UNIQUE (tournament_id, position);

ALTER TABLE games
    ADD CONSTRAINT uq_games_match_number UNIQUE (match_id, game_number);

-- Check constraints (Laravel 12 / PostgreSQL)
ALTER TABLE games
    ADD CONSTRAINT chk_games_number CHECK (game_number BETWEEN 1 AND 3);
```

### Application-level (Laravel)
```php
// Player model validation
protected static function boot()
{
    parent::boot();

    static::creating(function ($player) {
        // Ensure position is unique within tournament
        $maxPosition = Player::where('tournament_id', $player->tournament_id)
            ->max('position');
        $player->position = $maxPosition + 1;
    });
}

// Match model validation
public function recordGame(int $gameNumber, Player $winner): void
{
    // Validate game number
    if ($gameNumber < 1 || $gameNumber > 3) {
        throw new \InvalidArgumentException('Game number must be 1-3');
    }

    // Validate winner is a player in the match
    if (!in_array($winner->id, [$this->player1_id, $this->player2_id])) {
        throw new \InvalidArgumentException('Winner must be a match participant');
    }

    // ... rest of logic
}
```

## Query Examples

### Get Tournament Standings
```sql
SELECT
    p.id,
    p.name,
    -- Match stats
    SUM(CASE WHEN m.winner_id = p.id THEN 1 ELSE 0 END) as match_wins,
    SUM(CASE WHEN m.completed = true AND m.winner_id != p.id THEN 1 ELSE 0 END) as match_losses,
    -- Game stats
    (SELECT COUNT(*) FROM games g
     JOIN matches m2 ON g.match_id = m2.id
     WHERE g.winner_id = p.id
       AND (m2.player1_id = p.id OR m2.player2_id = p.id)
    ) as game_wins,
    -- Points calculation
    (SUM(CASE WHEN m.winner_id = p.id THEN 3 ELSE 0 END) +
     (SELECT COUNT(*) FROM games g
      JOIN matches m2 ON g.match_id = m2.id
      WHERE g.winner_id = p.id
        AND (m2.player1_id = p.id OR m2.player2_id = p.id)
     ) * 1 +
     (SELECT COUNT(*) FROM games g
      JOIN matches m2 ON g.match_id = m2.id
      WHERE g.winner_id != p.id AND g.winner_id IS NOT NULL
        AND (m2.player1_id = p.id OR m2.player2_id = p.id)
     ) * -0.5
    ) as total_points
FROM players p
LEFT JOIN matches m ON (m.player1_id = p.id OR m.player2_id = p.id) AND m.completed = true
WHERE p.tournament_id = ?
GROUP BY p.id
ORDER BY total_points DESC, match_wins DESC;
```

### Get Player's Match Schedule
```sql
SELECT
    m.*,
    p1.name as player1_name,
    p2.name as player2_name,
    GROUP_CONCAT(g.winner_id ORDER BY g.game_number) as game_results
FROM matches m
JOIN players p1 ON m.player1_id = p1.id
JOIN players p2 ON m.player2_id = p2.id
LEFT JOIN games g ON m.id = g.match_id
WHERE (m.player1_id = ? OR m.player2_id = ?)
  AND m.tournament_id = ?
GROUP BY m.id
ORDER BY m.round_number, m.table_number;
```

## Storage Estimates

### Per Tournament (8 players, 3 matches each)
```
Tournament:     1 row  × ~200 bytes  = 200 bytes
Players:        8 rows × ~150 bytes  = 1.2 KB
Matches:       12 rows × ~200 bytes  = 2.4 KB
Games:         36 rows × ~100 bytes  = 3.6 KB
Members:        8 rows × ~100 bytes  = 800 bytes
─────────────────────────────────────────────
Total:                                ~8.2 KB per tournament
```

### 1000 tournaments = ~8.2 MB (very lightweight)

## Comparison to Current Structure

### Current (Firebase/localStorage)
```javascript
{
  "tournaments": {
    "ABC123": {
      "players": ["Alice", "Bob", "Charlie"],  // Array
      "matches": [
        {
          "player1": 0,                         // Index reference
          "player2": 1,
          "games": [null, 0, 1]                 // Index reference
        }
      ]
    }
  }
}
```

### Laravel (Relational)
```
tournaments table: Metadata
players table:     Named entities with IDs
matches table:     Relationships via foreign keys
games table:       Individual game results

Benefits:
- ✅ Referential integrity
- ✅ Easy queries (JOIN, WHERE, ORDER BY)
- ✅ Data normalization (no duplication)
- ✅ Transaction support
- ✅ Indexes for performance
```

## Migration Notes

Your current structure maps almost 1:1 to this schema:
- `tournament.players[]` → `players` table (position = array index)
- `tournament.matches[].player1` → `matches.player1_id` (via position lookup)
- `tournament.matches[].games[]` → `games` table (game_number 1-3)
- `tournament.members` → `tournament_members` pivot table
- `tournament.creator` → `tournaments.creator_id`
