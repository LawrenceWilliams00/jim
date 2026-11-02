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

## Plans

A plan is a folder of routines, such as Push Pull Legs. On Today, **New plan** makes one, and in the plan **Add** puts in a new routine, pasted JSON, or one of your other routines. The plan you're using runs Today: **Next up** goes through its routines in order, and other plans and loose routines are listed underneath. Open any plan and tap **Use this plan** to switch. Deleting a plan keeps its routines.

## Paste a routine or a whole plan as JSON

Make a new routine and tap **Paste JSON**, or open a plan and tap **Add → Paste JSON**. **Copy example** puts a sample on the clipboard: give it to an AI chat with your plan, then paste back the answer. **Paste** reads it from the clipboard, and you see what it found before you tap **Done**.

One routine:

```json
{
  "name": "Push day",
  "items": [
    { "checklist": "Warm-up", "items": [{ "text": "Easy bike", "timer": 5 }, "Band pull-aparts | 2 × 15"] },
    { "exercise": "Bench press", "equipment": "barbell", "sets": 4, "reps": "4-6", "rest": 180, "warmups": 3, "notes": "Pause the first rep" },
    { "exercise": "Incline dumbbell press", "equipment": "dumbbell", "sets": 3, "reps": "8-12", "rest": 120 },
    { "superset": [{ "exercise": "Lateral raise", "sets": 3, "reps": "12-15" }, { "exercise": "Triceps pushdown", "sets": 3, "reps": "10-12" }], "rest": 90 }
  ]
}
```

A whole plan is a list of routines: `{ "plan": "Push Pull Legs", "routines": [ { "name": "Push", "items": [ … ] }, { "name": "Pull", "items": [ … ] } ] }`. A plain list of routines works too. Pasted into a new routine, a plan of several routines becomes a plan of its own.

- Exercises are matched to the ones you already have by name, ignoring case. New names are added.
- `reps` is a number (`8`) or a range (`"6-8"`, `"6 to 8"`). `rest` is in seconds (`90`), minutes (`"2 min"`, `3`), or `"2:30"`. Plain numbers of 9 or less count as minutes, the same as typing in the editor.
- `equipment` is optional: `"barbell"`, `"dumbbell"`, `"machine"` or `"bodyweight"`. `"bar": 15` sets a barbell's bar weight (20 kg if left out).
- `warmups` goes from 0 to 4 (none inside a superset). Add `"warmup_mode": "manual"` to set the warm-up weights yourself.
- Checklist items are text (`"Name | detail"`) or `{ "text", "detail", "ticks" }`, or `{ "text", "timer" }` with the timer in minutes.
- Anything you leave out gets the usual defaults. Code fences, text around the JSON, curly quotes and trailing commas are all fine.

## Warm-ups

Warm-ups are worked out from your working weight, the weight of your first working set, not a 1-rep max.

- Barbell lifts start with the empty bar × 10.
- The rest climb in even steps to a last warm-up that depends on the rep range: 85% of the working weight for up to 6 reps, 80% up to 8, 75% up to 12, and 70% above that.
- Reps fall as the weight climbs (6, 4, 3, 2).
- A warm-up never repeats a weight or reaches the working weight, so light lifts get fewer.
- Bodyweight lifts get easy sets.

An exercise's **More** section has an optional **Equipment** setting. **Barbell** adds the bar weight, and Jim guesses the equipment for obvious names such as Bench press and Lat pulldown. **Warm-up weights** can be **Auto**, or **Manual**: you set the weights yourself, and Jim fills in what you did last time.

## Progress and bodyweight

Two tabs along the bottom: **Today** and **Progress**.

- **Bodyweight**: log it from the row at the top of Today, once a day (logging again changes it). Jim shows a smoothed line, the change a week (over up to 4 weeks, once there are 10 days of weigh-ins), and how long to your goal. Tap any weigh-in on the Bodyweight page to change or delete it.
- **Lifts** are measured by estimated 1RM (weight × (1 + reps / 30), the best set each week). Lifts you do for more than 12 reps are measured by your top set instead, since the estimate isn't worth much that high. Lifts with **Bodyweight** equipment count your bodyweight that day plus anything added.
- This week's point on a lift's line only shows once it beats last week, so a light day early in the week doesn't look like going backwards.
- **Records**: a session that beats every earlier one for that lift: its est. 1RM, its heaviest weight, or more reps than ever at that weight or heavier. Your first session with a lift isn't a record.
- **Weeks**: workouts, volume, working sets and time, against your plan (one workout per routine in it a week).
- **Settings** (from the bottom of Today): the bodyweight average (**7-day**, or **Weighted**, where recent weigh-ins count most), your goal weight, sound, and backup.

## Your data

- Everything is stored in Chrome's storage for this site on the phone, under the keys `jim.v3` and `jim.v3.sessions`. Uninstalling the app or clearing Chrome's data for the site deletes it.
- To back up, go to **Today → Backup → Download backup**, which saves a JSON file with your weigh-ins too. **Restore from a file** merges a backup in: anything missing is added, and where both copies have an item the newer one wins.
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
