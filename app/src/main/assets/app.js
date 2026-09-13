/* =========================================================
   GT KEYBOARD - core app logic
   ========================================================= */

const GIPHY_KEY = "x3lgplS4mV35AlgS0ROivHNJAxz3E7j8"; // your Giphy key

// ---------- native bridge (falls back to console when testing in a normal browser) ----------
const Bridge = {
  commitText: (t) => window.Android ? Android.commitText(t) : console.log("TYPE:", t),
  deleteOne: () => window.Android ? Android.deleteOne() : console.log("DEL"),
  enter: () => window.Android ? Android.sendEnter() : console.log("ENTER"),
  prevIme: () => window.Android ? Android.switchToPreviousIme() : console.log("SWITCH IME"),
  commitGif: (url, mime) => window.Android ? Android.commitGif(url, mime) : console.log("GIF:", url),
};

// ---------- Groq key storage ----------
const GroqKey = {
  get: () => localStorage.getItem("groq_api_key") || "",
  set: (k) => localStorage.setItem("groq_api_key", k),
  clear: () => localStorage.removeItem("groq_api_key"),
};

async function callGroq(systemPrompt, userText) {
  const key = GroqKey.get();
  if (!key) throw new Error("No Groq API key saved yet. Open CA and paste your key first.");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + key,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Groq error " + res.status + ": " + errText.slice(0, 200));
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
  ["~","`","|",".","√","π","÷","×","§","Δ"],
  ["£","¢","€","¥","^","°","=","{","}","\\"],
  ["NUM","%","©","®","™","✓","[","]","BACK"],
];

let shiftOn = false;
let capsLock = false;
let lastShiftTap = 0;

function letterCase(ch) {
  return (shiftOn || capsLock) ? ch.toUpperCase() : ch;
}

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
        b.className = "key key-wide" + (shiftOn || capsLock ? " key-active" : "");
        rowEl.appendChild(b);
      } else if (k === "BACK") {
        const b = buildKey("BACK", "\u232b");
        b.className = "key key-wide";
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
        b.className = "key key-wide";
        rowEl.appendChild(b);
      } else if (k === switchTarget) {
        const b = buildKey(k, switchLabel);
        b.className = "key key-wide";
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

  const abc = buildKey("TO_LETTERS", "ABC");
  abc.className = "key key-wide";

  const toNum = buildKey("TO_NUMSYM", "?123");
  toNum.className = "key key-wide";

  const emoji = buildKey("TO_EMOJI", "\u263a");
  emoji.className = "key";

  const space = buildKey("SPACE", "English");
  space.className = "key key-space";

  const dot = buildKey(".", ".");

  const enter = buildKey("ENTER", "\u23ce");
  enter.className = "key key-wide key-enter";

  if (fromView === "view-letters") {
    rowEl.appendChild(toNum);
    rowEl.appendChild(emoji);
    rowEl.appendChild(space);
    rowEl.appendChild(enter);
  } else {
    rowEl.appendChild(abc);
    rowEl.appendChild(emoji);
    rowEl.appendChild(space);
    rowEl.appendChild(dot);
    rowEl.appendChild(enter);
  }
  return rowEl;
}

function switchView(name) {
  document.querySelectorAll(".kb-view").forEach((v) => v.classList.remove("active"));
  document.getElementById(name).classList.add("active");
}

// ---------- key press handling (delegated) ----------
document.getElementById("kb-root").addEventListener("click", (e) => {
  const btn = e.target.closest(".key");
  if (!btn) return;
  const key = btn.dataset.key;

  if (key === "SHIFT") {
    const now = Date.now();
    if (now - lastShiftTap < 350) {
      capsLock = !capsLock;
      shiftOn = false;
    } else {
      shiftOn = !shiftOn;
    }
    lastShiftTap = now;
    renderLetters();
    return;
  }
  if (key === "BACK") { Bridge.deleteOne(); return; }
  if (key === "SPACE") { Bridge.commitText(" "); return; }
  if (key === "ENTER") { Bridge.enter(); return; }
  if (key === "TO_LETTERS") { switchView("view-letters"); return; }
  if (key === "TO_NUMSYM") { switchView("view-numsym"); return; }
  if (key === "SYM2") { switchView("view-symbols2"); return; }
  if (key === "NUM") { switchView("view-numsym"); return; }
  if (key === "TO_EMOJI") { switchView("view-emoji"); renderEmojiTabActive(); return; }

  // plain character
  const ch = key.length === 1 ? letterCase(key) : key;
  Bridge.commitText(ch);
  if (shiftOn) { shiftOn = false; renderLetters(); }
});

renderLetters();
renderGrid("view-numsym", NUMSYM_ROWS, "?123", "SYM2");
renderGrid("view-symbols2", SYMBOLS2_ROWS, "?123", "NUM");

/* =========================================================
   EMOJI / GIF / STICKER / SAVED
   ========================================================= */

const EMOJI_DATA = [
  ["\ud83d\ude00","grin happy face smile"],["\ud83d\ude01","grin happy"],["\ud83d\ude02","laugh cry funny lol"],["\ud83e\udd23","rofl laugh funny"],
  ["\ud83d\ude0a","smile happy blush"],["\ud83d\ude0d","love heart eyes"],["\ud83e\udd70","love hearts happy"],["\ud83d\ude18","kiss love"],
  ["\ud83d\ude09","wink"],["\ud83d\ude0e","cool sunglasses"],["\ud83e\udd29","star eyes excited"],["\ud83e\udd73","party celebrate"],
  ["\ud83d\ude22","cry sad"],["\ud83d\ude2d","cry sob sad"],["\ud83d\ude21","angry mad"],["\ud83d\ude31","shock scared"],
  ["\ud83d\ude34","sleep tired"],["\ud83e\udd14","think hmm"],["\ud83d\ude05","sweat nervous laugh"],["\ud83d\ude07","angel innocent"],
  ["\ud83d\ude43","upside down silly"],["\ud83d\ude0f","smirk"],["\ud83e\udd7a","pleading please cute"],["\ud83e\udd17","hug"],
  ["\ud83d\ude10","neutral meh"],["\ud83d\ude44","eye roll"],["\ud83d\ude2c","grimace awkward"],["\ud83e\udd2f","mind blown shocked"],
  ["\ud83e\udd75","hot sweating"],["\ud83e\udd76","cold freezing"],["\ud83e\udd12","sick fever"],["\ud83e\udd22","sick nausea"],
  ["\ud83d\udc4d","thumbs up good yes like"],["\ud83d\udc4e","thumbs down no dislike"],["\ud83d\udc4f","clap applause"],["\ud83d\ude4c","hands up celebrate"],
  ["\ud83d\ude4f","pray thanks please"],["\ud83d\udc4b","wave hi hello bye"],["\u270c\ufe0f","peace victory"],["\ud83e\udd1d","handshake deal"],
  ["\ud83d\udcaa","strong muscle flex"],["\ud83d\udc40","eyes look"],["\ud83d\udd25","fire lit hot"],["\ud83d\udcaf","hundred perfect"],
  ["\u2705","check done yes correct"],["\u274c","cross no wrong"],["\u2764\ufe0f","love heart red"],["\ud83d\udc94","heartbreak sad"],
  ["\ud83d\ude3b","cat love heart"],["\ud83d\udc36","dog puppy"],["\ud83d\udc31","cat kitten"],["\ud83e\udd8a","fox"],["\ud83d\udc3c","panda"],
  ["\ud83d\udc38","frog"],["\ud83d\udc35","monkey"],["\ud83e\udd81","lion"],["\ud83d\udc2f","tiger"],["\ud83d\udc0d","snake"],
  ["\ud83c\udf55","pizza food"],["\ud83c\udf54","burger food"],["\ud83c\udf5f","fries food"],["\ud83c\udf5c","noodles ramen food"],
  ["\ud83c\udf63","sushi japanese food"],["\ud83c\udf69","donut sweet"],["\u2615","coffee drink"],["\ud83c\udf7a","beer drink"],
  ["\ud83c\udfae","game controller gaming"],["\ud83c\udfa7","headphones music"],["\ud83c\udfb5","music note"],["\ud83d\udcf1","phone mobile"],
  ["\ud83d\udcbb","laptop computer code"],["\u26a1","lightning bolt energy fast"],["\ud83d\ude80","rocket launch fast"],["\ud83c\udf1f","star sparkle"],
  ["\ud83c\udf08","rainbow"],["\ud83c\udf19","moon night"],["\u2600\ufe0f","sun day"],["\u2b50","star favorite"],
  ["\ud83c\udf89","party celebrate confetti"],["\ud83c\udf82","birthday cake"],["\ud83c\udfc6","trophy win champion"],["\u2694\ufe0f","swords fight battle"],
  ["\ud83c\udfaf","target goal aim"],["\ud83d\udcb0","money cash rich"],["\ud83d\udc8e","diamond gem"],["\ud83d\udd12","lock secure"],
  ["\ud83d\udd13","unlock"],["\ud83d\udccc","pin note"],["\ud83d\udcce","clip attach"],["\u2728","sparkle magic"],
  ["\ud83d\udc51","crown king queen"],["\ud83d\udc09","dragon"],["\ud83e\udd77","ninja"],["\ud83e\udd16","robot ai bot"],
  ["\ud83d\uddfe","japan map"],["\ud83c\udf8c","japan flag crossed"],["\ud83c\uddef\ud83c\uddf5","flag japan"],["\ud83c\uddee\ud83c\uddf3","flag india"],
  ["\ud83c\uddfa\ud83c\uddf8","flag usa"],["\ud83c\uddec\ud83c\udde7","flag uk"],["\ud83c\udff3\ufe0f","white flag"],["\ud83d\udda4","black heart"],
  ["\ud83d\udc99","blue heart"],["\ud83d\udc9a","green heart"],["\ud83d\udc9b","yellow heart"],["\ud83e\udde1","orange heart"],
];

let currentEmojiTab = "emoji";

function renderEmojiTabActive() {
  const tabs = document.getElementById("emojiTabs");
  tabs.innerHTML = "";
  [["emoji","\ud83d\ude00"],["gif","GIF"],["sticker","STK"],["saved","\u2605"]].forEach(([id,label]) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.className = "emoji-tab" + (currentEmojiTab === id ? " active" : "");
    b.onclick = () => { currentEmojiTab = id; renderEmojiTabActive(); };
    tabs.appendChild(b);
  });

  const searchBox = document.getElementById("emojiSearch");
  searchBox.value = "";
  searchBox.placeholder = currentEmojiTab === "emoji" ? "Search emoji"
    : currentEmojiTab === "gif" ? "Search GIFs"
    : currentEmojiTab === "sticker" ? "Search stickers"
    : "Saved items";

  if (currentEmojiTab === "emoji") renderEmojiGrid(EMOJI_DATA);
  else if (currentEmojiTab === "saved") renderSavedGrid();
  else renderMediaGrid(currentEmojiTab, "");
}

function renderEmojiGrid(list) {
  const grid = document.getElementById("emojiGrid");
  grid.innerHTML = "";
  grid.className = "emoji-grid-emoji";
  list.forEach(([ch]) => {
    const b = document.createElement("button");
    b.className = "emoji-cell";
    b.textContent = ch;
    b.onclick = () => Bridge.commitText(ch);
    grid.appendChild(b);
  });
}

async function renderMediaGrid(kind, query) {
  const grid = document.getElementById("emojiGrid");
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
      img.onclick = () => {
        Bridge.commitGif(item.images.original.url, "image/gif");
        saveToRecent(item.images.fixed_width_small.url, item.images.original.url);
      };
      grid.appendChild(img);
    });
    if (!data.data || data.data.length === 0) {
      grid.innerHTML = "<div class='media-loading'>No results</div>";
    }
  } catch (err) {
    grid.innerHTML = "<div class='media-loading'>Couldn't load (check internet)</div>";
  }
}

function saveToRecent(thumb, original) {
  const saved = JSON.parse(localStorage.getItem("saved_media") || "[]");
  saved.unshift({ thumb, original });
  localStorage.setItem("saved_media", JSON.stringify(saved.slice(0, 40)));
}

function renderSavedGrid() {
  const grid = document.getElementById("emojiGrid");
  grid.className = "emoji-grid-media";
  const saved = JSON.parse(localStorage.getItem("saved_media") || "[]");
  grid.innerHTML = "";
  if (saved.length === 0) {
    grid.innerHTML = "<div class='media-loading'>Nothing saved yet - GIFs/stickers you send get saved here</div>";
    return;
  }
  saved.forEach((item) => {
    const img = document.createElement("img");
    img.className = "media-cell";
    img.src = item.thumb;
    img.onclick = () => Bridge.commitGif(item.original, "image/gif");
    grid.appendChild(img);
  });
}

let searchDebounce;
document.getElementById("emojiSearch").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  clearTimeout(searchDebounce);
  if (currentEmojiTab === "emoji") {
    const filtered = q ? EMOJI_DATA.filter(([, kw]) => kw.includes(q)) : EMOJI_DATA;
    renderEmojiGrid(filtered);
  } else if (currentEmojiTab === "gif" || currentEmojiTab === "sticker") {
    searchDebounce = setTimeout(() => renderMediaGrid(currentEmojiTab, q), 400);
  }
});

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
});

document.querySelectorAll(".gt-mini[data-panel]").forEach((btn) => {
  btn.addEventListener("click", () => openPanel(btn.dataset.panel));
});

/* =========================================================
   FLOATING DRAGGABLE BOXES
   ========================================================= */

function createFloatingBox(title) {
  const layer = document.getElementById("floatingLayer");
  const existing = document.getElementById("float-" + title);
  if (existing) existing.remove();

  const box = document.createElement("div");
  box.className = "float-box";
  box.id = "float-" + title;

  const header = document.createElement("div");
  header.className = "float-header";
  const titleEl = document.createElement("span");
  titleEl.textContent = title;
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "\u2715";
  closeBtn.className = "float-close";
  closeBtn.onclick = () => box.remove();
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  const content = document.createElement("div");
  content.className = "float-content";

  box.appendChild(header);
  box.appendChild(content);
  layer.appendChild(box);

  makeDraggable(box, header);
  return content;
}

function makeDraggable(box, handle) {
  let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
  handle.addEventListener("touchstart", (e) => {
    dragging = true;
    const t = e.touches[0];
    sx = t.clientX; sy = t.clientY;
    const rect = box.getBoundingClientRect();
    ox = rect.left; oy = rect.top;
  });
  handle.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    box.style.left = (ox + dx) + "px";
    box.style.top = (oy + dy) + "px";
    box.style.right = "auto";
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
  btn.className = "copy-btn";
  btn.textContent = "Copy";
  btn.onclick = () => {
    navigator.clipboard?.writeText(text);
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = "Copy"), 1200);
  };
  wrap.appendChild(p);
  wrap.appendChild(btn);
  return wrap;
}

function openPanel(name) {
  if (name === "ai") openAiPanel();
  if (name === "jw") openJwPanel();
  if (name === "jt") openTranslatePanel("Eng to JP", "jt", false);
  if (name === "jte") openTranslatePanel("Eng to JP (romaji)", "jte", true);
}

// ---------- CA: Call AI ----------
function openAiPanel() {
  const content = createFloatingBox("Call AI");

  const keyRow = document.createElement("div");
  keyRow.className = "ai-key-row";
  const keyInput = document.createElement("input");
  keyInput.type = "password";
  keyInput.placeholder = "Paste Groq API key";
  keyInput.value = GroqKey.get();
  const saveBtn = document.createElement("button");
  saveBtn.textContent = GroqKey.get() ? "Saved" : "Save";
  saveBtn.onclick = () => { GroqKey.set(keyInput.value.trim()); saveBtn.textContent = "Saved"; };
  const delBtn = document.createElement("button");
  delBtn.textContent = "Delete";
  delBtn.onclick = () => { GroqKey.clear(); keyInput.value = ""; saveBtn.textContent = "Save"; };
  keyRow.append(keyInput, saveBtn, delBtn);

  const input = document.createElement("textarea");
  input.className = "ai-input";
  input.placeholder = "Ask the AI anything...";

  const sendBtn = document.createElement("button");
  sendBtn.className = "ai-send";
  sendBtn.textContent = "Send";

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

  content.append(keyRow, input, sendBtn, resultWrap);
}

// ---------- JT / JTE: translate ----------
function openTranslatePanel(title, mode, romaji) {
  const content = createFloatingBox(title);
  const input = document.createElement("input");
  input.type = "text";
  input.className = "ai-input";
  input.placeholder = "Type an English word or sentence";
  const goBtn = document.createElement("button");
  goBtn.className = "ai-send";
  goBtn.textContent = "Translate";
  const resultWrap = document.createElement("div");

  goBtn.onclick = async () => {
    resultWrap.innerHTML = "<div class='media-loading'>Translating\u2026</div>";
    const sys = romaji
      ? "Translate the user's English text to Japanese, but output ONLY the Japanese written using romaji (English letters representing the Japanese sounds). No Japanese script, no explanation."
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

// ---------- JW: instant Japanese phrasebook ----------
const JW_PHRASES = [
  ["Thank you","Arigatou"],["Thank you very much","Arigatou gozaimasu"],["You're welcome","Dou itashimashite"],
  ["Sorry / Excuse me","Sumimasen"],["I'm sorry","Gomen nasai"],["Yes","Hai"],["No","Iie"],
  ["Good morning","Ohayou gozaimasu"],["Good afternoon","Konnichiwa"],["Good evening","Konbanwa"],
  ["Good night","Oyasumi nasai"],["Goodbye","Sayounara"],["See you later","Mata ne"],
  ["Nice to meet you","Hajimemashite"],["How are you?","Ogenki desu ka"],["I'm fine","Genki desu"],
  ["Please","Onegaishimasu"],["What is this?","Kore wa nan desu ka"],["I don't understand","Wakarimasen"],
  ["I understand","Wakarimashita"],["Do you speak English?","Eigo wo hanasemasu ka"],
  ["My name is...","Watashi no namae wa ... desu"],["What's your name?","Onamae wa nan desu ka"],
  ["How much is this?","Kore wa ikura desu ka"],["Where is the bathroom?","Toire wa doko desu ka"],
  ["Help me","Tasukete"],["I love you","Aishiteru"],["I like you","Suki desu"],
  ["Cute","Kawaii"],["Cool / Awesome","Sugoi"],["Delicious","Oishii"],["Let's go","Ikimashou"],
  ["Wait a moment","Chotto matte"],["I'm hungry","Onaka ga suita"],["I'm tired","Tsukareta"],
  ["Good luck","Ganbatte"],["Congratulations","Omedetou"],["Welcome","Youkoso"],
  ["Please give me...","... wo kudasai"],["How much does it cost?","Ikura desu ka"],
  ["I'm sorry, I'm late","Osoku natte sumimasen"],["What time is it?","Ima nanji desu ka"],
  ["Today","Kyou"],["Tomorrow","Ashita"],["Yesterday","Kinou"],["Now","Ima"],["Later","Atode"],
  ["Friend","Tomodachi"],["Family","Kazoku"],["Water","Mizu"],["Food","Tabemono"],
  ["Money","Okane"],["School","Gakkou"],["Home","Ie"],["Work","Shigoto"],
  ["I'm happy","Ureshii"],["I'm sad","Kanashii"],["I'm angry","Okotteru"],["I'm scared","Kowai"],
  ["It's okay / no problem","Daijoubu"],["Really?","Honto"],["Of course","Mochiron"],
  ["Let's eat","Itadakimasu"],["That was delicious (after eating)","Gochisousama"],
  ["Please wait here","Koko de matte kudasai"],["I'm coming","Ikimasu"],["I'm leaving","Ittekimasu"],
  ["I'm back","Tadaima"],["Welcome back","Okaeri"],["Cheers!","Kanpai"],
  ["One","Ichi"],["Two","Ni"],["Three","San"],["Four","Yon"],["Five","Go"],
  ["Six","Roku"],["Seven","Nana"],["Eight","Hachi"],["Nine","Kyuu"],["Ten","Juu"],
  ["What are you doing?","Nani shiteru no"],["I miss you","Aitai"],["Take care","Odaiji ni"],
  ["Nice work / good job","Otsukaresama"],["No way!","Uso"],["Amazing","Subarashii"],
];

function openJwPanel() {
  const content = createFloatingBox("Japanese Phrases");
  const search = document.createElement("input");
  search.type = "text";
  search.className = "ai-input";
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
        btn.onclick = () => { navigator.clipboard?.writeText(jp); btn.textContent = "Copied"; setTimeout(() => btn.textContent = "Copy", 1000); };
        row.append(text, btn);
        list.appendChild(row);
      });
  }
  search.addEventListener("input", () => renderList(search.value));
  renderList("");

  content.append(search, list);
}
