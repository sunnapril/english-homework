# Homework format (plain text → page)

A homework page is built automatically from plain text. **Only the text below is written; the design, checking, hints, “Show correct answer”, saving and confirmed sending are already built in.**

## Example

```
STUDENT: Sergey
HOMEWORK: Roadmap B2 · Unit 5A · Money choices · due 26.10.2026
TITLE: Money choices and past decisions
TAG: Roadmap B2 · Unit 5A · due 26 October 2026 · about 30 minutes
INTRO: Use the language from the last lessons in new situations.

## 1. Money phrases in new situations
TYPE: gap
TEXT: Complete each sentence with one phrase from the bank. Use every phrase once.
BANK: cut back on; set aside; pay back
1. After the rent increased, Pavel had to ___ restaurant meals. = cut back on | hint: Spend less on something.
2. Mina decided to ___ ten percent of her salary. = set aside ; put aside | hint: Keep money for a future purpose.
3. It took Alina a year to ___ the money. = pay back

## 2. What should have happened?
TYPE: choose
TEXT: Choose the form that expresses the intended meaning.
1. I wish I ___ the email more carefully. = had read | options: had read ; would read ; have read | hint: Wish + Past Perfect.
2. You ___ the only copy on a USB drive. = should not have kept | options: should not have kept ; did not have to keep ; were not supposed keep

## 3. What should they have done differently?
TYPE: open
TEXT: Choose **one** situation and write **70–90 words**.
- **A.** A streaming service renewed a subscription without a reminder.
- **B.** A cheap power supply damaged another component.
SUPPORT: with hindsight · a bargain · should have checked · could have avoided
PROMPT: What should they have done differently?
```

## Rules

**Top of the page (once):**
- `STUDENT:` name as it should appear in the results table.
- `HOMEWORK:` exact name of the homework for the table (include the due date).
- `LAYOUT: slides` — lesson look: each `##` section becomes a slide with clickable tabs at the top and a “Next” button (use for lesson pages and tests done in class).
- `SEND: no` — lesson page: no “Send answers” box, nothing goes to the results table (checking still works).
- `UI: ru` — buttons and messages in Russian (beginners; the tasks stay in the target language). `LANG: de` — German answers: ä/ae, ö/oe, ü/ue, ß/ss count as the same.
- `TITLE:` big heading on the page. `TAG:` and `INTRO:` are optional.

**Each section starts with `## Title`**, then:
- `TYPE:` `gap` (student types the answer), `choose` (drop-down list), `open` (written answer), `info` (text only), `fix` (find the mistake: the sentence itself is editable, the student corrects it in place; after ` = ` write the whole correct sentence). `order` (put events in order: the student taps the cards one by one and they line up in that order; after ` = ` write the correct position, e.g. `3. Wednesday opens a book. = 2`; the positions must be 1–N, each once). Use `order` instead of `gap` for story-order tasks.
- `TYPE: lotto` — a lottery ticket 1–49; the student crosses out the numbers they hear: `1. LOTTO 6 aus 49 = 12, 48, 29, 7, 35, 16`.
- `TYPE: chain` — a word chain; the student taps letters to mark the words. `[word]` = example, already marked: `1. [wohnen]sprechensrenheißen… = sprechen, heißen, …` (answers in chain order).
- `COLUMNS: 2` — the tasks of the section stand in two columns on a computer (one column on a phone).
- `TEXT:` instructions (several `TEXT:` lines allowed). Lines starting with `- ` become a list. `**word**` = bold.
- `BANK:` words for a word bank, separated by `;` (optional). The page shuffles the bank itself (same order on every visit, never the order of the answers), so the order you write does not matter.
- `AUDIO:` file name of an mp3 placed next to the page (optional). A “Back 5 seconds” button is added.
- `SCRIPT:` one line of the audio script (repeat `SCRIPT:` for every line, e.g. `SCRIPT: Jake: Right, let’s go.`). Shown folded under the player: “Script · open after listening”.
- `IMAGE:` file name | description (optional).
- `SUPPORT:` useful language behind a button (open answers).
- `PROMPT:` the question stored with the written answer (open answers).

**Groups (e.g. short dialogues):** inside a section, `### Conversation 1` starts a framed box. Lines after it such as `A: Did either of them come?` (no number) are shown as context lines in the box; numbered tasks after it go into the same box until the next `###`.

**Each task is one line:** `number. sentence with ___ = answer | options: … | hint: …`
- `___` (three underscores) marks the gap. Without it, the field is placed at the end.
- After ` = ` comes the correct answer. Several accepted answers: separate with ` ; `.
- `options:` only for `choose`, separated with ` ; ` (the correct one must be among them).
- `hint:` optional.
- Numbers start at 1 in every section and go without gaps.

If something is wrong (no answer, the answer is not among the options, a number is missing), the page shows a red box listing the problem and **sending is switched off**, so a broken page can never reach a student.

## Magazine look (optional)

Add at the top: `THEME: magazine` (serif "print magazine" design), `ISSUE: Reading room | The Autumn Issue | №1 / 2026` (thin line above the title),
`KICKER:` (the question under the title). In `TITLE:` a word in `*stars*` is printed in the accent colour.
`TYPE: article` = a reading text (justified; on a computer two columns in the magazine look). Every word in it can be tapped to highlight it like a marker (tap again to remove). `VOCAB: word | meaning` lines add a **New vocabulary** box under the section.
Example: `homework/reading/autumn-reset/`.
