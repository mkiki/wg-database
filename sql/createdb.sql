--------------------------------------------------------------------------------
-- wgdbtest - Database structure
-- 
-- Run with postgres role
-- psql -U postgres
--  - or - 
-- psql -d template1
--------------------------------------------------------------------------------

DROP DATABASE wgdbtest;
DROP USER wgdbtest;
CREATE USER wgdbtest PASSWORD 'wgdbtest';
CREATE DATABASE wgdbtest LC_COLLATE 'en_US.utf8' LC_CTYPE 'en_US.utf8';
\c wgdbtest;
GRANT ALL PRIVILEGES ON DATABASE wgdbtest TO wgdbtest;
CREATE EXTENSION "uuid-ossp";

