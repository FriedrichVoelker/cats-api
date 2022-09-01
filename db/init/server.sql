CREATE DATABASE IF NOT EXISTS `cats`;
USE `cats`;
SET GLOBAL max_allowed_packet=1073741824;

CREATE TABLE `images` (
	`uuid` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_general_ci',
	`image` BLOB NOT NULL,
	`source` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
	`created_at` DATETIME NULL DEFAULT NULL,
	PRIMARY KEY (`uuid`) USING BTREE
)
COLLATE='utf8mb4_general_ci'
ENGINE=InnoDB
;
