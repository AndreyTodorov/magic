/**
 * Unit tests for js/consent.js: reCAPTCHA (Firebase App Check) only loads after consent.
 * Loads the real script rather than a copy.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

let consent;

beforeAll(() => {
  (0, eval)(readFileSync('js/consent.js', 'utf8') + '\n;globalThis.__consent = recaptchaConsent;');
  consent = globalThis.__consent;
});

beforeEach(() => {
  document.body.innerHTML = `
    <section id="consentSection" class="section" hidden>
      <button id="consentAccept">Accept</button>
    </section>`;
});

describe('recaptchaConsent', () => {
  it('is not granted on a first visit', () => {
    expect(consent.isGranted()).toBe(false);
  });

  it('continues at once when the visitor agreed before', async () => {
    localStorage.setItem('mm_recaptcha_consent', 'granted');

    await consent.request();

    expect(document.getElementById('consentSection').hidden).toBe(true);
  });

  it('shows the prompt and waits for Accept', async () => {
    let done = false;
    const pending = consent.request().then(() => { done = true; });

    // .section only shows with .active (css/styles.css), so un-hiding alone is not enough
    expect(document.getElementById('consentSection').hidden).toBe(false);
    expect(document.getElementById('consentSection').classList.contains('active')).toBe(true);
    await Promise.resolve();
    expect(done).toBe(false);

    document.getElementById('consentAccept').click();
    await pending;

    expect(done).toBe(true);
    expect(consent.isGranted()).toBe(true);
    expect(document.getElementById('consentSection').hidden).toBe(true);
    expect(document.getElementById('consentSection').classList.contains('active')).toBe(false);
  });

  it('can be withdrawn', () => {
    localStorage.setItem('mm_recaptcha_consent', 'granted');

    consent.withdraw();

    expect(consent.isGranted()).toBe(false);
  });
});
