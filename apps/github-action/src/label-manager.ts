import type { Octokit } from "@octokit/rest";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface LabelOptions {
  owner: string;
  repo: string;
  pullNumber: number;
  riskLevel: RiskLevel;
}

export const RISK_LABELS = {
  HIGH: {
    name: "lazypr/high-risk",
    color: "d73a4a",
    description: "High risk PR based on impact scoring",
  },
  MEDIUM: {
    name: "lazypr/medium-risk",
    color: "fbca04",
    description: "Medium risk PR based on impact scoring",
  },
  LOW: {
    name: "lazypr/low-risk",
    color: "0e8a16",
    description: "Low risk PR based on impact scoring",
  },
};

const ALL_RISK_LABEL_NAMES = [RISK_LABELS.HIGH.name, RISK_LABELS.MEDIUM.name, RISK_LABELS.LOW.name];

export async function updateRiskLabels(octokit: Octokit, options: LabelOptions): Promise<void> {
  const { owner, repo, pullNumber, riskLevel } = options;

  const existingLabels = await getPRLabels(octokit, owner, repo, pullNumber);

  const labelsToRemove = ALL_RISK_LABEL_NAMES.filter(
    (label) => label !== RISK_LABELS[riskLevel].name,
  );

  for (const label of labelsToRemove) {
    if (existingLabels.includes(label)) {
      try {
        await octokit.issues.removeLabel({
          owner,
          repo,
          issue_number: pullNumber,
          name: label,
        });
      } catch (error) {
        const octokitError = error as { status?: number };
        if (octokitError.status !== 404) {
          console.warn(`Warning: Failed to remove label ${label}: ${error}`);
        }
      }
    }
  }

  const targetLabel = RISK_LABELS[riskLevel].name;
  if (!existingLabels.includes(targetLabel)) {
    try {
      await octokit.issues.addLabels({
        owner,
        repo,
        issue_number: pullNumber,
        labels: [targetLabel],
      });
    } catch (error) {
      console.warn(`Warning: Failed to add label ${targetLabel}: ${error}`);
    }
  }
}

async function getPRLabels(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<string[]> {
  try {
    const response = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    const labels = response.data.labels;
    if (Array.isArray(labels)) {
      return labels.map((label) => (typeof label === "string" ? label : (label.name ?? "")));
    }
    return [];
  } catch (error) {
    console.warn(`Warning: Failed to get PR labels: ${error}`);
    return [];
  }
}

export async function ensureLabelsExist(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<void> {
  for (const [level, labelConfig] of Object.entries(RISK_LABELS)) {
    try {
      await octokit.request("GET /repos/{owner}/{repo}/labels/{name}", {
        owner,
        repo,
        name: labelConfig.name,
      });
    } catch (error) {
      const octokitError = error as { status?: number };
      if (octokitError.status === 404) {
        try {
          await octokit.issues.createLabel({
            owner,
            repo,
            name: labelConfig.name,
            color: labelConfig.color,
            description: labelConfig.description,
          });
        } catch (createError) {
          console.warn(`Warning: Failed to create label ${labelConfig.name}: ${createError}`);
        }
      }
    }
  }
}

export function getRiskLabelEmoji(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case "HIGH":
      return "🔴";
    case "MEDIUM":
      return "🟡";
    case "LOW":
      return "🟢";
    default:
      return "⚪";
  }
}

export function getRiskLabelName(riskLevel: RiskLevel): string {
  return RISK_LABELS[riskLevel]?.name ?? "lazypr/unknown-risk";
}
