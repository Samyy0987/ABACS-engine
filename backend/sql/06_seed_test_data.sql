-- =============================================================================
-- ABAC Engine: Safe Synthetic Test Data Seeding Script
-- Schema: WKSP_SAMPROJECTS
-- Seeds: 2 Test Users, 7 User Attributes, 2 Protected Resources, 5 Resource Attributes
-- Non-sensitive, purely fictional test identities. Idempotent MERGE operations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SEED TEST USERS (ABAC_USERS)
-- -----------------------------------------------------------------------------
MERGE INTO ABAC_USERS u
USING (
    SELECT 
        'usr-test-alice-0001' AS id,
        'test_alice_secops' AS username,
        'test.alice@synthetic.local' AS email,
        '$2b$12$syntheticTestHashSecOpsAlice001' AS password_hash,
        1 AS is_active,
        1 AS is_verified
    FROM DUAL
    UNION ALL
    SELECT 
        'usr-test-bob-0002' AS id,
        'test_bob_guest' AS username,
        'test.bob@synthetic.local' AS email,
        '$2b$12$syntheticTestHashGuestBob002' AS password_hash,
        1 AS is_active,
        0 AS is_verified
    FROM DUAL
) src
ON (u.id = src.id)
WHEN MATCHED THEN
    UPDATE SET 
        username    = src.username,
        email       = src.email,
        is_active   = src.is_active,
        is_verified = src.is_verified,
        updated_at  = SYSTIMESTAMP
WHEN NOT MATCHED THEN
    INSERT (id, username, email, password_hash, is_active, is_verified, created_at, updated_at)
    VALUES (src.id, src.username, src.email, src.password_hash, src.is_active, src.is_verified, SYSTIMESTAMP, SYSTIMESTAMP);

-- -----------------------------------------------------------------------------
-- 2. SEED USER ATTRIBUTES (ABAC_USER_ATTRIBUTES)
-- -----------------------------------------------------------------------------
MERGE INTO ABAC_USER_ATTRIBUTES a
USING (
    -- Alice: SecOps Engineer (matches pol-001)
    SELECT 'usr-test-alice-0001' AS user_id, 'role' AS attribute_name, 'SecOps' AS attribute_value, 'string' AS data_type FROM DUAL UNION ALL
    SELECT 'usr-test-alice-0001' AS user_id, 'clearanceLevel' AS attribute_name, 'TopSecret' AS attribute_value, 'string' AS data_type FROM DUAL UNION ALL
    SELECT 'usr-test-alice-0001' AS user_id, 'mfaEnforced' AS attribute_name, 'true' AS attribute_value, 'boolean' AS data_type FROM DUAL UNION ALL
    SELECT 'usr-test-alice-0001' AS user_id, 'department' AS attribute_name, 'Security' AS attribute_value, 'string' AS data_type FROM DUAL UNION ALL

    -- Bob: Guest User (fails pol-001, pol-002 -> default deny)
    SELECT 'usr-test-bob-0002' AS user_id, 'role' AS attribute_name, 'Guest' AS attribute_value, 'string' AS data_type FROM DUAL UNION ALL
    SELECT 'usr-test-bob-0002' AS user_id, 'clearanceLevel' AS attribute_name, 'Public' AS attribute_value, 'string' AS data_type FROM DUAL UNION ALL
    SELECT 'usr-test-bob-0002' AS user_id, 'mfaEnforced' AS attribute_name, 'false' AS attribute_value, 'boolean' AS data_type FROM DUAL
) src
ON (a.user_id = src.user_id AND a.attribute_name = src.attribute_name)
WHEN MATCHED THEN
    UPDATE SET attribute_value = src.attribute_value, data_type = src.data_type, updated_at = SYSTIMESTAMP
WHEN NOT MATCHED THEN
    INSERT (user_id, attribute_name, attribute_value, data_type, created_at, updated_at)
    VALUES (src.user_id, src.attribute_name, src.attribute_value, src.data_type, SYSTIMESTAMP, SYSTIMESTAMP);

-- -----------------------------------------------------------------------------
-- 3. SEED PROTECTED RESOURCES (ABAC_PROTECTED_RESOURCES)
-- -----------------------------------------------------------------------------
MERGE INTO ABAC_PROTECTED_RESOURCES r
USING (
    -- Resource 1: Cluster Node (Target for pol-001 PERMIT)
    SELECT 
        'res-test-k8s-0001' AS id,
        'test-k8s-cluster-alpha' AS resource_key,
        'Test Kubernetes Cluster Alpha' AS name,
        'Synthetic worker node for ABAC PERMIT authorization tests.' AS description,
        'Cluster_Node' AS resource_type,
        'Critical' AS classification,
        'Infrastructure' AS owner_department,
        'usr-test-alice-0001' AS owner_id,
        1 AS is_active
    FROM DUAL
    UNION ALL
    -- Resource 2: Production Database (Target for pol-003 DENY)
    SELECT 
        'res-test-db-0002' AS id,
        'test-prod-db-primary' AS resource_key,
        'Test Production Relational DB' AS name,
        'Synthetic production database for ABAC DENY authorization tests.' AS description,
        'Relational_Database' AS resource_type,
        'Production_Database' AS classification,
        'Database_Operations' AS owner_department,
        'usr-test-alice-0001' AS owner_id,
        1 AS is_active
    FROM DUAL
) src
ON (r.id = src.id)
WHEN MATCHED THEN
    UPDATE SET 
        resource_key     = src.resource_key,
        name             = src.name,
        description      = src.description,
        resource_type    = src.resource_type,
        classification   = src.classification,
        owner_department = src.owner_department,
        owner_id         = src.owner_id,
        is_active        = src.is_active,
        updated_at       = SYSTIMESTAMP
WHEN NOT MATCHED THEN
    INSERT (id, resource_key, name, description, resource_type, classification, owner_department, owner_id, is_active, created_at, updated_at)
    VALUES (src.id, src.resource_key, src.name, src.description, src.resource_type, src.classification, src.owner_department, src.owner_id, src.is_active, SYSTIMESTAMP, SYSTIMESTAMP);

-- -----------------------------------------------------------------------------
-- 4. SEED RESOURCE ATTRIBUTES (ABAC_RESOURCE_ATTRIBUTES)
-- -----------------------------------------------------------------------------
MERGE INTO ABAC_RESOURCE_ATTRIBUTES a
USING (
    SELECT 'res-test-k8s-0001' resource_id,
           'classification' attribute_name,
           'Critical' attribute_value,
           'string' data_type
    FROM DUAL
    UNION ALL
    SELECT 'res-test-k8s-0001', 'type', 'Cluster_Node', 'string'
    FROM DUAL
    UNION ALL
    SELECT 'res-test-k8s-0001', 'environment', 'staging-test', 'string'
    FROM DUAL
    UNION ALL
    SELECT 'res-test-db-0002', 'classification',
           'Production_Database', 'string'
    FROM DUAL
    UNION ALL
    SELECT 'res-test-db-0002', 'type',
           'Relational_Database', 'string'
    FROM DUAL
) src
ON (
    a.resource_id = src.resource_id
    AND a.attribute_name = src.attribute_name
)
WHEN MATCHED THEN
    UPDATE SET
        attribute_value = src.attribute_value,
        data_type = src.data_type,
        updated_at = SYSTIMESTAMP
WHEN NOT MATCHED THEN
    INSERT (
        resource_id, attribute_name, attribute_value,
        data_type, created_at, updated_at
    )
    VALUES (
        src.resource_id, src.attribute_name, src.attribute_value,
        src.data_type, SYSTIMESTAMP, SYSTIMESTAMP
    )