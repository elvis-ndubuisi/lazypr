export interface PRMetadata {
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  body: string;
  author: string;
}

export async function getGitDiff(
  _owner: string,
  _repo: string,
  _baseSha: string,
  _headSha: string,
): Promise<string> {
  return "";
}

export async function getPRMetadata(
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<PRMetadata> {
  return { owner, repo, pullNumber, title: "", body: "", author: "" };
}

export class GhostCommitDetector {
  async detect(
    _diff: string,
    _commits: Array<{ sha: string; message: string }>,
  ): Promise<Array<{ sha: string; message: string; detected: boolean }>> {
    return [];
  }
}
