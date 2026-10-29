/**
 * RECAPTCHA CONSENT
 * In production the Firebase mode uses Firebase App Check, which runs Google reCAPTCHA.
 * reCAPTCHA stores and reads information on the visitor's device and sends it to Google,
 * so it may only start after the visitor agrees (§ 25(1) TDDDG). Until then the app waits
 * on the prompt in #consentSection; the standalone mode needs no consent and is linked from it.
 * The choice is kept in localStorage; the privacy page lets the visitor withdraw it.
 */

const RECAPTCHA_CONSENT_KEY = 'mm_recaptcha_consent';

const recaptchaConsent = {
  isGranted() {
    try {
      return localStorage.getItem(RECAPTCHA_CONSENT_KEY) === 'granted';
    } catch (e) {
      return false;
    }
  },

  withdraw() {
    try {
      localStorage.removeItem(RECAPTCHA_CONSENT_KEY);
    } catch (e) {
      // Storage blocked: nothing was stored, so there is nothing to withdraw
    }
  },

  /**
   * Resolves once the visitor has agreed: at once if they did on an earlier visit,
   * otherwise when they press Accept on the prompt.
   */
  request() {
    if (this.isGranted()) return Promise.resolve();

    const section = document.getElementById('consentSection');
    section.hidden = false;
    section.classList.add('active');
    document.body.classList.add('consent-pending');
    return new Promise((resolve) => {
      document.getElementById('consentAccept').addEventListener('click', () => {
        try {
          localStorage.setItem(RECAPTCHA_CONSENT_KEY, 'granted');
        } catch (e) {
          // Storage blocked: the consent still holds for this visit
        }
        section.hidden = true;
        section.classList.remove('active');
        document.body.classList.remove('consent-pending');
        resolve();
      }, { once: true });
    });
  },
};
