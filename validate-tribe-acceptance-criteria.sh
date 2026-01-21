#!/bin/bash

# Tribe Acceptance Criteria Validation
# Verifies all non-negotiable product invariants are met

echo "🔍 Validating Tribe Implementation..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Function to check for code pattern
check_code() {
    local description=$1
    local pattern=$2
    local file=$3
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $description"
        ((PASSED++))
    else
        echo -e "${RED}❌${NC} $description"
        ((FAILED++))
    fi
}

# Function to check file exists
check_file() {
    local description=$1
    local file=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $description"
        ((PASSED++))
    else
        echo -e "${RED}❌${NC} $description"
        ((FAILED++))
    fi
}

echo "📋 BACKEND VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backend: Data models exist
check_file "Tribe data models in Prisma schema" "backend/prisma/schema.prisma"
check_code "Tribe model defined" "model Tribe" "backend/prisma/schema.prisma"
check_code "TribeMember model defined" "model TribeMember" "backend/prisma/schema.prisma"
check_code "TribeProposal model defined" "model TribeProposal" "backend/prisma/schema.prisma"
check_code "TribeMemberPermissions model defined" "model TribeMemberPermissions" "backend/prisma/schema.prisma"

# Backend: API routes exist
check_file "Tribe API routes" "backend/src/routes/tribe.js"
check_file "Tribe permissions middleware" "backend/src/lib/tribePermissions.js"

# Backend: Permission enforcement
check_code "Permission validation function" "checkTribePermission" "backend/src/lib/tribePermissions.js"
check_code "Proposal state transition validation" "transitionProposalState" "backend/src/lib/tribePermissions.js"

# Backend: Required comment exists
check_code "Required code comment in backend" "Tribe items are invitations" "backend/src/routes/tribe.js"

echo ""
echo "📱 iOS VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# iOS: Models exist
check_file "ItemContext model (color system)" "ios/HelpEmApp/Models/ItemContext.swift"
check_file "Tribe models" "ios/HelpEmApp/Models/TribeModels.swift"

# iOS: Color system
check_code "Blue for personal items" ".blue" "ios/HelpEmApp/Models/ItemContext.swift"
check_code "Green for Tribe items" ".green" "ios/HelpEmApp/Models/ItemContext.swift"
check_code "Neutral for proposals" ".gray" "ios/HelpEmApp/Models/ItemContext.swift"

# iOS: Services exist
check_file "Tribe API client" "ios/HelpEmApp/Services/TribeAPIClient.swift"
check_file "Tribe notification manager" "ios/HelpEmApp/Services/TribeNotificationManager.swift"

# iOS: Views exist
check_file "Tribe list view" "ios/HelpEmApp/Views/Tribe/TribeListView.swift"
check_file "Tribe detail view" "ios/HelpEmApp/Views/Tribe/TribeDetailView.swift"
check_file "Tribe inbox view" "ios/HelpEmApp/Views/Tribe/TribeInboxView.swift"
check_file "Tribe settings view" "ios/HelpEmApp/Views/Tribe/TribeSettingsView.swift"
check_file "Contacts picker view" "ios/HelpEmApp/Views/Tribe/ContactsPickerView.swift"
check_file "Share with Tribe view" "ios/HelpEmApp/Views/Tribe/ShareWithTribeView.swift"

# iOS: Inbox actions
check_code "Accept proposal action" "func acceptProposal" "ios/HelpEmApp/Views/Tribe/TribeInboxView.swift"
check_code "Not now action" "func notNowProposal" "ios/HelpEmApp/Views/Tribe/TribeInboxView.swift"

# iOS: Contacts permission timing
check_code "Contacts permission on demand" "requestPermission" "ios/HelpEmApp/Views/Tribe/ContactsPickerView.swift"
check_code "No background sync warning" "No background sync" "ios/HelpEmApp/Views/Tribe/ContactsPickerView.swift"

# iOS: Notification actions
check_code "Accept notification action" "ACCEPT_PROPOSAL" "ios/HelpEmApp/Services/TribeNotificationManager.swift"
check_code "Not now notification action" "NOT_NOW_PROPOSAL" "ios/HelpEmApp/Services/TribeNotificationManager.swift"
check_code "One notification per proposal" "ONE notification per proposal" "ios/HelpEmApp/Services/TribeNotificationManager.swift"

# iOS: Required comment exists
check_code "Required code comment in iOS" "Tribe items are invitations" "ios/HelpEmApp/Models/TribeModels.swift"

# iOS: No social pressure
check_code "No social pressure in inbox" "No social pressure" "ios/HelpEmApp/Views/Tribe/TribeInboxView.swift"

# iOS: Recipient selection mandatory
check_code "Mandatory recipient selection" "send to all" "ios/HelpEmApp/Views/Tribe/ShareWithTribeView.swift"

# iOS: Appointment warning
check_code "Appointment proposal warning" "This will be sent as a proposal" "ios/HelpEmApp/Views/Tribe/ShareWithTribeView.swift"

echo ""
echo "🔐 PRODUCT INVARIANTS VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Acceptance criteria
check_code "Explicit acceptance required" "acceptProposal" "ios/HelpEmApp/Services/TribeAPIClient.swift"
check_code "Proposal state machine" "enum ProposalState" "ios/HelpEmApp/Models/TribeModels.swift"
check_code "Color context system" "enum ItemContext" "ios/HelpEmApp/Models/ItemContext.swift"
check_code "Actionable notifications" "UNNotificationCategory" "ios/HelpEmApp/Services/TribeNotificationManager.swift"

echo ""
echo "📊 RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All acceptance criteria validated!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run database migration: ./run-tribe-migration.sh"
    echo "2. Add Tribe files to Xcode project"
    echo "3. Update main navigation to include 'My Tribe'"
    echo "4. Test with real users"
    exit 0
else
    echo -e "${RED}⚠️  Some acceptance criteria failed${NC}"
    echo "Review the failed checks above and ensure all files are in place."
    exit 1
fi
