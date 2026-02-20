CREATE TABLE "article_tags" (
	"article_id" integer NOT NULL,
	"tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kb_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "knowledge_base_articles" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_knowledge_base_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_base_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_kb_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."kb_tags"("id") ON DELETE cascade ON UPDATE no action;