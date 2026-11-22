CREATE TABLE "shared_deadline_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_number" text NOT NULL,
	"year" integer NOT NULL,
	"semester" text NOT NULL,
	"type" text NOT NULL,
	"task_number" integer NOT NULL,
	"due_date" date NOT NULL,
	"install_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shared_deadline_votes_item_install_unique" UNIQUE("course_number","year","semester","type","task_number","install_hash")
);
--> statement-breakpoint
CREATE INDEX "shared_deadline_votes_course_idx" ON "shared_deadline_votes" USING btree ("course_number","year","semester");--> statement-breakpoint
CREATE INDEX "shared_deadline_votes_install_idx" ON "shared_deadline_votes" USING btree ("install_hash","updated_at");