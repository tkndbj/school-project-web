-- =============================================================================
-- PostgreSQL grants EXECUTE on new functions to PUBLIC (and therefore to the
-- `anon` API role). Revoke that everywhere we own functions; the functions
-- meant for signed-in users were granted to `authenticated` explicitly in the
-- migration that created them.
--
-- Every future migration that creates functions must end with the same
-- statements (tests/database/010_schema_security.test.sql enforces it).
-- =============================================================================

revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon;
