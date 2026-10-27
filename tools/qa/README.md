# QA tools

Local checks with a real browser (Playwright/Chromium) and the real Apps Script code running against a fake Google Sheet.
Nothing here touches Google, Netlify or students.

1. Put the current server files into `tools/qa/gs/patched/` (`Код.gs`, `ResultsV2.gs`; this folder is git-ignored).
2. `cd tools/qa && python3 check_template_page.py /homework/<student>/<page>/` — for pages built with the text template.
3. `e2e.py` + `fake_appsscript_server.js` are the building blocks for other tests:
   `start()`, `backend_reset('patched', coerce=True)`, `Faults()` (post='abort' simulates a network failure),
   `open_page(browser, path, faults)`, `state()` returns the fake sheet rows.
