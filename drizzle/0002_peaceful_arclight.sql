CREATE TABLE `tags` (
	`id` varchar(36) NOT NULL,
	`name` varchar(50) NOT NULL,
	`slug` varchar(70) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`),
	CONSTRAINT `tags_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `article_tags` (
	`article_id` varchar(36) NOT NULL,
	`tag_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `article_tags_pk` PRIMARY KEY(`article_id`,`tag_id`)
);
--> statement-breakpoint
ALTER TABLE `article_tags` ADD CONSTRAINT `article_tags_article_id_articles_id_fk` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `article_tags` ADD CONSTRAINT `article_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tags_created_at_idx` ON `tags` (`created_at`);--> statement-breakpoint
CREATE INDEX `article_tags_tag_id_idx` ON `article_tags` (`tag_id`);