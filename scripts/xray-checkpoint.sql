-- Apply once to the notification database before deploying the updated app.
-- Existing notification logs are retained.
CREATE TABLE IF NOT EXISTS `xray_notification_checkpoint` (
  `name` VARCHAR(191) NOT NULL,
  `checkedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
