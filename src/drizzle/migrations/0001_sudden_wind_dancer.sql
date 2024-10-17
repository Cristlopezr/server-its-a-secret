CREATE TABLE IF NOT EXISTS "player_to_game" (
	"player_id" varchar NOT NULL,
	"game_id" uuid NOT NULL,
	CONSTRAINT "player_to_game_player_id_game_id_pk" PRIMARY KEY("player_id","game_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_to_game" ADD CONSTRAINT "player_to_game_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_to_game" ADD CONSTRAINT "player_to_game_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN IF EXISTS "game_id";