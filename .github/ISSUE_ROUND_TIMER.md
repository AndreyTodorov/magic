# Round Timer: Countdown Clock

## Overview
Implement a countdown timer feature for tournament rounds. This is a standard feature in competitive Magic: The Gathering tournaments where each round has a fixed time limit (typically 50 minutes). The timer should be visible to both tournament organizers and players, with real-time synchronization across all connected devices.

## User Stories

### As a Tournament Organizer
- I want to start a round timer when a new round begins
- I want to pause/resume the timer for announcements or issues
- I want to add time extensions for judge calls or technical issues
- I want to see a warning when time is running low (e.g., 5 minutes remaining)
- I want to display the timer on a public screen for all players to see

### As a Player
- I want to see how much time remains in the current round
- I want to receive notifications when time is running low
- I want to know when time has expired

## Requirements

### Functional Requirements
1. **Configurable Duration**: Default 50 minutes, but configurable per tournament format
   - Standard/Modern: 50 minutes
   - Draft: 25 minutes for deck building, 50 minutes per round
   - Commander: 70-90 minutes
2. **Real-time Synchronization**: All connected devices see the same time
3. **Persistent State**: Timer survives page refreshes and server restarts
4. **Controls**: Start, Pause, Resume, Reset, Add Time
5. **Visual Warnings**: Color changes at 10 min (yellow) and 5 min (red) remaining
6. **Audio Alerts**: Optional sound at 5 min, 1 min, and 0:00
7. **Time Extensions**: Add 1, 5, or custom minutes during round
8. **End-of-Round Behavior**: Auto-notify when time expires, option to auto-complete matches

### Non-Functional Requirements
1. **Accuracy**: Timer should not drift across devices
2. **Performance**: Minimal server load (use broadcasting, not polling)
3. **Mobile-Friendly**: Readable on phone screens
4. **Offline Handling**: Show "disconnected" state if real-time fails

## Technical Implementation

### Database Schema

#### Add to `tournaments` table
```php
Schema::table('tournaments', function (Blueprint $table) {
    $table->integer('round_duration_minutes')->default(50);
    $table->integer('current_round')->default(0);
});
```

#### Create `tournament_rounds` table
```php
Schema::create('tournament_rounds', function (Blueprint $table) {
    $table->id();
    $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
    $table->integer('round_number');
    $table->integer('duration_minutes')->default(50); // Can override per round
    $table->timestamp('started_at')->nullable();
    $table->timestamp('paused_at')->nullable();
    $table->integer('pause_duration_seconds')->default(0); // Track total paused time
    $table->integer('extension_seconds')->default(0); // Time added via extensions
    $table->enum('status', ['pending', 'active', 'paused', 'completed'])->default('pending');
    $table->timestamp('completed_at')->nullable();
    $table->timestamps();

    $table->unique(['tournament_id', 'round_number']);
    $table->index(['tournament_id', 'status']);
});
```

### Model: TournamentRound

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class TournamentRound extends Model
{
    protected $fillable = [
        'tournament_id',
        'round_number',
        'duration_minutes',
        'started_at',
        'paused_at',
        'pause_duration_seconds',
        'extension_seconds',
        'status',
        'completed_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'paused_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    /**
     * Get remaining seconds in the round
     */
    public function getRemainingSeconds(): int
    {
        if ($this->status === 'pending' || $this->status === 'completed') {
            return 0;
        }

        $totalDuration = ($this->duration_minutes * 60) + $this->extension_seconds;

        if ($this->status === 'paused') {
            $elapsed = $this->started_at->diffInSeconds($this->paused_at);
            return max(0, $totalDuration - $elapsed - $this->pause_duration_seconds);
        }

        // Active
        $elapsed = $this->started_at->diffInSeconds(now());
        return max(0, $totalDuration - $elapsed - $this->pause_duration_seconds);
    }

    /**
     * Get formatted time remaining (MM:SS)
     */
    public function getFormattedTimeRemaining(): string
    {
        $seconds = $this->getRemainingSeconds();
        $minutes = floor($seconds / 60);
        $secs = $seconds % 60;
        return sprintf('%02d:%02d', $minutes, $secs);
    }

    /**
     * Start the round timer
     */
    public function start(): void
    {
        if ($this->status === 'paused') {
            // Resuming from pause
            $pausedDuration = $this->paused_at->diffInSeconds(now());
            $this->update([
                'status' => 'active',
                'paused_at' => null,
                'pause_duration_seconds' => $this->pause_duration_seconds + $pausedDuration,
            ]);
        } else {
            // Starting fresh
            $this->update([
                'started_at' => now(),
                'status' => 'active',
            ]);
        }

        broadcast(new \App\Events\RoundTimerUpdated($this))->toOthers();
    }

    /**
     * Pause the round timer
     */
    public function pause(): void
    {
        $this->update([
            'status' => 'paused',
            'paused_at' => now(),
        ]);

        broadcast(new \App\Events\RoundTimerUpdated($this))->toOthers();
    }

    /**
     * Add time extension
     */
    public function addTime(int $seconds): void
    {
        $this->increment('extension_seconds', $seconds);
        broadcast(new \App\Events\RoundTimerUpdated($this))->toOthers();
    }

    /**
     * Complete the round
     */
    public function complete(): void
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        broadcast(new \App\Events\RoundCompleted($this))->toOthers();
    }

    /**
     * Check if time has expired
     */
    public function hasExpired(): bool
    {
        return $this->status === 'active' && $this->getRemainingSeconds() <= 0;
    }
}
```

### Event: RoundTimerUpdated

```php
<?php

namespace App\Events;

use App\Models\TournamentRound;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RoundTimerUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public TournamentRound $round)
    {
    }

    public function broadcastOn(): Channel
    {
        return new Channel("tournament.{$this->round->tournament_id}");
    }

    public function broadcastWith(): array
    {
        return [
            'round_number' => $this->round->round_number,
            'status' => $this->round->status,
            'remaining_seconds' => $this->round->getRemainingSeconds(),
            'formatted_time' => $this->round->getFormattedTimeRemaining(),
        ];
    }
}
```

### Livewire Component: RoundTimer

```php
<?php

namespace App\Livewire;

use App\Models\Tournament;
use App\Models\TournamentRound;
use Livewire\Component;
use Livewire\Attributes\On;

class RoundTimer extends Component
{
    public Tournament $tournament;
    public ?TournamentRound $currentRound = null;
    public int $remainingSeconds = 0;
    public string $formattedTime = '00:00';
    public bool $showControls = false; // True for organizers

    public function mount()
    {
        $this->loadCurrentRound();
    }

    #[On('echo:tournament.{tournament.id},RoundTimerUpdated')]
    public function handleTimerUpdate($data)
    {
        $this->remainingSeconds = $data['remaining_seconds'];
        $this->formattedTime = $data['formatted_time'];
        $this->loadCurrentRound();
    }

    public function loadCurrentRound()
    {
        $this->currentRound = $this->tournament->rounds()
            ->where('status', '!=', 'completed')
            ->orderBy('round_number', 'desc')
            ->first();

        if ($this->currentRound) {
            $this->remainingSeconds = $this->currentRound->getRemainingSeconds();
            $this->formattedTime = $this->currentRound->getFormattedTimeRemaining();
        }
    }

    public function startTimer()
    {
        $this->currentRound?->start();
        $this->loadCurrentRound();
    }

    public function pauseTimer()
    {
        $this->currentRound?->pause();
        $this->loadCurrentRound();
    }

    public function addTime(int $minutes)
    {
        $this->currentRound?->addTime($minutes * 60);
        $this->loadCurrentRound();
    }

    public function render()
    {
        return view('livewire.round-timer');
    }
}
```

### Blade View: round-timer.blade.php

```blade
<div
    wire:poll.1s="loadCurrentRound"
    class="round-timer"
    x-data="{
        remainingSeconds: @entangle('remainingSeconds'),
        playSound: false,
        lastWarning: null
    }"
    x-init="
        $watch('remainingSeconds', value => {
            // Play sound at 5min, 1min, 0:00
            if ([300, 60, 0].includes(value) && lastWarning !== value) {
                if (playSound) new Audio('/sounds/timer-warning.mp3').play();
                lastWarning = value;
            }
        })
    "
>
    @if($currentRound && $currentRound->status !== 'completed')
        <div
            class="timer-display"
            :class="{
                'text-red-600': remainingSeconds <= 300,
                'text-yellow-600': remainingSeconds > 300 && remainingSeconds <= 600,
                'text-green-600': remainingSeconds > 600
            }"
        >
            <div class="text-6xl font-bold font-mono">
                {{ $formattedTime }}
            </div>

            <div class="text-sm text-gray-600 mt-2">
                Round {{ $currentRound->round_number }} -
                @if($currentRound->status === 'active')
                    <span class="text-green-600">● Active</span>
                @elseif($currentRound->status === 'paused')
                    <span class="text-yellow-600">⏸ Paused</span>
                @endif
            </div>
        </div>

        @if($showControls)
            <div class="timer-controls mt-4 flex gap-2">
                @if($currentRound->status === 'pending' || $currentRound->status === 'paused')
                    <button wire:click="startTimer" class="btn btn-success">
                        {{ $currentRound->status === 'paused' ? 'Resume' : 'Start' }}
                    </button>
                @endif

                @if($currentRound->status === 'active')
                    <button wire:click="pauseTimer" class="btn btn-warning">
                        Pause
                    </button>
                @endif

                <button wire:click="addTime(1)" class="btn btn-secondary">
                    +1 Min
                </button>
                <button wire:click="addTime(5)" class="btn btn-secondary">
                    +5 Min
                </button>
            </div>
        @endif
    @else
        <div class="text-gray-400">No active round</div>
    @endif
</div>
```

### Scheduled Job: Check for Timer Expiration

```php
<?php

namespace App\Console\Commands;

use App\Models\TournamentRound;
use Illuminate\Console\Command;

class CheckExpiredRounds extends Command
{
    protected $signature = 'tournaments:check-expired-rounds';
    protected $description = 'Check for expired round timers and notify';

    public function handle()
    {
        TournamentRound::where('status', 'active')
            ->get()
            ->each(function ($round) {
                if ($round->hasExpired()) {
                    // Notify tournament organizer
                    $round->tournament->creator->notify(
                        new \App\Notifications\RoundTimeExpired($round)
                    );

                    // Optionally auto-complete the round
                    // $round->complete();
                }
            });
    }
}
```

Add to `app/Console/Kernel.php`:
```php
protected function schedule(Schedule $schedule)
{
    $schedule->command('tournaments:check-expired-rounds')->everyMinute();
}
```

## Configuration

Add to `config/tournament.php`:
```php
'timer' => [
    'default_duration' => env('TOURNAMENT_TIMER_DURATION', 50), // minutes
    'warning_thresholds' => [
        'yellow' => 10, // minutes
        'red' => 5,
    ],
    'sound_alerts' => [
        'enabled' => env('TOURNAMENT_TIMER_SOUNDS', true),
        'thresholds' => [5, 1, 0], // minutes
    ],
],
```

## Acceptance Criteria

### Must Have
- [ ] Tournament organizer can start/pause/resume round timer
- [ ] Timer displays in MM:SS format
- [ ] Timer syncs in real-time across all devices via Laravel Reverb
- [ ] Visual color changes: green → yellow (10min) → red (5min)
- [ ] Timer persists through page refreshes
- [ ] Tournament organizer can add time extensions (+1 min, +5 min buttons)
- [ ] Timer accounts for paused time correctly
- [ ] Timer shows current status (Active/Paused/Pending)

### Should Have
- [ ] Audio alerts at 5min, 1min, 0:00 (toggleable)
- [ ] Notification to TO when time expires
- [ ] Large display mode for public viewing (TV/projector)
- [ ] Round number displayed with timer
- [ ] Mobile-responsive design

### Nice to Have
- [ ] Timer history (past rounds with durations)
- [ ] Average round duration statistics
- [ ] Custom time input (not just +1/+5 presets)
- [ ] Keyboard shortcuts (Space = pause/resume, +/- = add/subtract time)
- [ ] End-of-round auto-reminders to players

## Testing Considerations

### Unit Tests
- Test `getRemainingSeconds()` calculation with various states
- Test pause/resume math (paused time shouldn't count against round)
- Test time extension additions
- Test state transitions (pending → active → paused → active → completed)

### Feature Tests
- Test starting a round creates `TournamentRound` record
- Test timer broadcasts events correctly
- Test multiple devices receive same time
- Test page refresh doesn't reset timer

### Manual Testing Scenarios
1. Start timer, let it run for 1 minute, verify accuracy
2. Pause timer, wait 30 seconds, resume, verify paused time excluded
3. Add 5-minute extension, verify new end time
4. Open tournament in 2 browser windows, verify sync
5. Refresh page during active timer, verify continues from correct time
6. Let timer expire, verify visual/audio alerts

## UI/UX Mockup

```
┌─────────────────────────────────────────┐
│          Round 3 Timer                  │
│                                         │
│           ⏱️  45:23                     │
│        Round 3 - ● Active               │
│                                         │
│  [Pause] [+1 Min] [+5 Min]             │
└─────────────────────────────────────────┘

Color states:
- Green text: > 10 minutes remaining
- Yellow text: 5-10 minutes remaining
- Red text: < 5 minutes remaining
- Pulsing animation: < 1 minute
```

## Migration Path

1. **Database**: Create migration for `tournament_rounds` table
2. **Model**: Create `TournamentRound` model with business logic
3. **Event**: Create `RoundTimerUpdated` broadcast event
4. **Livewire**: Create `RoundTimer` component
5. **Views**: Create blade template with Alpine.js for client-side behavior
6. **Reverb**: Ensure Laravel Reverb is set up for WebSocket broadcasting
7. **Commands**: Create scheduled command for expiration checks
8. **Tests**: Write feature and unit tests
9. **Integration**: Add timer to tournament show page and live display

## Related Issues/Features

- Depends on: Laravel Reverb setup for real-time broadcasting
- Enhances: Round-based Swiss tournament structure (#TBD)
- Blocks: Auto-complete matches on timer expiration (#TBD)

## Resources

- [Laravel Broadcasting Docs](https://laravel.com/docs/11.x/broadcasting)
- [Laravel Reverb Docs](https://laravel.com/docs/11.x/reverb)
- [Livewire Real-time Docs](https://livewire.laravel.com/docs/events#real-time-events)
- [Alpine.js for client-side timer display](https://alpinejs.dev/)

---

**Implementation Estimate**: 2-3 days for experienced Laravel/TALL stack developer

**Priority**: High (core tournament management feature)

**Labels**: `enhancement`, `tall-stack`, `real-time`, `tournament-feature`
