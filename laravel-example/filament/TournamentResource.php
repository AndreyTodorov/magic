<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TournamentResource\Pages;
use App\Filament\Resources\TournamentResource\RelationManagers;
use App\Models\Tournament;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components;

class TournamentResource extends Resource
{
    protected static ?string $model = Tournament::class;

    protected static ?string $navigationIcon = 'heroicon-o-trophy';

    protected static ?string $navigationGroup = 'Tournaments';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Tournament Details')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->required()
                            ->maxLength(255),

                        Forms\Components\Textarea::make('description')
                            ->rows(3)
                            ->columnSpanFull(),

                        Forms\Components\TextInput::make('code')
                            ->required()
                            ->length(6)
                            ->unique(ignoreRecord: true)
                            ->placeholder('ABC123')
                            ->helperText('6-character tournament code'),

                        Forms\Components\Select::make('creator_id')
                            ->relationship('creator', 'name')
                            ->required()
                            ->searchable()
                            ->preload(),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Configuration')
                    ->schema([
                        Forms\Components\TextInput::make('player_count')
                            ->numeric()
                            ->default(0)
                            ->minValue(0)
                            ->maxValue(config('tournament.max_players'))
                            ->helperText('Will be set automatically when players join'),

                        Forms\Components\TextInput::make('matches_per_player')
                            ->numeric()
                            ->default(config('tournament.default_matches_per_player'))
                            ->minValue(1)
                            ->maxValue(10)
                            ->required()
                            ->helperText('Number of matches each player will play'),

                        Forms\Components\Select::make('status')
                            ->options([
                                'setup' => 'Setup',
                                'active' => 'Active',
                                'completed' => 'Completed',
                                'archived' => 'Archived',
                            ])
                            ->default('setup')
                            ->required(),
                    ])
                    ->columns(3),

                Forms\Components\Section::make('Timestamps')
                    ->schema([
                        Forms\Components\DateTimePicker::make('started_at')
                            ->displayFormat('M d, Y H:i'),

                        Forms\Components\DateTimePicker::make('completed_at')
                            ->displayFormat('M d, Y H:i'),
                    ])
                    ->columns(2)
                    ->visibleOn('edit'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('code')
                    ->searchable()
                    ->copyable()
                    ->badge()
                    ->color('success'),

                Tables\Columns\TextColumn::make('name')
                    ->searchable()
                    ->sortable()
                    ->description(fn (Tournament $record): string =>
                        $record->description ? \Str::limit($record->description, 50) : ''
                    ),

                Tables\Columns\TextColumn::make('creator.name')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'setup' => 'gray',
                        'active' => 'warning',
                        'completed' => 'success',
                        'archived' => 'danger',
                    }),

                Tables\Columns\TextColumn::make('player_count')
                    ->label('Players')
                    ->numeric()
                    ->sortable(),

                Tables\Columns\TextColumn::make('matches_per_player')
                    ->label('Matches/Player')
                    ->numeric(),

                Tables\Columns\TextColumn::make('matches_count')
                    ->counts('matches')
                    ->label('Total Matches')
                    ->sortable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('started_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('completed_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'setup' => 'Setup',
                        'active' => 'Active',
                        'completed' => 'Completed',
                        'archived' => 'Archived',
                    ]),

                Tables\Filters\Filter::make('active')
                    ->query(fn ($query) => $query->where('status', 'active'))
                    ->toggle(),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),

                Tables\Actions\Action::make('start')
                    ->icon('heroicon-o-play')
                    ->color('success')
                    ->requiresConfirmation()
                    ->visible(fn (Tournament $record) => $record->status === 'setup')
                    ->action(fn (Tournament $record) => $record->start()),

                Tables\Actions\Action::make('view_standings')
                    ->icon('heroicon-o-chart-bar')
                    ->url(fn (Tournament $record) => route('filament.resources.tournaments.standings', $record))
                    ->visible(fn (Tournament $record) => $record->status !== 'setup'),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Components\Section::make('Tournament Information')
                    ->schema([
                        Components\TextEntry::make('code')
                            ->copyable()
                            ->badge()
                            ->color('success'),

                        Components\TextEntry::make('name'),

                        Components\TextEntry::make('description')
                            ->columnSpanFull(),

                        Components\TextEntry::make('creator.name'),

                        Components\TextEntry::make('status')
                            ->badge()
                            ->color(fn (string $state): string => match ($state) {
                                'setup' => 'gray',
                                'active' => 'warning',
                                'completed' => 'success',
                                'archived' => 'danger',
                            }),
                    ])
                    ->columns(2),

                Components\Section::make('Statistics')
                    ->schema([
                        Components\TextEntry::make('player_count')
                            ->label('Total Players'),

                        Components\TextEntry::make('matches_per_player'),

                        Components\TextEntry::make('matches_count')
                            ->label('Total Matches')
                            ->state(fn (Tournament $record) => $record->matches()->count()),

                        Components\TextEntry::make('completed_matches_count')
                            ->label('Completed Matches')
                            ->state(fn (Tournament $record) => $record->matches()->completed()->count()),

                        Components\TextEntry::make('started_at')
                            ->dateTime()
                            ->placeholder('Not started'),

                        Components\TextEntry::make('completed_at')
                            ->dateTime()
                            ->placeholder('Not completed'),
                    ])
                    ->columns(3),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\PlayersRelationManager::class,
            RelationManagers\MatchesRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListTournaments::route('/'),
            'create' => Pages\CreateTournament::route('/create'),
            'view' => Pages\ViewTournament::route('/{record}'),
            'edit' => Pages\EditTournament::route('/{record}/edit'),
            'standings' => Pages\TournamentStandings::route('/{record}/standings'),
        ];
    }
}
