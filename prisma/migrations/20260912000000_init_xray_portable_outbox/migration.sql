CREATE TABLE `xray_portable_cursors` (
    `job_name` VARCHAR(64) NOT NULL,
    `last_xn` BIGINT NOT NULL,
    `initialized_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`job_name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

CREATE TABLE `xray_portable_notifications` (
    `source_xn` BIGINT NOT NULL,
    `item_code` INTEGER NOT NULL,
    `target_group` VARCHAR(32) NOT NULL DEFAULT 'test',
    `status` ENUM('PENDING', 'PROCESSING', 'FAILED', 'SENT') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `next_attempt_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processing_token` VARCHAR(36) NULL,
    `processing_started_at` DATETIME(3) NULL,
    `sent_at` DATETIME(3) NULL,
    `last_error` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_xray_portable_due`(`status`, `next_attempt_at`),
    INDEX `idx_xray_portable_stale`(`status`, `processing_started_at`),
    PRIMARY KEY (`source_xn`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;
