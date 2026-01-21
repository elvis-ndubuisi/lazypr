import type * as github from "@actions/github";

/**
 * Shared Octokit type across this action.
 *
 * We use `@actions/github`'s bundled Octokit to avoid adding additional Octokit
 * dependencies and to match the GitHub Actions runtime environment.
 */
export type OctokitClient = ReturnType<typeof github.getOctokit>;
