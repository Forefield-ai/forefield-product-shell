import { chromium, expect } from '@playwright/test';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:5173';
const TOPIC_INTENT = 'Teams want better ways to monitor privacy complaints across public forums.';
const HOME_HEADING = 'Start a new Topic from natural language';
const WORKSPACE_SURFACE_LABEL = 'Topic Workspace Preview';
const DRAFT_CONFIRMATION_HEADING = 'Review and edit your local Topic Draft';
const REACHABILITY_TIMEOUT_MS = 5000;
const STEP_TIMEOUT_MS = 15000;

async function ensureBaseUrlReachable(baseUrl) {
  try {
    const response = await fetch(baseUrl, {
      signal: AbortSignal.timeout(REACHABILITY_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`received HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Local dev server is not reachable at ${baseUrl}. Start it in another terminal and retry:\n`
      + '1. npm run dev\n'
      + '2. npm run smoke:browser\n'
      + `\nReachability check failed: ${error.message}`
    );
  }
}

async function launchSmokeBrowser() {
  const launchAttempts = [
    { label: 'bundled Chromium', options: { headless: true } },
    { label: 'Microsoft Edge channel', options: { channel: 'msedge', headless: true } },
    { label: 'Google Chrome channel', options: { channel: 'chrome', headless: true } },
  ];
  const errors = [];

  for (const attempt of launchAttempts) {
    try {
      const browser = await chromium.launch(attempt.options);
      return browser;
    } catch (error) {
      errors.push(`${attempt.label}: ${error.message}`);
    }
  }

  throw new Error(
    'Unable to launch a browser for local smoke testing.\n'
    + 'Tried bundled Chromium, Microsoft Edge, and Google Chrome.\n'
    + 'If you have not installed Playwright browsers yet, run:\n'
    + 'npx playwright install chromium\n\n'
    + errors.join('\n')
  );
}

function createScenarioErrorTracker(page) {
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('favicon.ico')) {
      consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error?.stack || error?.message || String(error));
  });

  return {
    assertClean(label) {
      if (!consoleErrors.length && !pageErrors.length) {
        return;
      }

      throw new Error(
        `${label} produced browser errors.\n`
        + `console.error:\n${consoleErrors.join('\n') || '(none)'}\n\n`
        + `pageerror:\n${pageErrors.join('\n') || '(none)'}`
      );
    },
  };
}

async function gotoHome(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: HOME_HEADING })).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });
}

async function selectLocalScenario(page, fixtureKey, baselineScenarioKey = 'default') {
  await page.selectOption('#fixture-selector', fixtureKey);
  await page.selectOption('#baseline-scenario-selector', baselineScenarioKey);
}

async function startTopicFlow(page) {
  await page.getByLabel('Topic intent').fill(TOPIC_INTENT);
  await page.getByRole('button', { name: 'Create Topic Draft' }).click();
  await expect(page.getByRole('heading', { name: DRAFT_CONFIRMATION_HEADING })).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });
  await page.getByRole('button', { name: 'Confirm Topic & Start Initial Review' }).click();
}

async function expectWorkspace(page) {
  await expect(page.getByText(WORKSPACE_SURFACE_LABEL).first()).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });
}

async function runScenario(browser, label, fn) {
  const context = await browser.newContext();
  await context.route('**/favicon.ico', async (route) => {
    await route.fulfill({
      status: 204,
      body: '',
    });
  });
  const page = await context.newPage();
  const tracker = createScenarioErrorTracker(page);

  try {
    await gotoHome(page);
    await fn(page);
    await page.waitForTimeout(150);
    tracker.assertClean(label);
    console.log(`PASS ${label}`);
  } finally {
    await context.close();
  }
}

async function assertClusterVisible(page) {
  await expect(page.locator('.cluster-card').first()).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });
}

async function main() {
  await ensureBaseUrlReachable(BASE_URL);
  const browser = await launchSmokeBrowser();

  try {
    await runScenario(browser, 'rich + standard baseline -> Workspace', async (page) => {
      await selectLocalScenario(page, 'rich', 'default');
      await startTopicFlow(page);
      await expectWorkspace(page);
    });

    await runScenario(browser, 'empty + standard baseline -> EmptySparseState', async (page) => {
      await selectLocalScenario(page, 'empty', 'default');
      await startTopicFlow(page);
      await expectWorkspace(page);
      await expect(page.getByText('Empty Workspace')).toBeVisible({ timeout: STEP_TIMEOUT_MS });
      await expect(page.locator('.cluster-card')).toHaveCount(0);
    });

    await runScenario(browser, 'sparse + standard baseline -> limited notice + cluster', async (page) => {
      await selectLocalScenario(page, 'sparse', 'default');
      await startTopicFlow(page);
      await expectWorkspace(page);
      await expect(page.locator('.empty-state__eyebrow').filter({ hasText: 'Limited Coverage' })).toBeVisible({
        timeout: STEP_TIMEOUT_MS,
      });
      await assertClusterVisible(page);
    });

    await runScenario(browser, 'no_evidence + standard baseline -> Evidence unavailable', async (page) => {
      await selectLocalScenario(page, 'no_evidence', 'default');
      await startTopicFlow(page);
      await expectWorkspace(page);
      await assertClusterVisible(page);
      const unavailableButton = page.locator('.cluster-card__button', { hasText: 'Evidence unavailable' }).first();
      await expect(unavailableButton).toBeDisabled();
      await page.getByRole('button', { name: 'Preview Brief' }).click();
      await expect(page.getByLabel('Baseline brief preview')).toBeVisible({ timeout: STEP_TIMEOUT_MS });
      await page.getByRole('button', { name: 'View monitoring gap' }).click();
      await expect(page.getByLabel('Baseline brief preview')).toHaveCount(0);
      await expect(page.locator('.cluster-card--selected')).toHaveCount(1);
      await page.locator('.cluster-card').first().click();
      await expect(page.getByLabel('Evidence drawer')).toHaveCount(0);
    });

    await runScenario(browser, 'rich + baseline_failed -> failed fallback', async (page) => {
      await selectLocalScenario(page, 'rich', 'baseline_failed');
      await startTopicFlow(page);
      await expect(page.getByRole('heading', { name: 'Initial Review could not be completed' })).toBeVisible({
        timeout: STEP_TIMEOUT_MS,
      });
      await expect(page.getByText('Prototype failure state')).toBeVisible();
      await expect(page.getByText(WORKSPACE_SURFACE_LABEL)).toHaveCount(0);
    });

    await runScenario(browser, 'rich + baseline_stuck -> stuck fallback', async (page) => {
      await selectLocalScenario(page, 'rich', 'baseline_stuck');
      await startTopicFlow(page);
      await expect(page.getByRole('heading', { name: 'Initial Review stopped advancing' })).toBeVisible({
        timeout: STEP_TIMEOUT_MS,
      });
      await expect(page.getByText('Prototype delayed state')).toBeVisible();
      await expect(page.getByText(WORKSPACE_SURFACE_LABEL)).toHaveCount(0);
    });

    await runScenario(browser, 'rich normal path -> Evidence Drawer open/close', async (page) => {
      await selectLocalScenario(page, 'rich', 'default');
      await startTopicFlow(page);
      await expectWorkspace(page);
      const openDrawerButton = page.locator('.cluster-card__button:enabled', { hasText: 'View Evidence' }).first();
      await expect(openDrawerButton).toBeVisible({ timeout: STEP_TIMEOUT_MS });
      await openDrawerButton.click();
      await expect(page.locator('.evidence-drawer')).toBeVisible({ timeout: STEP_TIMEOUT_MS });
      await page.getByRole('button', { name: 'Close' }).click();
      await expect(page.locator('.evidence-drawer')).toHaveCount(0);
    });

    await runScenario(browser, 'rich + standard baseline -> Brief Preview trace handoff', async (page) => {
      await selectLocalScenario(page, 'rich', 'default');
      await startTopicFlow(page);
      await expectWorkspace(page);
      await page.getByRole('button', { name: 'Preview Brief' }).click();
      await expect(page.getByLabel('Baseline brief preview')).toBeVisible({ timeout: STEP_TIMEOUT_MS });
      await expect(page.getByRole('heading', { name: 'Baseline Brief' })).toBeVisible({
        timeout: STEP_TIMEOUT_MS,
      });
      await page.getByRole('button', { name: 'Open cluster' }).first().click();
      await expect(page.getByLabel('Baseline brief preview')).toHaveCount(0);
      await expect(
        page.locator('.cluster-card--selected').filter({
          hasText: 'Teams want clearer privacy controls across shared workflows.',
        })
      ).toHaveCount(1);
      await expect(page.getByLabel('Evidence drawer')).toHaveCount(0);
      await page.getByRole('button', { name: 'Preview Brief' }).click();
      await expect(page.getByLabel('Baseline brief preview')).toBeVisible({ timeout: STEP_TIMEOUT_MS });
      await page.getByRole('button', { name: 'View supporting evidence' }).first().click();
      await expect(page.getByLabel('Baseline brief preview')).toHaveCount(0);
      await expect(page.locator('.evidence-drawer')).toBeVisible({ timeout: STEP_TIMEOUT_MS });
      await expect(
        page.getByLabel('Evidence drawer').getByRole('heading', {
          name: 'Teams want clearer privacy controls across shared workflows.',
        })
      ).toBeVisible({ timeout: STEP_TIMEOUT_MS });
    });
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
