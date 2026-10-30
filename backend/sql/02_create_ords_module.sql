-- =============================================================================
-- ABAC Engine for Enterprise Applications (EasyAccess)
-- ORDS REST Module Definition Script
-- Module: abac/v1/
--
-- Features:
-- - Idempotent registration using ORDS.DEFINE_MODULE, DEFINE_TEMPLATE, DEFINE_HANDLER
-- - Safe parameterized SQL/PLSQL queries with bind variables
-- - Endpoints:
--     1. GET  abac/v1/health/ping
--     2. GET  abac/v1/policies/
--     3. POST abac/v1/policies/
--     4. GET  abac/v1/policies/:id
--     5. PUT  abac/v1/policies/:id
--     6. DELETE abac/v1/policies/:id
--     7. GET  abac/v1/resources/
--     8. POST abac/v1/resources/
--     9. GET  abac/v1/resources/:id
--    10. PUT  abac/v1/resources/:id
--    11. DELETE abac/v1/resources/:id
--    12. GET  abac/v1/users/
--    13. POST abac/v1/users/
--    14. GET  abac/v1/users/:id
--    15. GET  abac/v1/users/:id/attributes
--    16. POST abac/v1/users/:id/attributes
--    17. GET  abac/v1/resources/:id/attributes
--    18. POST abac/v1/resources/:id/attributes
--    19. GET  abac/v1/audit-logs/
--    20. POST abac/v1/audit-logs/
-- =============================================================================

BEGIN
    -- 1. Ensure ORDS is enabled for the current schema
    ORDS.ENABLE_SCHEMA(
        p_enabled             => TRUE,
        p_schema              => USER,
        p_url_mapping_type    => 'BASE_PATH',
        p_url_mapping_pattern => LOWER(USER),
        p_auto_rest_auth      => FALSE
    );

    -- 2. Define or recreate the 'abac/v1/' REST module
    ORDS.DEFINE_MODULE(
        p_module_name    => 'abac.v1',
        p_base_path      => 'abac/v1/',
        p_items_per_page => 100,
        p_status         => 'PUBLISHED',
        p_comments       => 'EasyAccess ABAC Enterprise Engine REST API'
    );

    -- -------------------------------------------------------------------------
    -- TEMPLATE: health/ping
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'abac.v1',
        p_pattern     => 'health/ping',
        p_priority    => 0,
        p_comments    => 'Lightweight ORDS connectivity check'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name   => 'abac.v1',
        p_pattern       => 'health/ping',
        p_method        => 'GET',
        p_source_type   => ORDS.SOURCE_TYPE_QUERY_ROW,
        p_items_per_page => 1,
        p_source        => 'SELECT ''healthy'' AS status, ''oracle-ords-abac'' AS service, TO_CHAR(SYSTIMESTAMP, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS db_timestamp, (SELECT COUNT(*) FROM ABAC_POLICIES WHERE is_enabled = 1) AS active_policy_count FROM DUAL'
    );

    -- -------------------------------------------------------------------------
    -- TEMPLATE: policies/
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'abac.v1',
        p_pattern     => 'policies/',
        p_priority    => 0,
        p_comments    => 'Collection of ABAC policies'
    );

    -- GET policies/ (supports optional bind filters :is_enabled, :category)
    ORDS.DEFINE_HANDLER(
        p_module_name   => 'abac.v1',
        p_pattern       => 'policies/',
        p_method        => 'GET',
        p_source_type   => ORDS.SOURCE_TYPE_COLLECTION_FEED,
        p_items_per_page => 100,
        p_source        => '
            SELECT 
                p.id,
                p.code,
                p.name,
                p.description,
                p.category,
                p.priority,
                p.effect,
                p.is_enabled,
                p.actions,
                p.conditions,
                p.version,
                TO_CHAR(p.created_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS created_at,
                TO_CHAR(p.updated_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS updated_at
            FROM ABAC_POLICIES p
            WHERE (:is_enabled IS NULL OR p.is_enabled = TO_NUMBER(:is_enabled))
              AND (:category IS NULL OR LOWER(p.category) = LOWER(:category))
            ORDER BY p.priority ASC, p.code ASC'
    );

    -- POST policies/ (insert new policy from JSON body)
    ORDS.DEFINE_HANDLER(
        p_module_name => 'abac.v1',
        p_pattern     => 'policies/',
        p_method      => 'POST',
        p_source_type => ORDS.SOURCE_TYPE_PLSQL,
        p_source      => '
        DECLARE
            v_body        CLOB;
            v_obj         JSON_OBJECT_T;
            v_id          VARCHAR2(36);
            v_code        VARCHAR2(64);
            v_name        VARCHAR2(200);
            v_description CLOB;
            v_category    VARCHAR2(64);
            v_priority    NUMBER;
            v_effect      VARCHAR2(16);
            v_is_enabled  NUMBER(1);
            v_actions     CLOB;
            v_conditions  CLOB;
            v_version     VARCHAR2(32);
        BEGIN
            v_body := :body_text;
            v_obj  := JSON_OBJECT_T.parse(v_body);

            v_id          := NVL(v_obj.get_string(''id''), SYS_GUID());
            v_code        := v_obj.get_string(''code'');
            v_name        := v_obj.get_string(''name'');
            v_description := v_obj.get_string(''description'');
            v_category    := v_obj.get_string(''category'');
            v_priority    := NVL(v_obj.get_number(''priority''), 10);
            v_effect      := UPPER(v_obj.get_string(''effect''));
            v_is_enabled  := CASE WHEN v_obj.get_boolean(''is_enabled'') THEN 1 ELSE 0 END;
            v_version     := NVL(v_obj.get_string(''version''), ''1.0.0'');

            IF v_obj.has(''actions'') THEN
                v_actions := v_obj.get(''actions'').to_clob();
            ELSE
                v_actions := ''[]'';
            END IF;

            IF v_obj.has(''conditions'') THEN
                v_conditions := v_obj.get(''conditions'').to_clob();
            ELSE
                v_conditions := ''{}'';
            END IF;

            INSERT INTO ABAC_POLICIES (
                id, code, name, description, category, priority, effect, is_enabled, actions, conditions, version, created_at, updated_at
            ) VALUES (
                v_id, v_code, v_name, v_description, v_category, v_priority, v_effect, v_is_enabled, v_actions, v_conditions, v_version, SYSTIMESTAMP, SYSTIMESTAMP
            );

            :status_code := 201;
            OWA_UTIL.MIME_HEADER(''application/json'', FALSE);
            HTP.P(''Content-Type: application/json'');
            OWA_UTIL.HTTP_HEADER_CLOSE;
            HTP.P(''{"status":"created","id":"'' || v_id || ''","code":"'' || v_code || ''"}'');
        EXCEPTION
            WHEN DUP_VAL_ON_INDEX THEN
                :status_code := 409;
                HTP.P(''{"error":"Policy code already exists"}'');
            WHEN OTHERS THEN
                :status_code := 400;
                HTP.P(''{"error":"Invalid policy payload: '' || REPLACE(SQLERRM, ''"'', ''\'''') || ''"}'');
        END;'
    );

    -- -------------------------------------------------------------------------
    -- TEMPLATE: policies/:id
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'abac.v1',
        p_pattern     => 'policies/:id',
        p_priority    => 0,
        p_comments    => 'Individual ABAC policy by ID or code'
    );

    -- GET policies/:id
    ORDS.DEFINE_HANDLER(
        p_module_name   => 'abac.v1',
        p_pattern       => 'policies/:id',
        p_method        => 'GET',
        p_source_type   => ORDS.SOURCE_TYPE_QUERY_ROW,
        p_items_per_page => 1,
        p_source        => '
            SELECT 
                p.id,
                p.code,
                p.name,
                p.description,
                p.category,
                p.priority,
                p.effect,
                p.is_enabled,
                p.actions,
                p.conditions,
                p.version,
                TO_CHAR(p.created_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS created_at,
                TO_CHAR(p.updated_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS updated_at
            FROM ABAC_POLICIES p
            WHERE p.id = :id OR p.code = :id'
    );

    -- PUT policies/:id
    ORDS.DEFINE_HANDLER(
        p_module_name => 'abac.v1',
        p_pattern     => 'policies/:id',
        p_method      => 'PUT',
        p_source_type => ORDS.SOURCE_TYPE_PLSQL,
        p_source      => '
        DECLARE
            v_body        CLOB;
            v_obj         JSON_OBJECT_T;
            v_rows        NUMBER;
        BEGIN
            v_body := :body_text;
            v_obj  := JSON_OBJECT_T.parse(v_body);

            UPDATE ABAC_POLICIES
            SET 
                name        = NVL(v_obj.get_string(''name''), name),
                description = NVL(v_obj.get_string(''description''), description),
                category    = NVL(v_obj.get_string(''category''), category),
                priority    = NVL(v_obj.get_number(''priority''), priority),
                effect      = NVL(UPPER(v_obj.get_string(''effect'')), effect),
                is_enabled  = CASE WHEN v_obj.has(''is_enabled'') 
                                   THEN (CASE WHEN v_obj.get_boolean(''is_enabled'') THEN 1 ELSE 0 END)
                                   ELSE is_enabled END,
                actions     = CASE WHEN v_obj.has(''actions'') THEN v_obj.get(''actions'').to_clob() ELSE actions END,
                conditions  = CASE WHEN v_obj.has(''conditions'') THEN v_obj.get(''conditions'').to_clob() ELSE conditions END,
                version     = NVL(v_obj.get_string(''version''), version),
                updated_at  = SYSTIMESTAMP
            WHERE id = :id OR code = :id;

            v_rows := SQL%ROWCOUNT;
            IF v_rows > 0 THEN
                :status_code := 200;
                HTP.P(''{"status":"updated","id":"'' || :id || ''"}'');
            ELSE
                :status_code := 404;
                HTP.P(''{"error":"Policy not found"}'');
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                :status_code := 400;
                HTP.P(''{"error":"Update failed: '' || REPLACE(SQLERRM, ''"'', ''\'''') || ''"}'');
        END;'
    );

    -- DELETE policies/:id
    ORDS.DEFINE_HANDLER(
        p_module_name => 'abac.v1',
        p_pattern     => 'policies/:id',
        p_method      => 'DELETE',
        p_source_type => ORDS.SOURCE_TYPE_PLSQL,
        p_source      => '
        DECLARE
            v_rows NUMBER;
        BEGIN
            DELETE FROM ABAC_POLICIES WHERE id = :id OR code = :id;
            v_rows := SQL%ROWCOUNT;
            IF v_rows > 0 THEN
                :status_code := 200;
                HTP.P(''{"status":"deleted","id":"'' || :id || ''"}'');
            ELSE
                :status_code := 404;
                HTP.P(''{"error":"Policy not found"}'');
            END IF;
        END;'
    );

    -- -------------------------------------------------------------------------
    -- TEMPLATE: resources/
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'abac.v1',
        p_pattern     => 'resources/',
        p_priority    => 0,
        p_comments    => 'Protected enterprise resources'
    );

    -- GET resources/
    ORDS.DEFINE_HANDLER(
        p_module_name   => 'abac.v1',
        p_pattern       => 'resources/',
        p_method        => 'GET',
        p_source_type   => ORDS.SOURCE_TYPE_COLLECTION_FEED,
        p_items_per_page => 100,
        p_source        => '
            SELECT 
                r.id,
                r.resource_key,
                r.name,
                r.description,
                r.resource_type,
                r.classification,
                r.owner_department,
                r.owner_id,
                r.is_active,
                TO_CHAR(r.created_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS created_at,
                TO_CHAR(r.updated_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS updated_at
            FROM ABAC_PROTECTED_RESOURCES r
            WHERE (:is_active IS NULL OR r.is_active = TO_NUMBER(:is_active))
              AND (:resource_type IS NULL OR LOWER(r.resource_type) = LOWER(:resource_type))
              AND (:classification IS NULL OR LOWER(r.classification) = LOWER(:classification))
            ORDER BY r.name ASC'
    );

    -- POST resources/
    ORDS.DEFINE_HANDLER(
        p_module_name => 'abac.v1',
        p_pattern     => 'resources/',
        p_method      => 'POST',
        p_source_type => ORDS.SOURCE_TYPE_PLSQL,
        p_source      => '
        DECLARE
            v_body   CLOB;
            v_obj    JSON_OBJECT_T;
            v_id     VARCHAR2(36);
            v_key    VARCHAR2(120);
            v_name   VARCHAR2(150);
            v_desc   CLOB;
            v_type   VARCHAR2(64);
            v_class  VARCHAR2(32);
            v_dept   VARCHAR2(100);
            v_owner  VARCHAR2(36);
            v_active NUMBER(1);
        BEGIN
            v_body := :body_text;
            v_obj  := JSON_OBJECT_T.parse(v_body);

            v_id     := NVL(v_obj.get_string(''id''), SYS_GUID());
            v_key    := v_obj.get_string(''resource_key'');
            v_name   := v_obj.get_string(''name'');
            v_desc   := v_obj.get_string(''description'');
            v_type   := v_obj.get_string(''resource_type'');
            v_class  := v_obj.get_string(''classification'');
            v_dept   := v_obj.get_string(''owner_department'');
            v_owner  := v_obj.get_string(''owner_id'');
            v_active := CASE WHEN v_obj.has(''is_active'') AND NOT v_obj.get_boolean(''is_active'') THEN 0 ELSE 1 END;

            INSERT INTO ABAC_PROTECTED_RESOURCES (
                id, resource_key, name, description, resource_type, classification, owner_department, owner_id, is_active, created_at, updated_at
            ) VALUES (
                v_id, v_key, v_name, v_desc, v_type, v_class, v_dept, v_owner, v_active, SYSTIMESTAMP, SYSTIMESTAMP
            );

            :status_code := 201;
            HTP.P(''{"status":"created","id":"'' || v_id || ''","resource_key":"'' || v_key || ''"}'');
        EXCEPTION
            WHEN DUP_VAL_ON_INDEX THEN
                :status_code := 409;
                HTP.P(''{"error":"Resource key already exists"}'');
            WHEN OTHERS THEN
                :status_code := 400;
                HTP.P(''{"error":"Insert resource failed: '' || REPLACE(SQLERRM, ''"'', ''\'''') || ''"}'');
        END;'
    );

    -- -------------------------------------------------------------------------
    -- TEMPLATE: resources/:id
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'abac.v1',
        p_pattern     => 'resources/:id',
        p_priority    => 0,
        p_comments    => 'Individual resource by ID or key'
    );

    -- GET resources/:id
    ORDS.DEFINE_HANDLER(
        p_module_name   => 'abac.v1',
        p_pattern       => 'resources/:id',
        p_method        => 'GET',
        p_source_type   => ORDS.SOURCE_TYPE_QUERY_ROW,
        p_items_per_page => 1,
        p_source        => '
            SELECT 
                r.id,
                r.resource_key,
                r.name,
                r.description,
                r.resource_type,
                r.classification,
                r.owner_department,
                r.owner_id,
                r.is_active,
                TO_CHAR(r.created_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS created_at,
                TO_CHAR(r.updated_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS updated_at
            FROM ABAC_PROTECTED_RESOURCES r
            WHERE r.id = :id OR r.resource_key = :id'
    );

    -- DELETE resources/:id
    ORDS.DEFINE_HANDLER(
        p_module_name => 'abac.v1',
        p_pattern     => 'resources/:id',
        p_method      => 'DELETE',
        p_source_type => ORDS.SOURCE_TYPE_PLSQL,
        p_source      => '
        DECLARE
            v_rows NUMBER;
        BEGIN
            DELETE FROM ABAC_PROTECTED_RESOURCES WHERE id = :id OR resource_key = :id;
            v_rows := SQL%ROWCOUNT;
            IF v_rows > 0 THEN
                :status_code := 200;
                HTP.P(''{"status":"deleted","id":"'' || :id || ''"}'');
            ELSE
                :status_code := 404;
                HTP.P(''{"error":"Resource not found"}'');
            END IF;
        END;'
    );

    -- -------------------------------------------------------------------------
    -- TEMPLATE: users/
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'abac.v1',
        p_pattern     => 'users/',
        p_priority    => 0,
        p_comments    => 'User identity directory'
    );

    -- GET users/ (never outputs password_hash)
    ORDS.DEFINE_HANDLER(
        p_module_name   => 'abac.v1',
        p_pattern       => 'users/',
        p_method        => 'GET',
        p_source_type   => ORDS.SOURCE_TYPE_COLLECTION_FEED,
        p_items_per_page => 100,
        p_source        => '
            SELECT 
                u.id,
                u.username,
                u.email,
                u.is_active,
                u.is_verified,
                TO_CHAR(u.created_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS created_at,
                TO_CHAR(u.updated_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS updated_at
            FROM ABAC_USERS u
            WHERE (:is_active IS NULL OR u.is_active = TO_NUMBER(:is_active))
            ORDER BY u.username ASC'
    );

    -- POST users/
    ORDS.DEFINE_HANDLER(
        p_module_name => 'abac.v1',
        p_pattern     => 'users/',
        p_method      => 'POST',
        p_source_type => ORDS.SOURCE_TYPE_PLSQL,
        p_source      => '
        DECLARE
            v_body   CLOB;
            v_obj    JSON_OBJECT_T;
            v_id     VARCHAR2(36);
            v_user   VARCHAR2(64);
            v_email  VARCHAR2(255);
            v_pwd    VARCHAR2(255);
            v_active NUMBER(1);
            v_ver    NUMBER(1);
        BEGIN
            v_body := :body_text;
            v_obj  := JSON_OBJECT_T.parse(v_body);

            v_id     := NVL(v_obj.get_string(''id''), SYS_GUID());
            v_user   := v_obj.get_string(''username'');
            v_email  := v_obj.get_string(''email'');
            v_pwd    := v_obj.get_string(''password_hash'');
            v_active := CASE WHEN v_obj.has(''is_active'') AND NOT v_obj.get_boolean(''is_active'') THEN 0 ELSE 1 END;
            v_ver    := CASE WHEN v_obj.has(''is_verified'') AND v_obj.get_boolean(''is_verified'') THEN 1 ELSE 0 END;

            INSERT INTO ABAC_USERS (
                id, username, email, password_hash, is_active, is_verified, created_at, updated_at
            ) VALUES (
                v_id, v_user, v_email, v_pwd, v_active, v_ver, SYSTIMESTAMP, SYSTIMESTAMP
            );

            :status_code := 201;
            HTP.P(''{"status":"created","id":"'' || v_id || ''","username":"'' || v_user || ''"}'');
        EXCEPTION
            WHEN DUP_VAL_ON_INDEX THEN
                :status_code := 409;
                HTP.P(''{"error":"Username or email already exists"}'');
            WHEN OTHERS THEN
                :status_code := 400;
                HTP.P(''{"error":"Create user failed: '' || REPLACE(SQLERRM, ''"'', ''\'''') || ''"}'');
        END;'
    );

    -- -------------------------------------------------------------------------
    -- TEMPLATE: users/:id
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'abac.v1',
        p_pattern     => 'users/:id',
        p_priority    => 0,
        p_comments    => 'User profile by ID or username'
    );

    -- GET users/:id
    ORDS.DEFINE_HANDLER(
        p_module_name   => 'abac.v1',
        p_pattern       => 'users/:id',
        p_method        => 'GET',
        p_source_type   => ORDS.SOURCE_TYPE_QUERY_ROW,
        p_items_per_page => 1,
        p_source        => '
            SELECT 
                u.id,
                u.username,
                u.email,
                u.is_active,
                u.is_verified,
                TO_CHAR(u.created_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS created_at,
                TO_CHAR(u.updated_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS updated_at
            FROM ABAC_USERS u
            WHERE u.id = :id OR u.username = :id'
    );

    -- -------------------------------------------------------------------------
    -- TEMPLATE: users/:id/attributes
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'abac.v1',
        p_pattern     => 'users/:id/attributes',
        p_priority    => 0,
        p_comments    => 'Subject attributes for user'
    );

    -- GET users/:id/attributes
    ORDS.DEFINE_HANDLER(
        p_module_name   => 'abac.v1',
        p_pattern       => 'users/:id/attributes',
        p_method        => 'GET',
        p_source_type   => ORDS.SOURCE_TYPE_COLLECTION_FEED,
        p_items_per_page => 100,
        p_source        => '
            SELECT 
                a.id,
                a.user_id,
                a.attribute_name,
                a.attribute_value,
                a.data_type,
                TO_CHAR(a.updated_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS updated_at
            FROM ABAC_USER_ATTRIBUTES a
            JOIN ABAC_USERS u ON u.id = a.user_id
            WHERE u.id = :id OR u.username = :id
            ORDER BY a.attribute_name ASC'
    );

    -- POST users/:id/attributes (upsert attribute)
    ORDS.DEFINE_HANDLER(
        p_module_name => 'abac.v1',
        p_pattern     => 'users/:id/attributes',
        p_method      => 'POST',
        p_source_type => ORDS.SOURCE_TYPE_PLSQL,
        p_source      => '
        DECLARE
            v_body    CLOB;
            v_obj     JSON_OBJECT_T;
            v_user_id VARCHAR2(36);
            v_name    VARCHAR2(100);
            v_val     CLOB;
            v_type    VARCHAR2(32);
        BEGIN
            v_body := :body_text;
            v_obj  := JSON_OBJECT_T.parse(v_body);

            SELECT id INTO v_user_id FROM ABAC_USERS WHERE id = :id OR username = :id;

            v_name := v_obj.get_string(''attribute_name'');
            v_val  := v_obj.get_string(''attribute_value'');
            v_type := NVL(v_obj.get_string(''data_type''), ''string'');

            MERGE INTO ABAC_USER_ATTRIBUTES a
            USING DUAL
            ON (a.user_id = v_user_id AND a.attribute_name = v_name)
            WHEN MATCHED THEN
                UPDATE SET a.attribute_value = v_val, a.data_type = v_type, a.updated_at = SYSTIMESTAMP
            WHEN NOT MATCHED THEN
                INSERT (user_id, attribute_name, attribute_value, data_type, created_at, updated_at)
                VALUES (v_user_id, v_name, v_val, v_type, SYSTIMESTAMP, SYSTIMESTAMP);

            :status_code := 200;
            HTP.P(''{"status":"success","attribute_name":"'' || v_name || ''"}'');
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                :status_code := 404;
                HTP.P(''{"error":"User not found"}'');
            WHEN OTHERS THEN
                :status_code := 400;
                HTP.P(''{"error":"Attribute upsert failed: '' || REPLACE(SQLERRM, ''"'', ''\'''') || ''"}'');
        END;'
    );

    -- -------------------------------------------------------------------------
    -- TEMPLATE: resources/:id/attributes
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'abac.v1',
        p_pattern     => 'resources/:id/attributes',
        p_priority    => 0,
        p_comments    => 'Metadata attributes for protected resource'
    );

    -- GET resources/:id/attributes
    ORDS.DEFINE_HANDLER(
        p_module_name   => 'abac.v1',
        p_pattern       => 'resources/:id/attributes',
        p_method        => 'GET',
        p_source_type   => ORDS.SOURCE_TYPE_COLLECTION_FEED,
        p_items_per_page => 100,
        p_source        => '
            SELECT 
                a.id,
                a.resource_id,
                a.attribute_name,
                a.attribute_value,
                a.data_type,
                TO_CHAR(a.updated_at, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS updated_at
            FROM ABAC_RESOURCE_ATTRIBUTES a
            JOIN ABAC_PROTECTED_RESOURCES r ON r.id = a.resource_id
            WHERE r.id = :id OR r.resource_key = :id
            ORDER BY a.attribute_name ASC'
    );

    -- POST resources/:id/attributes (upsert resource attribute)
    ORDS.DEFINE_HANDLER(
        p_module_name => 'abac.v1',
        p_pattern     => 'resources/:id/attributes',
        p_method      => 'POST',
        p_source_type => ORDS.SOURCE_TYPE_PLSQL,
        p_source      => '
        DECLARE
            v_body   CLOB;
            v_obj    JSON_OBJECT_T;
            v_res_id VARCHAR2(36);
            v_name   VARCHAR2(100);
            v_val    CLOB;
            v_type   VARCHAR2(32);
        BEGIN
            v_body := :body_text;
            v_obj  := JSON_OBJECT_T.parse(v_body);

            SELECT id INTO v_res_id FROM ABAC_PROTECTED_RESOURCES WHERE id = :id OR resource_key = :id;

            v_name := v_obj.get_string(''attribute_name'');
            v_val  := v_obj.get_string(''attribute_value'');
            v_type := NVL(v_obj.get_string(''data_type''), ''string'');

            MERGE INTO ABAC_RESOURCE_ATTRIBUTES a
            USING DUAL
            ON (a.resource_id = v_res_id AND a.attribute_name = v_name)
            WHEN MATCHED THEN
                UPDATE SET a.attribute_value = v_val, a.data_type = v_type, a.updated_at = SYSTIMESTAMP
            WHEN NOT MATCHED THEN
                INSERT (resource_id, attribute_name, attribute_value, data_type, created_at, updated_at)
                VALUES (v_res_id, v_name, v_val, v_type, SYSTIMESTAMP, SYSTIMESTAMP);

            :status_code := 200;
            HTP.P(''{"status":"success","attribute_name":"'' || v_name || ''"}'');
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                :status_code := 404;
                HTP.P(''{"error":"Resource not found"}'');
            WHEN OTHERS THEN
                :status_code := 400;
                HTP.P(''{"error":"Resource attribute upsert failed: '' || REPLACE(SQLERRM, ''"'', ''\'''') || ''"}'');
        END;'
    );

    -- -------------------------------------------------------------------------
    -- TEMPLATE: audit-logs/
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'abac.v1',
        p_pattern     => 'audit-logs/',
        p_priority    => 0,
        p_comments    => 'Immutable ABAC compliance audit trail'
    );

    -- GET audit-logs/
    ORDS.DEFINE_HANDLER(
        p_module_name   => 'abac.v1',
        p_pattern       => 'audit-logs/',
        p_method        => 'GET',
        p_source_type   => ORDS.SOURCE_TYPE_COLLECTION_FEED,
        p_items_per_page => 100,
        p_source        => '
            SELECT 
                l.id,
                l.request_id,
                l.subject_identifier,
                l.resource_key,
                l.action,
                l.decision,
                l.matched_policy_ids,
                l.context_snapshot,
                l.evaluation_duration_ms,
                l.client_ip,
                TO_CHAR(l.timestamp, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS timestamp
            FROM ABAC_ACCESS_AUDIT_LOGS l
            WHERE (:subject IS NULL OR LOWER(l.subject_identifier) = LOWER(:subject))
              AND (:resource_key IS NULL OR LOWER(l.resource_key) = LOWER(:resource_key))
              AND (:decision IS NULL OR UPPER(l.decision) = UPPER(:decision))
            ORDER BY l.timestamp DESC'
    );

    -- POST audit-logs/ (append-only write)
    ORDS.DEFINE_HANDLER(
        p_module_name => 'abac.v1',
        p_pattern     => 'audit-logs/',
        p_method      => 'POST',
        p_source_type => ORDS.SOURCE_TYPE_PLSQL,
        p_source      => '
        DECLARE
            v_body     CLOB;
            v_obj      JSON_OBJECT_T;
            v_id       VARCHAR2(36);
            v_req_id   VARCHAR2(64);
            v_subj     VARCHAR2(150);
            v_res      VARCHAR2(150);
            v_action   VARCHAR2(64);
            v_decision VARCHAR2(16);
            v_policies CLOB;
            v_ctx      CLOB;
            v_duration NUMBER(10, 2);
            v_ip       VARCHAR2(64);
        BEGIN
            v_body := :body_text;
            v_obj  := JSON_OBJECT_T.parse(v_body);

            v_id       := NVL(v_obj.get_string(''id''), SYS_GUID());
            v_req_id   := v_obj.get_string(''request_id'');
            v_subj     := v_obj.get_string(''subject_identifier'');
            v_res      := v_obj.get_string(''resource_key'');
            v_action   := UPPER(v_obj.get_string(''action''));
            v_decision := UPPER(v_obj.get_string(''decision''));

            IF v_obj.has(''matched_policy_ids'') THEN
                v_policies := v_obj.get(''matched_policy_ids'').to_clob();
            ELSE
                v_policies := ''[]'';
            END IF;

            IF v_obj.has(''context_snapshot'') THEN
                v_ctx := v_obj.get(''context_snapshot'').to_clob();
            ELSE
                v_ctx := ''{}'';
            END IF;

            v_duration := v_obj.get_number(''evaluation_duration_ms'');
            v_ip       := v_obj.get_string(''client_ip'');

            INSERT INTO ABAC_ACCESS_AUDIT_LOGS (
                id, request_id, subject_identifier, resource_key, action, decision,
                matched_policy_ids, context_snapshot, evaluation_duration_ms, client_ip, timestamp
            ) VALUES (
                v_id, v_req_id, v_subj, v_res, v_action, v_decision,
                v_policies, v_ctx, v_duration, v_ip, SYSTIMESTAMP
            );

            :status_code := 201;
            HTP.P(''{"status":"logged","id":"'' || v_id || ''","request_id":"'' || v_req_id || ''"}'');
        EXCEPTION
            WHEN OTHERS THEN
                :status_code := 400;
                HTP.P(''{"error":"Audit log insert failed: '' || REPLACE(SQLERRM, ''"'', ''\'''') || ''"}'');
        END;'
    );

    COMMIT;
END;
/
