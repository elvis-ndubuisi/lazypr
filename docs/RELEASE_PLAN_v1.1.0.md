# LazyPR v1.1.0 Marketplace Release Plan

## Executive Summary

Publishing **Batch 1** features to GitHub Marketplace requires synchronizing the root `action.yml` with all new features and creating a proper release.

---

## 🎯 Release Overview

**Version:** v1.1.0  
**Scope:** Batch 1 Features (Issues #4-#7)  
**Release Date:** [Today]  
**Status:** 🔧 In Progress

### Features Included
- ✅ Issue #4: JIRA/Ticket Detection
- ✅ Issue #5: PR Title Enhancement  
- ✅ Issue #6: Custom Placeholders
- ✅ Issue #7: PR Size Detection

---

## 📋 Phase 1: Sync Action Configuration

### 1.1 Current State

**Problem Identified:**
- Root `/action.yml` is OUTDATED
- `/apps/github-action/action.yml` has correct config
- Missing all Batch 1 features in marketplace-facing file

### 1.2 Required Changes

#### Add These Inputs to `/action.yml`:

```yaml
ticket_pattern:
  description: "Custom regex pattern for ticket ID detection (e.g., 'PROJ-[0-9]+')"
  required: false
  default: ""

ticket_url_template:
  description: "URL template for ticket links (use {{id}} placeholder)"
  required: false
  default: ""

auto_update_title:
  description: "Whether to automatically update vague PR titles (true/false)"
  required: false
  default: "false"

custom_placeholders:
  description: "Custom placeholders as JSON object for template substitution"
  required: false
  default: "{}"

pr_size_warning:
  description: "Warn if PR exceeds this many lines (0 to disable). Default: 500"
  required: false
  default: "500"

pr_size_block:
  description: "Block summarization if PR exceeds this many lines (0 to disable). Default: 2000"
  required: false
  default: "2000"
```

#### Add These Outputs to `/action.yml`:

```yaml
pr_size_lines:
  description: "Total number of lines changed in the PR"

pr_size_warning_triggered:
  description: "Whether the PR size warning was triggered (true/false)"

pr_size_blocked:
  description: "Whether summarization was blocked due to PR size (true/false)"

related_tickets:
  description: "Markdown list of detected tickets (JIRA, GitHub issues, etc.)"

enhanced_title:
  description: "Updated PR title if auto_update_title was enabled and title was vague"

custom_placeholders_applied:
  description: "Number of custom placeholders that were substituted in the template"
```

---

## 🔧 Phase 2: Pre-Release Checklist

### 2.1 Code Quality
- [ ] Run `bun run build` - Verify all packages compile
- [ ] Run `bun run test` - All 216 tests passing
- [ ] Run `bun run lint` - No linting errors
- [ ] Run `bun run bundle:marketplace` - Generate fresh dist/index.js

### 2.2 File Verification
- [ ] `/action.yml` - Updated with all inputs/outputs
- [ ] `/dist/index.js` - Built and committed
- [ ] `/README.md` - Usage examples updated
- [ ] `/CHANGELOG.md` - v1.1.0 entry added

### 2.3 Git Status
- [ ] All changes committed
- [ ] Branch is `main` or `master`
- [ ] No uncommitted files in `dist/`

---

## 🚀 Phase 3: Publishing Steps

### 3.1 Create Release Tag

```bash
# Ensure on main branch
git checkout main
git pull origin main

# Create annotated tag
git tag -a v1.1.0 -m "Release v1.1.0 - Batch 1 features complete

Features:
- JIRA/Ticket Detection (Issue #4)
- PR Title Enhancement (Issue #5)
- Custom Placeholders (Issue #6)
- PR Size Detection (Issue #7)

Full changelog: https://github.com/elvis-ndubuisi/lazypr/blob/main/CHANGELOG.md"

# Push tag
git push origin v1.1.0
```

### 3.2 GitHub Release Creation

1. Navigate to: `https://github.com/elvis-ndubuisi/lazypr/releases`
2. Click "Draft a new release"
3. Select tag: `v1.1.0`
4. **CRITICAL:** Check box "Publish this Action to the GitHub Marketplace"
5. Title: `Release v1.1.0 - Batch 1 Features`
6. Description:
   ```markdown
   ## 🚀 What's New in v1.1.0

   ### ✨ New Features

   **Issue #4: JIRA/Ticket Detection**
   - Auto-detects tickets from PR titles, commits, and descriptions
   - Supports JIRA (PROJ-123), GitHub issues (#123), and custom patterns
   - Configurable URL templates for ticket links

   **Issue #5: PR Title Enhancement**
   - Analyzes vague titles like "fix bug" or "update stuff"
   - Suggests descriptive alternatives based on diff analysis
   - Optional auto-update feature

   **Issue #6: Custom Placeholders**
   - Define your own template variables (e.g., `{{securityReview}}`)
   - Pass values via JSON in workflow config
   - Support for team-specific workflows

   **Issue #7: PR Size Detection**
   - Warns on oversized PRs (configurable threshold, default: 500 lines)
   - Optional blocking for massive PRs (default: 2000 lines)
   - Size metrics available as template placeholders

   ### 📝 Usage

   ```yaml
   - uses: elvis-ndubuisi/lazypr@v1.1.0
     with:
       api_key: ${{ secrets.GEMINI_API_KEY }}
       ticket_pattern: "PROJ-[0-9]+"
       auto_update_title: "true"
       pr_size_warning: "500"
   ```

   See [README.md](https://github.com/elvis-ndubuisi/lazypr/blob/main/README.md) for full documentation.
   ```

7. Click "Publish Release"

### 3.3 Marketplace Validation

GitHub will automatically:
- ✅ Validate `action.yml` syntax
- ✅ Check required fields (name, description, runs)
- ✅ Verify `dist/index.js` exists
- ✅ Test action inputs/outputs format

**If validation fails:** Check error messages and fix:
- Missing required fields
- Invalid YAML syntax
- Missing `dist/index.js`

### 3.4 Update Major Version Tag (Optional but Recommended)

```bash
# Update v1 tag to point to v1.1.0
git tag -fa v1 -m "Update v1 tag to v1.1.0"
git push origin v1 --force
```

This allows users to use `@v1` and automatically get minor updates.

---

## 🔄 Phase 4: Post-Release Verification

### 4.1 Immediate Checks
- [ ] Release appears on GitHub releases page
- [ ] Action appears in GitHub Marketplace
- [ ] Marketplace listing shows correct description
- [ ] Inputs/outputs match documentation

### 4.2 Test Installation

Create a test workflow in a separate repo:

```yaml
name: Test LazyPR v1.1.0
on: pull_request

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: elvis-ndubuisi/lazypr@v1.1.0
        with:
          api_key: ${{ secrets.GEMINI_API_KEY }}
          ticket_pattern: "TEST-[0-9]+"
          auto_update_title: "true"
          pr_size_warning: "100"
```

### 4.3 Announcement

- [ ] Post on Twitter/X (Day 4 of 4 series)
- [ ] Post on LinkedIn
- [ ] Update repository README with new features
- [ ] Close Issues #4, #5, #6, #7 with release notes link

---

## 🐛 Troubleshooting

### Common Issues

**Issue: "action.yml validation failed"**
- Fix: Check YAML syntax with `yamllint action.yml`
- Ensure no tabs, only spaces

**Issue: "dist/index.js not found"**
- Fix: Run `bun run bundle:marketplace` and commit

**Issue: "Marketplace checkbox disabled"**
- Fix: Repository must be public and you must be owner/collaborator

**Issue: "Previous release is draft"**
- Fix: Publish or delete any draft releases first

---

## 📊 Success Metrics

- ✅ Action published to marketplace
- ✅ v1.1.0 tag created and pushed
- ✅ All 4 features working in production
- ✅ Documentation updated
- ✅ Issues closed

---

**Plan Created:** 2026-02-09  
**Planned Release:** v1.1.0  
**Status:** Ready for execution
