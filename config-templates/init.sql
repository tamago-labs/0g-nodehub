-- MySQL initialization script
-- This creates the provider user and grants permissions
-- The database 'provider' is already created by CDK as the default database

CREATE USER IF NOT EXISTS 'provider'@'%' IDENTIFIED BY 'provider';
GRANT ALL PRIVILEGES ON provider.* TO 'provider'@'%';
FLUSH PRIVILEGES;

-- Verify the setup
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = 'provider';
