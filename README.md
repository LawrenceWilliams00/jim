# Jim

A simple gym tracker you install on your phone. You build routines from one shared list of exercises, log sets as you go, rest with a timer, and it suggests next time's weight from your history.

Plain HTML, CSS and JavaScript with no build step. It works offline, and your data stays on the phone.

## Run it locally

```sh
npm start            # http://localhost:4173
```

## Tests

```sh
npm install
npx playwright install chromium
npm test
```

The tests run on a Pixel 7 profile and at 360 px wide. They cover building a routine, training it, history shared between routines, backup and restore, opening offline, the on-screen keyboard, the back gesture, and real-phone hazards: double taps, typing being interrupted, late buzzes and short screens.

## Put it online with GitHub Pages

1. Create a repo and push this folder to `main`. A free account needs the repo to be public for Pages. Only the code is public, because your workouts never leave your phone.
2. In the repo, go to **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, then **main** and **/ (root)**, and save.
3. After a minute it's live at `https://<username>.github.io/<repo>/`.

## Install on Android

Open that URL in Chrome, then go to **⋮ → Install app** (on some versions it's **Add to home screen → Install**). Launch it from the home screen and it runs full screen, even without signal.

## Paste a routine as JSON

Make a new routine and tap **Paste JSON**. **Copy example** puts a sample on the clipboard: give it to an AI chat along with your plan, then paste back the answer. **Paste** reads it from the clipboard. You'll see what it found before you tap **Done**.

```json
{
  "name": "Push day",
  "items": [
    { "checklist": "Warm-up", "items": [{ "text": "Easy bike", "timer": 5 }, "Band pull-aparts | 2 × 15"] },
    { "exercise": "Bench press", "sets": 4, "reps": "4-6", "rest": "3:00", "warmups": 3, "notes": "Pause the first rep" },
    { "exercise": "Incline dumbbell press", "sets": 3, "reps": "8-12", "rest": 120 },
    { "superset": [{ "exercise": "Lateral raise", "sets": 3, "reps": "12-15" }, { "exercise": "Triceps pushdown", "sets": 3, "reps": "10-12" }], "rest": 90 }
  ]
}
```

- Exercises are matched to the ones you already have by name, ignoring case. New names are added.
- `reps` is a number (`8`) or a range (`"6-8"`, `"6 to 8"`). `rest` is in seconds (`90`), minutes (`"2 min"`, `3`), or `"2:30"`. Plain numbers of 9 or less count as minutes, the same as typing in the editor.
- `warmups` goes from 0 to 4. Checklist items are text (`"Name | detail"`) or `{ "text", "detail", "ticks" }`, or `{ "text", "timer" }` with the timer in minutes.
- Anything you leave out gets the usual defaults. Code fences, text around the JSON, curly quotes and trailing commas are all fine.

## Your data

- Everything is stored in Chrome's storage for this site on the phone, under the keys `jim.v3` and `jim.v3.sessions`. Uninstalling the app or clearing Chrome's data for the site deletes it.
- To back up, go to **Today → Backup → Download backup**, which saves a JSON file. **Restore from a file** merges a backup in: anything missing is added, and where both copies have an item the newer one wins.
- There's no sync between devices. Use a backup file to move your data across.

## Updating

Bump `VERSION` in `sw.js`, then push to `main`. The next time the app opens, it picks up the new version and reloads itself: straight away if you're on Today, otherwise the next time it goes into the background, so a workout is never interrupted. If you forget to bump it, the change still arrives, just one open later. If you add, rename or remove a file, update `FILES` too.

## How it's put together

| File | What it does |
| --- | --- |
| `index.html` | The page shell. |
| `app.css` | All styles, with the colour tokens at the top. |
| `app.js` | State, workout logic, screens and sheets. Every change rebuilds the app's HTML, and buttons call actions through `data-a` attributes mapped in the `A` object. |
| `sw.js` | The offline cache. |
| `manifest.webmanifest`, `icons/` | What Android needs to install it. |
| `fonts/` | Bricolage Grotesque, under the SIL Open Font License (see `fonts/OFL.txt`). |
| `tests/` | Playwright tests, a fixture, and a small static server. |

## Known limits

- The on-screen keyboard: `interactive-widget=resizes-content` in `index.html` makes Chrome shrink the page instead of covering it. Where a browser only shrinks the visible area, `fitKeyboard()` in `app.js` lifts the sheets instead.
- You won't get an alert when rest ends while the screen is off or you're in another app. During a workout the app keeps the screen awake, so it beeps and buzzes as long as it's open. Lock-screen alerts need a native wrapper, such as Capacitor with its Local Notifications plugin, which is straightforward on Android.
- `localStorage` holds about 5 MB, which is a few years of workouts. If history outgrows that, move sessions to IndexedDB.
