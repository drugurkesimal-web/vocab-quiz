// app.js

// WORDS dizisi, WORDS.js dosyasından global olarak geliyor
// Örn: WORDS = [{en:'Abandone', tr:'Terk etmek'}, ...];

const STORAGE_KEY = "vocab_quiz_state_v1";

let state = {
  poolType: "all",           // "all" | "hardWrong"
  remaining: [],             // sorulacak indeksler
  answered: [],              // en az bir kere sorulmuş indeksler
  difficult: [],             // zor kelimeler indeksleri
  wrong: [],                 // en az bir kere yanlış yapılan indeksler
  totalAsked: 0,
  totalCorrect: 0,
  totalWrong: 0,
  currentIndex: null
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  loadState();
  initIfEmpty();
  renderStats();
  pickNextQuestion();
  attachEventHandlers();
});

function cacheElements() {
  elements.questionText = document.getElementById("question-text");
  elements.answers = document.getElementById("answers");
  elements.statTotal = document.getElementById("stat-total");
  elements.statCorrect = document.getElementById("stat-correct");
  elements.statWrong = document.getElementById("stat-wrong");
  elements.modeLabel = document.getElementById("mode-label");
  elements.remainingLabel = document.getElementById("remaining-label");
  elements.infoText = document.getElementById("info-text");

  elements.btnNext = document.getElementById("btn-next");
  elements.btnMarkHard = document.getElementById("btn-mark-hard");
  elements.btnHardTest = document.getElementById("btn-hard-test");
  elements.btnAllTest = document.getElementById("btn-all-test");
  elements.btnReset = document.getElementById("btn-reset");
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      initDefaultState();
      return;
    }
    const parsed = JSON.parse(saved);

    // Basit bir doğrulama
    if (!Array.isArray(parsed.remaining) || !Array.isArray(parsed.difficult) || !Array.isArray(parsed.wrong)) {
      initDefaultState();
      return;
    }

    state = {
      ...state,
      ...parsed,
    };
  } catch (e) {
    console.error("State yüklenirken hata:", e);
    initDefaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("State kaydedilemedi:", e);
  }
}

function initDefaultState() {
  state.poolType = "all";
  state.remaining = WORDS.map((_, idx) => idx);
  state.answered = [];
  state.difficult = [];
  state.wrong = [];
  state.totalAsked = 0;
  state.totalCorrect = 0;
  state.totalWrong = 0;
  state.currentIndex = null;
}

function initIfEmpty() {
  if (!Array.isArray(state.remaining) || state.remaining.length === 0) {
    // Havuz boşsa, pool tipine göre yeniden doldur
    if (state.poolType === "hardWrong") {
      const set = new Set([...(state.difficult || []), ...(state.wrong || [])]);
      const arr = Array.from(set);
      if (arr.length > 0) {
        state.remaining = arr;
      } else {
        // zor+yanlış yoksa tüm kelimelere dön
        state.poolType = "all";
        state.remaining = WORDS.map((_, idx) => idx);
      }
    } else {
      state.poolType = "all";
      state.remaining = WORDS.map((_, idx) => idx);
    }
  }
}

function renderStats() {
  elements.statTotal.textContent = state.totalAsked;
  elements.statCorrect.textContent = state.totalCorrect;
  elements.statWrong.textContent = state.totalWrong;

  elements.modeLabel.textContent =
    state.poolType === "all" ? "Tüm kelimeler" : "Sadece zor + yanlışlar";

  elements.remainingLabel.textContent = `${state.remaining.length} kaldı`;

  // Zor kelime butonu aktif mi (bu kelime zor listesinde mi)
  if (
    state.currentIndex !== null &&
    state.difficult.includes(state.currentIndex)
  ) {
    elements.btnMarkHard.classList.add("hard-active");
  } else {
    elements.btnMarkHard.classList.remove("hard-active");
  }
}

function pickNextQuestion() {
  clearAnswers();
  if (!state.remaining || state.remaining.length === 0) {
    elements.questionText.textContent =
      "Bu moddaki tüm kelimeleri bitirdin. İstersen yeni bir test başlat.";
    elements.btnNext.disabled = true;
    return;
  }

  // Rastgele indeks seç
  const rIdx = Math.floor(Math.random() * state.remaining.length);
  const wordIndex = state.remaining[rIdx];

  // Havuzdan çıkar ki tekrar gelmesin
  state.remaining.splice(rIdx, 1);

  state.currentIndex = wordIndex;
  if (!state.answered.includes(wordIndex)) {
    state.answered.push(wordIndex);
  }

  const word = WORDS[wordIndex];
  elements.questionText.textContent = word.en;

  // Şıkları hazırla (doğru + 3 yanlış)
  const options = buildOptions(wordIndex);

  // Cevap butonlarını oluştur
  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.textContent = opt.tr;
    btn.dataset.correct = opt.correct ? "1" : "0";
    btn.addEventListener("click", () => handleAnswerClick(btn));
    elements.answers.appendChild(btn);
  });

  // Bilmiyorum butonu
  const dontKnowBtn = document.createElement("button");
  dontKnowBtn.className = "answer-btn";
  dontKnowBtn.textContent = "Bilmiyorum";
  dontKnowBtn.dataset.dontknow = "1";
  dontKnowBtn.addEventListener("click", () =>
    handleDontKnow(dontKnowBtn)
  );
  elements.answers.appendChild(dontKnowBtn);

  elements.btnNext.disabled = true;
  renderStats();
  saveState();
}

function buildOptions(correctIndex) {
  const correctWord = WORDS[correctIndex];

  const used = new Set();
  used.add(correctIndex);

  const options = [{ tr: correctWord.tr, correct: true }];

  // 3 tane farklı yanlış şık seç
  while (options.length < 4) {
    const rnd = Math.floor(Math.random() * WORDS.length);
    if (used.has(rnd)) continue;
    used.add(rnd);
    options.push({ tr: WORDS[rnd].tr, correct: false });
  }

  // Karıştır
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

function clearAnswers() {
  elements.answers.innerHTML = "";
}

function disableAnswerButtons() {
  const btns = elements.answers.querySelectorAll(".answer-btn");
  btns.forEach((b) => b.classList.add("disabled"));
}

function handleAnswerClick(btn) {
  if (btn.classList.contains("disabled")) return;

  const isCorrect = btn.dataset.correct === "1";
  const allBtns = elements.answers.querySelectorAll(".answer-btn");
  const wordIndex = state.currentIndex;

  state.totalAsked += 1;

  if (isCorrect) {
    btn.classList.add("correct");
    state.totalCorrect += 1;
  } else {
    btn.classList.add("wrong");
    state.totalWrong += 1;
    if (!state.wrong.includes(wordIndex)) {
      state.wrong.push(wordIndex);
    }
  }

  // Doğru şıkkı yeşile boya
  allBtns.forEach((b) => {
    if (b.dataset.correct === "1") {
      b.classList.add("correct");
    }
  });

  disableAnswerButtons();
  elements.btnNext.disabled = false;
  renderStats();
  saveState();
}

function handleDontKnow(btn) {
  if (btn.classList.contains("disabled")) return;

  const allBtns = elements.answers.querySelectorAll(".answer-btn");
  const wordIndex = state.currentIndex;

  state.totalAsked += 1;
  state.totalWrong += 1;
  if (!state.wrong.includes(wordIndex)) {
    state.wrong.push(wordIndex);
  }

  // “Bilmiyorum” butonunu kırmızı, doğru cevabı yeşil yap
  btn.classList.add("wrong");
  allBtns.forEach((b) => {
    if (b.dataset.correct === "1") {
      b.classList.add("correct");
    }
  });

  disableAnswerButtons();
  elements.btnNext.disabled = false;
  renderStats();
  saveState();
}

function attachEventHandlers() {
  elements.btnNext.addEventListener("click", () => {
    pickNextQuestion();
  });

  elements.btnMarkHard.addEventListener("click", () => {
    if (state.currentIndex === null) return;
    const idx = state.currentIndex;
    if (!state.difficult.includes(idx)) {
      state.difficult.push(idx);
    }
    renderStats();
    saveState();
  });

  elements.btnHardTest.addEventListener("click", () => {
    const pool = new Set([
      ...(state.difficult || []),
      ...(state.wrong || []),
    ]);
    const arr = Array.from(pool);

    if (arr.length === 0) {
      alert("Henüz zor veya yanlış kelime yok.");
      return;
    }

    state.poolType = "hardWrong";
    state.remaining = arr.slice(); // kopya
    state.currentIndex = null;
    elements.infoText.textContent =
      "Şu an sadece zor işaretlediğin ve yanlış yaptığın kelimeleri çözüyorsun.";
    pickNextQuestion();
  });

  elements.btnAllTest.addEventListener("click", () => {
    state.poolType = "all";
    state.remaining = WORDS.map((_, idx) => idx);
    state.currentIndex = null;
    elements.infoText.textContent =
      "Şu an tüm kelimelerden yeni bir test başlattın. İlerleme (doğru/yanlış ve zor liste) sıfırlanmadı.";
    pickNextQuestion();
  });

  elements.btnReset.addEventListener("click", () => {
    if (!confirm("Tüm ilerlemeyi sıfırlamak istediğine emin misin?")) {
      return;
    }
    initDefaultState();
    saveState();
    elements.infoText.textContent =
      "İlerleme tamamen sıfırlandı. Tüm kelimelerden yeni bir test başlıyor.";
    pickNextQuestion();
  });
}
