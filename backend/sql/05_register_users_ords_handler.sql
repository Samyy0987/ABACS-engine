-- =============================================================================
-- ABAC Engine: Register missing GET users/ endpoint
-- Schema: WKSP_SAMPROJECTS
-- Module: easyaccess_abac  |  Base Path: abac/
-- Template: users/         |  Method: GET
-- =============================================================================

BEGIN
    -- 1. Define Template: users/ under existing easyaccess_abac module
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'easyaccess_abac',
        p_pattern     => 'users/',
        p_priority    => 0,
        p_comments    => 'User identity directory collection'
    );

    -- 2. Define GET Handler for users/
    -- Source Type: COLLECTION_FEED (matches working policies/, resources/, audit-logs/)
    ORDS.DEFINE_HANDLER(
        p_module_name    => 'easyaccess_abac',
        p_pattern        => 'users/',
        p_method         => 'GET',
        p_source_type    => ORDS.SOURCE_TYPE_COLLECTION_FEED,
        p_items_per_page => 100,
        p_source         => '
            SELECT 
                u.id,
                u.username,
                u.email,
                u.is_active,
                u.is_verified,
                TO_CHAR(u.created_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS created_at,
                TO_CHAR(u.updated_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS updated_at
            FROM ABAC_USERS u
            ORDER BY u.username ASC'
    );

    COMMIT;
END;
/
