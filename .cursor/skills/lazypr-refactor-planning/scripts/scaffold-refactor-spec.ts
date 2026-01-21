import { mkdir } from "node:fs/promises";
import path from "node:path";

type ParsedArgs = {
  title: string;
  slug?: string;
  outDir: string;
  force: boolean;
};

function slugify(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replaceAll(/['"]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug.length > 0 ? slug : "refactor-spec";
}

function getArgValue(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

function parseArgs(argv: string[]): ParsedArgs {
  const title = getArgValue(argv, "--title") ?? getArgValue(argv, "-t");
  const slug = getArgValue(argv, "--slug") ?? getArgValue(argv, "-s");
  const outDir = getArgValue(argv, "--outDir") ?? "docs/refactor-specs";
  const force = hasFlag(argv, "--force");

  if (!title) {
    throw new Error(
      [
        "Missing required --title.",
        "",
        "Usage:",
        '  bun ".cursor/skills/lazypr-refactor-planning/scripts/scaffold-refactor-spec.ts" --title "My refactor title"',
        "",
        "Options:",
        "  --slug <kebab-case>   Override output filename slug",
        "  --outDir <dir>        Output directory (default: docs/refactor-specs)",
        "  --force               Overwrite existing file",
      ].join("\n"),
    );
  }

  return { title, slug, outDir, force };
}

function buildTemplate(title: string): string {
  const today = new Date().toISOString().slice(0, 10);

  return [
    `# Refactor: ${title}`,
    "",
    `> Created: ${today}`,
    "",
    "## 🚨 Current issues",
    "- ...",
    "",
    "## 🎯 Requirements",
    "- ...",
    "",
    "## 🧭 Proposed approach",
    "- ...",
    "",
    "## 🔁 Step-by-step plan",
    "1. ...",
    "",
    "## ⚠️ Risks & mitigations",
    "- ...",
    "",
    "## ✅ Test plan",
    "- `bun run build`",
    "- `bun run test`",
    "- `bun run lint`",
    "",
    "## 🚀 Rollout / migration notes",
    "- ...",
    "",
    "## ✅ Done criteria",
    "- ...",
    "",
    "## ❓ Open questions",
    "- ...",
    "",
  ].join("\n");
}

async function fileExists(filePath: string): Promise<boolean> {
  return await Bun.file(filePath).exists();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const slug = args.slug ?? slugify(args.title);
  const outFile = path.join(args.outDir, `${slug}.md`);

  await mkdir(args.outDir, { recursive: true });

  const exists = await fileExists(outFile);
  if (exists && !args.force) {
    throw new Error(
      [
        `Refactor spec already exists: ${outFile}`,
        "Re-run with --force to overwrite, or pass a different --slug.",
      ].join("\n"),
    );
  }

  await Bun.write(outFile, buildTemplate(args.title));
  // biome-ignore lint/suspicious/noConsole: Script UX output
  console.log(`Created refactor spec: ${outFile}`);
}

await main();

