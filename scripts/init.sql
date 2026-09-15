-- Create RCM Database
CREATE DATABASE IF NOT EXISTS rcmdb;

-- Create REFER Database
CREATE DATABASE IF NOT EXISTS referdb;

-- Use HOS database
USE hos;

-- Example table for testing
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    status ENUM ('pending', 'sent', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Grant privileges
GRANT ALL PRIVILEGES ON hos.* TO 'sa'@'%' IDENTIFIED BY 'aranhospi';

GRANT ALL PRIVILEGES ON rcmdb.* TO 'sa'@'%' IDENTIFIED BY 'aranhospi';

GRANT ALL PRIVILEGES ON referdb.* TO 'sa'@'%' IDENTIFIED BY 'aranhospi';

FLUSH PRIVILEGES;