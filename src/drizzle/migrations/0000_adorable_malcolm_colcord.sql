CREATE TABLE IF NOT EXISTS "game" (
	"id" uuid PRIMARY KEY NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"code" integer NOT NULL,
	"winner_id" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "game_to_option" (
	"game_id" uuid NOT NULL,
	"option_id" integer NOT NULL,
	CONSTRAINT "game_to_option_game_id_option_id_pk" PRIMARY KEY("game_id","option_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "option" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "player" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"game_id" uuid
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "game" ADD CONSTRAINT "game_winner_id_player_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "game_to_option" ADD CONSTRAINT "game_to_option_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "game_to_option" ADD CONSTRAINT "game_to_option_option_id_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."option"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
