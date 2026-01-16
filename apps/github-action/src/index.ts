import { getGitDiff, getPRMetadata, GhostCommitDetector } from "@lazypr/core";
import { createOpenAIProvider } from "@lazypr/ai-engine";
import { getTemplate } from "@lazypr/config-presets";

async function main() {
  console.log("lazypr GitHub Action");
}

main().catch(console.error);
