/* =========================================================
   GT KEYBOARD - core app logic (floating-box UI)
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
   ICONS (inline SVG, no text labels anywhere)
   ========================================================= */

const ICONS = {
  gt: `<svg viewBox="0 0 24 24" class="ic ic-gt"><path d="M13 2 3 14h7l-1 8 11-13h-7z"/></svg>`,
  ai: `<svg viewBox="0 0 24 24" class="ic ic-ai"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>`,
  jw: `<svg viewBox="0 0 24 24" class="ic ic-jw"><path d="M4 5c3-1 5-1 8 0v14c-3-1-5-1-8 0z"/><path d="M20 5c-3-1-5-1-8 0v14c3-1 5-1 8 0z"/></svg>`,
  jt: `<svg viewBox="0 0 24 24" class="ic ic-jt"><path d="M4 7h9M8 4v3c0 5-2 8-5 10"/><path d="M13 10c1 3 3 5 7 6"/><path d="M14 20l4-9 4 9M15.6 17h4.8"/></svg>`,
  jte: `<svg viewBox="0 0 24 24" class="ic ic-jte"><path d="M3 6h7M6.5 4v2.4c0 3.6-1.4 5.7-3.5 7"/><path d="M9 8.5c.7 2.3 2 3.8 4.5 4.6"/><text x="13" y="19" font-size="10" font-weight="700" fill="currentColor" stroke="none">A</text></svg>`,
  clipboard: `<svg viewBox="0 0 24 24" class="ic ic-clip"><rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6M9 15h6"/></svg>`,
  kill: `<svg viewBox="0 0 24 24" class="ic ic-kill"><path d="M12 3v8"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/></svg>`,
  emoji: `<svg viewBox="0 0 24 24" class="ic ic-emoji"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.1" fill="currentColor" stroke="none"/><path d="M8 14c1.2 1.5 2.6 2.2 4 2.2s2.8-.7 4-2.2"/></svg>`,
  close: `<svg viewBox="0 0 24 24" class="ic ic-close"><path d="M5 5l14 14M19 5 5 19"/></svg>`,
  drag: `<svg viewBox="0 0 24 24" class="ic ic-drag"><circle cx="8" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="16" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="8" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="8" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="16" cy="18" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  send: `<svg viewBox="0 0 24 24" class="ic ic-send"><path d="M3 11l18-8-8 18-2.5-7.5z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" class="ic ic-trash"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" class="ic ic-copy"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`,
  gif: `<svg viewBox="0 0 24 24" class="ic ic-gif"><rect x="3" y="6" width="18" height="12" rx="2"/><text x="6" y="15" font-size="7" font-weight="800" fill="currentColor" stroke="none">GIF</text></svg>`,
  sticker: `<svg viewBox="0 0 24 24" class="ic ic-sticker"><path d="M4 12a8 8 0 0 1 8-8h4a4 4 0 0 1 4 4v4a8 8 0 0 1-8 8H8a4 4 0 0 1-4-4z"/><path d="M20 8h-3a3 3 0 0 1-3-3"/></svg>`,
  star: `<svg viewBox="0 0 24 24" class="ic ic-star"><path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3-5.4 3 1.3-6-4.5-4 6-.6z"/></svg>`,
  backspace: `<svg viewBox="0 0 24 24" class="ic ic-back"><path d="M8 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-6-7z"/><path d="M12 10l5 5M17 10l-5 5"/></svg>`,
  shift: `<svg viewBox="0 0 24 24" class="ic ic-shift"><path d="M12 3l7 8h-4v8H9v-8H5z"/></svg>`,
};
function icon(name) { return ICONS[name] || ""; }
function iconBtn(el, name) { el.innerHTML = icon(name); }

/* =========================================================
   LOCAL TYPING ENGINE
   ========================================================= */

let activeLocalField = null;
function markLocalField(el) { activeLocalField = el; }
function clearLocalFieldIfMatches(el) { if (activeLocalField === el) activeLocalField = null; }

function typeChar(ch) {
  if (activeLocalField) insertIntoLocalField(activeLocalField, ch);
  else Bridge.commitText(ch);
}
function typeBackspace() {
  if (activeLocalField) deleteFromLocalField(activeLocalField);
  else Bridge.deleteOne();
}
function typeEnter() {
  if (activeLocalField) activeLocalField.dispatchEvent(new Event("gt-enter"));
  else Bridge.enter();
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
document.addEventListener("focusin", (e) => {
  if (e.target.classList?.contains("local-typable")) markLocalField(e.target);
});
document.addEventListener("focusout", (e) => clearLocalFieldIfMatches(e.target));
document.addEventListener("mousedown", (e) => {
  if (e.target.closest(".key, .icon-btn, .emoji-tab, .emoji-cell")) {
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
  if (!key) throw new Error("No Groq API key saved yet.");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userText }],
    }),
  });
  if (!res.ok) throw new Error("Groq error " + res.status + ": " + (await res.text()).slice(0, 160));
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "(no response)";
}

/* =========================================================
   CLIPBOARD
   ========================================================= */

function saveClip(text) {
  const clips = JSON.parse(localStorage.getItem("clip_history") || "[]");
  clips.unshift({ text, t: Date.now() });
  localStorage.setItem("clip_history", JSON.stringify(clips.slice(0, 60)));
}
function getClips() { return JSON.parse(localStorage.getItem("clip_history") || "[]"); }
function deleteClip(index) {
  const clips = getClips();
  clips.splice(index, 1);
  localStorage.setItem("clip_history", JSON.stringify(clips));
}
function addLongPress(el, onLongPress, ms = 550) {
  let timer = null;
  const start = () => { timer = setTimeout(onLongPress, ms); };
  const cancel = () => { if (timer) clearTimeout(timer); };
  el.addEventListener("touchstart", start, { passive: true });
  el.addEventListener("touchend", cancel);
  el.addEventListener("touchmove", cancel);
  el.addEventListener("mousedown", start);
  el.addEventListener("mouseup", cancel);
  el.addEventListener("mouseleave", cancel);
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

let shiftOn = false, capsLock = false, lastShiftTap = 0;
function letterCase(ch) { return (shiftOn || capsLock) ? ch.toUpperCase() : ch; }

function buildKey(label, displayOverride) {
  const b = document.createElement("button");
  b.className = "key";
  b.textContent = displayOverride ?? label;
  b.dataset.key = label;
  return b;
}
function buildIconKey(label, iconName, extraClass) {
  const b = document.createElement("button");
  b.className = "key key-func" + (extraClass ? " " + extraClass : "");
  b.innerHTML = icon(iconName);
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
        rowEl.appendChild(buildIconKey("SHIFT", "shift", "key-wide" + (shiftOn || capsLock ? " key-active" : "")));
      } else if (k === "BACK") {
        rowEl.appendChild(buildIconKey("BACK", "backspace", "key-wide"));
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
      if (k === "BACK") { rowEl.appendChild(buildIconKey("BACK", "backspace", "key-wide")); }
      else if (k === switchTarget) {
        const b = buildKey(k, switchLabel); b.className = "key key-wide key-func";
        rowEl.appendChild(b);
      } else { rowEl.appendChild(buildKey(k)); }
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
  const emoji = buildIconKey("OPEN_EMOJI", "emoji");
  const space = buildKey("SPACE", "English"); space.className = "key key-space";
  const dot = buildKey(".", ".");
  const enter = buildKey("ENTER", "\u23ce"); enter.className = "key key-wide key-enter";
  if (fromView === "view-letters") rowEl.append(toNum, emoji, space, enter);
  else rowEl.append(abc, emoji, space, dot, enter);
  return rowEl;
}
function switchView(name) {
  document.querySelectorAll(".kb-view").forEach((v) => v.classList.remove("active"));
  document.getElementById(name).classList.add("active");
}

document.getElementById("keysArea").addEventListener("click", (e) => {
  const btn = e.target.closest(".key");
  if (!btn) return;
  const key = btn.dataset.key;

  if (key === "SHIFT") {
    const now = Date.now();
    if (now - lastShiftTap < 350) { capsLock = !capsLock; shiftOn = false; }
    else shiftOn = !shiftOn;
    lastShiftTap = now;
    renderLetters();
    return;
  }
  if (key === "BACK") { typeBackspace(); return; }
  if (key === "SPACE") { typeChar(" "); return; }
  if (key === "ENTER") { typeEnter(); return; }
  if (key === "TO_LETTERS") { switchView("view-letters"); return; }
  if (key === "TO_NUMSYM") { switchView("view-numsym"); return; }
  if (key === "SYM2") { switchView("view-symbols2"); return; }
  if (key === "NUM") { switchView("view-numsym"); return; }
  if (key === "OPEN_EMOJI") { openEmojiPanel(); return; }

  const ch = key.length === 1 ? letterCase(key) : key;
  typeChar(ch);
  if (shiftOn) { shiftOn = false; renderLetters(); }
});

renderLetters();
renderGrid("view-numsym", NUMSYM_ROWS, "?123", "SYM2");
renderGrid("view-symbols2", SYMBOLS2_ROWS, "?123", "NUM");

/* =========================================================
   ICON BUTTONS (topbar)
   ========================================================= */

iconBtn(document.getElementById("gtBtn"), "gt");
document.querySelectorAll('.gt-mini[data-panel]').forEach((btn) => {
  iconBtn(btn, btn.dataset.panel);
  btn.addEventListener("click", () => openPanel(btn.dataset.panel));
});
iconBtn(document.getElementById("clipboardBtn"), "clipboard");
iconBtn(document.getElementById("killGt"), "kill");
document.getElementById("clipboardBtn").addEventListener("click", openClipboardPanel);

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

/* =========================================================
   FLOATING PANELS
   ========================================================= */

function closeFloatingBox() {
  document.getElementById("floatingLayer").innerHTML = "";
  Bridge.collapse();
}
function createFloatingBox(iconName) {
  closeFloatingBox();
  Bridge.expand();
  const layer = document.getElementById("floatingLayer");
  const box = document.createElement("div");
  box.className = "float-box";
  const header = document.createElement("div");
  header.className = "float-header";
  const drag = document.createElement("span");
  drag.className = "drag-handle";
  drag.innerHTML = icon("drag");
  const titleIcon = document.createElement("span");
  titleIcon.className = "float-title-icon";
  titleIcon.innerHTML = icon(iconName);
  const closeBtn = document.createElement("button");
  closeBtn.className = "icon-btn float-close";
  closeBtn.innerHTML = icon("close");
  closeBtn.addEventListener("mousedown", (e) => e.preventDefault());
  closeBtn.onclick = () => closeFloatingBox();
  header.append(drag, titleIcon, closeBtn);
  const content = document.createElement("div");
  content.className = "float-content";
  box.append(header, content);
  layer.appendChild(box);
  makeDraggable(box, drag);
  return content;
}
function makeDraggable(box, handle) {
  let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
  handle.addEventListener("touchstart", (e) => {
    dragging = true;
    const t = e.touches[0];
    sx = t.clientX; sy = t.clientY;
    const rect = box.getBoundingClientRect();
    const parentRect = box.parentElement.getBoundingClientRect();
    ox = rect.left - parentRect.left; oy = rect.top - parentRect.top;
  });
  handle.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    box.style.left = (ox + (t.clientX - sx)) + "px";
    box.style.top = (oy + (t.clientY - sy)) + "px";
    box.style.right = "auto";
    box.style.bottom = "auto";
    e.preventDefault();
  }, { passive: false });
  handle.addEventListener("touchend", () => dragging = false);
}
function copyBoxHTML(text) {
  const wrap = document.createElement("div");
  wrap.className = "copy-box";
  const p = document.createElement("div");
  p.className = "copy-text";
  p.textContent = text;
  const btn = document.createElement("button");
  btn.className = "icon-btn copy-btn";
  btn.innerHTML = icon("copy");
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.onclick = () => {
    navigator.clipboard?.writeText(text);
    saveClip(text);
    btn.classList.add("copied");
    setTimeout(() => btn.classList.remove("copied"), 900);
  };
  wrap.append(p, btn);
  return wrap;
}
function openPanel(name) {
  if (name === "ai") openAiPanel();
  if (name === "jw") openJwPanel();
  if (name === "jt") openTranslatePanel("jt", false);
  if (name === "jte") openTranslatePanel("jte", true);
}

function openAiPanel() {
  const content = createFloatingBox("ai");
  const keyRow = document.createElement("div");
  keyRow.className = "ai-key-row";
  const keyInput = document.createElement("input");
  keyInput.className = "local-typable";
  keyInput.type = "password";
  keyInput.inputMode = "none";
  keyInput.placeholder = "Groq API key";
  keyInput.value = GroqKey.get();
  const saveBtn = document.createElement("button");
  saveBtn.className = "pill-btn";
  saveBtn.textContent = GroqKey.get() ? "\u2713" : "Save";
  saveBtn.addEventListener("mousedown", (e) => e.preventDefault());
  saveBtn.onclick = () => { GroqKey.set(keyInput.value.trim()); saveBtn.textContent = "\u2713"; };
  const delBtn = document.createElement("button");
  delBtn.className = "icon-btn pill-btn-icon";
  delBtn.innerHTML = icon("trash");
  delBtn.addEventListener("mousedown", (e) => e.preventDefault());
  delBtn.onclick = () => { GroqKey.clear(); keyInput.value = ""; saveBtn.textContent = "Save"; };
  keyRow.append(keyInput, saveBtn, delBtn);

  const input = document.createElement("textarea");
  input.className = "ai-input local-typable";
  input.inputMode = "none";
  input.placeholder = "Ask the AI anything...";
  const sendBtn = document.createElement("button");
  sendBtn.className = "icon-btn ai-send";
  sendBtn.innerHTML = icon("send");
  sendBtn.addEventListener("mousedown", (e) => e.preventDefault());
  const resultWrap = document.createElement("div");
  sendBtn.onclick = async () => {
    resultWrap.innerHTML = "<div class='media-loading'>Thinking\u2026</div>";
    try {
      const reply = await callGroq("You are a helpful, concise assistant inside a keyboard app.", input.value);
      resultWrap.innerHTML = "";
      resultWrap.appendChild(copyBoxHTML(reply));
    } catch (err) { resultWrap.innerHTML = `<div class='media-loading'>${err.message}</div>`; }
  };
  content.append(keyRow, input, sendBtn, resultWrap);
}

function openTranslatePanel(iconName, romaji) {
  const content = createFloatingBox(iconName);
  const input = document.createElement("input");
  input.type = "text";
  input.className = "ai-input local-typable";
  input.inputMode = "none";
  input.placeholder = "Type English text";
  const goBtn = document.createElement("button");
  goBtn.className = "icon-btn ai-send";
  goBtn.innerHTML = icon("send");
  goBtn.addEventListener("mousedown", (e) => e.preventDefault());
  const resultWrap = document.createElement("div");
  goBtn.onclick = async () => {
    resultWrap.innerHTML = "<div class='media-loading'>Translating\u2026</div>";
    const sys = romaji
      ? "Translate the user's English text to Japanese, but output ONLY romaji (English letters). No Japanese script, no explanation."
      : "Translate the user's English text to natural Japanese. Output ONLY the translation, no explanation.";
    try {
      const reply = await callGroq(sys, input.value);
      resultWrap.innerHTML = "";
      resultWrap.appendChild(copyBoxHTML(reply));
    } catch (err) { resultWrap.innerHTML = `<div class='media-loading'>${err.message}</div>`; }
  };
  content.append(input, goBtn, resultWrap);
}

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
  const content = createFloatingBox("jw");
  const search = document.createElement("input");
  search.type = "text";
  search.className = "ai-input local-typable";
  search.inputMode = "none";
  search.placeholder = "Search phrases";
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
        btn.className = "icon-btn copy-btn";
        btn.innerHTML = icon("copy");
        btn.addEventListener("mousedown", (e) => e.preventDefault());
        btn.onclick = () => { navigator.clipboard?.writeText(jp); saveClip(jp); btn.classList.add("copied"); setTimeout(() => btn.classList.remove("copied"), 800); };
        row.append(text, btn);
        list.appendChild(row);
      });
  }
  search.addEventListener("input", () => renderList(search.value));
  renderList("");
  content.append(search, list);
}

function openClipboardPanel() {
  const content = createFloatingBox("clipboard");
  const list = document.createElement("div");
  list.className = "jw-list";
  function render() {
    list.innerHTML = "";
    const clips = getClips();
    if (clips.length === 0) {
      list.innerHTML = "<div class='media-loading'>Nothing copied yet \u2014 items you copy in AI/JW get saved here. Hold to delete.</div>";
      return;
    }
    clips.forEach((c, i) => {
      const row = document.createElement("div");
      row.className = "jw-row clip-row";
      const text = document.createElement("div");
      text.className = "clip-text";
      text.textContent = c.text;
      row.appendChild(text);
      row.addEventListener("click", () => typeChar(c.text));
      addLongPress(row, () => { deleteClip(i); render(); });
      list.appendChild(row);
    });
  }
  render();
  content.appendChild(list);
}

/* =========================================================
   EMOJI / GIF / STICKER / SAVED
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
const RANGE_BLOCKS = [[0x1F600,0x1F64F],[0x1F300,0x1F5FF],[0x1F680,0x1F6FF],[0x1F900,0x1F9FF],[0x1FA70,0x1FAFF],[0x2600,0x26FF],[0x2700,0x27BF]];
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
let currentEmojiTab = "emoji";

function openEmojiPanel() {
  const content = createFloatingBox("emoji");
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

  function setTab(id) {
    currentEmojiTab = id;
    tabs.innerHTML = "";
    [["emoji","emoji"],["gif","gif"],["sticker","sticker"],["saved","star"]].forEach(([tid, ic]) => {
      const b = document.createElement("button");
      b.className = "icon-btn emoji-tab" + (currentEmojiTab === tid ? " active" : "");
      b.innerHTML = icon(ic);
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.onclick = () => setTab(tid);
      tabs.appendChild(b);
    });
    search.value = "";
    search.placeholder = id === "emoji" ? "Search emoji" : id === "gif" ? "Search GIFs" : id === "sticker" ? "Search stickers" : "Saved";
    if (id === "emoji") renderEmojiGrid(grid, ALL_EMOJI);
    else if (id === "saved") renderSavedGrid(grid);
    else renderMediaGrid(grid, id, "");
  }

  let searchDebounce;
  search.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    clearTimeout(searchDebounce);
    if (currentEmojiTab === "emoji") {
      renderEmojiGrid(grid, q ? ALL_EMOJI.filter(([, kw]) => kw && kw.includes(q)) : ALL_EMOJI);
    } else if (currentEmojiTab === "gif" || currentEmojiTab === "sticker") {
      searchDebounce = setTimeout(() => renderMediaGrid(grid, currentEmojiTab, q), 400);
    }
  });

  setTab("emoji");
}

function renderEmojiGrid(grid, list) {
  grid.innerHTML = "";
  grid.className = "emoji-grid-emoji";
  const frag = document.createDocumentFragment();
  list.forEach(([ch]) => {
    const b = document.createElement("button");
    b.className = "emoji-cell";
    b.textContent = ch;
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.onclick = () => typeChar(ch);
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
        const saved = JSON.parse(localStorage.getItem("saved_media") || "[]");
        saved.unshift({ thumb: item.images.fixed_width_small.url, original: item.images.original.url });
        localStorage.setItem("saved_media", JSON.stringify(saved.slice(0, 40)));
      };
      grid.appendChild(img);
    });
    if (!data.data || data.data.length === 0) grid.innerHTML = "<div class='media-loading'>No results</div>";
  } catch (err) { grid.innerHTML = "<div class='media-loading'>Couldn't load (check internet)</div>"; }
}

function renderSavedGrid(grid) {
  grid.className = "emoji-grid-media";
  const saved = JSON.parse(localStorage.getItem("saved_media") || "[]");
  grid.innerHTML = "";
  if (saved.length === 0) { grid.innerHTML = "<div class='media-loading'>Nothing saved yet</div>"; return; }
  saved.forEach((item) => {
    const img = document.createElement("img");
    img.className = "media-cell";
    img.src = item.thumb;
    img.addEventListener("mousedown", (e) => e.preventDefault());
    img.onclick = () => Bridge.commitGif(item.original, "image/gif");
    grid.appendChild(img);
  });
}
