import { test, expect } from '@playwright/test';
import datasets from '../src/datasets.json' with { type: 'json' };

test('all datasets and methods load, playback stays synchronized, and controls work', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Less data. Same detail.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play videos' })).toBeEnabled();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  for (const dataset of datasets) {
    await page.getByRole('button', { name: new RegExp(dataset.name + '$') }).click();
    await expect(page.getByRole('heading', { name: dataset.name, exact: true })).toBeVisible();
    for (const method of ['bc1', 'neural', 'neural_mse', 'uncompressed']) {
      await page.getByLabel('Left method').selectOption(method);
      await expect(page.getByRole('button', { name: 'Play videos' })).toBeEnabled();
      await expect.poll(() => page.locator('video').evaluateAll(videos => videos.every(v => v.readyState >= 3 && v.videoWidth === 1920 && v.videoHeight === 1080))).toBe(true);
    }
  }
  await page.getByLabel('Left method').selectOption('neural');
  await expect(page.getByRole('button', { name: 'Play videos' })).toBeEnabled();
  await page.getByRole('button', { name: 'Play videos' }).click();
  await expect(page.getByRole('button', { name: 'Pause videos' })).toBeVisible();
  await expect.poll(() => page.locator('video').evaluateAll(v => v.every(video => !video.paused && video.currentTime > .5))).toBe(true);
  expect(await page.locator('video').evaluateAll(v => Math.abs(v[0].currentTime - v[1].currentTime))).toBeLessThan(.12);
  await page.getByRole('button', { name: 'Pause videos' }).click();
  await page.getByLabel('Video timeline').fill('6');
  await expect.poll(() => page.locator('video').evaluateAll(v => v.every(video => Math.abs(video.currentTime - 6) < .05))).toBe(true);
  await page.getByLabel('Playback speed').selectOption('0.5');
  expect(await page.locator('video').evaluateAll(v => v.every(video => video.playbackRate === .5))).toBe(true);
  await page.getByRole('button', { name: 'Swap comparison sides' }).click();
  await expect(page.getByLabel('Left method')).toHaveValue('uncompressed');
  await expect(page.getByLabel('Right method')).toHaveValue('neural');
  await expect(page.getByRole('button', { name: 'Play videos' })).toBeEnabled();
  await page.getByRole('button', { name: 'Fullscreen comparison' }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.getByRole('button', { name: 'Fullscreen comparison' }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await page.getByLabel('Video timeline').fill('11.8');
  await page.getByRole('button', { name: 'Play videos' }).click();
  await expect(page.getByRole('button', { name: 'Play videos' })).toBeVisible();
  await expect(page.getByLabel('Video timeline')).toHaveValue('0');
  await page.getByRole('button', { name: /01Ballista|Ballista$/ }).click();
  await expect(page.getByRole('button', { name: 'Play videos' })).toBeEnabled();
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('mobile layout, shared selection, and keyboard divider', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?dataset=chessset&left=bc1&right=neural_mse');
  await expect(page.getByRole('heading', { name: 'Chess set', exact: true })).toBeVisible();
  await expect(page.getByLabel('Left method')).toHaveValue('bc1');
  await expect(page.getByLabel('Right method')).toHaveValue('neural_mse');
  await expect(page.getByRole('button', { name: 'Play videos' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole('slider', { name: /Click and drag/i }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Drag the divider to compare · 51 / 49')).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});
