CREATE TABLE `accounts` (
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `provider_account_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`metadata` text NOT NULL,
	`codice_fiscale_enc` text,
	`notes_enc` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assets_family_id_idx` ON `assets` (`family_id`);--> statement-breakpoint
CREATE TABLE `deadlines` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`asset_id` text,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`due_date` text NOT NULL,
	`amount_cents` integer,
	`recurrence` text DEFAULT 'none' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`source` text NOT NULL,
	`source_message_id` text,
	`medication_id` text,
	`notes_enc` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_message_id`) REFERENCES `inbox_messages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medication_id`) REFERENCES `medications`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `deadlines_family_id_due_date_idx` ON `deadlines` (`family_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `deadlines_family_id_status_idx` ON `deadlines` (`family_id`,`status`);--> statement-breakpoint
CREATE TABLE `families` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`invite_code` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `families_invite_code_unique` ON `families` (`invite_code`);--> statement-breakpoint
CREATE TABLE `family_members` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `family_members_family_id_user_id_idx` ON `family_members` (`family_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `family_members_user_id_idx` ON `family_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `inbox_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`user_id` text NOT NULL,
	`channel` text NOT NULL,
	`content_type` text NOT NULL,
	`raw_text` text,
	`transcription` text,
	`telegram_file_id` text,
	`parse_result` text,
	`parse_error` text,
	`status` text DEFAULT 'received' NOT NULL,
	`telegram_chat_id` text,
	`telegram_confirmation_message_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `inbox_messages_family_id_status_idx` ON `inbox_messages` (`family_id`,`status`);--> statement-breakpoint
CREATE TABLE `medications` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`name` text NOT NULL,
	`aic_code` text,
	`format` text,
	`expiry_date` text,
	`quantity` text,
	`notes_enc` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `medications_family_id_idx` ON `medications` (`family_id`);--> statement-breakpoint
CREATE TABLE `notifications_log` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`user_id` text,
	`kind` text NOT NULL,
	`ref_id` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`channel` text NOT NULL,
	`sent_at` text NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_log_dedupe_key_idx` ON `notifications_log` (`dedupe_key`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`user_agent` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE TABLE `telegram_link_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`used` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_link_codes_code_unique` ON `telegram_link_codes` (`code`);--> statement-breakpoint
CREATE TABLE `telegram_links` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`telegram_chat_id` text NOT NULL,
	`telegram_username` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_links_user_id_unique` ON `telegram_links` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_links_telegram_chat_id_unique` ON `telegram_links` (`telegram_chat_id`);--> statement-breakpoint
CREATE TABLE `therapies` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`person_asset_id` text,
	`medication_id` text,
	`medication_name` text NOT NULL,
	`dosage_text` text NOT NULL,
	`times_per_day` integer NOT NULL,
	`times` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`active` integer DEFAULT true NOT NULL,
	`source_message_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`medication_id`) REFERENCES `medications`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_message_id`) REFERENCES `inbox_messages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `therapies_family_id_active_idx` ON `therapies` (`family_id`,`active`);--> statement-breakpoint
CREATE TABLE `therapy_intakes` (
	`id` text PRIMARY KEY NOT NULL,
	`therapy_id` text NOT NULL,
	`scheduled_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`taken_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`therapy_id`) REFERENCES `therapies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `therapy_intakes_therapy_id_scheduled_at_idx` ON `therapy_intakes` (`therapy_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `therapy_intakes_status_scheduled_at_idx` ON `therapy_intakes` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`asset_id` text,
	`deadline_id` text,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`deadline_id`) REFERENCES `deadlines`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `transactions_family_id_date_idx` ON `transactions` (`family_id`,`date`);--> statement-breakpoint
CREATE INDEX `transactions_asset_id_idx` ON `transactions` (`asset_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`email_verified` integer,
	`image` text,
	`password_hash` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);