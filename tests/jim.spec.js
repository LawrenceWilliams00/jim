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

test.describe('with the on-screen keyboard open', () => {
  test('editors leave room for it when the page shrinks (Chrome on Android)', async ({ page }) => {
    const { tap } = await open(page, { seed: backup });
    await page.getByRole('button', { name: 'Edit' }).click();
    await tap('Exercise');
    const field = await page.evaluateHandle(() => document.getElementById('pick-q'));
    const { width } = page.viewportSize();
    await page.setViewportSize({ width, height: 420 }); // what's left above a typical keyboard
    await page.keyboard.type('Bench');
    expect(await page.evaluate(f => f === document.getElementById('pick-q'), field), 'typing never rebuilds the field').toBe(true);
    await expect(page.locator('#pick-q')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.sheet .pickrow', { hasText: 'Bench press' })).toBeInViewport({ ratio: 1 });
    expect((await page.locator('.sheet').boundingBox()).y).toBeGreaterThanOrEqual(0);
    await page.keyboard.press('Enter');
    await expect(page.locator('#e-name')).toHaveValue('Bench press');
  });

  test('editors end above it when only the visible area shrinks', async ({ page }) => {
    await page.addInitScript(() => {
      let kb = 0;
      const vv = new EventTarget();
      Object.defineProperties(vv, {
        height: { get: () => document.documentElement.clientHeight - kb },
        width: { get: () => innerWidth },
        offsetTop: { get: () => 0 },
      });
      Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
      window.__keyboard = h => { kb = h; vv.dispatchEvent(new Event('resize')); };
    });
    const { tap } = await open(page, { seed: backup });
    await page.getByRole('button', { name: 'Edit' }).click();
    await tap('Checklist');
    // Enter walks through the list: item, its detail, then a fresh item.
    for (const [item, detail] of [['Bike', '5 min'], ['Band pull-aparts', '2 × 15'], ['Dislocates', '× 10']]) {
      await page.keyboard.type(item); await page.keyboard.press('Enter');
      await page.keyboard.type(detail); await page.keyboard.press('Enter');
    }
    await page.keyboard.type('Push-ups');
    await expect(page.locator('[data-ci="2"][data-cf="detail"]')).toHaveValue('× 10');
    await page.locator('[data-ci="3"][data-cf="text"]').focus();
    const kb = 340;
    await page.evaluate(h => window.__keyboard(h), kb);
    const visibleBottom = (await page.evaluate(() => document.documentElement.clientHeight)) - kb;
    const sheet = await page.locator('.sheet').boundingBox();
    expect(sheet.y + sheet.height).toBeLessThanOrEqual(visibleBottom + 1);
    expect(sheet.y).toBeGreaterThanOrEqual(0);
    const item = await page.locator('[data-ci="3"][data-cf="text"]').boundingBox();
    expect(item.y).toBeGreaterThanOrEqual(sheet.y);
    expect(item.y + item.height).toBeLessThanOrEqual(visibleBottom + 1);
    await page.evaluate(() => window.__keyboard(0));
    await tap('Cancel');
  });
});

test('the back gesture closes what you are in, not the app', async ({ page }) => {
  const { tap } = await open(page, { seed: backup });
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: /^Bench press/ }).click();
  await expect(page.locator('.sheet.form')).toBeVisible();
  await tap('Sets, more');
  await page.goBack();
  await expect(page.locator('.sheet')).toHaveCount(0);
  await expect(page.locator('.blks'), 'back keeps the change, like Done').toContainText('5 × 4–6');

  // Cancel closes it too, and the next back still lands one step up.
  await tap('Exercise');
  await tap('Cancel');
  await expect(page.locator('.sheet')).toHaveCount(0);
  await page.waitForTimeout(100);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

  await tap('Start');
  await page.locator('#card .val').nth(1).click();
  await expect(page.locator('.keys')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.sheet')).toHaveCount(0);
  await expect(page.locator('#card')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});

test.describe('on a real phone', () => {
  test('a quick double tap does not run on into the next screen', async ({ page }) => {
    // Automation is exempt from the tap guard; pretend to be a person.
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
    const { tap } = await open(page, { seed: backup });
    await page.waitForTimeout(400); // taps right after the app opens are ignored too
    await tap('Start');
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Log set 1' }).dblclick();
    await expect(page.getByRole('button', { name: 'Skip rest' }), 'the second tap must not skip the rest').toBeVisible();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Skip rest' }).dblclick();
    await expect(page.getByRole('button', { name: 'Log set 2' }), 'the second tap must not log set 2').toBeVisible();
  });

  test('typing is not disturbed by a toast or the rest timer', async ({ page }) => {
    const { tap } = await open(page, { seed: backup });
    await tap('Edit');
    await tap('Duplicate'); // shows a toast and puts you in the name field
    await page.keyboard.type(' x');
    await page.locator('#r-name').evaluate(el => el.setSelectionRange(3, 3));
    await page.clock.fastForward(4000); // the toast goes away
    expect(await page.locator('#r-name').evaluate(el => [document.activeElement === el, el.selectionStart])).toEqual([true, 3]);

    await tap('Today');
    await tap('Start');
    await tap('Log set 1');
    await page.getByRole('button', { name: /^Bench press/ }).click();
    await page.locator('#notes').fill('Grip wider');
    await page.locator('#notes').evaluate(el => el.setSelectionRange(4, 4));
    await page.clock.fastForward(181_000); // rest runs out while typing
    expect(await page.locator('#notes').evaluate(el => [document.activeElement === el, el.selectionStart])).toEqual([true, 4]);
  });

  test('no late beep when you come back after the rest ended', async ({ page }) => {
    await page.addInitScript(() => {
      window.__buzz = 0; navigator.vibrate = () => { window.__buzz++; return true; };
      let state = 'visible';
      Object.defineProperty(document, 'visibilityState', { get: () => state, configurable: true });
      window.__setVisible = v => { state = v ? 'visible' : 'hidden'; document.dispatchEvent(new Event('visibilitychange')); };
    });
    const { tap } = await open(page, { seed: backup });
    await tap('Start');
    await tap('Log set 1');
    await page.evaluate(() => window.__setVisible(false));
    // The phone sleeps: no timers run, the clock moves on 4 minutes.
    await page.clock.setSystemTime(new Date('2026-10-28T08:04:00'));
    await page.evaluate(() => window.__setVisible(true));
    await expect(page.locator('.over')).toBeVisible();
    expect(await page.evaluate(() => window.__buzz)).toBe(0);
  });

  test('the screen never shifts under a focused field', async ({ page }) => {
    await page.addInitScript(() => {
      let kb = 0; const vv = new EventTarget();
      Object.defineProperties(vv, { height: { get: () => document.documentElement.clientHeight - kb }, width: { get: () => innerWidth }, offsetTop: { get: () => 0 } });
      Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
      window.__keyboard = h => { kb = h; vv.dispatchEvent(new Event('resize')); };
    });
    const { tap } = await open(page, { seed: backup });
    await tap('Edit');
    await tap('Checklist');
    for (const item of ['Bike', 'Rows', 'Dislocates', 'Push-ups']) { await page.keyboard.type(item); await page.keyboard.press('Enter'); await page.keyboard.press('Enter'); }
    await page.evaluate(() => window.__keyboard(340));
    await page.locator('[data-ci="3"][data-cf="detail"]').focus();
    await page.evaluate(() => document.activeElement.scrollIntoView());
    expect(await page.evaluate(() => [document.getElementById('app').scrollTop, document.querySelector('.sheet').scrollTop])).toEqual([0, 0]);
  });

  test('editor fields keep their size on a short screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 560 });
    const { tap } = await open(page, { seed: backup });
    await tap('Edit');
    for (let i = 0; i < 6; i++) { await tap('Checklist'); await tap('Done'); }
    expect((await page.locator('#r-name').boundingBox()).height).toBeGreaterThanOrEqual(48);
  });
});

test('numbers in the editors can be typed as well as stepped', async ({ page }) => {
  const { tap } = await open(page, { seed: backup });
  await tap('Edit');
  await page.getByRole('button', { name: /^Bench press/ }).click();
  const type = async (id, text) => { await page.locator(id).click(); await page.keyboard.press('Control+A'); await page.keyboard.type(text); await page.keyboard.press('Enter'); };

  await type('#v-sets', '6');
  await expect(page.locator('#v-sets')).toHaveValue('6');
  // Typing then going straight for + still counts both.
  await page.locator('#v-sets').click(); await page.keyboard.press('Control+A'); await page.keyboard.type('5');
  await tap('Sets, more');
  await expect(page.locator('#v-sets')).toHaveValue('6');

  await type('#v-hi', '8');
  await type('#v-lo', '10'); // above the top of the range: the range moves up with it
  await expect(page.locator('#v-hi')).toHaveValue('10');
  await type('#v-lo', '6');
  await type('#v-hi', '8');
  await type('#v-rest', '150');
  await expect(page.locator('#v-rest')).toHaveValue('2:30');
  await type('#v-rest', '3');
  await expect(page.locator('#v-rest')).toHaveValue('3:00');
  await type('#v-rest', '1.45');
  await expect(page.locator('#v-rest')).toHaveValue('1:45');
  await type('#v-step', '1.25');
  await expect(page.locator('#v-step')).toHaveValue('1.25 kg');
  await tap('Goes up by, more');
  await expect(page.locator('#v-step')).toHaveValue('2 kg');
  await type('#v-sets', 'abc'); // nonsense is ignored
  await expect(page.locator('#v-sets')).toHaveValue('6');
  await type('#v-warm', '2');
  await tap('Done');
  await expect(page.locator('.blks')).toContainText('6 × 6–8, rest 1:45, 2 warm-ups');

  // A value typed and then left with the back gesture is kept.
  await page.getByRole('button', { name: /^Bench press/ }).click();
  await page.locator('#v-sets').click(); await page.keyboard.press('Control+A'); await page.keyboard.type('4');
  await page.goBack();
  await expect(page.locator('.blks')).toContainText('4 × 6–8');

  await page.getByRole('button', { name: /^Back squat/ }).click();
  await tap('Cancel');
  await tap('Checklist');
  await page.keyboard.type('Bike');
  await type('#v-timer-0', '5');
  await expect(page.locator('#v-timer-0')).toHaveValue('5 min');
  await type('#v-timer-0', '0');
  await expect(page.locator('#v-timer-0')).toHaveValue('Off');
  await type('#v-ticks-0', '3');
  await expect(page.locator('#v-ticks-0')).toHaveValue('3');
});
