CREATE TABLE `answers` (
	`id` varchar(36) NOT NULL,
	`question_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `answers` ADD CONSTRAINT `answers_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `answers` ADD CONSTRAINT `answers_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `answers_question_id_idx` ON `answers` (`question_id`);--> statement-breakpoint
CREATE INDEX `answers_author_id_idx` ON `answers` (`author_id`);--> statement-breakpoint
CREATE INDEX `answers_question_created_at_idx` ON `answers` (`question_id`,`created_at`);