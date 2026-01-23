# Support Agent Testing Guide
**Post-Deployment UAT**

---

## What Was Updated

### 1. **Support Instructions** (Complete Rewrite)
- ✅ Added NO MARKDOWN rules (explicit)
- ✅ Updated to reflect actual app state (iOS available NOW, alpha status)
- ✅ Concise response guidelines (50-100 words max)
- ✅ Accurate feature descriptions from codebase
- ✅ Clear escalation rules
- ✅ Removed outdated info

### 2. **Markdown Stripping Function** (NEW)
Added `stripMarkdown()` function that removes:
- Headers (##, ###)
- Bold (**text**)
- Italics (*text*)
- Bullet points (-, *, •)
- Numbered lists
- Code blocks
- Links

This runs on EVERY response as a safety net.

### 3. **100-Scenario Test Plan** (Created)
- 20 Basic Features
- 15 Pricing & Plans
- 20 Troubleshooting
- 15 Advanced Usage
- 15 Edge Cases
- 10 Feedback & Feature Requests
- 5 Confusion & Unclear Questions

---

## Testing After Deployment

### Quick Test (5 minutes)

Test these 10 critical scenarios in the deployed app:

1. **"What is HelpEm?"** → Should be concise (30-50 words), no markdown
2. **"How do I add a todo?"** → Should mention voice AND text, examples
3. **"Does it work on iPhone?"** → Should say YES (available NOW via TestFlight)
4. **"How much does it cost?"** → Should mention alpha is FREE, future pricing
5. **"Can I cancel anytime?"** → Should ESCALATE to support@helpem.ai
6. **"Voice input isn't working"** → Should give troubleshooting steps
7. **"My tasks disappeared"** → Should ESCALATE immediately
8. **"Can I add tasks via API?"** → Should mention Premium plan
9. **"I want to speak with a human"** → Should ESCALATE with email
10. **"???"** → Should handle gracefully, offer help

### What to Check

For EACH response, verify:
- [ ] **No markdown** (no ##, **, *, -, etc)
- [ ] **Concise** (ideally under 75 words)
- [ ] **Accurate** (reflects actual app capabilities)
- [ ] **Friendly** (warm, professional tone)
- [ ] **Escalates correctly** (billing → email immediately)

---

## Full 100-Scenario Test

Use `SUPPORT_AGENT_QA_100.md` for comprehensive testing.

### How to Run

**Option 1: Manual Testing**
1. Open deployed app: Menu → Get Support
2. Ask each question from QA document
3. Score each response: ✅ Pass | ⚠️ Needs Improvement | ❌ Fail
4. Document failures

**Option 2: Automated Testing** (Recommended)
```bash
# Test against deployed API
curl -X POST https://helpem.ai/api/support \
  -H "Content-Type: application/json" \
  -d '{"message": "What is HelpEm?", "conversationHistory": []}'
```

Create script to test all 100 scenarios and log results.

---

## Expected Improvements

### Before (Old Agent Issues)
❌ Verbose responses (150+ words)
❌ Markdown formatting (##, **, -, etc)
❌ Outdated info ("iOS coming soon" - but it's available!)
❌ Vague escalations
❌ Missing alpha status info

### After (New Agent)
✅ Concise (50-75 words average)
✅ Plain text only (markdown stripped)
✅ Accurate (iOS available, alpha status, $2/month limit)
✅ Clear escalations ("Email support@helpem.ai")
✅ Voice features mentioned

---

## Key Changes to Validate

1. **iOS Availability**: Should say "Available NOW" not "coming soon"
2. **Alpha Status**: Should mention $2/month, ~1000 messages, TestFlight
3. **Voice Features**: Should mention microphone icon, Chrome/Safari/Edge
4. **Menu Features**: Should mention Get Support, Give Feedback, View Usage, Clear All Data
5. **Escalation**: Should use exact phrase: "I'd love to help with that! Please email support@helpem.ai and our team will assist you directly."

---

## Scoring Rubric

### Excellent (✅)
- Under 75 words
- No markdown
- 100% accurate
- Friendly tone
- Clear escalation when needed

### Good (⚠️ Minor issues)
- 75-100 words
- Minimal markdown (1-2 instances)
- Mostly accurate (minor omissions)
- Professional tone
- Escalates but could be clearer

### Needs Work (❌)
- Over 100 words
- Heavy markdown usage
- Inaccurate information
- Too formal/robotic
- No escalation when needed

---

## Common Failure Patterns to Watch

1. **Still using markdown** → Check if stripMarkdown() is working
2. **Too verbose** → May need to strengthen conciseness rules
3. **Wrong info** → Update instructions with correct details
4. **Not escalating** → Add more escalation triggers
5. **Too formal** → Adjust tone guidelines

---

## Iteration Process

1. **Deploy** new support agent to production
2. **Test** 10 quick scenarios
3. **If issues** → Update instructions, redeploy
4. **Test** full 100 scenarios
5. **Document** failure patterns
6. **Iterate** on instructions
7. **Redeploy** and re-test
8. **Repeat** until 95%+ pass rate

---

## Success Criteria

**Ready for Alpha Users:**
- ✅ 95%+ responses have no markdown
- ✅ 90%+ responses under 100 words
- ✅ 100% accuracy on app status (iOS, alpha, pricing)
- ✅ 100% correct escalation on billing/technical issues
- ✅ Friendly, helpful tone maintained

---

## Next Steps

1. **NOW**: Commit and deploy these changes
2. **After Deploy**: Run 10-question quick test
3. **Iterate**: Fix any issues found
4. **Full Test**: Run all 100 scenarios
5. **Monitor**: Check real user conversations for issues
6. **Improve**: Update instructions based on real usage

---

## Notes

- Test in BOTH web app and iOS app
- Test with various conversation histories (not just first question)
- Test edge cases (typos, gibberish, long questions)
- Monitor API logs for errors
- Check rate limiting works (20 requests / 15 min)

**Remember**: This is iterative. First deployment won't be perfect. Monitor, learn, improve!
