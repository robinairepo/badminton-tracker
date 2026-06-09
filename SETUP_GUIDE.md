# Shuttle Tracker — Setup Guide v2
## Total time: ~10 minutes

---

## PART A — Google Sheet + Apps Script (~5 min)

### Step 1 — Create the Google Sheet
1. Go to **sheets.google.com** → click **Blank**
2. Rename it: `Badminton Tracker` (click "Untitled spreadsheet" top-left)
3. Keep this tab open

### Step 2 — Add the Apps Script
1. Click **Extensions** → **Apps Script**
2. Delete the default code in the editor
3. Copy everything from `Code.gs` (included in this package)
4. Paste it into the editor
5. Press **Ctrl+S** and name the project: `BadmintonTracker`

### Step 3 — Deploy as Web App
1. Click **Deploy** (top-right) → **New deployment**
2. Click the ⚙️ gear → select **Web app**
3. Set: Execute as **Me** / Who has access **Anyone**
4. Click **Deploy** → **Authorize access** → choose your account → **Allow**
5. **Copy the Web App URL** (https://script.google.com/macros/s/ABC.../exec)
6. Click **Done**

---

## PART B — GitHub Pages hosting (~5 min)

### Step 4 — Create the GitHub repo
1. Go to github.com, log in as `robinairepo`
2. Click **+** → **New repository**
3. Name: `badminton-tracker` | Set to **Public** | Check **Add a README**
4. Click **Create repository**

### Step 5 — Upload app files
1. Click **Add file** → **Upload files**
2. Upload: `index.html`, `manifest.json`, `sw.js`
3. Click **Commit changes**

### Step 6 — Enable GitHub Pages
1. Go to **Settings** → **Pages**
2. Source: **Deploy from a branch** | Branch: **main** | Folder: **/ (root)**
3. Click **Save** — wait ~1 min
4. App is live at: **https://robinairepo.github.io/badminton-tracker/**

---

## PART C — Install on Phone

**Android (Chrome):** Open the URL → tap ⋮ → **Add to Home screen**

**iPhone (Safari):** Open the URL → tap Share → **Add to Home Screen**

Then paste your Apps Script URL in the setup screen and tap **Connect & Setup**.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Connection failed" | Check URL has no spaces; re-deploy Apps Script |
| No install prompt (Android) | Use Chrome, not another browser |
| No install prompt (iPhone) | Must use Safari |
| Re-deploy after edits | Apps Script → Deploy → Manage → edit → New version |
