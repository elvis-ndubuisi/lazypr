# Testing lazypr with Google Gemini API Key

This guide walks you through testing the lazypr GitHub Action using your own Google AI Studio API key.

## Prerequisites

1. **Google AI Studio API Key** - Get one at https://aistudio.google.com/
2. **GitHub Repository** - A repo with pull requests to test
3. **GitHub Personal Access Token** - With repo and workflow permissions

## Step 1: Get Your Google AI Studio API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **"Create API Key"** (or go to Settings > API Keys)
4. Copy your API key and save it securely

⚠️ **Important:** Never commit this key to version control!

## Step 2: Add API Key to GitHub Repository

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **"New repository secret"**
4. Add the following secrets:

| Secret Name | Value |
|-------------|-------|
| `GEMINI_API_KEY` | Your Google AI Studio API key |
| `GITHUB_TOKEN` | (Auto-provided by GitHub Actions) |

### To add `GEMINI_API_KEY`:
```
Name: GEMINI_API_KEY
Secret: YOUR_API_KEY_HERE
```

## Step 3: Create a Test Workflow

Create `.github/workflows/lazypr-test.yml`:

```yaml
name: Test lazypr with Gemini

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  lazypr-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run lazypr with Gemini
        uses: elvis-ndubuisi/lazypr@v1
        with:
          api_key: ${{ secrets.GEMINI_API_KEY }}
          provider: gemini
          template: default
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## Step 4: Trigger a Test Pull Request

1. Create a new branch with a small change:
   ```bash
   git checkout -b test-lazypr
   echo "# Test Change" >> TEST.md
   git add TEST.md
   git commit -m "Test lazypr with Gemini"
   git push origin test-lazypr
   ```

2. Open a pull request against main
3. Watch the lazypr workflow run in the "Actions" tab

## Step 5: Verify the Results

After the workflow completes:

1. Check the **Actions** tab for a successful run
2. Look at your **Pull Request** - lazypr should have added a comment with:
   - PR Summary
   - Risk Level (LOW/MEDIUM/HIGH)
   - Impact Score
   - Reviewer Checklist

### Expected Output Example

```markdown
### TL;DR
Added a test file for lazypr Gemini integration verification.

### Key Changes
- Added TEST.md with initial test content
- Single file change to validate workflow execution

### Security Analysis
- No auth, secrets, or permission changes detected
- Low-risk test file modification
- No database or API changes

### Reviewer Checklist
- [x] Test file added successfully
- [x] No production code changes
```

## Troubleshooting

### ❌ "Error generating PR summary: API key not found"

**Cause:** `GEMINI_API_KEY` secret is missing or incorrect

**Fix:**
1. Go to Settings > Secrets and variables > Actions
2. Verify `GEMINI_API_KEY` exists and is correct
3. Re-run the workflow

### ❌ "models/gemini-2.5-flash is not found"

**Cause:** API key doesn't have access to Gemini 2.5 Flash

**Fix:**
1. Try a different model in your workflow:
   ```yaml
   model: gemini-1.5-pro
   ```
2. Or ensure your API key has access to the model in Google AI Studio

### ❌ "This action must be run on a pull request event"

**Cause:** Workflow triggered outside a PR context

**Fix:**
1. Ensure the workflow only runs on `pull_request` events
2. Create/update a PR to trigger the action

### ❌ Workflow times out

**Cause:** Large diff or slow API response

**Fix:**
1. Try with a smaller PR (fewer files changed)
2. Use the `concise` template:
   ```yaml
   template: concise
   ```

## Advanced Testing

### Test with Custom Template

Create `.github/lazypr-custom-template.md`:

```markdown
You are a tech lead reviewing this PR.

### Summary
Provide a 1-sentence summary:

### Changes
List the files changed:

### Review Notes
What should reviewers pay attention to?
```

Use it in your workflow:

```yaml
- uses: elvis-ndubuisi/lazypr@v1
  with:
    api_key: ${{ secrets.GEMINI_API_KEY }}
    provider: gemini
    custom_template: true
    template: default
```

### Test Multiple Providers

Compare outputs from different providers:

```yaml
jobs:
  test-gemini:
    runs-on: ubuntu-latest
    steps:
      - uses: elvis-ndubuisi/lazypr@v1
        with:
          api_key: ${{ secrets.GEMINI_API_KEY }}
          provider: gemini
          template: default

  test-openai:
    runs-on: ubuntu-latest
    steps:
      - uses: elvis-ndubuisi/lazypr@v1
        with:
          api_key: ${{ secrets.OPENAI_API_KEY }}
          provider: openai
          template: default
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google AI Studio API key | Yes (for Gemini) |
| `OPENAI_API_KEY` | OpenAI API key | Yes (for OpenAI) |
| `ANTHROPIC_API_KEY` | Anthropic API key | Yes (for Anthropic) |
| `LLM_PROVIDER` | Override provider detection | No (defaults to gemini) |

## Local Development Testing

For faster iteration, test locally:

1. Set the API key:
   ```bash
   export GEMINI_API_KEY="your-api-key"
   ```

2. Run tests:
   ```bash
   bun run test
   ```

3. Test summarization directly:
   ```bash
   # Create a test diff file
   echo "diff --git a/test.js b/test.js" > test.diff
   
   # Run the core summarizer
   cd packages/ai-engine
   bun run test
   ```

## Rate Limits

Be aware of API rate limits:

| Provider | Rate Limit (approx) |
|----------|-------------------|
| Gemini (free tier) | 15 requests/minute |
| OpenAI (pay-as-you-go) | 3,500 requests/minute |
| Anthropic | Varies by plan |

For testing, you should be well within limits with typical PR workflows.

## Security Best Practices

1. **Never commit API keys** - Always use GitHub secrets
2. **Use least privilege** - Only grant necessary permissions to the workflow
3. **Rotate keys regularly** - Generate new keys periodically
4. **Monitor usage** - Check Google AI Studio for unusual activity

## Getting Help

- **Issues:** https://github.com/elvis-ndubuisi/lazypr/issues
- **Discussions:** https://github.com/elvis-ndubuisi/lazypr/discussions
- **GitHub Actions:** https://docs.github.com/en/actions

## Quick Reference

```yaml
# Minimal working config
name: AI PR Summary
on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  summarize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: elvis-ndubuisi/lazypr@v1
        with:
          api_key: ${{ secrets.GEMINI_API_KEY }}
          provider: gemini
```
