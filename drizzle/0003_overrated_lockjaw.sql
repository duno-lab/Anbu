CREATE TABLE `questions` (
	`id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`slug` varchar(220) NOT NULL,
	`content` text NOT NULL,
	`status` enum('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`),
	CONSTRAINT `questions_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `question_tags` (
	`question_id` varchar(36) NOT NULL,
	`tag_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_tags_pk` PRIMARY KEY(`question_id`,`tag_id`)
);
--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_tags` ADD CONSTRAINT `question_tags_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_tags` ADD CONSTRAINT `question_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `questions_author_id_idx` ON `questions` (`author_id`);--> statement-breakpoint
CREATE INDEX `questions_status_created_at_idx` ON `questions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `question_tags_tag_id_idx` ON `question_tags` (`tag_id`);