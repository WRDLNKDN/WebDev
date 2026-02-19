import { GenerativeModel } from '@google/generative-ai';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Phase 2: Deploy to the actual E2E suite
export const deployAgentCode = (aiGeneratedCode: string, testName: string) => {
  // Routes directly to: src/tests/e2e/
  const testPath = path.join(
    __dirname,
    '..',
    'src',
    'tests',
    'e2e',
    `${testName}.spec.ts`,
  );

  // The Solenoid Splice: Strip the markdown formatting
  const cleanCode = aiGeneratedCode
    .replace(/```(?:typescript|ts)?|```/g, '')
    .trim();

  fs.writeFileSync(testPath, cleanCode);
  console.log(
    `[System Audit] 🚀 Agent test physically anchored to: ${testPath}`,
  );
  return testPath;
};

// Phase 3: Asynchronous Execution
export const executePlaywright = (testPath: string) => {
  console.log(`[IRQ] Executing deterministic verification on: ${testPath}...`);

  try {
    execSync(`npx playwright test ${testPath} --reporter=list`, {
      stdio: 'pipe',
    });
    console.log('[Verification] 💎 Zero bugs detected. Archiving success.');
    return { status: 'success', log: null };
  } catch (error: unknown) {
    console.log(
      '[Verification] ⚠️ Structural failure detected. Capturing the black box.',
    );

    // Safely narrowing the unknown error to extract execSync's stdout buffer
    let errorLog = 'Unknown execution error';
    if (error instanceof Error) {
      errorLog = error.message;
      if ('stdout' in error && error.stdout) {
        errorLog = (error.stdout as Buffer).toString();
      }
    }

    return {
      status: 'failure',
      log: errorLog,
    };
  }
};

// Phase 4 & 5: Sentinel Catch & Report Generation
export const analyzeFailureAndReport = async (
  agent: GenerativeModel,
  failedTaskName: string,
  playwrightErrorLog: string,
  screenshotPath: string,
) => {
  console.log(
    '[System Audit] 🚨 Executing Sentinel Catch via Multimodal Analysis...',
  );

  const imageBuffer = fs.readFileSync(screenshotPath);
  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType: 'image/png',
    },
  };

  const bugTemplate = `
# [ISSUE TITLE - COPY THIS TO GITHUB TITLE]

- **Area:** [Application Area / Component]
- **Priority:** [High / Medium / Low]
- **Environment:** <http://localhost:5173>
- **Step:** [e.g., Step 4 of 4 – Profile]

---

## Summary

[Briefly summarize the issue. What is happening and why is it a problem?]

---

## Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

---

## Actual Behavior

- [Describe the error/failure exactly as seen in the screenshot/logs]
- [Reference any error banners or console logs]

---

## Expected Behavior

- [Describe the target experience]
- [Identify the intended success state or routing]

---

## Impact

- [Describe how this blocks the Human OS or system flow]
- [Severity Classification]

---

## Acceptance Criteria

1. [Criteria 1]
2. [Criteria 2]
3. Verified on desktop and mobile.

---

## Notes

[Any additional technical constraints or "Negative Space" findings.]
`;

  const prompt = `
  You are a Principal QA Automation Architect. A Playwright UI test has failed.

  Error Log:
  ${playwrightErrorLog}

  Visual Evidence:
  Analyze the provided screenshot. Identify any overlays, loading states, or rendering glitches (Negative Space Debugging).

  Task:
  Generate a bug report strictly using the exact Markdown template provided below.
  Inject the visual findings into the "Summary" and "Problem" sections.

  Template:
  ${bugTemplate}
  `;

  const result = await agent.generateContent([prompt, imagePart]);
  const finalReport = result.response.text();

  const reportsDir = path.join(__dirname, '..', 'docs', 'bug-reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const reportPath = path.join(reportsDir, `${failedTaskName}-bug.md`);

  // MD034 Fix: Angle brackets around paths/URLs
  // MD047 Fix: Appending a final newline \\n
  const physicalArtifacts = `\n\n**Evidence Files:**\n- **Screenshot:** <${screenshotPath}>\n- **Trace File:** <./test-results/> *(Check recent sub-folders for trace.zip)*\n`;

  fs.writeFileSync(reportPath, finalReport + physicalArtifacts);

  console.log(
    `[Verification] 📝 April-Approved Bug Report compiled at: ${reportPath}`,
  );
};
