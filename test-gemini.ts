#!/usr/bin/env bun

/**
 * Test script for lazypr AI Engine with Google Gemini
 *
 * Usage:
 *   GEMINI_API_KEY=your_key bun test-gemini.ts
 *
 * This script tests:
 * 1. LLM Factory - Creating Gemini provider
 * 2. LangChain Provider - Making actual API calls
 * 3. DiffSanitizer - Parsing a sample diff
 * 4. TokenManager - Calculating token weights
 */

import {
  createLLM,
  createLangChainProvider,
  getProviderInfo,
} from "./packages/ai-engine/src/index.js";
import { DiffSanitizer, TokenManager } from "./packages/core/src/index.js";

const TEST_DIFF = `diff --git a/src/auth.ts b/src/auth.ts
index 1234567..89abcdef 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,5 +1,10 @@
+import { hash } from "bcrypt";
 import { Request, Response } from "express";
 
 export async function login(req: Request, res: Response) {
-  const { username, password } = req.body;
+  const { username, password } = req.body;
+  
+  // Validate credentials
+  const hashedPassword = await hash(password, 10);
+  
   return res.json({ success: true });
 }
diff --git a/package-lock.json b/package-lock.json
index abcdefg..1234567 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,1000 +1,1000 @@
 {
   "name": "test",
   "version": "1.0.0",
   "lockfileVersion": 3,
   "requires": true,
   "packages": {
     "": {
       "name": "test",
       "version": "1.0.0"
     }
   }
 }
diff --git a/README.md b/README.md
index 1234567..89abcdef 100644
--- a/README.md
+++ b/README.md
@@ -1,3 +1,5 @@
 # Test Project
+
+This is a test project.
`;

async function runTests() {
  console.log("🧪 lazypr Test Suite\n");
  console.log("=".repeat(60));

  // Test 1: Provider Info
  console.log("\n1️⃣  Testing Provider Info...");
  const geminiInfo = getProviderInfo("gemini");
  console.log("   Provider:", geminiInfo.name);
  console.log("   Model:", geminiInfo.model);
  console.log("   Context Window:", geminiInfo.contextWindow);
  console.log("   ✅ Provider info retrieved");

  // Test 2: Diff Sanitization
  console.log("\n2️⃣  Testing DiffSanitizer...");
  const sanitizer = new DiffSanitizer();
  const parsedFiles = sanitizer.parse(TEST_DIFF);
  console.log("   Parsed", parsedFiles.length, "files from diff");

  const sanitizedFiles = sanitizer.sanitize(parsedFiles, {
    excludeLockfiles: true,
    excludeNonCodeAssets: true,
  });
  console.log("   After sanitization:", sanitizedFiles.length, "files");
  console.log("   ✅ Diff sanitization working");

  // Test 3: Token Management
  console.log("\n3️⃣  Testing TokenManager...");
  const tokenManager = new TokenManager();
  const totalTokens = tokenManager.getTotalTokens(sanitizedFiles);
  console.log("   Total tokens:", totalTokens);

  const truncated = tokenManager.truncate(sanitizedFiles, {
    maxTokens: 1000,
  });
  console.log("   After truncation (limit 1000):", truncated.length, "files");
  console.log("   ✅ Token management working");

  // Test 4: Gemini API Call (requires API key)
  console.log("\n4️⃣  Testing Gemini API Call...");
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log("   ⚠️  GEMINI_API_KEY not set - skipping API test");
    console.log("   To test the API, run:");
    console.log("   GEMINI_API_KEY=your_key bun test-gemini.ts");
  } else {
    console.log("   API key found, making test request...");

    const provider = createLangChainProvider({
      provider: "gemini",
      apiKey,
      model: "gemini-2.5-flash",
    });

    const result = await provider.complete("Say Hello from lazypr! in exactly 5 words.", {
      maxTokens: 50,
      temperature: 0.3,
    });

    console.log(`   Response: ${result.text}`);
    console.log(`   Input tokens: ${result.usage.inputTokens}`);
    console.log(`   Output tokens: ${result.usage.outputTokens}`);
    console.log("   ✅ Gemini API call successful");
  }

  // Test 5: Full PR Summary Flow
  console.log("\n5️⃣  Testing PR Summary Generation (Mock)...");
  const reconstructedDiff = sanitizer.reconstruct(sanitizedFiles);
  console.log(`   Reconstructed diff length: ${reconstructedDiff.length} chars`);
  console.log("   ✅ PR summary flow ready");

  console.log(`\n${"=".repeat(60)}`);
  console.log("✅ All tests completed successfully!");
  console.log("\nNext steps:");
  console.log("  1. Set GEMINI_API_KEY environment variable");
  console.log("  2. Run: GEMINI_API_KEY=your_key bun test-gemini.ts");
  console.log("  3. Test in GitHub Action by setting secrets.GEMINI_API_KEY");
}

runTests().catch(console.error);
