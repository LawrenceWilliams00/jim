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

The tests run on a Pixel 7 profile and at 360 px wide. They cover building a routine, training it, history shared between routines, backup and restore, and opening offline.

## Put it online with GitHub Pages

1. Create a repo and push this folder to `main`. A free account needs the repo to be public for Pages. Only the code is public, because your workouts never leave your phone.
2. In the repo, go to **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, then **main** and **/ (root)**, and save.
3. After a minute it's live at `https://<username>.github.io/<repo>/`.

## Install on Android

Open that URL in Chrome, then go to **⋮ → Install app** (on some versions it's **Add to home screen → Install**). Launch it from the home screen and it runs full screen, even without signal.

## Your data

- Everything is stored in Chrome's storage for this site on the phone, under the keys `jim.v3` and `jim.v3.sessions`. Uninstalling the app or clearing Chrome's data for the site deletes it.
- To back up, go to **Today → Backup → Download backup**, which saves a JSON file. **Restore from a file** merges a backup in: anything missing is added, and where both copies have an item the newer one wins.
- There's no sync between devices. Use a backup file to move your data across.

## Updating

Push to `main`. The app opens its cached copy instantly and fetches new files in the background, so changes show up the next time you open it. If you add, rename or remove a file, update `FILES` in `sw.js` and bump `VERSION`.

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

- You won't get an alert when rest ends while the screen is off or you're in another app. During a workout the app keeps the screen awake, so it beeps and buzzes as long as it's open. Lock-screen alerts need a native wrapper, such as Capacitor with its Local Notifications plugin, which is straightforward on Android.
- `localStorage` holds about 5 MB, which is a few years of workouts. If history outgrows that, move sessions to IndexedDB.
