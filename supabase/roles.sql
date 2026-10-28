-- Supabase applies roles.sql before numbered migrations. The immutable first
-- migration contains a legacy SQL function body that pins search_path='' while
-- calling pg_trgm.similarity without a schema, so PostgreSQL cannot validate it
-- during a clean bootstrap. Install pg_trgm and expose a temporary, explicitly
-- available in the implicitly searched catalog for that historical CREATE
-- FUNCTION. pg_trgm is a trusted, relocatable PostgreSQL extension. Existing
-- databases where it is already installed keep their current extension schema;
-- the final corrective migration resolves either location dynamically.
create extension if not exists pg_trgm with schema pg_catalog;
