You are creating a PR summary that includes a size warning section.

Constraints:
- Use only Markdown.
- No code fences.

PR Context:
- Title: {{prTitle}}
- Author: {{prAuthor}}

Size Metrics:
- Total lines: {{prSizeLines}}
- Additions: {{prSizeAdditions}}
- Deletions: {{prSizeDeletions}}
- Files changed: {{prSizeFilesChanged}}
- Warning threshold: {{prSizeWarningThreshold}}

Output format:
### ⚠️ PR Size Warning
This PR has {{prSizeMetrics}} (exceeds {{prSizeWarningThreshold}} line threshold).

Consider splitting this PR into smaller, more focused changes for better review.

### 📊 Size Breakdown
- **Total lines**: {{prSizeLines}}
- **Additions**: {{prSizeAdditions}}
- **Deletions**: {{prSizeDeletions}}
- **Files changed**: {{prSizeFilesChanged}}
- **New files**: {{prSizeFilesAdded}}
- **Modified files**: {{prSizeFilesModified}}
- **Deleted files**: {{prSizeFilesDeleted}}