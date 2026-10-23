-- =============================================================================
-- ABAC Engine: Test Data Cleanup Script
-- Schema: WKSP_SAMPROJECTS
-- Deletes ONLY the specific synthetic test records created by 06_seed_test_data.sql.
-- Cascading foreign keys will clean child attributes, with explicit deletes for safety.
-- =============================================================================

-- 1. Remove resource attributes for test resources
DELETE FROM ABAC_RESOURCE_ATTRIBUTES 
WHERE resource_id IN ('res-test-k8s-0001', 'res-test-db-0002');

-- 2. Remove test protected resources
DELETE FROM ABAC_PROTECTED_RESOURCES 
WHERE id IN ('res-test-k8s-0001', 'res-test-db-0002');

-- 3. Remove user attributes for test users
DELETE FROM ABAC_USER_ATTRIBUTES 
WHERE user_id IN ('usr-test-alice-0001', 'usr-test-bob-0002');

-- 4. Remove test users
DELETE FROM ABAC_USERS 
WHERE id IN ('usr-test-alice-0001', 'usr-test-bob-0002');

COMMIT;
