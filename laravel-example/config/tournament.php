<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Scoring Configuration
    |--------------------------------------------------------------------------
    |
    | Define point values for tournament scoring.
    | Ported from your js/config.js SCORING settings.
    |
    */
    'scoring' => [
        'match_win' => env('TOURNAMENT_MATCH_WIN_POINTS', 3),
        'game_win' => env('TOURNAMENT_GAME_WIN_POINTS', 1),
        'game_loss' => env('TOURNAMENT_GAME_LOSS_POINTS', -0.5),
    ],

    /*
    |--------------------------------------------------------------------------
    | Player Limits
    |--------------------------------------------------------------------------
    */
    'min_players' => env('TOURNAMENT_MIN_PLAYERS', 4),
    'max_players' => env('TOURNAMENT_MAX_PLAYERS', 30),

    /*
    |--------------------------------------------------------------------------
    | Tournament Code Generation
    |--------------------------------------------------------------------------
    */
    'code_length' => 6,
    'code_characters' => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',

    /*
    |--------------------------------------------------------------------------
    | Match Generation
    |--------------------------------------------------------------------------
    */
    'default_matches_per_player' => 3,
    'max_generation_attempts' => 1000,
];
