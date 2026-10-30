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
- `TITLE:` big heading on the page. `TAG:` and `INTRO:` are optional.

**Each section starts with `## Title`**, then:
- `TYPE:` `gap` (student types the answer), `choose` (drop-down list), `open` (written answer), `info` (text only).
- `TEXT:` instructions (several `TEXT:` lines allowed). Lines starting with `- ` become a list. `**word**` = bold.
- `BANK:` words for a word bank, separated by `;` (optional).
- `AUDIO:` file name of an mp3 placed next to the page (optional). A “Back 5 seconds” button is added.
- `SCRIPT:` one line of the audio script (repeat `SCRIPT:` for every line, e.g. `SCRIPT: Jake: Right, let’s go.`). Shown folded under the player: “Script · open after listening”.
- `IMAGE:` file name | description (optional).
- `SUPPORT:` useful language behind a button (open answers).
- `PROMPT:` the question stored with the written answer (open answers).

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
`TYPE: article` = a reading text (drop cap, two columns on a computer). `VOCAB: word | meaning` lines add a **New vocabulary** box under the section.
Example: `homework/reading/autumn-reset/`.
