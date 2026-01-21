# Helpem — Personal Analytics & Notification System
# Developer Implementation Instructions
#
# Scope
#
# Add a Personal Analytics feature to the main app menu and implement a calm,
# respectful notification system aligned with Helpem’s philosophy.
#
# This is a standalone Helpem agent (not part of a broader portfolio).
#
# 1. Core Product Philosophy (DO NOT SKIP)
#
# Non-Negotiable Principles
# - Every day is treated as a clean slate
# - Productivity includes rest, calm, and personal care
# - The app must never guilt, shame, or escalate emotionally
# - Notifications are encouragement, not enforcement
# - Calm days are valid days
#
# Prohibited Behaviors
# - Do not reference missed tasks or routines in notifications
# - Do not use urgency language (“don’t forget”, “ASAP”, “now”)
# - Do not frame rest as a reward for productivity
# - Do not escalate tone based on poor performance
# - Do not shame broken streaks or inactivity
#
# If unsure, default to neutral and quiet.
#
# 2. Menu Addition — Personal Analytics
#
# Menu Placement
# - Add “Personal Analytics” as a first-level menu item
# - Use a neutral icon (e.g. chart / trend / summary)
# - Do NOT badge or highlight this menu item
#
# Purpose
# - Reflection
# - Awareness
# - Perspective
#
# It is not a performance scoreboard.
#
# 3. Personal Analytics — Content Requirements
#
# Views (Initial MVP)
# - Daily overview (optional)
# - Weekly summary
# - Monthly summary
#
# Quarterly / annual views are explicitly out of scope.
#
# Data Rules
# - Treat routines, tasks, and calm/personal-care routines equally
# - Do not label activities as “productive” vs “unproductive”
# - Show trends and summaries, not rankings
#
# Tone Rules
# - Descriptive, not evaluative
# - “Here’s how things went” > “Here’s how you did”
# - Avoid comparative language unless user explicitly navigates to it
#
# 4. Notification System — Overview
#
# Implement four notification types.
# All notifications must be opt-in configurable.
#
# Notification Types
# - Daily Morning Encouragement (Routines)
# - Daily High-Priority Task Encouragement
# - Weekly Summary
# - Monthly Summary (last day of month)
#
# Notifications should be local-first and work offline.
#
# 5. Daily Morning Encouragement (Routines)
#
# Trigger Conditions
# - Fire once per day
# - Only if ≥ 1 routine is scheduled today
# - User-defined time window (default morning)
# - Skip entirely if no routines
#
# Content Rules
# - Neutral, calm tone
# - No mention of yesterday
# - No performance data in body text
#
# Example Pattern
# - “Good morning. You have a few routines today.”
#
# Technical Notes
# - No sound by default
# - No badge increment
# - Category: DAILY_ROUTINE_PRIME
#
# 6. Daily High-Priority Task Encouragement
#
# Trigger Conditions (ALL must be true)
# - At least one task marked high_priority
# - Task is incomplete
# - Fire at most once per day
# - Never interrupt scheduled calm / rest routines
#
# Content Rules
# - Mention only one task
# - No urgency or pressure language
# - Frame as opportunity, not obligation
#
# Example Pattern
# - “One important task remains.”
#
# Category
# - HIGH_PRIORITY_NUDGE
#
# 7. Weekly Summary Notification
#
# Timing
# - User-selectable:
#   - Sunday evening OR
#   - Monday morning
#
# Content Rules
# - One positive or neutral observation
# - No percentages in notification body
# - No calls to “do better next week”
#
# Example Pattern
# - “Here’s a look at how your week went.”
#
# Behavior
# - Tapping opens Weekly Analytics View
# - No modal, no forced reflection
#
# 8. Monthly Summary Notification
#
# Timing
# - Fire on the last calendar day of the month
# - After 6 PM local time
#
# Content Rules
# - Perspective-focused
# - No rankings or comparisons
# - No numbers in notification body
#
# Example Pattern
# - “A look back at this month.”
#
# Category
# - MONTHLY_REFLECTION
#
# 9. Notification Settings (Required UI)
#
# Add a Notifications Settings section with toggles:
# - Morning encouragement: On / Off
# - High-priority reminders: On / Off
# - Weekly summary: Day & time
# - Monthly summary: On / Off
#
# Defaults should be conservative, not aggressive.
#
# 10. Tone Enforcement Rules (Important)
#
# When generating any copy (notifications or analytics):
#
# Must Pass These Checks
# - Does this mention the past in a negative way? → ❌
# - Does this imply obligation or urgency? → ❌
# - Does this make today feel heavier? → ❌
#
# If any check fails, rewrite or suppress.
#
# 11. Engineering Guardrails
#
# Data Handling
# - Inactivity must never increase notification frequency
# - Missed days do not change tone or behavior
# - Calm routines must be counted as valid activity
#
# Default State
# - If data is sparse or missing → show neutral summaries
# - Never show “no data” as a failure state
#
# 12. Internal North Star (For All Dev Decisions)
#
# Helpem optimizes for sustainability, not output.
#
# If a feature increases pressure or anxiety, it does not ship.
#
# End of Instructions
