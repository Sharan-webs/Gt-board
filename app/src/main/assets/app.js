/* =========================================================
   GT KEYBOARD - core app logic
   ========================================================= */

const GIPHY_KEY = "x3lgplS4mV35AlgS0ROivHNJAxz3E7j8";

const Bridge = {
  commitText: (t) => window.Android ? Android.commitText(t) : console.log("TYPE:", t),
  deleteOne: () => window.Android ? Android.deleteOne() : console.log("DEL"),
  enter: () => window.Android ? Android.sendEnter() : console.log("ENTER"),
  commitGif: (url, mime) => window.Android ? Android.commitGif(url, mime) : console.log("GIF:", url),
  expand: () => window.Android ? Android.expandKeyboard() : console.log("EXPAND"),
  collapse: () => window.Android ? Android.collapseKeyboard() : console.log("COLLAPSE"),
};

/* =========================================================
   LOCAL TYPING ENGINE
   Any tap on our own keys either (a) types into the app the
   user is really typing into, or (b) types into one of our
   OWN inputs (emoji search, AI box, translate boxes) when one
   of those is focused. This is what makes search/AI typing
   actually work using the SAME keyboard that's always visible
   below every floating box - there is no second/duplicate
   keyboard anywhere in this app.
   ========================================================= */

let activeLocalField = null; // the local <input>/<textarea> currently "focused" for our purposes

function markLocalField(el) { activeLocalField = el; }
function clearLocalFieldIfMatches(el) { if (activeLocalField === el) activeLocalField = null; }

function typeChar(ch) {
  if (activeLocalField) {
    insertIntoLocalField(activeLocalField, ch);
  } else {
    Bridge.commitText(ch);
  }
}
function typeBackspace() {
  if (activeLocalField) {
    deleteFromLocalField(activeLocalField);
  } else {
    Bridge.deleteOne();
  }
}
function typeEnter() {
  if (activeLocalField) {
    activeLocalField.dispatchEvent(new Event("gt-enter"));
  } else {
    Bridge.enter();
  }
}

// Used for inserting a whole chunk of text (an emoji, a clipboard item)
// that should always land in the REAL app the user is typing into, even
// if one of our own search/input fields happens to still have focus.
function insertText(text) {
  Bridge.commitText(text);
}

function insertIntoLocalField(el, text) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  const newPos = start + text.length;
  el.setSelectionRange(newPos, newPos);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
function deleteFromLocalField(el) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  if (start === end && start > 0) {
    el.value = el.value.slice(0, start - 1) + el.value.slice(end);
    el.setSelectionRange(start - 1, start - 1);
  } else {
    el.value = el.value.slice(0, start) + el.value.slice(end);
    el.setSelectionRange(start, start);
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// Any element with class "local-typable" routes keystrokes to itself while focused.
document.addEventListener("focusin", (e) => {
  if (e.target.classList && e.target.classList.contains("local-typable")) {
    markLocalField(e.target);
  }
});
document.addEventListener("focusout", (e) => {
  clearLocalFieldIfMatches(e.target);
});

// Prevent our own key taps from stealing focus away from a local field.
document.addEventListener("mousedown", (e) => {
  if (e.target.closest(".key, .gt-mini, .gt-toggle, .emoji-tab")) {
    if (activeLocalField) e.preventDefault();
  }
});

/* =========================================================
   GROQ
   ========================================================= */

const GroqKey = {
  get: () => localStorage.getItem("groq_api_key") || "",
  set: (k) => localStorage.setItem("groq_api_key", k),
  clear: () => localStorage.removeItem("groq_api_key"),
};

async function callGroq(systemPrompt, userText) {
  const key = GroqKey.get();
  if (!key) throw new Error("No Groq API key saved yet. Paste your key above first.");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Groq error " + res.status + ": " + errText.slice(0, 180));
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "(no response)";
}

/* =========================================================
   LETTER / NUMBER / SYMBOL LAYOUTS
   ========================================================= */

const LETTER_ROWS = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["SHIFT","z","x","c","v","b","n","m","BACK"],
];
const NUMSYM_ROWS = [
  ["1","2","3","4","5","6","7","8","9","0"],
  ["@","#","$","_","&","-","+","(",")","/"],
  ["SYM2","*","\"","'",":",";","!","?","BACK"],
];
const SYMBOLS2_ROWS = [
  ["~","`","|",".","\u221a","\u03c0","\u00f7","\u00d7","\u00a7","\u0394"],
  ["\u00a3","\u00a2","\u20ac","\u00a5","^","\u00b0","=","{","}","\\"],
  ["NUM","%","\u00a9","\u00ae","\u2122","\u2713","[","]","BACK"],
];

let shiftOn = false;
let capsLock = false;
let lastShiftTap = 0;

function letterCase(ch) { return (shiftOn || capsLock) ? ch.toUpperCase() : ch; }

function buildKey(label, displayOverride) {
  const b = document.createElement("button");
  b.className = "key";
  b.textContent = displayOverride ?? label;
  b.dataset.key = label;
  return b;
}

function renderLetters() {
  const root = document.getElementById("view-letters");
  root.innerHTML = "";
  LETTER_ROWS.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "kb-row";
    row.forEach((k) => {
      if (k === "SHIFT") {
        const b = buildKey("SHIFT", "\u21e7");
        b.className = "key key-wide key-func" + (shiftOn || capsLock ? " key-active" : "");
        rowEl.appendChild(b);
      } else if (k === "BACK") {
        const b = buildKey("BACK", "\u232b");
        b.className = "key key-wide key-func";
        rowEl.appendChild(b);
      } else {
        rowEl.appendChild(buildKey(k, letterCase(k)));
      }
    });
    root.appendChild(rowEl);
  });
  root.appendChild(buildBottomRow("view-letters"));
}

function renderGrid(containerId, rows, switchLabel, switchTarget) {
  const root = document.getElementById(containerId);
  root.innerHTML = "";
  rows.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "kb-row";
    row.forEach((k) => {
      if (k === "BACK") {
        const b = buildKey("BACK", "\u232b");
        b.className = "key key-wide key-func";
        rowEl.appendChild(b);
      } else if (k === switchTarget) {
        const b = buildKey(k, switchLabel);
        b.className = "key key-wide key-func";
        rowEl.appendChild(b);
      } else {
        rowEl.appendChild(buildKey(k));
      }
    });
    root.appendChild(rowEl);
  });
  root.appendChild(buildBottomRow(containerId));
}

function buildBottomRow(fromView) {
  const rowEl = document.createElement("div");
  rowEl.className = "kb-row bottom-row";
  const abc = buildKey("TO_LETTERS", "ABC"); abc.className = "key key-wide key-func";
  const toNum = buildKey("TO_NUMSYM", "?123"); toNum.className = "key key-wide key-func";
  const emoji = buildKey("TO_EMOJI", "\u263a"); emoji.className = "key key-func";
  const comma = buildKey(",", ","); comma.className = "key key-punct";
  const space = buildKey("SPACE", "English"); space.className = "key key-space";
  const dot = buildKey(".", "."); dot.className = "key key-punct";
  const enter = buildKey("ENTER", "\u23ce"); enter.className = "key key-wide key-enter";

  if (fromView === "view-letters") {
    rowEl.append(toNum, emoji, comma, space, dot, enter);
  } else {
    rowEl.append(abc, emoji, comma, space, dot, enter);
  }
  return rowEl;
}

function switchView(name) {
  document.querySelectorAll(".kb-view").forEach((v) => v.classList.remove("active"));
  document.getElementById(name).classList.add("active");
}

document.getElementById("kb-root").addEventListener("click", (e) => {
  const btn = e.target.closest(".key");
  if (!btn) return;
  const key = btn.dataset.key;

  if (key === "SHIFT") {
    const now = Date.now();
    if (now - lastShiftTap < 350) { capsLock = !capsLock; shiftOn = false; }
    else { shiftOn = !shiftOn; }
    lastShiftTap = now;
    renderLetters();
    return;
  }
  if (key === "BACK") { return; } // handled by the hold/triple-tap gesture logic below
  if (key === "SPACE") { typeChar(" "); return; }
  if (key === "ENTER") { typeEnter(); return; }
  if (key === "TO_LETTERS") { switchView("view-letters"); return; }
  if (key === "TO_NUMSYM") { switchView("view-numsym"); return; }
  if (key === "SYM2") { switchView("view-symbols2"); return; }
  if (key === "NUM") { switchView("view-numsym"); return; }
  if (key === "TO_EMOJI") { openEmojiPanel(); return; }

  const ch = key.length === 1 ? letterCase(key) : key;
  typeChar(ch);
  if (shiftOn) { shiftOn = false; renderLetters(); }
});

renderLetters();
renderGrid("view-numsym", NUMSYM_ROWS, "?123", "SYM2");
renderGrid("view-symbols2", SYMBOLS2_ROWS, "?123", "NUM");

/* =========================================================
   BACKSPACE GESTURES
   Tap = delete one. Hold = repeat rapidly like Gboard, faster
   the longer it's held. Triple-tap = clear the whole field.
   Delegated (not per-button) since BACK is re-created on every
   render across all three views.
   ========================================================= */

function clearAllText() {
  if (activeLocalField) {
    activeLocalField.value = "";
    activeLocalField.dispatchEvent(new Event("input", { bubbles: true }));
  } else if (window.Android) {
    Android.clearAll();
  }
}

let bsPressStart = 0;
let bsHoldTimeout = null;
let bsRepeatTimeout = null;
let bsRepeating = false;
let bsTapTimes = [];

function bsStop() {
  clearTimeout(bsHoldTimeout); bsHoldTimeout = null;
  clearTimeout(bsRepeatTimeout); bsRepeatTimeout = null;
  bsRepeating = false;
}
function bsRepeatTick(speed) {
  typeBackspace();
  const next = Math.max(28, speed - 10);
  bsRepeatTimeout = setTimeout(() => bsRepeatTick(next), next);
}
function bsDown() {
  bsPressStart = Date.now();
  bsRepeating = false;
  bsHoldTimeout = setTimeout(() => { bsRepeating = true; bsRepeatTick(120); }, 350);
}
function bsUp() {
  const wasRepeating = bsRepeating;
  bsStop();
  if (wasRepeating) return; // hold already deleted plenty - nothing more to do on release

  typeBackspace(); // quick tap = single delete

  const now = Date.now();
  bsTapTimes = bsTapTimes.filter((t) => now - t < 600);
  bsTapTimes.push(now);
  if (bsTapTimes.length >= 3) {
    bsTapTimes = [];
    clearAllText();
  }
}

const kbRoot = document.getElementById("kb-root");
kbRoot.addEventListener("pointerdown", (e) => { if (e.target.closest('.key[data-key="BACK"]')) bsDown(); });
kbRoot.addEventListener("pointerup", (e) => { if (e.target.closest('.key[data-key="BACK"]')) bsUp(); });
kbRoot.addEventListener("pointercancel", (e) => { if (e.target.closest('.key[data-key="BACK"]')) bsStop(); });
kbRoot.addEventListener("pointerleave", (e) => { if (e.target.closest('.key[data-key="BACK"]')) bsStop(); }, true);

/* =========================================================
   EMOJI DATA - curated searchable set + generated Unicode
   ranges for 1000+ total browsing.
   ========================================================= */

const CURATED_EMOJI = [
  ["\ud83d\ude00","grin happy face smile"],["\ud83d\ude02","laugh cry funny lol"],["\ud83e\udd23","rofl laugh funny"],
  ["\ud83d\ude0a","smile happy blush"],["\ud83d\ude0d","love heart eyes"],["\ud83e\udd70","love hearts happy"],
  ["\ud83d\ude18","kiss love"],["\ud83d\ude09","wink"],["\ud83d\ude0e","cool sunglasses"],
  ["\ud83e\udd29","star eyes excited"],["\ud83e\udd73","party celebrate"],["\ud83d\ude22","cry sad"],
  ["\ud83d\ude2d","cry sob sad"],["\ud83d\ude21","angry mad"],["\ud83d\ude31","shock scared"],
  ["\ud83d\ude34","sleep tired"],["\ud83e\udd14","think hmm"],["\ud83d\ude05","sweat nervous laugh"],
  ["\ud83d\ude07","angel innocent"],["\ud83d\ude43","upside down silly"],["\ud83d\ude0f","smirk"],
  ["\ud83e\udd7a","pleading please cute"],["\ud83e\udd17","hug"],["\ud83d\ude10","neutral meh"],
  ["\ud83d\ude44","eye roll"],["\ud83e\udd2f","mind blown shocked"],["\ud83d\udc4d","thumbs up good yes like"],
  ["\ud83d\udc4e","thumbs down no dislike"],["\ud83d\udc4f","clap applause"],["\ud83d\ude4c","hands up celebrate"],
  ["\ud83d\ude4f","pray thanks please"],["\ud83d\udc4b","wave hi hello bye"],["\u270c\ufe0f","peace victory"],
  ["\ud83e\udd1d","handshake deal"],["\ud83d\udcaa","strong muscle flex"],["\ud83d\udc40","eyes look"],
  ["\ud83d\udd25","fire lit hot"],["\ud83d\udcaf","hundred perfect"],["\u2705","check done yes correct"],
  ["\u274c","cross no wrong"],["\u2764\ufe0f","love heart red"],["\ud83d\udc94","heartbreak sad"],
  ["\ud83d\udc36","dog puppy"],["\ud83d\udc31","cat kitten"],["\ud83e\udd8a","fox"],["\ud83d\udc3c","panda"],
  ["\ud83c\udf55","pizza food"],["\ud83c\udf54","burger food"],["\ud83c\udf5c","noodles ramen food"],
  ["\ud83c\udf63","sushi japanese food"],["\u2615","coffee drink"],["\ud83c\udfae","game controller gaming"],
  ["\ud83c\udfa7","headphones music"],["\ud83d\udcf1","phone mobile"],["\ud83d\udcbb","laptop computer code"],
  ["\u26a1","lightning bolt energy fast"],["\ud83d\ude80","rocket launch fast"],["\ud83c\udf1f","star sparkle"],
  ["\ud83c\udf08","rainbow"],["\ud83c\udf19","moon night"],["\u2600\ufe0f","sun day"],["\u2b50","star favorite"],
  ["\ud83c\udf89","party celebrate confetti"],["\ud83c\udf82","birthday cake"],["\ud83c\udfc6","trophy win champion"],
  ["\u2694\ufe0f","swords fight battle"],["\ud83c\udfaf","target goal aim"],["\ud83d\udcb0","money cash rich"],
  ["\ud83d\udc8e","diamond gem"],["\ud83d\udd12","lock secure"],["\u2728","sparkle magic"],
  ["\ud83d\udc51","crown king queen"],["\ud83d\udc09","dragon"],["\ud83e\udd77","ninja"],["\ud83e\udd16","robot ai bot"],
  ["\ud83c\uddef\ud83c\uddf5","flag japan"],["\ud83c\uddee\ud83c\uddf3","flag india"],["\ud83c\uddfa\ud83c\uddf8","flag usa"],
];

const RANGE_BLOCKS = [
  [0x1F600, 0x1F64F], [0x1F300, 0x1F5FF], [0x1F680, 0x1F6FF],
  [0x1F900, 0x1F9FF], [0x1FA70, 0x1FAFF], [0x2600, 0x26FF], [0x2700, 0x27BF],
];

function buildFullEmojiList() {
  const seen = new Set(CURATED_EMOJI.map(([ch]) => ch));
  const list = [...CURATED_EMOJI];
  RANGE_BLOCKS.forEach(([start, end]) => {
    for (let cp = start; cp <= end; cp++) {
      const ch = String.fromCodePoint(cp);
      if (!seen.has(ch)) { seen.add(ch); list.push([ch, ""]); }
    }
  });
  return list;
}
const ALL_EMOJI = buildFullEmojiList();

function renderEmojiGrid(grid, list) {
  grid.innerHTML = "";
  grid.className = "emoji-grid-emoji";
  const frag = document.createDocumentFragment();
  list.forEach(([ch]) => {
    const b = document.createElement("button");
    b.className = "emoji-cell";
    b.textContent = ch;
    b.addEventListener("mousedown", (e) => e.preventDefault());
    // Always goes to the real app being typed into, never into our own search box.
    b.onclick = () => insertText(ch);
    frag.appendChild(b);
  });
  grid.appendChild(frag);
}

async function renderMediaGrid(grid, kind, query) {
  grid.className = "emoji-grid-media";
  grid.innerHTML = "<div class='media-loading'>Loading\u2026</div>";
  const endpoint = kind === "gif" ? "gifs" : "stickers";
  const url = query
    ? `https://api.giphy.com/v1/${endpoint}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=24`
    : `https://api.giphy.com/v1/${endpoint}/trending?api_key=${GIPHY_KEY}&limit=24`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    grid.innerHTML = "";
    (data.data || []).forEach((item) => {
      const img = document.createElement("img");
      img.className = "media-cell";
      img.src = item.images.fixed_width_small.url;
      img.addEventListener("mousedown", (e) => e.preventDefault());
      img.onclick = () => {
        Bridge.commitGif(item.images.original.url, "image/gif");
        saveToRecent(item.images.fixed_width_small.url, item.images.original.url);
      };
      grid.appendChild(img);
    });
    if (!data.data || data.data.length === 0) grid.innerHTML = "<div class='media-loading'>No results</div>";
  } catch (err) {
    grid.innerHTML = "<div class='media-loading'>Couldn't load (check internet)</div>";
  }
}

function saveToRecent(thumb, original) {
  const saved = JSON.parse(localStorage.getItem("saved_media") || "[]");
  saved.unshift({ thumb, original });
  localStorage.setItem("saved_media", JSON.stringify(saved.slice(0, 40)));
}

function renderSavedGrid(grid) {
  grid.className = "emoji-grid-media";
  const saved = JSON.parse(localStorage.getItem("saved_media") || "[]");
  grid.innerHTML = "";
  if (saved.length === 0) {
    grid.innerHTML = "<div class='media-loading'>Nothing saved yet</div>";
    return;
  }
  saved.forEach((item) => {
    const img = document.createElement("img");
    img.className = "media-cell";
    img.src = item.thumb;
    img.addEventListener("mousedown", (e) => e.preventDefault());
    img.onclick = () => Bridge.commitGif(item.original, "image/gif");
    grid.appendChild(img);
  });
}

// ---------- Emoji floating box ----------
// Opens ABOVE the keyboard. The letters/numbers view underneath is left
// exactly as it was and stays fully usable - that's what fixes "can't
// get back to the alphabet": you never actually leave it.
function openEmojiPanel() {
  const content = createFloatingBox("Emoji", "emoji");
  content.classList.add("emoji-panel");

  const tabs = document.createElement("div");
  tabs.id = "emojiTabs";
  const search = document.createElement("input");
  search.id = "emojiSearch";
  search.className = "local-typable";
  search.type = "text";
  search.inputMode = "none";
  search.autocomplete = "off";
  const grid = document.createElement("div");
  grid.id = "emojiGrid";
  content.append(tabs, search, grid);

  let currentTab = "emoji";

  function renderTabs() {
    tabs.innerHTML = "";
    [["emoji","Emoji"],["gif","GIF"],["sticker","Sticker"],["saved","Saved"]].forEach(([id, label]) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.className = "emoji-tab" + (currentTab === id ? " active" : "");
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.onclick = () => { currentTab = id; renderTabs(); };
      tabs.appendChild(b);
    });
    search.value = "";
    search.placeholder = currentTab === "emoji" ? "Search " + ALL_EMOJI.length + "+ emoji"
      : currentTab === "gif" ? "Search GIFs"
      : currentTab === "sticker" ? "Search stickers"
      : "Saved items";
    if (currentTab === "emoji") renderEmojiGrid(grid, ALL_EMOJI);
    else if (currentTab === "saved") renderSavedGrid(grid);
    else renderMediaGrid(grid, currentTab, "");
  }

  let searchDebounce;
  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    clearTimeout(searchDebounce);
    if (currentTab === "emoji") {
      renderEmojiGrid(grid, q ? ALL_EMOJI.filter(([, kw]) => kw && kw.includes(q)) : ALL_EMOJI);
    } else if (currentTab === "gif" || currentTab === "sticker") {
      searchDebounce = setTimeout(() => renderMediaGrid(grid, currentTab, q), 400);
    }
  });

  renderTabs();
}

/* =========================================================
   CLIPBOARD PANEL
   Backed by native clipboard history (MyKeyboardIME listens
   for system clipboard changes). Tap an item to paste it,
   long-press to delete it.
   ========================================================= */

function openClipboardPanel() {
  const content = createFloatingBox("Clipboard", "clipboard");
  const list = document.createElement("div");
  list.className = "clip-list";
  content.appendChild(list);

  function render() {
    let items = [];
    if (window.Android) {
      try { items = JSON.parse(Android.getClipHistory() || "[]"); } catch (e) { items = []; }
    }
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = "<div class='media-loading'>Nothing copied yet</div>";
      return;
    }
    items.forEach((text) => {
      const row = document.createElement("div");
      row.className = "clip-row";
      const p = document.createElement("div");
      p.className = "clip-text";
      p.textContent = text;
      row.appendChild(p);

      let pressTimer = null;
      let longPressed = false;
      row.addEventListener("pointerdown", () => {
        longPressed = false;
        pressTimer = setTimeout(() => {
          longPressed = true;
          if (window.Android) Android.deleteClipItem(text);
          row.classList.add("clip-row-removing");
          setTimeout(render, 180);
        }, 500);
      });
      const cancelPress = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
      row.addEventListener("pointerup", () => {
        cancelPress();
        if (!longPressed) {
          insertText(text);
          closeFloatingBox();
        }
      });
      row.addEventListener("pointerleave", cancelPress);
      row.addEventListener("pointercancel", cancelPress);

      list.appendChild(row);
    });
  }
  render();
}

/* =========================================================
   THEME (background photo)
   The photo picker + crop screen are entirely native (see
   ThemePickerActivity). We just trigger it and, whenever the
   keyboard notices the saved photo changed, apply it here.
   ========================================================= */

function applyTheme(dataUrl) {
  const root = document.getElementById("kb-root");
  if (dataUrl) {
    root.style.backgroundImage =
      `linear-gradient(180deg, rgba(14,15,19,0.72), rgba(14,15,19,0.86)), url("${dataUrl}")`;
    root.classList.add("has-theme");
  } else {
    root.style.backgroundImage = "";
    root.classList.remove("has-theme");
  }
}
window.applyThemeFromNative = applyTheme;

document.getElementById("themeBtn").addEventListener("click", () => {
  if (window.Android) Android.pickThemeImage();
});

document.getElementById("settingsBtn").addEventListener("click", () => openSettingsPanel());

function openSettingsPanel() {
  const content = createFloatingBox("Settings", "settings");

  const resetBtn = document.createElement("button");
  resetBtn.className = "settings-btn settings-danger";
  resetBtn.textContent = "Refresh & Restart (clears saved API key, clipboard, theme)";
  resetBtn.addEventListener("mousedown", (e) => e.preventDefault());
  resetBtn.onclick = () => {
    localStorage.clear();
    if (window.Android) Android.resetAllData();
    applyTheme("");
    resetBtn.textContent = "Cleared \u2713";
    setTimeout(() => { resetBtn.textContent = "Refresh & Restart (clears saved API key, clipboard, theme)"; }, 1500);
  };

  const adminBtn = document.createElement("button");
  adminBtn.className = "settings-btn";
  adminBtn.textContent = "Contact Admin";
  adminBtn.addEventListener("mousedown", (e) => e.preventDefault());
  adminBtn.onclick = () => {
    if (window.Android) Android.openUrl("https://www.instagram.com/sharan.in__/");
  };

  content.append(resetBtn, adminBtn);
}

if (window.Android) {
  try {
    const initial = Android.getThemeUri();
    if (initial) applyTheme(initial);
  } catch (e) { /* no theme saved yet */ }
}

/* =========================================================
   GT MODE
   ========================================================= */

const body = document.body;
let gtModeOn = false;

document.getElementById("gtBtn").addEventListener("click", () => {
  gtModeOn = !gtModeOn;
  body.classList.toggle("gt-mode", gtModeOn);
  document.getElementById("gtPanel").classList.toggle("hidden", !gtModeOn);
});
document.getElementById("killGt").addEventListener("click", () => {
  gtModeOn = false;
  body.classList.remove("gt-mode");
  document.getElementById("gtPanel").classList.add("hidden");
  closeFloatingBox();
});
document.querySelectorAll(".gt-mini[data-panel]").forEach((btn) => {
  btn.addEventListener("click", () => openPanel(btn.dataset.panel));
});

function openPanel(name) {
  if (name === "ai") openAiPanel();
  if (name === "jw") openJwPanel();
  if (name === "jt") openTranslatePanel("Eng to JP", false);
  if (name === "jte") openTranslatePanel("Eng to JP (romaji)", true);
  if (name === "clipboard") openClipboardPanel();
}

/* =========================================================
   FLOATING BOXES
   One shared component used by every panel (emoji / AI /
   phrases / translate / clipboard). Always sits ABOVE the key
   rows with a fixed 2cm gap, never covers or resizes the keys,
   and never contains a duplicate keyboard - typing happens on
   the real keys, which stay visible the entire time.
   ========================================================= */

function closeFloatingBox() {
  const area = document.getElementById("floatingArea");
  area.innerHTML = "";
  area.classList.remove("open");
  Bridge.collapse();
}

function createFloatingBox(title, kind) {
  closeFloatingBox();
  const area = document.getElementById("floatingArea");
  area.classList.add("open");
  Bridge.expand();

  const box = document.createElement("div");
  box.className = "float-box" + (kind ? " float-" + kind : "");

  const header = document.createElement("div");
  header.className = "float-header";

  const grip = document.createElement("span");
  grip.className = "float-grip";
  grip.innerHTML = '<svg viewBox="0 0 24 24" class="icon icon-grip"><circle cx="8" cy="6" r="1.4"/><circle cx="16" cy="6" r="1.4"/><circle cx="8" cy="12" r="1.4"/><circle cx="16" cy="12" r="1.4"/><circle cx="8" cy="18" r="1.4"/><circle cx="16" cy="18" r="1.4"/></svg>';

  const titleEl = document.createElement("span");
  titleEl.className = "float-title";
  titleEl.textContent = title;

  const closeBtn = document.createElement("button");
  closeBtn.className = "float-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.innerHTML = '<svg viewBox="0 0 24 24" class="icon"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  closeBtn.addEventListener("mousedown", (e) => e.preventDefault());
  closeBtn.onclick = () => closeFloatingBox();

  header.append(grip, titleEl, closeBtn);

  const content = document.createElement("div");
  content.className = "float-content";

  box.append(header, content);
  area.appendChild(box);
  makeDraggable(box, grip, area);
  return content;
}

function makeDraggable(box, handle, bounds) {
  let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;

  handle.addEventListener("pointerdown", (e) => {
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    sx = e.clientX; sy = e.clientY;
    ox = box.offsetLeft; oy = box.offsetTop;
    box.style.right = "auto";
  });
  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const boundsRect = bounds.getBoundingClientRect();
    let nx = ox + (e.clientX - sx);
    let ny = oy + (e.clientY - sy);
    nx = Math.max(0, Math.min(nx, Math.max(0, boundsRect.width - box.offsetWidth)));
    ny = Math.max(0, Math.min(ny, Math.max(0, boundsRect.height - box.offsetHeight)));
    box.style.left = nx + "px";
    box.style.top = ny + "px";
  });
  const endDrag = () => { dragging = false; };
  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);
}

function copyBoxHTML(text) {
  const wrap = document.createElement("div");
  wrap.className = "copy-box";
  const p = document.createElement("div");
  p.className = "copy-text";
  p.textContent = text;
  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.textContent = "Copy";
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.onclick = () => {
    navigator.clipboard?.writeText(text);
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = "Copy"), 1200);
  };
  wrap.append(p, btn);
  return wrap;
}

// ---------- CA: Call AI ----------
// Two slides sharing the same box: first-run asks only for the API key;
// once saved it never asks again and only the chat slide shows, with a
// delete-key button (top-left of that slide) to reset back to slide one.
function openAiPanel() {
  const content = createFloatingBox("Call AI", "ai");
  if (GroqKey.get()) renderAiChatStep(content);
  else renderAiKeyStep(content);
}

function renderAiKeyStep(content) {
  content.innerHTML = "";

  const label = document.createElement("div");
  label.className = "ai-hint";
  label.textContent = "Paste a free Groq API key once to enable Call AI.";

  const keyInput = document.createElement("input");
  keyInput.className = "ai-input local-typable";
  keyInput.type = "password";
  keyInput.inputMode = "none";
  keyInput.placeholder = "Paste Groq API key";

  const saveBtn = document.createElement("button");
  saveBtn.className = "ai-send";
  saveBtn.textContent = "Save & Continue";
  saveBtn.addEventListener("mousedown", (e) => e.preventDefault());
  saveBtn.onclick = () => {
    const key = keyInput.value.trim();
    if (!key) return;
    GroqKey.set(key);
    renderAiChatStep(content);
  };

  content.append(label, keyInput, saveBtn);
}

function renderAiChatStep(content) {
  content.innerHTML = "";

  const topRow = document.createElement("div");
  topRow.className = "ai-chat-top";
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "ai-delete-key";
  deleteBtn.setAttribute("aria-label", "Remove saved API key");
  deleteBtn.title = "Remove saved API key";
  deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" class="icon"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>';
  deleteBtn.addEventListener("mousedown", (e) => e.preventDefault());
  deleteBtn.onclick = () => {
    GroqKey.clear();
    renderAiKeyStep(content);
  };
  topRow.appendChild(deleteBtn);

  const input = document.createElement("textarea");
  input.className = "ai-input local-typable";
  input.inputMode = "none";
  input.placeholder = "Ask the AI anything...";

  const sendBtn = document.createElement("button");
  sendBtn.className = "ai-send";
  sendBtn.textContent = "Send";
  sendBtn.addEventListener("mousedown", (e) => e.preventDefault());

  const resultWrap = document.createElement("div");

  sendBtn.onclick = async () => {
    resultWrap.innerHTML = "<div class='media-loading'>Thinking\u2026</div>";
    try {
      const reply = await callGroq("You are a helpful, concise assistant inside a keyboard app.", input.value);
      resultWrap.innerHTML = "";
      resultWrap.appendChild(copyBoxHTML(reply));
    } catch (err) {
      resultWrap.innerHTML = `<div class='media-loading'>${err.message}</div>`;
    }
  };

  content.append(topRow, input, sendBtn, resultWrap);
}

// ---------- JT / JTE ----------
function openTranslatePanel(title, romaji) {
  const content = createFloatingBox(title, romaji ? "jte" : "jt");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "ai-input local-typable";
  input.inputMode = "none";
  input.placeholder = "Type an English word or sentence";
  const goBtn = document.createElement("button");
  goBtn.className = "ai-send";
  goBtn.textContent = "Translate";
  goBtn.addEventListener("mousedown", (e) => e.preventDefault());
  const resultWrap = document.createElement("div");

  goBtn.onclick = async () => {
    resultWrap.innerHTML = "<div class='media-loading'>Translating\u2026</div>";
    const sys = romaji
      ? "Translate the user's English text to Japanese, but output ONLY the Japanese written using romaji (English letters). No Japanese script, no explanation."
      : "Translate the user's English text to natural Japanese. Output ONLY the Japanese translation, no explanation.";
    try {
      const reply = await callGroq(sys, input.value);
      resultWrap.innerHTML = "";
      resultWrap.appendChild(copyBoxHTML(reply));
    } catch (err) {
      resultWrap.innerHTML = `<div class='media-loading'>${err.message}</div>`;
    }
  };

  content.append(input, goBtn, resultWrap);
}

// ---------- JW ----------
const JW_PHRASES = [
  ["Thank you","Arigatou"],["Thank you very much","Arigatou gozaimasu"],["You're welcome","Dou itashimashite"],
  ["Sorry / Excuse me","Sumimasen"],["I'm sorry","Gomen nasai"],["Yes","Hai"],["No","Iie"],
  ["Good morning","Ohayou gozaimasu"],["Good afternoon","Konnichiwa"],["Good evening","Konbanwa"],
  ["Good night","Oyasumi nasai"],["Goodbye","Sayounara"],["See you later","Mata ne"],
  ["Nice to meet you","Hajimemashite"],["How are you?","Ogenki desu ka"],["I'm fine","Genki desu"],
  ["Please","Onegaishimasu"],["What is this?","Kore wa nan desu ka"],["I don't understand","Wakarimasen"],
  ["I understand","Wakarimashita"],["Do you speak English?","Eigo wo hanasemasu ka"],
  ["What's your name?","Onamae wa nan desu ka"],["How much is this?","Kore wa ikura desu ka"],
  ["Where is the bathroom?","Toire wa doko desu ka"],["Help me","Tasukete"],["I love you","Aishiteru"],
  ["I like you","Suki desu"],["Cute","Kawaii"],["Cool / Awesome","Sugoi"],["Delicious","Oishii"],
  ["Let's go","Ikimashou"],["Wait a moment","Chotto matte"],["I'm hungry","Onaka ga suita"],
  ["I'm tired","Tsukareta"],["Good luck","Ganbatte"],["Congratulations","Omedetou"],["Welcome","Youkoso"],
  ["Today","Kyou"],["Tomorrow","Ashita"],["Yesterday","Kinou"],["Now","Ima"],["Later","Atode"],
  ["Friend","Tomodachi"],["Family","Kazoku"],["Water","Mizu"],["Food","Tabemono"],["Money","Okane"],
  ["School","Gakkou"],["Home","Ie"],["Work","Shigoto"],["I'm happy","Ureshii"],["I'm sad","Kanashii"],
  ["It's okay / no problem","Daijoubu"],["Really?","Honto"],["Of course","Mochiron"],
  ["I'm coming","Ikimasu"],["I'm leaving","Ittekimasu"],["I'm back","Tadaima"],["Welcome back","Okaeri"],
  ["Cheers!","Kanpai"],["One","Ichi"],["Two","Ni"],["Three","San"],["Four","Yon"],["Five","Go"],
  ["Six","Roku"],["Seven","Nana"],["Eight","Hachi"],["Nine","Kyuu"],["Ten","Juu"],
  ["I miss you","Aitai"],["Take care","Odaiji ni"],["Nice work / good job","Otsukaresama"],
  ["No way!","Uso"],["Amazing","Subarashii"],
];

function openJwPanel() {
  const content = createFloatingBox("Japanese Phrases", "jw");
  const search = document.createElement("input");
  search.type = "text";
  search.className = "ai-input local-typable";
  search.inputMode = "none";
  search.placeholder = "Search phrases...";
  const list = document.createElement("div");
  list.className = "jw-list";

  function renderList(filter) {
    list.innerHTML = "";
    const f = filter.toLowerCase();
    JW_PHRASES.filter(([en, jp]) => !f || en.toLowerCase().includes(f) || jp.toLowerCase().includes(f))
      .forEach(([en, jp]) => {
        const row = document.createElement("div");
        row.className = "jw-row";
        const text = document.createElement("div");
        text.innerHTML = `<div class="jw-en">${en}</div><div class="jw-jp">${jp}</div>`;
        const btn = document.createElement("button");
        btn.className = "copy-btn";
        btn.textContent = "Copy";
        btn.addEventListener("mousedown", (e) => e.preventDefault());
        btn.onclick = () => { navigator.clipboard?.writeText(jp); btn.textContent = "Copied"; setTimeout(() => btn.textContent = "Copy", 1000); };
        row.append(text, btn);
        list.appendChild(row);
      });
  }
  search.addEventListener("input", () => renderList(search.value));
  renderList("");

  content.append(search, list);
}
