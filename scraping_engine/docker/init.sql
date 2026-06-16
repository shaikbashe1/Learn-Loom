-- PostgreSQL initialization script
-- Creates the database extensions needed for full-text search and UUID support

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- trigram similarity for dedup
CREATE EXTENSION IF NOT EXISTS "unaccent";  -- accent-insensitive search

-- Optional: create a read-only reporting user
-- CREATE ROLE learnloom_reader WITH LOGIN PASSWORD 'reader_pass';
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO learnloom_reader;
