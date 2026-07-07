CREATE TABLE "study_group_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_number" text NOT NULL,
	"year" integer NOT NULL,
	"semester" text NOT NULL,
	"platform" text NOT NULL,
	"url" text NOT NULL,
	"status" text DEFAULT 'approved' NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_group_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "study_group_reports" ADD CONSTRAINT "study_group_reports_link_id_study_group_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."study_group_links"("id") ON DELETE no action ON UPDATE no action;