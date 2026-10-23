-- =============================================================================
-- ABAC Engine for Enterprise Applications (EasyAccess)
-- ORDS Module Setup for Schema: WKSP_SAMPROJECTS
-- Module Name: easyaccess_abac  |  Base Path: abac/
--
-- GUARANTEES:
-- 1. No SQL*Plus commands (no SET SERVEROUTPUT ON) - pure PL/SQL block.
-- 2. No calls to ORDS.ENABLE_SCHEMA (schema already REST-enabled).
-- 3. No calls to ORDS.DELETE_TEMPLATE.
-- 4. Does NOT touch or recreate the working 'users/' handler.
-- 5. Uses ORDS.SOURCE_TYPE_QUERY_ONE_ROW for single-row queries (health/ping, policies/:id).
-- 6. Uses ORDS.SOURCE_TYPE_COLLECTION_FEED for collection feeds (policies/, resources/, audit-logs/).
-- 7. Uses ORDS.SOURCE_TYPE_PLSQL for write operations (POST, PUT, DELETE).
-- 8. Safe to rerun repeatedly (ORDS natively updates existing templates and handlers).
-- =============================================================================

BEGIN
    -- -------------------------------------------------------------------------
    -- 1. Ensure module 'easyaccess_abac' is published with base path 'abac/'
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_MODULE(
        p_module_name    => 'easyaccess_abac',
        p_base_path      => 'abac/',
        p_items_per_page => 100,
        p_status         => 'PUBLISHED',
        p_comments       => 'EasyAccess ABAC Engine REST Services'
    );

    -- -------------------------------------------------------------------------
    -- 2. TEMPLATE: health/ping (GET)
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'easyaccess_abac',
        p_pattern     => 'health/ping',
        p_priority    => 0,
        p_comments    => 'Connectivity probe for ABAC health check'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name    => 'easyaccess_abac',
        p_pattern        => 'health/ping',
        p_method         => 'GET',
        p_source_type    => ORDS.SOURCE_TYPE_QUERY_ONE_ROW,
        p_items_per_page => 1,
        p_source         => '
            SELECT 
                ''healthy'' AS status, 
                ''oracle-ords-abac'' AS service, 
                TO_CHAR(SYSTIMESTAMP, ''YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'') AS db_timestamp, 
                (SELECT COUNT(*) FROM ABAC_POLICIES WHERE is_enabled = 1) AS active_policy_count 
            FROM DUAL'
    );

    -- -------------------------------------------------------------------------
    -- 3. TEMPLATE: policies/ (GET & POST)
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'easyaccess_abac',
        p_pattern     => 'policies/',
        p_priority    => 0,
        p_comments    => 'ABAC security policies collection'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name    => 'easyaccess_abac',
        p_pattern        => 'policies/',
        p_method         => 'GET',
        p_source_type    => ORDS.SOURCE_TYPE_COLLECTION_FEED,
        p_items_per_page => 100,
        p_source         => '
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
            ORDER BY p.priority ASC, p.code ASC'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name => 'easyaccess_abac',
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
            v_is_enabled  := CASE WHEN v_obj.has(''is_enabled'') AND NOT v_obj.get_boolean(''is_enabled'') THEN 0 ELSE 1 END;
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
    -- 4. TEMPLATE: policies/:id (GET, PUT, DELETE)
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'easyaccess_abac',
        p_pattern     => 'policies/:id',
        p_priority    => 0,
        p_comments    => 'Single policy by ID or code'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name    => 'easyaccess_abac',
        p_pattern        => 'policies/:id',
        p_method         => 'GET',
        p_source_type    => ORDS.SOURCE_TYPE_QUERY_ONE_ROW,
        p_items_per_page => 1,
        p_source         => '
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

    ORDS.DEFINE_HANDLER(
        p_module_name => 'easyaccess_abac',
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

    ORDS.DEFINE_HANDLER(
        p_module_name => 'easyaccess_abac',
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
    -- 5. TEMPLATE: resources/ (GET & POST)
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'easyaccess_abac',
        p_pattern     => 'resources/',
        p_priority    => 0,
        p_comments    => 'Protected enterprise resources'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name    => 'easyaccess_abac',
        p_pattern        => 'resources/',
        p_method         => 'GET',
        p_source_type    => ORDS.SOURCE_TYPE_COLLECTION_FEED,
        p_items_per_page => 100,
        p_source         => '
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
            ORDER BY r.name ASC'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name => 'easyaccess_abac',
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
    -- 6. TEMPLATE: resources/:id (GET & DELETE)
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'easyaccess_abac',
        p_pattern     => 'resources/:id',
        p_priority    => 0,
        p_comments    => 'Individual resource by ID or key'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name    => 'easyaccess_abac',
        p_pattern        => 'resources/:id',
        p_method         => 'GET',
        p_source_type    => ORDS.SOURCE_TYPE_QUERY_ONE_ROW,
        p_items_per_page => 1,
        p_source         => '
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

    ORDS.DEFINE_HANDLER(
        p_module_name => 'easyaccess_abac',
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
    -- 7. TEMPLATE: audit-logs/ (GET & POST)
    -- -------------------------------------------------------------------------
    ORDS.DEFINE_TEMPLATE(
        p_module_name => 'easyaccess_abac',
        p_pattern     => 'audit-logs/',
        p_priority    => 0,
        p_comments    => 'Immutable ABAC compliance audit trail'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name    => 'easyaccess_abac',
        p_pattern        => 'audit-logs/',
        p_method         => 'GET',
        p_source_type    => ORDS.SOURCE_TYPE_COLLECTION_FEED,
        p_items_per_page => 100,
        p_source         => '
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
            ORDER BY l.timestamp DESC'
    );

    ORDS.DEFINE_HANDLER(
        p_module_name => 'easyaccess_abac',
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

            IF v_obj.has(''matched_policy_ids'') AND v_obj.get(''matched_policy_ids'') IS NOT NULL THEN
                v_policies := v_obj.get(''matched_policy_ids'').to_clob();
            ELSE
                v_policies := ''[]'';
            END IF;

            IF v_obj.has(''context_snapshot'') AND v_obj.get(''context_snapshot'') IS NOT NULL THEN
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

            COMMIT;
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
