import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  analyzeFailureAndReport,
  deployAgentCode,
  executePlaywright,
} from './core-io.js';
import { getQaAgent } from './system-prompt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const runAgenticQA = async (taskFileName: string) => {
  const agent = getQaAgent();

  const taskPath = path.join(
    __dirname,
    '..',
    'docs',
    'qa-tasks',
    `${taskFileName}.md`,
  );

  if (!fs.existsSync(taskPath)) {
    console.error(`[System Error] QA Task not found at: ${taskPath}`);
    process.exit(1);
  }

  const taskContent = fs.readFileSync(taskPath, 'utf-8');

  console.log(`[System Audit] ⚙️ Ingesting QA Task: ${taskFileName}`);

  // The Integrity Protocol: Enforcing the Quarantine Tag in the prompt
  const prompt = `Translate this QA Task into a robust Playwright TypeScript test.
  1. Use test.step() for every action.
  2. Include the tag "@quarantine" in the test title.
  3. Wrap the test body in test.fixme() if it describes a known failing state.
  4. Use 'import type { Page }' for type-only imports to satisfy verbatimModuleSyntax.
  Output ONLY valid TypeScript code. \n\n ${taskContent}`;

  const result = await agent.generateContent(prompt);
  const aiGeneratedCode = result.response.text();

  // The Physical Shift: Routing to the Quarantine Silo
  const testPath = deployAgentCode(aiGeneratedCode, taskFileName);
  const execution = executePlaywright(testPath);

  if (execution.status === 'failure') {
    const screenshotDir = path.join(__dirname, '..', 'test-results');

    let foundScreenshot = '';
    if (fs.existsSync(screenshotDir)) {
      const files = fs.readdirSync(screenshotDir, {
        recursive: true,
      }) as string[];
      const pngFiles = files.filter((f) => f.endsWith('.png'));
      if (pngFiles.length > 0) {
        foundScreenshot = path.join(screenshotDir, pngFiles[0]);
      }
    }

    if (foundScreenshot) {
      await analyzeFailureAndReport(
        agent,
        taskFileName,
        execution.log as string,
        foundScreenshot,
      );
    } else {
      console.log(
        `[System Error] Screenshot not found in ${screenshotDir}. Proceeding with text-only log.`,
      );
    }
  } else {
    // The Quarantine Logic: Even successful runs stay quarantined for human verification
    console.log(
      `[Verification] ✅ Task executed successfully in quarantine. Run 'npm run test:quarantine' to review.`,
    );
  }
};

const targetTask = process.argv[2];
if (!targetTask) {
  console.error(
    'Please provide a QA task filename. Example: npm run agent:qa login-flow',
  );
  process.exit(1);
}

runAgenticQA(targetTask);
