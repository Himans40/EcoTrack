# How to Run This Project and Upload It to GitHub

A complete, step-by-step guide written for someone who has **never used Git or
GitHub before**. Nothing is assumed. Follow it in order.

You will do four things:

1. Extract the ZIP file
2. Install Node.js (if you don't already have it)
3. Run the project and check it works
4. Upload it to your own GitHub account

Set aside about 30 minutes the first time.

---

## Part 1 — Extract the ZIP file

### On Windows

1. Find `environment-monitoring-system.zip` in your Downloads folder.
2. **Right-click** it and choose **Extract All…**
3. Choose a simple location — your **Desktop** or **Documents** is ideal.
   Avoid any folder path containing special characters.
4. Click **Extract**.

### On Mac

1. Find `environment-monitoring-system.zip` in your Downloads folder.
2. **Double-click** it. macOS extracts it into the same folder automatically.
3. Drag the extracted `environment-monitoring-system` folder to your **Desktop**.

### Check it worked

Open the extracted folder. You should see files and folders including:

```
src/
docs/
public/
README.md
GITHUB_UPLOAD_GUIDE.md
package.json
package-lock.json
index.html
.gitignore
```

> **If you see a folder inside a folder** — that is, `environment-monitoring-system`
> containing another `environment-monitoring-system` — use the inner one. That is
> the actual project.

> **You will NOT see a `node_modules` folder, and that is correct.** It is
> deliberately excluded. You will create it in Part 3 by running `npm install`.

---

## Part 2 — Install Node.js

The project needs **Node.js version 20.19 or newer**. Version 22 LTS is recommended.

### Check whether you already have it

**Windows:** press `Windows key`, type `cmd`, press Enter.
**Mac:** press `Cmd + Space`, type `terminal`, press Enter.

In the window that opens, type this and press Enter:

```bash
node --version
```

- If you see something like `v22.11.0` or `v20.19.0` or higher — **you are done
  with Part 2.** Skip to Part 3.
- If you see `v18.x.x` or lower, or an error like *"command not found"* or
  *"not recognized"* — install Node.js below.

### Install it

1. Go to **<https://nodejs.org>**
2. Download the **LTS** version (the left-hand button). LTS means Long Term
   Support — the stable one.
3. Run the downloaded installer and accept all the defaults.
4. **Close the command window completely and open a new one.** The installer only
   affects windows opened after it finishes.
5. Check again:

```bash
node --version
```

You should now see a version number.

---

## Part 3 — Run the project

### Step 3.1 — Install Visual Studio Code (recommended)

If you don't have it: download from **<https://code.visualstudio.com>** and
install with the default options. It is free.

### Step 3.2 — Open the project folder

Open VS Code, then **File → Open Folder…**, select your
`environment-monitoring-system` folder, and click **Open**.

If VS Code asks *"Do you trust the authors of the files in this folder?"* — click
**Yes, I trust the authors**. It is your own project folder.

You should now see the project files in the left-hand sidebar.

### Step 3.3 — Open the built-in terminal

In VS Code: **Terminal → New Terminal** (or press ``Ctrl + ` ``).

A panel opens at the bottom. **Check it is in the right folder** — the text before
the cursor should end with `environment-monitoring-system`.

### Step 3.4 — Install the project's dependencies

Type this and press Enter:

```bash
npm install
```

This downloads the libraries the project uses. It takes **1–3 minutes** on a normal
connection. You will see a lot of text scroll past — that is normal.

When it finishes you will see something like `added 300 packages`.

> **You may see `npm warn deprecated` messages. These are normal and harmless** —
> they are notices about packages the project depends on indirectly. The project
> itself reports **0 vulnerabilities**.

> **If you see `npm: command not found`** — Node.js is not installed, or you did
> not open a new terminal after installing it. Go back to Part 2.

A new `node_modules` folder now appears. **Do not upload this folder to GitHub.**
The project is already configured to exclude it automatically.

### Step 3.5 — Start the application

```bash
npm run dev
```

After a moment you will see:

```
  VITE v7.3.8  ready in 180 ms

  ➜  Local:   http://localhost:5173/
```

**Hold `Ctrl` (or `Cmd` on Mac) and click that link**, or open a browser and go to
<http://localhost:5173>.

### Step 3.6 — Check the application works

You should see the **Environmental Overview** dashboard with live data.

Work through this checklist:

- [ ] The dashboard shows an Air Quality Index number and a coloured gauge
- [ ] Temperature and humidity tiles show values with green **Live API data** chips
- [ ] All seven items in the left sidebar open a page that loads
- [ ] **Water Quality** page loads — click **Load sample data** to populate it
- [ ] **Environmental Map** shows a map with coloured pins
- [ ] The sun/moon icon in the top right switches between light and dark themes

> **If the dashboard shows "Could not reach the data provider"** — your internet
> connection is down, or a firewall is blocking it. The application still works:
> click **Show demonstration data** to review the interface offline. The Water
> Quality page works fully offline regardless.

### Step 3.7 — Stop the server

Click into the terminal and press **`Ctrl + C`**. (On Mac it is still `Ctrl + C`,
not `Cmd + C`.)

### Step 3.8 — Optional: check the production build and tests

```bash
npm run build
```

Should end with `✓ built in` and a few seconds.

```bash
npm run test
```

Should end with `Tests  181 passed (181)`.

Both are worth running once so you can state the result honestly if asked.

---

## Part 4 — Upload to GitHub

There are two ways. **Method A uses only the GitHub website and needs no extra
software — use this one unless you specifically want to learn Git.**

### Step 4.1 — Create a GitHub account

If you don't have one:

1. Go to **<https://github.com>** and click **Sign up**
2. Use an email address you can access — you must verify it
3. Choose a username you are happy for a lecturer to see
4. Complete the verification and confirm the link sent to your email

### Step 4.2 — Create an empty repository

1. Sign in to GitHub
2. Click the **`+`** in the top-right corner → **New repository**
3. Fill in:
   - **Repository name:** `environment-monitoring-system`
   - **Description:** `Air and Water Quality Index and Environment Monitoring System — college major project`
   - **Public** or **Private** — pick **Public** unless your college requires
     otherwise. A lecturer cannot open a private repository without being invited.
   - **Do NOT tick** *"Add a README file"*
   - **Do NOT** add a `.gitignore` or a licence
4. Click **Create repository**

> **Why no README?** Your project already contains one. Letting GitHub create
> another causes a conflict that is annoying to resolve as a beginner.

You will land on a page headed *"Quick setup — if you've done this kind of thing
before"*. Keep this page open.

---

### Method A — Upload through the website (recommended)

#### Step A1 — Delete `node_modules` first

**This step is essential.** `node_modules` contains tens of thousands of files.
Uploading it will fail or take hours, and it must not be in the repository anyway —
anyone who downloads your project recreates it by running `npm install`.

- **Windows:** open your project folder, right-click the `node_modules` folder,
  choose **Delete**
- **Mac:** open your project folder, right-click `node_modules`, choose
  **Move to Bin**

Also delete the **`dist`** folder if one exists (it appears only if you ran
`npm run build`). It is generated output, not source code.

> Deleting `node_modules` does not break anything. Run `npm install` again whenever
> you want to work on the project.

#### Step A2 — Upload the files

1. On your new repository page, click the **uploading an existing file** link
   (in the sentence *"…or upload an existing file"*).
2. Open your `environment-monitoring-system` folder on your computer.
3. **Select everything inside it** — `Ctrl + A` on Windows, `Cmd + A` on Mac —
   then **drag it all** onto the GitHub upload area.
4. Wait for the uploads to complete. You will see each file listed with a green tick.

> **The `.gitignore` file may appear hidden.** On Windows, in File Explorer, go to
> the **View** tab and tick **Hidden items**. On Mac, press
> **`Cmd + Shift + .`** (period) in Finder to show hidden files. Make sure
> `.gitignore` is included — it is what stops `node_modules` being committed later.

#### Step A3 — Commit

1. Scroll to the bottom to the **Commit changes** box
2. In the first field type: `Initial commit — environment monitoring system`
3. Leave **Commit directly to the main branch** selected
4. Click **Commit changes**

Your code is now on GitHub.

---

### Method B — Using Git commands (optional)

Only if you want to learn Git. Method A produces exactly the same result.

#### Step B1 — Install Git

Download from **<https://git-scm.com/downloads>** and install with the defaults.
Close and reopen your terminal afterwards. Check it worked:

```bash
git --version
```

#### Step B2 — Tell Git who you are

Use the same email as your GitHub account:

```bash
git config --global user.name "Your Name"
```

```bash
git config --global user.email "your.email@example.com"
```

#### Step B3 — Prepare and upload

In VS Code's terminal, in your project folder, run these **one at a time**:

```bash
git init
```

```bash
git add .
```

> At this point, run `git status` and check that **`node_modules` is not listed**.
> The project's `.gitignore` excludes it automatically. If you do see it, stop and
> check that `.gitignore` was extracted correctly.

```bash
git commit -m "Initial commit — environment monitoring system"
```

```bash
git branch -M main
```

Now connect it to your GitHub repository. **Replace `YOUR-USERNAME` with your
actual GitHub username:**

```bash
git remote add origin https://github.com/YOUR-USERNAME/environment-monitoring-system.git
```

```bash
git push -u origin main
```

A browser window will open asking you to sign in to GitHub. Approve it.

> **If you are asked for a password in the terminal, GitHub will reject your normal
> password.** GitHub requires a Personal Access Token instead. The simplest fix is
> to install **GitHub Desktop** (<https://desktop.github.com>) and sign in there, or
> use Method A instead.

---

## Part 5 — Check the upload is complete

Go to `https://github.com/YOUR-USERNAME/environment-monitoring-system` and confirm:

- [ ] A **`src`** folder is present
- [ ] A **`docs`** folder is present (it contains the reports and screenshots)
- [ ] A **`public`** folder is present
- [ ] **`package.json`** and **`package-lock.json`** are present
- [ ] **`index.html`** is present
- [ ] **`README.md`** is present — and its contents display on the repository front
      page, with the screenshots visible
- [ ] **`GITHUB_UPLOAD_GUIDE.md`** is present
- [ ] Config files are present: `vite.config.ts`, `vitest.config.ts`,
      `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`,
      `tsconfig.app.json`, `tsconfig.node.json`
- [ ] **`node_modules` is NOT there** ✓
- [ ] **`dist` is NOT there** ✓

Click into `src` and confirm you see these folders: `components`, `context`,
`hooks`, `lib`, `pages`, `services`, `test`, `types`.

> **If the README doesn't display on the front page**, `README.md` was not uploaded
> to the top level. Re-upload just that file.

> **If the screenshots in the README show as broken images**, the
> `docs/screenshots` folder did not upload. Upload it again, making sure the folder
> structure is preserved.

---

## Part 6 — Get the link for your submission

On your repository page, copy the URL from your browser's address bar:

```
https://github.com/YOUR-USERNAME/environment-monitoring-system
```

That is the link to submit.

**Before you submit, test it properly:** open a **private / incognito browser
window** and paste the link. If the page loads without asking you to sign in, your
lecturer can open it. If it shows a 404, the repository is Private — go to
**Settings → General → scroll to Danger Zone → Change repository visibility →
Make public**, unless your college specifically requires a private repository (in
which case invite your lecturer under **Settings → Collaborators**).

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm: command not found` / `not recognized` | Node.js isn't installed, or you didn't open a **new** terminal after installing. See Part 2. |
| `npm install` fails with network errors | Check your internet connection; try again. On a restricted college network, try a different one. |
| `Port 5173 is already in use` | Another copy is already running. Close other terminals, or press `Ctrl + C` in them, then try again. |
| Dashboard shows "Could not reach the data provider" | No internet, or a firewall is blocking it. Click **Show demonstration data** to review the interface offline. |
| Browser shows a blank white page | Run `npm install` first — it must finish before `npm run dev` works. |
| Upload to GitHub is extremely slow or stalls | You are uploading `node_modules`. Delete it (Step A1) and start the upload again. |
| Can't see `.gitignore` to upload it | Enable hidden files: Windows → View tab → Hidden items. Mac → `Cmd + Shift + .` in Finder. |
| GitHub rejects your password when pushing | GitHub no longer accepts account passwords for Git. Use Method A, or install GitHub Desktop. |
| README shows but screenshots are broken | The `docs/screenshots` folder didn't upload. Upload it again with its folder structure intact. |

---

## Quick reference

Once everything is set up, these are the only commands you need:

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run test
```

---

## What to read before your viva

| File | Why |
| --- | --- |
| `README.md` | Overview, features, setup, limitations |
| `docs/DEMO_GUIDE.md` | **Five-minute demo script and 30 viva questions with answers** |
| `docs/PROJECT_REPORT.md` | The full report — abstract through conclusion |
| `docs/ARCHITECTURE.md` | How the system is built, for technical questions |
| `src/lib/aqi.ts` | The AQI calculation — heavily commented, and the most likely subject of questions |
| `src/lib/wqi.ts` | The water quality index — same |

Start with **`docs/DEMO_GUIDE.md`**. It is written specifically to prepare you for
presenting and defending this project.
