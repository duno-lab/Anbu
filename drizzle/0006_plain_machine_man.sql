CREATE TABLE `answer_votes` (
	`id` varchar(36) NOT NULL,
	`answer_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`value` enum('UP','DOWN') NOT NULL,
	CONSTRAINT `answer_votes_id` PRIMARY KEY(`id`),
	CONSTRAINT `answer_votes_answer_user_unique` UNIQUE(`answer_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `answer_votes` ADD CONSTRAINT `answer_votes_answer_id_answers_id_fk` FOREIGN KEY (`answer_id`) REFERENCES `answers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `answer_votes` ADD CONSTRAINT `answer_votes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `answer_votes_user_id_idx` ON `answer_votes` (`user_id`);