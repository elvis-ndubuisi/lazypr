/**
 * Ticket ID detection utility for extracting and linking project management
 * tickets from PR titles, descriptions, and commit messages.
 */

export interface TicketMatch {
  /** Type of ticket system */
  type: "jira" | "github" | "linear" | "custom";
  /** The ticket ID (e.g., "PROJ-123") */
  id: string;
  /** Full URL to the ticket */
  url: string;
}

export interface TicketDetectionOptions {
  /** Custom regex pattern for ticket IDs */
  pattern?: string;
  /** URL template to convert IDs to links (e.g., "https://jira.example.com/browse/{{id}}") */
  urlTemplate?: string;
  /** Base URL for GitHub issues (defaults to current repo) */
  githubBaseUrl?: string;
}

/**
 * Default patterns for different ticket systems
 */
const DEFAULT_PATTERNS = {
  /** JIRA pattern: PROJECT-123 */
  jira: /\b([A-Z][A-Z0-9]+-\d+)\b/g,
  /** GitHub issue pattern: #123 */
  github: /#(\d{1,6})/g,
  /** Linear pattern: TEAM-123 or TICKET-456 */
  linear: /\b([A-Z][A-Z0-9]+-\d+)\b/g,
};

/**
 * Detect ticket IDs from text content
 *
 * @param text - The text to search (PR title, body, commit message)
 * @param options - Detection options including custom pattern and URL template
 * @returns Array of detected tickets with their types and URLs
 *
 * @example
 * ```typescript
 * const tickets = detectTickets("Fixes PROJ-123 and #456", {
 *   urlTemplate: "https://jira.example.com/browse/{{id}}"
 * });
 * // Returns: [{ type: "jira", id: "PROJ-123", url: "https://jira.example.com/browse/PROJ-123" },
 * //           { type: "github", id: "456", url: "https://github.com/owner/repo/issues/456" }]
 * ```
 */
export function detectTickets(text: string, options: TicketDetectionOptions = {}): TicketMatch[] {
  const tickets: TicketMatch[] = [];
  const seen = new Set<string>();

  // Use custom pattern if provided
  if (options.pattern && options.pattern.trim().length > 0) {
    const customRegex = new RegExp(options.pattern.trim(), "g");
    const matches = text.matchAll(customRegex);

    for (const match of matches) {
      const id = match[1] || match[0];
      if (id && !seen.has(id)) {
        seen.add(id);
        tickets.push({
          type: "custom",
          id,
          url: generateTicketUrl(id, options.urlTemplate ?? undefined),
        });
      }
    }

    return tickets;
  }

  // Check for JIRA tickets
  const jiraMatches = text.matchAll(DEFAULT_PATTERNS.jira);
  for (const match of jiraMatches) {
    const id = match[1];
    if (id && !seen.has(id)) {
      seen.add(id);
      tickets.push({
        type: "jira",
        id,
        url: generateTicketUrl(id, options.urlTemplate || "https://jira.example.com/browse/{{id}}"),
      });
    }
  }

  // Check for GitHub issues
  const githubMatches = text.matchAll(DEFAULT_PATTERNS.github);
  for (const match of githubMatches) {
    const id = match[1];
    if (id) {
      const fullId = `#${id}`;
      if (!seen.has(fullId)) {
        seen.add(fullId);
        tickets.push({
          type: "github",
          id: fullId,
          url: generateGitHubIssueUrl(id, options.githubBaseUrl),
        });
      }
    }
  }

  // Linear uses same pattern as JIRA but we can differentiate by context
  // For now, we treat them as JIRA-style

  return tickets;
}

/**
 * Detect tickets from multiple text sources (title, body, commits)
 *
 * @param sources - Object containing text from various PR sources
 * @param options - Detection options
 * @returns Array of unique detected tickets
 *
 * @example
 * ```typescript
 * const sources = {
 *   title: "Fix PROJ-123",
 *   body: "This addresses #456 and LINEAR-789",
 *   commits: ["PROJ-123: Fix authentication bug"]
 * };
 * const tickets = detectTicketsFromSources(sources);
 * ```
 */
export function detectTicketsFromSources(
  sources: {
    title?: string;
    body?: string;
    commits?: string[];
  },
  options: TicketDetectionOptions = {},
): TicketMatch[] {
  const allTickets: TicketMatch[] = [];
  const seen = new Set<string>();

  // Search title
  if (sources.title) {
    const titleTickets = detectTickets(sources.title, options);
    for (const ticket of titleTickets) {
      if (!seen.has(ticket.id)) {
        seen.add(ticket.id);
        allTickets.push(ticket);
      }
    }
  }

  // Search body
  if (sources.body) {
    const bodyTickets = detectTickets(sources.body, options);
    for (const ticket of bodyTickets) {
      if (!seen.has(ticket.id)) {
        seen.add(ticket.id);
        allTickets.push(ticket);
      }
    }
  }

  // Search commit messages
  if (sources.commits) {
    for (const commit of sources.commits) {
      const commitTickets = detectTickets(commit, options);
      for (const ticket of commitTickets) {
        if (!seen.has(ticket.id)) {
          seen.add(ticket.id);
          allTickets.push(ticket);
        }
      }
    }
  }

  return allTickets;
}

/**
 * Generate a markdown-formatted list of related tickets
 *
 * @param tickets - Array of detected tickets
 * @returns Markdown string with ticket links
 *
 * @example
 * ```typescript
 * const markdown = formatTicketsMarkdown(tickets);
 * // Returns: "- [PROJ-123](https://jira.example.com/browse/PROJ-123) (JIRA)\n- [#456](https://github.com/.../issues/456) (GitHub)"
 * ```
 */
export function formatTicketsMarkdown(tickets: TicketMatch[]): string {
  if (tickets.length === 0) {
    return "No related tickets found.";
  }

  return tickets
    .map((ticket) => {
      const typeLabel = ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1);
      return `- [${ticket.id}](${ticket.url}) (${typeLabel})`;
    })
    .join("\n");
}

/**
 * Generate a ticket URL from a template
 *
 * @param id - The ticket ID
 * @param template - URL template with {{id}} placeholder
 * @returns Formatted URL
 */
function generateTicketUrl(id: string, template?: string): string {
  if (!template) {
    return "#";
  }
  return template.replace(/\{\{id\}\}/g, id);
}

/**
 * Generate GitHub issue URL
 *
 * @param issueNumber - The issue number (without #)
 * @param baseUrl - Base URL for GitHub (defaults to current repo)
 * @returns Full GitHub issue URL
 */
function generateGitHubIssueUrl(issueNumber: string, baseUrl?: string): string {
  if (baseUrl) {
    return `${baseUrl}/issues/${issueNumber}`;
  }
  return `https://github.com/issues/${issueNumber}`;
}
