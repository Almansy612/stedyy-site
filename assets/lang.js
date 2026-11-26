// Shows the French page to a browser set to French, without asking (Abdallah, 2026-11-26).
// - Runs in the <head>, before the page draws, so an English page never flashes first.
// - Only English pages send anyone anywhere: a French page always stays French.
// - The small "English" / "Français" link on the Terms and privacy pages is a person's own choice,
//   so it wins for the rest of the visit (kept in sessionStorage, which the browser clears with the tab).
(function () {
  var FRENCH_TWIN = { '': 'index-fr.html', 'index.html': 'index-fr.html', 'privacy.html': 'privacy-fr.html', 'terms.html': 'terms-fr.html' };

  var chosen = null;
  try {
    chosen = sessionStorage.getItem('lang');
  } catch (error) {
    // Private browsing can block storage: then the browser's language simply decides every time.
  }

  var page = location.pathname.split('/').pop();
  var twin = FRENCH_TWIN[page];
  var browserIsFrench = /^fr\b/i.test(navigator.language || '');
  if (twin && browserIsFrench && chosen !== 'en') {
    location.replace(twin + location.search + location.hash);
    return;
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest ? event.target.closest('a[hreflang]') : null;
    // Only a link to the Terms, the privacy policy or the home page in the other language counts:
    // the English-only health-data page is marked hreflang="en" too, and opening it is no choice.
    if (!link || !/(^|\/)(index|privacy|terms)(-fr)?\.html/.test(link.getAttribute('href') || '')) return;
    try {
      sessionStorage.setItem('lang', link.getAttribute('hreflang'));
    } catch (error) {
      // Storage blocked: the link still opens the other language, it just isn't remembered.
    }
  });
})();
