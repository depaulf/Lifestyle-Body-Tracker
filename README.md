# Movie Star Body — KPI Tracker
## Greg O'Gallagher Protocol

---

## STEP-BY-STEP DEPLOYMENT (15 minutes)

### What you need first (all free):
- GitHub account → github.com
- Vercel account → vercel.com (sign up WITH your GitHub)
- Anthropic account → console.anthropic.com

---

### STEP 1 — Create a GitHub repository

1. Go to github.com and log in
2. Click the green "New" button (top left)
3. Name it: `movie-star-body-tracker`
4. Make sure "Public" is selected
5. Click "Create repository"

---

### STEP 2 — Upload these files to GitHub

On the new empty repository page:
1. Click "uploading an existing file" link
2. Drag ALL these files/folders into the upload area:
   - `index.html`
   - `vercel.json`
   - `public/` folder (with style.css, app.js, manifest.json)
   - `api/` folder (with analyze.js)
3. Scroll down, click "Commit changes"

---

### STEP 3 — Deploy on Vercel

1. Go to vercel.com and log in
2. Click "Add New Project"
3. Find your `movie-star-body-tracker` repo and click "Import"
4. Leave all settings as default
5. Click "Deploy"
6. Wait ~60 seconds — Vercel gives you a live URL like `movie-star-body-tracker.vercel.app`

---

### STEP 4 — Add your Anthropic API key

**Option A (recommended — more secure):**
1. In Vercel, go to your project → Settings → Environment Variables
2. Add: Name = `ANTHROPIC_API_KEY`, Value = your key from console.anthropic.com
3. Click Save, then redeploy (Deployments → Redeploy)

**Option B (quick):**
1. Open your live app
2. Go to the TARGETS tab
3. Paste your API key in the "Anthropic API Key" field
4. Tap Save

---

### STEP 5 — Add to your iPhone home screen

1. Open your app URL in Safari (must be Safari, not Chrome)
2. Tap the Share button (box with arrow at bottom of screen)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

It now looks and works like a real app on your phone.

---

## HOW TO USE

**WEEK tab** — Your daily grind
- Tap any day to open it
- Check off KPIs manually OR upload screenshots for AI auto-logging
- Upload MFP diary screenshot, step count screenshot, workout photo
- Tap "Read screenshots & auto-log" — AI checks your boxes automatically
- Log your lifts in the lift logger (lift days only)

**CHECK-IN tab** — Every Monday morning
- Log all 13 measurements
- Upload front, back, side, and flexed photos
- Tap Save — everything is stored forever

**ADONIS tab** — Your progress toward the ideal physique
- Shows every measurement vs your 6'0" Adonis Index targets
- Shoulder/waist ratio tracker
- Progress bars for each measurement

**COACH tab** — Weekly AI bodybuilding coach
- Tap "Analyze my week" at the end of each week
- Gets full breakdown: compliance score, measurement analysis, timeline to goal
- Can automatically update your calorie/macro targets for next week

**TARGETS tab** — Settings
- Manually update calories and macros
- Store your Anthropic API key

---

## YOUR PROTOCOL

| Day | Type | Calories | Carbs | Protein | Fat | Lift | Stair Climber |
|-----|------|----------|-------|---------|-----|------|---------------|
| Sun | Rest | 1,950 | 139g | 200g | 66g | — | — |
| Mon | High | 2,500 | 254g | 200g | 76g | ✓ | ✓ |
| Tue | Low  | 1,950 | 139g | 200g | 66g | — | ✓ |
| Wed | High | 2,500 | 254g | 200g | 76g | ✓ | ✓ |
| Thu | Low  | 1,950 | 139g | 200g | 66g | — | ✓ |
| Fri | High | 2,500 | 254g | 200g | 76g | ✓ | ✓ |
| Sat | Low  | 1,950 | 139g | 200g | 66g | — | ✓ |

Daily: 5g creatine + 10,000 steps

Calorie rule: 0–100 under target = GREEN (cutting sweet spot). Over = RED. 100+ under = AMBER.

---

## YOUR GOAL

- Height: 6'0"
- Target: 32" waist / 52" shoulders / 9–11% body fat
- Adonis ratio: 1.625 (shoulders ÷ waist)
- Reference physiques: Will Smith (Focus) + Michael B. Jordan (Black Panther)
