import * as core from "@actions/core";
import type { OctokitClient } from "./octokit-types.js";

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

export async function updateRiskLabels(
  octokit: OctokitClient,
  options: LabelOptions,
): Promise<void> {
  const { owner, repo, pullNumber, riskLevel } = options;

  const existingLabels = await getPRLabels(octokit, owner, repo, pullNumber);

  const labelsToRemove = ALL_RISK_LABEL_NAMES.filter(
    (label) => label !== RISK_LABELS[riskLevel].name,
  );

  for (const label of labelsToRemove) {
    if (existingLabels.includes(label)) {
      try {
        await octokit.rest.issues.removeLabel({
          owner,
          repo,
          issue_number: pullNumber,
          name: label,
        });
      } catch (error) {
        const octokitError = error as { status?: number };
        if (octokitError.status !== 404) {
          core.warning(`Failed to remove label ${label}: ${error}`);
        }
      }
    }
  }

  const targetLabel = RISK_LABELS[riskLevel].name;
  if (!existingLabels.includes(targetLabel)) {
    try {
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: pullNumber,
        labels: [targetLabel],
      });
    } catch (error) {
      core.warning(`Failed to add label ${targetLabel}: ${error}`);
    }
  }
}

async function getPRLabels(
  octokit: OctokitClient,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<string[]> {
  try {
    const response = await octokit.rest.pulls.get({
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
    core.warning(`Failed to get PR labels: ${error}`);
    return [];
  }
}

export async function ensureLabelsExist(
  octokit: OctokitClient,
  owner: string,
  repo: string,
): Promise<void> {
  for (const [_level, labelConfig] of Object.entries(RISK_LABELS)) {
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
          await octokit.rest.issues.createLabel({
            owner,
            repo,
            name: labelConfig.name,
            color: labelConfig.color,
            description: labelConfig.description,
          });
        } catch (createError) {
          core.warning(`Failed to create label ${labelConfig.name}: ${createError}`);
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
