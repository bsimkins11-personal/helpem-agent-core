# Support Agent QA - 100 Scenarios
**Version**: 1.0  
**Date**: January 15, 2026  
**Test Objective**: Validate and improve support agent quality, conciseness, and escalation logic

---

## Test Methodology

Each scenario is evaluated on:
- **Accuracy**: Is the information correct?
- **Conciseness**: Response under 100 words when possible
- **Helpfulness**: Does it solve the user's problem?
- **Tone**: Friendly, professional, supportive
- **Escalation**: Correctly escalates when needed

**Scoring**: ✅ Pass | ⚠️ Needs Improvement | ❌ Fail

---

## Category 1: Basic Features (20 scenarios)

### 1. "What is HelpEm?"
**Expected**: Brief explanation - voice-first personal assistant, captures tasks naturally  
**Key Points**: Voice/text input, auto-categorizes, zero friction  
**Max Words**: 50

### 2. "How do I add a todo?"
**Expected**: "Just say or type what you need to do! Examples: 'Buy milk', 'Call mom tomorrow', 'Email team'. HelpEm creates it instantly."  
**Max Words**: 30

### 3. "Can I use voice on web?"
**Expected**: Yes! Click microphone icon, speak naturally. Works on Chrome, Safari, Edge.  
**Max Words**: 20

### 4. "Does it work on iPhone?"
**Expected**: Yes! iOS app available now. Download from TestFlight (alpha) or coming to App Store soon.  
**Max Words**: 20

### 5. "What's the difference between a todo and appointment?"
**Expected**: Todos are tasks to complete (any time). Appointments have specific date/time. App auto-detects based on your wording.  
**Max Words**: 25

### 6. "How do I set priority?"
**Expected**: Say "urgent" or "ASAP" for high priority. Otherwise defaults to medium. You can also say "low priority" explicitly.  
**Max Words**: 20

### 7. "Can I add multiple tasks at once?"
**Expected**: Yes! Say "Add eggs, bread, and milk" - currently creates first item but acknowledges all. Full multi-add coming soon.  
**Max Words**: 20

### 8. "How do routines work?"
**Expected**: Say "every day" or "every Monday" - creates recurring reminders. Example: "Take vitamins every morning".  
**Max Words**: 20

### 9. "Do I need to create an account?"
**Expected**: Yes for iOS (Sign in with Apple). Web demo available without account, but data isn't saved.  
**Max Words**: 20

### 10. "Where is my data stored?"
**Expected**: Securely in our encrypted database. Each user's data is completely isolated. You can delete all data anytime from menu.  
**Max Words**: 20

### 11. "Can I edit a task after creating it?"
**Expected**: Currently no direct edit - best to delete and recreate. Full edit feature coming soon!  
**Max Words**: 15

### 12. "How do I delete a task?"
**Expected**: Say "delete [task name]" or "remove my reminder about [X]". Agent will confirm before deleting.  
**Max Words**: 20

### 13. "What if I make a mistake?"
**Expected**: No problem! Say "delete that" right after or ask to "remove my last task". Easy to fix.  
**Max Words**: 15

### 14. "Can I see all my tasks?"
**Expected**: Yes! Check the Todos, Appointments, and Routines tabs. Or ask "What do I need to do today?"  
**Max Words**: 20

### 15. "How do notifications work?"
**Expected**: Todos with times notify at that time. Appointments notify 15 minutes before. iOS notifications require permission.  
**Max Words**: 20

### 16. "Can I share lists with family?"
**Expected**: Not yet in alpha. Team collaboration coming in Premium plan ($9.99/month) - share with up to 5 people!  
**Max Words**: 20

### 17. "Does it integrate with Google Calendar?"
**Expected**: Calendar sync coming in Basic plan ($4.99/month). Currently working with Apple Calendar for iOS.  
**Max Words**: 15

### 18. "Can I backup my data?"
**Expected**: Data automatically backed up in secure database. You can export/clear from menu → Clear All Data.  
**Max Words**: 15

### 19. "What languages do you support?"
**Expected**: Currently English only. More languages planned for future releases!  
**Max Words**: 10

### 20. "Is there a desktop app?"
**Expected**: Web app works on desktop! Visit helpem.ai/app. Native desktop apps (Mac/Windows) planned for future.  
**Max Words**: 15

---

## Category 2: Pricing & Plans (15 scenarios)

### 21. "How much does it cost?"
**Expected**: Alpha: Free! After launch: Free plan (50 tasks/month), Basic $4.99/month, Premium $9.99/month.  
**Max Words**: 20

### 22. "What's included in the free plan?"
**Expected**: 50 tasks/month, 10 appointments/month, 5 routines, basic grocery lists, email support.  
**Max Words**: 15

### 23. "What's the difference between Basic and Premium?"
**Expected**: Premium adds: unlimited usage, team collaboration (5 people), shared lists, analytics, API access, priority support.  
**Max Words**: 20

### 24. "Is there a student discount?"
**Expected**: ESCALATE - "Great question! Email support@helpem.ai about student pricing options."  
**Max Words**: 10

### 25. "Can I cancel anytime?"
**Expected**: ESCALATE - "Yes, but email support@helpem.ai for billing/cancellation help."  
**Max Words**: 10

### 26. "What payment methods do you accept?"
**Expected**: ESCALATE - "Email support@helpem.ai for billing and payment questions."  
**Max Words**: 10

### 27. "Do you offer refunds?"
**Expected**: ESCALATE - "Email support@helpem.ai about refund policy and specific cases."  
**Max Words**: 10

### 28. "Is there a family plan?"
**Expected**: Premium includes team collaboration (up to 5 people) - great for families! $9.99/month.  
**Max Words**: 15

### 29. "What happens if I hit my monthly limit?"
**Expected**: Alpha: $2 API limit (~1000 messages). After launch: Free plan limits, then upgrade prompts.  
**Max Words**: 15

### 30. "Can I try Premium before buying?"
**Expected**: ESCALATE - "Email support@helpem.ai to request a Premium trial."  
**Max Words**: 10

### 31. "Is there an annual discount?"
**Expected**: Yes! Basic: $50/year (save $10). Premium: $100/year (save $20).  
**Max Words**: 10

### 32. "What's included in priority support?"
**Expected**: Basic: priority email. Premium: priority email + chat + phone. Faster response times.  
**Max Words**: 15

### 33. "Can I upgrade mid-month?"
**Expected**: ESCALATE - "Email support@helpem.ai for mid-cycle upgrade/billing questions."  
**Max Words**: 10

### 34. "Do you have lifetime pricing?"
**Expected**: ESCALATE - "Email support@helpem.ai about special pricing options."  
**Max Words**: 10

### 35. "What's API access in Premium?"
**Expected**: Developers can integrate HelpEm into their own apps/workflows. Documentation coming soon!  
**Max Words**: 15

---

## Category 3: Troubleshooting (20 scenarios)

### 36. "Voice input isn't working"
**Expected**: Check: 1) Microphone permission in browser, 2) Use Chrome/Safari/Edge, 3) Refresh page. Still broken? Email support@helpem.ai  
**Max Words**: 20

### 37. "I said something but nothing happened"
**Expected**: Try: 1) Click microphone again, 2) Say action + task (e.g. "Add buy milk"), 3) Check if task appeared in list.  
**Max Words**: 20

### 38. "My tasks disappeared"
**Expected**: ESCALATE - "That shouldn't happen! Email support@helpem.ai immediately with details."  
**Max Words**: 10

### 39. "I'm not getting notifications"
**Expected**: iOS: Settings → HelpEm → Notifications → Allow. Web: Browser may block. Check browser notification settings.  
**Max Words**: 15

### 40. "App is slow"
**Expected**: Try: 1) Refresh page, 2) Clear browser cache, 3) Check internet connection. Still slow? Email support@helpem.ai  
**Max Words**: 15

### 41. "Can't log in on iPhone"
**Expected**: ESCALATE - "Login issues need direct help. Email support@helpem.ai with error details."  
**Max Words**: 10

### 42. "Sign in with Apple failed"
**Expected**: ESCALATE - "Authentication errors need technical help. Email support@helpem.ai"  
**Max Words**: 10

### 43. "My microphone icon is missing"
**Expected**: Try refreshing page. If using Safari, check microphone permissions. Still missing? Email support@helpem.ai  
**Max Words**: 15

### 44. "I hear my voice but AI doesn't respond"
**Expected**: That's transcription working! AI processes after you finish speaking. Wait 2-3 seconds. Still stuck? Refresh page.  
**Max Words**: 15

### 45. "Tasks are in wrong category"
**Expected**: AI learns from context. Todos = tasks, Appointments = specific times. Say "appointment at 3pm" or "todo: buy milk" to be explicit.  
**Max Words**: 20

### 46. "Can't see my calendar"
**Expected**: Calendar sync requires Basic plan ($4.99/month). Currently in beta for iOS users.  
**Max Words**: 15

### 47. "Deleted wrong task, can I undo?"
**Expected**: No undo yet. You'll need to recreate it. Say exactly what you need again. Undo feature coming soon!  
**Max Words**: 15

### 48. "App crashed"
**Expected**: ESCALATE - "Sorry about that! Email support@helpem.ai with: device type, what you were doing, error message if any."  
**Max Words**: 15

### 49. "Can't access web app"
**Expected**: Check: 1) Visit helpem.ai/app, 2) Try different browser, 3) Disable VPN if using one. Still blocked? Email support@helpem.ai  
**Max Words**: 20

### 50. "My data is wrong"
**Expected**: You can clear all data: Menu → Clear All Data. WARNING: This deletes everything! Or email support@helpem.ai for selective fixes.  
**Max Words**: 20

### 51. "Battery draining fast on iPhone"
**Expected**: Check: 1) Background app refresh off, 2) Reduce usage frequency. Issue persists? Email support@helpem.ai  
**Max Words**: 15

### 52. "Text-to-speech sounds weird"
**Expected**: We use OpenAI voices. Try different voice in settings. Prefer natural speech? Email support@helpem.ai to suggest improvements.  
**Max Words**: 15

### 53. "Can't delete account"
**Expected**: ESCALATE - "Account deletion requires verification. Email support@helpem.ai from your registered email."  
**Max Words**: 10

### 54. "Forgot my password"
**Expected**: We use Sign in with Apple (no password!). If locked out, check Apple ID settings or email support@helpem.ai  
**Max Words**: 15

### 55. "App won't install on old iPhone"
**Expected**: Requires iOS 15+. Check: Settings → General → About → Software Version. Need help? Email support@helpem.ai  
**Max Words**: 15

---

## Category 4: Advanced Usage (15 scenarios)

### 56. "Can I add tasks via API?"
**Expected**: Premium plan includes API access! Documentation coming soon. Email support@helpem.ai to join API beta.  
**Max Words**: 15

### 57. "How do I use keyboard shortcuts?"
**Expected**: Currently no keyboard shortcuts. Great idea! Request this feature: support@helpem.ai  
**Max Words**: 10

### 58. "Can I import from Todoist?"
**Expected**: ESCALATE - "Import feature not available yet. Email support@helpem.ai to request import help."  
**Max Words**: 10

### 59. "How does the AI work?"
**Expected**: Uses GPT-4 to understand natural language, extract tasks, and categorize automatically. No training needed - just talk naturally!  
**Max Words**: 20

### 60. "Can I customize the AI?"
**Expected**: AI learns from your corrections over time. Custom AI settings coming in future updates!  
**Max Words**: 15

### 61. "What data do you collect?"
**Expected**: Only: your tasks, usage stats, anonymous analytics. NO: email (Apple Sign In only), NO selling data. Delete anytime from menu.  
**Max Words**: 20

### 62. "Is my data encrypted?"
**Expected**: Yes! Data encrypted at rest and in transit. Each user completely isolated. We take security seriously.  
**Max Words**: 15

### 63. "Can I export my data?"
**Expected**: ESCALATE - "Export feature coming soon! For now, email support@helpem.ai for manual data export."  
**Max Words**: 10

### 64. "How do I use with Siri?"
**Expected**: iOS Shortcuts integration coming soon! You'll be able to say "Hey Siri, add to HelpEm". Stay tuned!  
**Max Words**: 15

### 65. "Can I access offline?"
**Expected**: Requires internet for AI. Offline mode planned for future - view/edit existing tasks without connection.  
**Max Words**: 15

### 66. "What's the monthly usage limit?"
**Expected**: Alpha: $2 API (~1000 messages). After launch: Free=50 tasks, Basic=500 tasks, Premium=unlimited.  
**Max Words**: 15

### 67. "Can I connect to Zapier?"
**Expected**: Premium API access enables Zapier integration. Documentation + guides coming soon!  
**Max Words**: 10

### 68. "How do I add location-based reminders?"
**Expected**: Location reminders coming in future update! Currently time-based only. Request this: support@helpem.ai  
**Max Words**: 10

### 69. "Can I add images to tasks?"
**Expected**: Not yet! Image attachments planned for future. Great idea - request priority: support@helpem.ai  
**Max Words**: 10

### 70. "How does team collaboration work?"
**Expected**: Premium only: invite up to 5 people, shared lists, real-time sync. Perfect for families and small teams!  
**Max Words**: 15

---

## Category 5: Edge Cases & Complex Questions (15 scenarios)

### 71. "I want to add 50 tasks at once"
**Expected**: Best to add one at a time for accuracy. Bulk import coming soon! Need this now? Email support@helpem.ai  
**Max Words**: 15

### 72. "Can you integrate with Microsoft Teams?"
**Expected**: Premium API enables custom integrations. Teams integration not official yet. Email support@helpem.ai to request!  
**Max Words**: 15

### 73. "My boss wants company-wide access"
**Expected**: ESCALATE - "Enterprise plans coming soon! Email support@helpem.ai for business/enterprise pricing."  
**Max Words**: 10

### 74. "I'm a developer, can I contribute?"
**Expected**: ESCALATE - "We'd love your help! Email support@helpem.ai about open source or partnership opportunities."  
**Max Words**: 10

### 75. "What if HelpEm shuts down?"
**Expected**: ESCALATE - "We're committed long-term! For data export guarantees, email support@helpem.ai"  
**Max Words**: 10

### 76. "Can I white-label this for my company?"
**Expected**: ESCALATE - "Interesting! Email support@helpem.ai about white-label/partnership opportunities."  
**Max Words**: 10

### 77. "I found a security vulnerability"
**Expected**: ESCALATE - "URGENT: Email security@helpem.ai immediately. Do NOT share publicly. Thank you!"  
**Max Words**: 10

### 78. "Can you build a custom feature for me?"
**Expected**: ESCALATE - "Feature requests welcome! Email support@helpem.ai with details. Premium users get priority."  
**Max Words**: 10

### 79. "Your competitor does X, why don't you?"
**Expected**: We're focused on zero-friction voice-first experience! What feature do you need? Email support@helpem.ai to suggest!  
**Max Words**: 15

### 80. "I'm a journalist writing about HelpEm"
**Expected**: ESCALATE - "Exciting! Email press@helpem.ai or support@helpem.ai for media inquiries."  
**Max Words**: 10

### 81. "Can I invest in HelpEm?"
**Expected**: ESCALATE - "We appreciate the interest! Email support@helpem.ai about investment opportunities."  
**Max Words**: 10

### 82. "What's your privacy policy?"
**Expected**: We collect minimal data (no email!), never sell it, you can delete anytime. Full policy: helpem.ai/privacy  
**Max Words**: 15

### 83. "Are you GDPR compliant?"
**Expected**: Yes! EU users can request data export/deletion. Email support@helpem.ai for GDPR requests.  
**Max Words**: 10

### 84. "Can I use this for medical reminders?"
**Expected**: Yes for personal use, but HelpEm is NOT a medical device. For critical health needs, consult your doctor.  
**Max Words**: 15

### 85. "What if AI misunderstands me?"
**Expected**: Say "delete that" immediately, then rephrase. AI improves from corrections. Persistent issues? Email support@helpem.ai  
**Max Words**: 15

---

## Category 6: Feedback & Feature Requests (10 scenarios)

### 86. "Can you add dark mode?"
**Expected**: Great idea! Request features: Menu → Give Feedback, or email support@helpem.ai. We track all requests!  
**Max Words**: 15

### 87. "I love this app!"
**Expected**: Thank you! 🎉 We'd love a review or testimonial. Share feedback: Menu → Give Feedback. Means the world to us!  
**Max Words**: 15

### 88. "This is terrible, nothing works"
**Expected**: I'm sorry you're having trouble! Let's fix this. Email support@helpem.ai with specific issues - we'll help immediately.  
**Max Words**: 15

### 89. "Feature X would be perfect"
**Expected**: Love it! Submit via Menu → Give Feedback or email support@helpem.ai. Premium users get feature priority!  
**Max Words**: 15

### 90. "When is [feature] coming?"
**Expected**: We don't announce dates but actively developing! Email support@helpem.ai to vote for specific features.  
**Max Words**: 15

### 91. "Can I beta test new features?"
**Expected**: Yes! Email support@helpem.ai to join our beta program. Premium users get early access automatically!  
**Max Words**: 15

### 92. "How do I report a bug?"
**Expected**: Menu → Give Feedback, or email support@helpem.ai with: what happened, what you expected, device/browser info.  
**Max Words**: 15

### 93. "Your UI is confusing"
**Expected**: Thanks for the feedback! Specific suggestions? Menu → Give Feedback or email support@helpem.ai. UI improvements ongoing!  
**Max Words**: 15

### 94. "Can I get credits for reporting bugs?"
**Expected**: ESCALATE - "Great idea! Email support@helpem.ai about bug bounty/rewards program."  
**Max Words**: 10

### 95. "I want to speak with a human"
**Expected**: Happy to connect you! Email support@helpem.ai and our team will respond within 24 hours (faster for Premium).  
**Max Words**: 15

---

## Category 7: Confusion & Unclear Questions (5 scenarios)

### 96. "It's not working"
**Expected**: I want to help! What specifically isn't working? Voice input, task creation, notifications? Or email support@helpem.ai with details.  
**Max Words**: 20

### 97. "Help"
**Expected**: I'm here to help! What do you need? Ask about features, pricing, troubleshooting, or anything HelpEm-related!  
**Max Words**: 15

### 98. "???"
**Expected**: Not sure what you need? Try: "How does HelpEm work?" or "How do I add a task?" or email support@helpem.ai!  
**Max Words**: 15

### 99. "asdfghjkl"
**Expected**: Looks like a typo! Ask me about HelpEm features, pricing, or troubleshooting. Or email support@helpem.ai for help!  
**Max Words**: 15

### 100. "I don't understand"
**Expected**: No problem! What are you trying to do? Add tasks, check pricing, troubleshoot? Or email support@helpem.ai for 1-on-1 help!  
**Max Words**: 15

---

## QA Results Summary

### Issues Identified in Current Support Agent:

1. **❌ TOO VERBOSE**: Current pricing info includes full feature lists (unnecessary)
2. **❌ INCORRECT INFO**: Says "iOS coming soon" but it's ALREADY available (TestFlight/alpha)
3. **❌ MISSING INFO**: No mention of:
   - Voice features (transcribe/TTS)
   - Alpha status ($2/month limit)
   - Sign in with Apple
   - Actual app capabilities from codebase
   - Clear All Data feature
   - Get Support in menu

4. **❌ WEAK ESCALATION**: Doesn't clearly end session or emphasize email

5. **❌ NO SPECIFICS**: Vague on actual functionality (priorities, routines, smart categorization)

### Improved Support Agent Requirements:

✅ **Concise**: 50 words or less for simple questions  
✅ **Accurate**: Reflects actual codebase (voice, alpha limits, iOS available NOW)  
✅ **Current**: Alpha status, $2/month limit, 1000 message limit  
✅ **Decisive**: End with email link when can't solve  
✅ **Friendly**: Warm but professional tone  
✅ **Smart Escalation**: Billing, technical, bugs → immediate escalate  

---

## Recommended Changes

See SUPPORT_AGENT_IMPROVED_INSTRUCTIONS.md for updated prompt.
