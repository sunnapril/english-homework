# Irina's homework site — rules for any assistant working here

Site: Netlify `irina-english-homework` (publishes this repo's `main` as is, no build).
Teacher: Irina (Russian-speaking; not a programmer). Talk to her in Russian, briefly and honestly.
Whenever she must do something herself (Apps Script, Netlify, Google Sheets), give numbered steps with exact
button names and what she should see after each step.

## Publishing (money matters)
- Every merge to `main` = one production deploy = **15 Netlify credits**. Deploy previews are free.
- Work on a branch → PR → check on the deploy preview → **merge only after Irina writes «публикуй»**.
- Collect everything that is ready into **one** merge. Never publish piecemeal without asking.
- Preview links (`deploy-preview-…`) are visible only to Irina; students get `https://irina-english-homework.netlify.app/…` links only.
- Publish only materials Irina approved. Natalia: no homework pages (her choice); her word-practice quiz `/word-quiz/natalia/` was requested by Irina on 29.10.2026. Do not change teaching content;
  technical fixes are fine but must be named in the report.

## Homework sending (do not break)
- Every homework with answers uses `/assets/homework-submission.js` + `window.HOMEWORK_SUBMISSION_CONFIG`
  (student, homework, submitButtonSelector, statusSelector, closedSelector, openSelector, …).
  Never write own sending code, never `fetch(..., {mode:'no-cors'})`, never show "Sent/Received" without the server's confirmation.
- New homework: prefer the text template (`/assets/hw-template.js`, format in `templates/HOMEWORK_FORMAT.md`,
  example `templates/homework-demo/`). It wires the shared sending automatically and refuses to send if the content is broken.
- Results go to Google Sheet "Homework Results", tab `TEST_RESULTS_V2` (readable text: ❌ ERRORS / ✅ CORRECT).
  Old pages without confirmation go to tab `Лист1`.
- Server code (Apps Script `Код.gs`, `ResultsV2.gs`) is **not** in this repo (it contains a private e-mail).
  Two web-app deployments in one project must always run the same version:
  `AKfycbx0Fb…Wevy64` (pages with confirmation) and `AKfycbw2zU…ogeennPu` (older pages).
  After code changes Irina must create a **new version** for **both** deployments (pencil → Version → New version).
  `ResultsV2.gs` must keep the CRLF→LF normalisation in `cleanV2` (readable multi-line answers depend on it).

## Checks before every release
- `tools/qa/` runs real pages in Chromium against the real Apps Script code with a fake Google Sheet
  (copy current `Код.gs`/`ResultsV2.gs` into `tools/qa/gs/patched/`, git-ignored).
  - template homework: `python3 tools/qa/check_template_page.py /homework/…/`
  - any page: open it, click every Check/Hint/answer button, play audio, look at images, phone width 390 px.
- Look at pictures, do not only check that they load (blurry or cropped images count as broken).
- Heavy images (> 1 MB): re-save as JPEG q90 at the same size and compare side by side.
- YouTube links: confirm the title matches the task; students in Russia may need a VPN.

## Student menus
`homework/<student>/…/index.html` lists the homework; add each new page there (newest first, keep old links).
Folder names are case-sensitive (`homework/Anastasia/…` ≠ `homework/anastasia/…`).

## Word practice (lesson tool, not for students)
`/word-quiz/quiz.js` + one page per student (`word-quiz/<student>/index.html`, words inline: `## topic`, `word | meaning | example with ___ (= other forms) | Russian | img/file.jpg`, `SYN: a ; b`).
Check every deck in the browser: all gap answers accepted, no two synonyms among options. Not linked from student menus.
