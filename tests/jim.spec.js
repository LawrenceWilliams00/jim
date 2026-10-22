import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const backup = readFileSync(new URL('./fixtures/backup.json', import.meta.url), 'utf8');
const backupFile = { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) };

// Opens the app with a fixed clock, optionally with data already on the phone.
async function open(page, { seed } = {}) {
  await page.clock.install({ time: new Date('2026-10-28T08:00:00') });
  if (seed) {
    await page.addInitScript(data => {
      if (localStorage.getItem('jim.v3')) return;
      const { exercises, routines, sessions, settings } = JSON.parse(data);
      localStorage.setItem('jim.v3', JSON.stringify({ exercises, routines, settings, cur: null }));
      localStorage.setItem('jim.v3.sessions', JSON.stringify(sessions));
    }, seed);
  }
  await page.goto('./');
  // Taps a button by its accessible name, inside the open sheet if there is one.
  const tap = async (name, exact = true) => {
    const scope = (await page.locator('.sheet').count()) ? page.locator('.sheet') : page;
    await scope.getByRole('button', { name, exact }).first().click();
  };
  const times = async (name, n) => { for (let i = 0; i < n; i++) await tap(name); };
  return { tap, times };
}

test('builds a routine from the shared exercise list', async ({ page }) => {
  const { tap, times } = await open(page);
  await tap('New routine');
  await page.keyboard.type('Push day');

  await tap('Checklist');
  await page.keyboard.type('Band pull-aparts');
  await tap('Ticks for item 1, more');
  await tap('Done');

  await tap('Exercise');
  await page.keyboard.type('Bench press');
  await tap('New: Bench press');
  await expect(page.locator('.sheet .rm'), 'a new exercise has Cancel, not Remove').toHaveCount(0);
  await tap('Sets, more');
  await expect(page.locator('.sheet.enter'), 'the sheet stays put while you change numbers').toHaveCount(0);
  await times('Low, less', 4);
  await times('High, less', 6);
  await tap('Done');
  await expect(page.locator('.blks')).toContainText('4 × 4–6');

  // Cancelling a new exercise leaves nothing behind in the list.
  await tap('Exercise');
  await page.keyboard.type('Bnech');
  await tap('New: Bnech');
  await tap('Cancel');
  await tap('Exercise');
  await expect(page.locator('.sheet .pickrow', { hasText: 'Bnech' })).toHaveCount(0);
  await tap('Cancel');

  // A superset starts empty.
  await tap('Superset');
  await expect(page.locator('.sheet .partrow')).toHaveCount(0);
  await tap('Add an exercise');
  await page.keyboard.type('Leg curl');
  await tap('New: Leg curl');
  await tap('Add another');
  await page.keyboard.type('Lateral raise');
  await tap('New: Lateral raise');
  await tap('Done');
  await expect(page.locator('.blks')).toContainText('Leg curl + Lateral raise');

  // Cancel undoes edits; Remove is one tap and can be undone.
  await page.getByRole('button', { name: /^Bench press/ }).click();
  await times('Sets, more', 3);
  await tap('Cancel');
  await expect(page.locator('.blks')).toContainText('4 × 4–6');
  await page.getByRole('button', { name: /^Bench press/ }).click();
  await tap('Remove');
  await expect(page.locator('.blks')).not.toContainText('Bench press');
  await tap('Undo');
  await expect(page.locator('.blks')).toContainText('Bench press');

  await tap('Done');
  await page.reload();
  await expect(page.locator('.wcard')).toContainText('Leg curl');
  await expect(page.locator('.rt')).toContainText('Push day');
});

test('trains a routine, and another routine sees the same history', async ({ page }) => {
  const { tap } = await open(page, { seed: backup });
  await tap('Start');
  // Last time was 4 × 6 at 60 kg, the top of 4–6, so it goes up by 2.5.
  await expect(page.locator('#card')).toContainText('62.5');
  for (let k = 1; k <= 4; k++) { await tap(`Log set ${k}`); await tap('Skip rest'); }

  await expect(page.getByText('Band on.')).toBeVisible();
  await tap('Log set 1');
  await page.clock.fastForward(181_000);
  await expect(page.locator('.over'), 'rest ran out, so it moved on by itself').toBeVisible();
  await tap('Log set 2');
  await tap('Skip rest');
  await tap('Log set 3');
  await expect(page.locator('.stats')).toContainText('7 sets');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tap('Done');

  await tap('New routine');
  await page.keyboard.type('Pull day');
  await tap('Exercise');
  await page.keyboard.type('ben');
  await tap('Bench press');
  await expect(page.locator('.sheet')).toContainText('Also in Day A');
  await tap('Done');
  await tap('Done');
  await page.getByRole('button', { name: /^Pull day/ }).click();
  await tap('Start');
  await expect(page.locator('#card')).toContainText('last 4 × 62.5');
});

test('backs up to a file and restores from one', async ({ page }) => {
  const { tap } = await open(page);
  await tap('Backup');
  await page.locator('#restore-file').setInputFiles(backupFile);
  await expect(page.locator('.toast')).toContainText('Restored 1 routine and 1 workout');
  await expect(page.locator('.rt')).toContainText('Day A');

  await tap('Backup');
  const [download] = await Promise.all([page.waitForEvent('download'), tap('Download backup')]);
  expect(download.suggestedFilename()).toMatch(/^jim-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const saved = JSON.parse(readFileSync(await download.path(), 'utf8'));
  expect(saved.routines.map(r => r.name)).toEqual(['Day A']);
  expect(saved.sessions).toHaveLength(1);
  await expect(page.locator('.foot')).toContainText('Backed up');

  // Restoring the same file again adds nothing.
  await tap('Backup');
  await page.locator('#restore-file').setInputFiles(backupFile);
  await expect(page.locator('.toast')).toContainText('Nothing new in that backup');
});

test('opens with no connection after the first visit', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.fonts.check('700 16px "Bricolage Grotesque"'))).toBe(true);
  await context.setOffline(false);
});
