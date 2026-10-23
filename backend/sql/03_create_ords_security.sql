-- =============================================================================
-- ABAC Engine for Enterprise Applications (EasyAccess)
-- ORDS Security Configuration Script (Privileges, Roles & OAuth Client)
--
-- Features:
-- - Defines custom ORDS Role: 'abac_api_role'
-- - Defines ORDS Privilege protecting all sensitive ABAC CRUD & audit endpoints
-- - Creates OAuth2 Client Credentials for the Flask backend Policy Decision Point
-- - Idempotent execution (catches existing role/privilege/client exceptions)
--
-- Note: Run this script in Oracle APEX SQL Workshop or via SQLcl/SQL Developer.
-- =============================================================================

DECLARE
    v_role_name      VARCHAR2(64) := 'abac_api_role';
    v_privilege_name VARCHAR2(64) := 'abac_api_privilege';
    v_patterns       OWA.VC_ARR;
    v_roles          OWA.VC_ARR;
    v_client_name    VARCHAR2(64) := 'easyaccess_flask_backend';
    v_client_id      VARCHAR2(255);
    v_client_secret  VARCHAR2(255);
BEGIN
    -- -------------------------------------------------------------------------
    -- 1. Create ORDS Role
    -- -------------------------------------------------------------------------
    BEGIN
        ORDS.CREATE_ROLE(p_role_name => v_role_name);
    EXCEPTION
        WHEN OTHERS THEN
            -- Role already exists
            NULL;
    END;

    -- -------------------------------------------------------------------------
    -- 2. Define ORDS Privilege protecting the ABAC module
    -- -------------------------------------------------------------------------
    -- Patterns protected under abac/v1/
    v_patterns(1) := '/abac/v1/policies/*';
    v_patterns(2) := '/abac/v1/resources/*';
    v_patterns(3) := '/abac/v1/users/*';
    v_patterns(4) := '/abac/v1/audit-logs/*';

    v_roles(1) := v_role_name;

    ORDS.DEFINE_PRIVILEGE(
        p_privilege_name => v_privilege_name,
        p_roles          => v_roles,
        p_patterns       => v_patterns,
        p_comments       => 'Protects ABAC Engine CRUD, identity and audit endpoints'
    );

    -- -------------------------------------------------------------------------
    -- 3. Register OAuth2 Client for Flask Backend
    -- Note: OAUTH package is standard in ORDS. In some locked environments,
    -- clients are registered via the APEX RESTful Services UI.
    -- -------------------------------------------------------------------------
    BEGIN
        OAUTH.CREATE_CLIENT(
            p_name            => v_client_name,
            p_grant_type      => 'client_credentials',
            p_owner           => USER,
            p_description     => 'Flask ABAC Policy Decision Point Client Credentials',
            p_support_email   => 'security@enterprise.local',
            p_privilege_names => v_privilege_name
        );

        OAUTH.GRANT_CLIENT_ROLE(
            p_client_name => v_client_name,
            p_role_name   => v_role_name
        );
        
        DBMS_OUTPUT.PUT_LINE('OAuth client registered successfully: ' || v_client_name);
        DBMS_OUTPUT.PUT_LINE('Retrieve client credentials using:');
        DBMS_OUTPUT.PUT_LINE('SELECT id, name, client_id FROM user_ords_clients WHERE name = ''' || v_client_name || ''';');
    EXCEPTION
        WHEN OTHERS THEN
            DBMS_OUTPUT.PUT_LINE('OAuth client setup note: ' || SQLERRM);
    END;

    COMMIT;
END;
/
