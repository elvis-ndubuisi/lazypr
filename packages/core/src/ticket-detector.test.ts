import { describe, expect, test } from "bun:test";
import {
  type TicketMatch,
  detectTickets,
  detectTicketsFromSources,
  formatTicketsMarkdown,
} from "./ticket-detector.js";

describe("detectTickets", () => {
  test("should detect JIRA tickets", () => {
    const text = "Fixes PROJ-123 and PROJECT-456";
    const tickets = detectTickets(text);

    expect(tickets.length).toBe(2);
    const first = tickets[0];
    const second = tickets[1];
    expect(first?.id).toBe("PROJ-123");
    expect(first?.type).toBe("jira");
    expect(second?.id).toBe("PROJECT-456");
    expect(second?.type).toBe("jira");
  });

  test("should detect GitHub issue references", () => {
    const text = "This addresses #123 and #45678";
    const tickets = detectTickets(text);

    expect(tickets.length).toBe(2);
    const first = tickets[0];
    const second = tickets[1];
    expect(first?.id).toBe("#123");
    expect(first?.type).toBe("github");
    expect(second?.id).toBe("#45678");
    expect(second?.type).toBe("github");
  });

  test("should detect both JIRA and GitHub tickets", () => {
    const text = "Fixes PROJ-123 and addresses #456";
    const tickets = detectTickets(text);

    expect(tickets.length).toBe(2);
    const first = tickets[0];
    const second = tickets[1];
    expect(first?.id).toBe("PROJ-123");
    expect(first?.type).toBe("jira");
    expect(second?.id).toBe("#456");
    expect(second?.type).toBe("github");
  });

  test("should use custom URL template for JIRA", () => {
    const text = "Fixes PROJ-123";
    const tickets = detectTickets(text, {
      urlTemplate: "https://mycompany.atlassian.net/browse/{{id}}",
    });

    expect(tickets.length).toBe(1);
    const first = tickets[0];
    expect(first?.url).toBe("https://mycompany.atlassian.net/browse/PROJ-123");
  });

  test("should use custom pattern when provided", () => {
    const text = "Ticket: TICK-999 and BUG-123";
    const tickets = detectTickets(text, {
      pattern: "(TICK-\\d+)",
    });

    expect(tickets.length).toBe(1);
    const first = tickets[0];
    expect(first?.id).toBe("TICK-999");
    expect(first?.type).toBe("custom");
  });

  test("should not duplicate tickets", () => {
    const text = "Fixes PROJ-123 and also PROJ-123";
    const tickets = detectTickets(text);

    expect(tickets.length).toBe(1);
    const first = tickets[0];
    expect(first?.id).toBe("PROJ-123");
  });

  test("should handle empty text", () => {
    const tickets = detectTickets("");

    expect(tickets.length).toBe(0);
  });

  test("should handle text without tickets", () => {
    const text = "This is just a regular commit message without any ticket IDs";
    const tickets = detectTickets(text);

    expect(tickets.length).toBe(0);
  });
});

describe("detectTicketsFromSources", () => {
  test("should detect tickets from multiple sources", () => {
    const sources = {
      title: "Fix PROJ-123",
      body: "This addresses #456",
      commits: ["PROJ-789: Update documentation"],
    };

    const tickets = detectTicketsFromSources(sources);

    expect(tickets.length).toBe(3);
    const ids = tickets.map((t) => t.id);
    expect(ids).toContain("PROJ-123");
    expect(ids).toContain("#456");
    expect(ids).toContain("PROJ-789");
  });

  test("should deduplicate tickets across sources", () => {
    const sources = {
      title: "Fix PROJ-123",
      body: "This is related to PROJ-123",
      commits: ["PROJ-123: Same ticket in commits"],
    };

    const tickets = detectTicketsFromSources(sources);

    expect(tickets.length).toBe(1);
    const first = tickets[0];
    expect(first?.id).toBe("PROJ-123");
  });

  test("should handle missing sources gracefully", () => {
    const sources = {
      title: "Fix PROJ-123",
    };

    const tickets = detectTicketsFromSources(sources);

    expect(tickets.length).toBe(1);
    const first = tickets[0];
    expect(first?.id).toBe("PROJ-123");
  });
});

describe("formatTicketsMarkdown", () => {
  test("should format tickets as markdown list", () => {
    const tickets: TicketMatch[] = [
      { type: "jira", id: "PROJ-123", url: "https://jira.example.com/browse/PROJ-123" },
      { type: "github", id: "#456", url: "https://github.com/owner/repo/issues/456" },
    ];

    const markdown = formatTicketsMarkdown(tickets);

    expect(markdown).toContain("- [PROJ-123](https://jira.example.com/browse/PROJ-123) (Jira)");
    expect(markdown).toContain("- [#456](https://github.com/owner/repo/issues/456) (Github)");
  });

  test("should handle empty ticket list", () => {
    const markdown = formatTicketsMarkdown([]);

    expect(markdown).toBe("No related tickets found.");
  });

  test("should handle single ticket", () => {
    const tickets: TicketMatch[] = [
      { type: "jira", id: "PROJ-123", url: "https://jira.example.com/browse/PROJ-123" },
    ];

    const markdown = formatTicketsMarkdown(tickets);

    expect(markdown).toBe("- [PROJ-123](https://jira.example.com/browse/PROJ-123) (Jira)");
  });
});
