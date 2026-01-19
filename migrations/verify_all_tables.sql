-- ============================================
-- COMPLETE DATABASE VERIFICATION
-- ============================================
-- Verify all tables exist and are properly configured
-- Run this after deployment to ensure database integrity
-- ============================================

-- 1. List all tables in public schema
SELECT 
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE columns.table_name = tables.table_name) AS column_count
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables:
-- - users
-- - todos
-- - appointments
-- - habits
-- - groceries
-- - feedback
-- - alpha_feedback
-- - user_inputs (optional)

-- ============================================
-- 2. Verify each table exists
-- ============================================

-- Users table
SELECT 'users' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables 
              WHERE table_name = 'users') AS exists;

-- Todos table
SELECT 'todos' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables 
              WHERE table_name = 'todos') AS exists;

-- Appointments table
SELECT 'appointments' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables 
              WHERE table_name = 'appointments') AS exists;

-- Habits table
SELECT 'habits' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables 
              WHERE table_name = 'habits') AS exists;

-- Groceries table
SELECT 'groceries' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables 
              WHERE table_name = 'groceries') AS exists;

-- Feedback table
SELECT 'feedback' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables 
              WHERE table_name = 'feedback') AS exists;

-- ============================================
-- 3. Count records in each table
-- ============================================

SELECT 
    'users' AS table_name,
    COUNT(*) AS record_count
FROM users
UNION ALL
SELECT 
    'todos' AS table_name,
    COUNT(*) AS record_count
FROM todos
UNION ALL
SELECT 
    'appointments' AS table_name,
    COUNT(*) AS record_count
FROM appointments
UNION ALL
SELECT 
    'habits' AS table_name,
    COUNT(*) AS record_count
FROM habits
UNION ALL
SELECT 
    'groceries' AS table_name,
    COUNT(*) AS record_count
FROM groceries
UNION ALL
SELECT 
    'feedback' AS table_name,
    COUNT(*) AS record_count
FROM feedback
ORDER BY table_name;

-- ============================================
-- 4. Verify foreign key constraints
-- ============================================

SELECT
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- Expected foreign keys:
-- - todos.user_id → users.id
-- - appointments.user_id → users.id
-- - habits.user_id → users.id
-- - groceries.user_id → users.id
-- - feedback.user_id → users.id

-- ============================================
-- 5. Verify indexes exist
-- ============================================

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- 6. Check for orphaned records (data integrity)
-- ============================================

-- Find todos without valid user
SELECT 'todos_orphaned' AS issue, COUNT(*) AS count
FROM todos t
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = t.user_id);

-- Find appointments without valid user
SELECT 'appointments_orphaned' AS issue, COUNT(*) AS count
FROM appointments a
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = a.user_id);

-- Find habits without valid user
SELECT 'habits_orphaned' AS issue, COUNT(*) AS count
FROM habits h
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = h.user_id);

-- Find groceries without valid user
SELECT 'groceries_orphaned' AS issue, COUNT(*) AS count
FROM groceries g
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = g.user_id);

-- All counts should be 0 (no orphaned records)

-- ============================================
-- 7. Database size and statistics
-- ============================================

SELECT 
    pg_size_pretty(pg_database_size(current_database())) AS database_size;

SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- SUCCESS CRITERIA:
-- ============================================
-- ✅ All expected tables exist
-- ✅ All foreign keys are configured correctly
-- ✅ All indexes are created
-- ✅ No orphaned records (all counts = 0)
-- ✅ Database size is reasonable
-- ============================================
