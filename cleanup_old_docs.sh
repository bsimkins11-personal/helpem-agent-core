#!/bin/bash

# Markdown Documentation Cleanup Script
# Date: January 22, 2026
# Moves outdated markdown files to archive folder

ARCHIVE_DIR="archive/old-docs-20260122"
mkdir -p "$ARCHIVE_DIR"/{temporary-tests,deployment,tribe,ios,qa-tests,uat,vercel,status,appointments,features,support,misc}

echo "=== Moving Temporary Test Files ==="
mv -v app_ux_functional_1768693237.md "$ARCHIVE_DIR/temporary-tests/" 2>/dev/null
mv -v app_ux_simulation_1768693145.md "$ARCHIVE_DIR/temporary-tests/" 2>/dev/null
mv -v functional_simulation_1768693067.md "$ARCHIVE_DIR/temporary-tests/" 2>/dev/null
mv -v retest_results_1768692899.md "$ARCHIVE_DIR/temporary-tests/" 2>/dev/null
mv -v support_quality_test_1768692591.md "$ARCHIVE_DIR/temporary-tests/" 2>/dev/null
mv -v ux_100_test_1768693350.md "$ARCHIVE_DIR/temporary-tests/" 2>/dev/null
mv -v ux_100_test_1768936998.md "$ARCHIVE_DIR/temporary-tests/" 2>/dev/null
mv -v ux_100_test_1768941484.md "$ARCHIVE_DIR/temporary-tests/" 2>/dev/null
mv -v ux_100_test_1768943912.md "$ARCHIVE_DIR/temporary-tests/" 2>/dev/null
mv -v test-appointment-flow.md "$ARCHIVE_DIR/temporary-tests/" 2>/dev/null

echo -e "\n=== Moving Superseded Deployment Docs ==="
mv -v DEPLOYMENT_READY.md "$ARCHIVE_DIR/deployment/" 2>/dev/null
mv -v PRODUCTION_READY.md "$ARCHIVE_DIR/deployment/" 2>/dev/null
mv -v DEPLOY_NOW.md "$ARCHIVE_DIR/deployment/" 2>/dev/null
mv -v DEPLOY_TO_STAGING.md "$ARCHIVE_DIR/deployment/" 2>/dev/null
mv -v DEPLOY_ALL_CHECKLIST.md "$ARCHIVE_DIR/deployment/" 2>/dev/null
mv -v DEPLOYMENT_STATUS.md "$ARCHIVE_DIR/deployment/" 2>/dev/null
mv -v QUICK_DEPLOY_STEPS.md "$ARCHIVE_DIR/deployment/" 2>/dev/null
mv -v MANUAL_DEPLOY_REQUIRED.md "$ARCHIVE_DIR/deployment/" 2>/dev/null
mv -v FINISH_BEFORE_DEPLOY.md "$ARCHIVE_DIR/deployment/" 2>/dev/null
mv -v FINAL_STATUS.md "$ARCHIVE_DIR/deployment/" 2>/dev/null

echo -e "\n=== Moving Superseded Tribe Docs ==="
mv -v TRIBE_DEPLOY_NOW.md "$ARCHIVE_DIR/tribe/" 2>/dev/null
mv -v TRIBE_FINAL_STATUS.md "$ARCHIVE_DIR/tribe/" 2>/dev/null
mv -v TRIBE_FINAL_DELIVERY.md "$ARCHIVE_DIR/tribe/" 2>/dev/null
mv -v TRIBE_IMPLEMENTATION_COMPLETE.md "$ARCHIVE_DIR/tribe/" 2>/dev/null
mv -v TRIBE_QA_COMPLETE.md "$ARCHIVE_DIR/tribe/" 2>/dev/null
mv -v TRIBE_QA_FINDINGS.md "$ARCHIVE_DIR/tribe/" 2>/dev/null
mv -v TRIBE_QA_TEST_GUIDE.md "$ARCHIVE_DIR/tribe/" 2>/dev/null
mv -v TRIBE_QUICK_START.md "$ARCHIVE_DIR/tribe/" 2>/dev/null
mv -v TRIBE_REFACTOR_DEPLOYMENT.md "$ARCHIVE_DIR/tribe/" 2>/dev/null
mv -v TRIBE_UX_IMPROVEMENTS.md "$ARCHIVE_DIR/tribe/" 2>/dev/null
mv -v TRIBE_LAYOUT_REFERENCE.md "$ARCHIVE_DIR/tribe/" 2>/dev/null
mv -v ios/HelpEmApp/Views/Tribe/TribeUXRefactor.md "$ARCHIVE_DIR/tribe/" 2>/dev/null

echo -e "\n=== Moving Superseded iOS Docs ==="
mv -v IOS_CODE_IMPROVEMENTS.md "$ARCHIVE_DIR/ios/" 2>/dev/null
mv -v IOS_CODE_REVIEW_2026.md "$ARCHIVE_DIR/ios/" 2>/dev/null
mv -v IOS_CRITICAL_FIXES.md "$ARCHIVE_DIR/ios/" 2>/dev/null
mv -v IOS_LIGHTWEIGHT_OPTIMIZATION.md "$ARCHIVE_DIR/ios/" 2>/dev/null
mv -v IOS_MEMORY_FIX.md "$ARCHIVE_DIR/ios/" 2>/dev/null

echo -e "\n=== Moving Old QA Test Results ==="
mv -v QA_100_RESULTS_2026-01-18.md "$ARCHIVE_DIR/qa-tests/" 2>/dev/null
mv -v 100Q_POWER_QA_REPORT.md "$ARCHIVE_DIR/qa-tests/" 2>/dev/null
mv -v FINAL_100Q_VICTORY_REPORT.md "$ARCHIVE_DIR/qa-tests/" 2>/dev/null
mv -v FINAL_100_TEST_SUMMARY.md "$ARCHIVE_DIR/qa-tests/" 2>/dev/null
mv -v QA_CRUD_TEST_25.md "$ARCHIVE_DIR/qa-tests/" 2>/dev/null
mv -v CRUD_QA_REPORT.md "$ARCHIVE_DIR/qa-tests/" 2>/dev/null
mv -v FINAL_CRUD_TEST.md "$ARCHIVE_DIR/qa-tests/" 2>/dev/null
mv -v FINAL_TEST_RESULTS.md "$ARCHIVE_DIR/qa-tests/" 2>/dev/null
mv -v IMPROVEMENT_RESULTS.md "$ARCHIVE_DIR/qa-tests/" 2>/dev/null
mv -v VALIDATION_RESULTS.md "$ARCHIVE_DIR/qa-tests/" 2>/dev/null
mv -v VICTORY.md "$ARCHIVE_DIR/qa-tests/" 2>/dev/null

echo -e "\n=== Moving Old UAT Docs ==="
mv -v UAT_REPORT_2026-01-16.md "$ARCHIVE_DIR/uat/" 2>/dev/null
mv -v UAT_25_QUESTION_TEST.md "$ARCHIVE_DIR/uat/" 2>/dev/null
mv -v UAT_50_INTERACTION_REPORT.md "$ARCHIVE_DIR/uat/" 2>/dev/null
mv -v UAT_SUMMARY.md "$ARCHIVE_DIR/uat/" 2>/dev/null
mv -v UAT_SUCCESS_SUMMARY.md "$ARCHIVE_DIR/uat/" 2>/dev/null
mv -v UAT_FINAL_REPORT.md "$ARCHIVE_DIR/uat/" 2>/dev/null
mv -v COMPLETE_UAT_CHECKLIST.md "$ARCHIVE_DIR/uat/" 2>/dev/null
mv -v QUICK_UAT_CHECKLIST.md "$ARCHIVE_DIR/uat/" 2>/dev/null
mv -v UAT_PRODUCTION_CHECKLIST.md "$ARCHIVE_DIR/uat/" 2>/dev/null

echo -e "\n=== Moving Vercel Troubleshooting Docs ==="
mv -v FIX_VERCEL_PROTECTION.md "$ARCHIVE_DIR/vercel/" 2>/dev/null
mv -v VERCEL_DEPLOYMENT_ISSUE.md "$ARCHIVE_DIR/vercel/" 2>/dev/null
mv -v VERCEL_FIX_STEPS.md "$ARCHIVE_DIR/vercel/" 2>/dev/null
mv -v VERCEL_NOT_UPDATING.md "$ARCHIVE_DIR/vercel/" 2>/dev/null

echo -e "\n=== Moving Old Status Docs ==="
mv -v CURRENT_STATUS_AND_NEXT_STEPS.md "$ARCHIVE_DIR/status/" 2>/dev/null
mv -v SESSION_SUMMARY.md "$ARCHIVE_DIR/status/" 2>/dev/null

echo -e "\n=== Moving Appointment/Task Docs ==="
mv -v APPOINTMENT_QA_ANALYSIS.md "$ARCHIVE_DIR/appointments/" 2>/dev/null
mv -v APPOINTMENT_UAT_TESTING.md "$ARCHIVE_DIR/appointments/" 2>/dev/null
mv -v URGENT_APPOINTMENT_DEBUG.md "$ARCHIVE_DIR/appointments/" 2>/dev/null
mv -v TASK_CATEGORY_SEPARATION.md "$ARCHIVE_DIR/appointments/" 2>/dev/null

echo -e "\n=== Moving Old Feature Fix Docs ==="
mv -v AUDIO_CLEANUP_FIX_COMPLETE.md "$ARCHIVE_DIR/features/" 2>/dev/null
mv -v BLACK_SCREEN_FIX_QA.md "$ARCHIVE_DIR/features/" 2>/dev/null
mv -v COMPLETE_FIX_BLACK_SCREEN_BLUE_DOT.md "$ARCHIVE_DIR/features/" 2>/dev/null
mv -v IMMEDIATE_FIX_STEPS.md "$ARCHIVE_DIR/features/" 2>/dev/null
mv -v TTS_OPTIMIZATION_COMPLETE.md "$ARCHIVE_DIR/features/" 2>/dev/null
mv -v STICKY_INPUT_FEATURE.md "$ARCHIVE_DIR/features/" 2>/dev/null

echo -e "\n=== Moving Old Support Agent Docs ==="
mv -v SUPPORT_AGENT_IMPROVED_INSTRUCTIONS.md "$ARCHIVE_DIR/support/" 2>/dev/null
mv -v SUPPORT_AGENT_IMPROVEMENTS_NEEDED.md "$ARCHIVE_DIR/support/" 2>/dev/null
mv -v SUPPORT_AGENT_QA_100.md "$ARCHIVE_DIR/support/" 2>/dev/null
mv -v SUPPORT_AGENT_QUALITY_SUMMARY.md "$ARCHIVE_DIR/support/" 2>/dev/null
mv -v SUPPORT_AGENT_TESTING_GUIDE.md "$ARCHIVE_DIR/support/" 2>/dev/null
mv -v SUPPORT_AGENT_TEST_RESULTS.md "$ARCHIVE_DIR/support/" 2>/dev/null

echo -e "\n=== Moving Miscellaneous Old Docs ==="
mv -v CHECK_DATABASE.md "$ARCHIVE_DIR/misc/" 2>/dev/null
mv -v GENERATE_TEST_TOKEN.md "$ARCHIVE_DIR/misc/" 2>/dev/null
mv -v QUICK_TEST_GUIDE.md "$ARCHIVE_DIR/misc/" 2>/dev/null
mv -v QUICK_ALERT_TEST.md "$ARCHIVE_DIR/misc/" 2>/dev/null
mv -v RAILWAY_TEST_PLAN.md "$ARCHIVE_DIR/misc/" 2>/dev/null
mv -v REFACTOR_NOTES.md "$ARCHIVE_DIR/misc/" 2>/dev/null

echo -e "\n=== Cleanup Complete ==="
echo "Files archived to: $ARCHIVE_DIR"
echo ""
echo "Summary:"
find "$ARCHIVE_DIR" -type f | wc -l | xargs echo "Total files archived:"
