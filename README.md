# GT Keyboard

Your custom Android keyboard. UI = HTML/CSS/JS (yours to edit freely).
Native shell = ~120 lines of Kotlin that just embeds that UI as a real
system keyboard. Builds into an APK on GitHub's servers — you never
need a PC or Android Studio.

## What's inside
- `app/src/main/assets/index.html` + `style.css` + `app.js` → your entire
  keyboard UI: letters/numbers/symbols, emoji+GIF+sticker+saved tabs,
  GT mode, and the CA / JW / JT / JTE floating boxes.
- `app/src/main/java/.../MyKeyboardIME.kt` → the native shell. Handles
  typing into whatever app is open, plus real GIF sending via Android's
  `commitContent` API (same one Gboard uses — only works in apps that
  accept inline images, e.g. WhatsApp/Messages; shows a toast in plain
  text fields that don't support it).
- `.github/workflows/build.yml` → builds the APK on GitHub's own
  computer every time you push.

## From Termux, push it to GitHub

```
cd CustomKeyboard
git init
git add .
git commit -m "GT Keyboard v1"
git branch -M main
git remote add origin https://github.com/4U-LTD/gt-keyboard.git
git push -u origin main
```

(swap in your actual repo URL — create an empty repo on GitHub first)

## Get the APK

1. On GitHub, open your repo → **Actions** tab
2. You'll see "Build Keyboard APK" running (starts automatically on push)
3. Wait ~2-3 min, click into the finished run
4. Under **Artifacts**, download `GT-Keyboard-debug-apk` → unzip → install
   the `.apk` on your phone (allow "install unknown apps" if asked)

## Turning it on as your keyboard
Settings → System → Languages & input → On-screen keyboard → Manage
keyboards → turn on **GT Keyboard** → then switch to it from the
keyboard switcher icon while typing anywhere.

## Using CA (Call AI)
Tap GT → CA → paste your Groq API key once → Save. It's stored on your
phone only (`localStorage` inside the keyboard's own WebView), never
sent anywhere except straight to Groq when you send a message. Delete
button wipes it.

## What's already wired up
- ✅ Full letters/numbers/symbols layout, shift + double-tap caps lock
- ✅ Emoji tab with search (~90 curated emoji, easy to extend — see
  `EMOJI_DATA` in app.js)
- ✅ GIF + Sticker tabs, live Giphy search, your key is already in there
- ✅ Saved tab (auto-saves GIFs/stickers you actually send)
- ✅ GT mode toggle with the red/green animated border
- ✅ CA / JW / JT / JTE as draggable floating boxes
- ✅ JW phrasebook with ~80 starter phrases + copy buttons (add more
  anytime in `JW_PHRASES`)
- ✅ JT and JTE both call Groq with the right system prompt

## What to tweak first
- Model name in `app.js` (`callGroq`) is set to `llama-3.3-70b-versatile`
  — swap if you want a different Groq model
- Emoji/phrase lists are just JS arrays — add as many as you want
- Colors/fonts are all in `style.css` — nothing is hardcoded elsewhere

## If the GitHub Action fails
Most common cause: Android SDK license prompt on the runner. If you
hit that, tell me the exact error text and I'll patch the workflow.
