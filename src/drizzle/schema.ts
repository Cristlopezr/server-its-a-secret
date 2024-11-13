/* import { relations } from 'drizzle-orm';
import { uuid, pgTable, integer, varchar, timestamp, primaryKey, serial } from 'drizzle-orm/pg-core';

export const games = pgTable('game', {
    id: uuid('id').primaryKey(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    finishedAt: timestamp('finished_at'),
    code: integer('code').notNull(),
    winner: varchar('winner_id').references(() => players.id),
});

export const players = pgTable('player', {
    id: varchar('id').notNull().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
});

export const gameRelations = relations(games, ({ many, one }) => ({
    players: many(players),
    winner: one(players, { fields: [games.winner], references: [players.id] }),
    gamesToOptions: many(gamesToOptions),
}));

export const playersToGames = pgTable(
    'player_to_game',
    {
        playerId: varchar('player_id')
            .notNull()
            .references(() => players.id)
            .notNull(),
        gameId: uuid('game_id')
            .notNull()
            .references(() => games.id)
            .notNull(),
    },
    t => ({
        pk: primaryKey({ columns: [t.playerId, t.gameId] }),
    })
);

export const playersToGamesRelations = relations(playersToGames, ({ one }) => ({
    player: one(players, {
        fields: [playersToGames.playerId],
        references: [players.id],
    }),
    game: one(games, {
        fields: [playersToGames.gameId],
        references: [games.id],
    }),
}));

export const options = pgTable('option', {
    id: serial('id').primaryKey(),
    name: varchar('name').notNull(),
});

export const optionsRelations = relations(options, ({ many }) => ({
    gamesToOptions: many(gamesToOptions),
}));

export const gamesToOptions = pgTable(
    'game_to_option',
    {
        gameId: uuid('game_id')
            .notNull()
            .references(() => games.id)
            .notNull(),
        optionsId: integer('option_id')
            .notNull()
            .references(() => options.id)
            .notNull(),
    },
    t => ({
        pk: primaryKey({ columns: [t.gameId, t.optionsId] }),
    })
);

export const gamesToOptionsRelations = relations(gamesToOptions, ({ one }) => ({
    game: one(games, {
        fields: [gamesToOptions.gameId],
        references: [games.id],
    }),
    option: one(options, {
        fields: [gamesToOptions.optionsId],
        references: [options.id],
    }),
}));
 */
