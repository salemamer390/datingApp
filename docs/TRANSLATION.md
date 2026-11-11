# Translation (GTranslate free widget)

## What ships

- A consent-gated [GTranslate free website widget](https://gtranslate.io/website-translator-widget)
  loader, appended to the shared footer in `public/js/layout.js` (present on all pages that
  load the footer part).
- Languages offered: English, Arabic, French (`window.gtranslateSettings`).
- No account, API key, or card is required by the free HTML widget.

## Privacy behavior

- **Nothing is translated and no page text leaves the browser until the visitor opts in.**
  First visit shows a small "Translate" pill; tapping it opens a notice (EN + AR) explaining
  that page text, including visible chat messages, is sent to Google, and that the choice is
  remembered on this device. "Not now" dismisses the notice.
- After consent (`localStorage lc_gt_consent`), the widget loads on every visit and
  auto-translates to the remembered language until the visitor switches back to English.
  This is inherent to the free widget and is disclosed in the notice.
- The free plan terms ([gtranslate.io/terms](https://gtranslate.io/terms), clause 6.1) allow
  personal/nonprofit/internal use only; commercial use needs a paid plan. The site owner has
  classified the current deployment as noncommercial.

## Interaction with the site's own i18n (`public/js/i18n.js`)

- Picking a non-English widget language while the site language is non-English resets the
  site language to English and reloads once, so the widget always translates the original
  English text (no double translation).
- While a widget translation is active, `i18n.js` treats the page language as English so it
  does not fight the widget on later loads.
- The site i18n tree walker and attribute translator now key off the stored originals, so
  switching back to English fully restores original text (previously Arabic text/placeholders
  could not revert in place).

## Operations

- To change offered languages or the default, edit `window.gtranslateSettings` in
  `public/js/layout.js` (see the GTranslate generator for valid language codes).
- To disable the widget entirely, remove the footer block marked
  "GTranslate free website widget" in `public/js/layout.js`.
