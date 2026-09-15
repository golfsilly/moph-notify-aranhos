ALTER TABLE `xray_portable_cursors`
    ADD COLUMN `last_run_at` DATETIME(3) NULL,
    ADD COLUMN `last_run_status` ENUM('RUNNING', 'SUCCESS', 'FAILED') NULL,
    ADD COLUMN `last_run_duration_ms` INTEGER NULL,
    ADD COLUMN `last_run_error` VARCHAR(500) NULL,
    ADD COLUMN `last_run_queued` INTEGER NULL,
    ADD COLUMN `last_run_sent` INTEGER NULL,
    ADD COLUMN `last_run_failed` INTEGER NULL;
