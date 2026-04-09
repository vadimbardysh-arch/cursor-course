/* ===== CURSOR COURSE — GAMIFIED QUIZ ENGINE ===== */

const STORAGE_KEY = 'cursor_course_progress';
const NAME_KEY = 'cursor_course_user';
const TOTAL_MODULES = 8;
const POINTS_CORRECT = 100;
const POINTS_STREAK_BONUS = 25;
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwKSwoZM5KV_93YpzvKjmipjxt_c322XZl0bxnnLn7DrMcpaEsk4U1ZIUGOMsLd0JtW/exec';

/* ===== USER NAME ===== */

function getUserName() { return localStorage.getItem(NAME_KEY); }
function setUserName(n) { localStorage.setItem(NAME_KEY, n.trim()); }

function ensureUserName() {
  if (getUserName()) return;
  const overlay = document.getElementById('name-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  const input = overlay.querySelector('.name-input');
  const btn = overlay.querySelector('.name-submit');
  function submit() {
    const v = input.value.trim();
    if (!v) { input.focus(); return; }
    setUserName(v);
    overlay.classList.add('hidden');
    if (typeof updateProgressUI === 'function') updateProgressUI();
  }
  btn.addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  input.focus();
}

/* ===== PROGRESS STORAGE ===== */

function getProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveModuleResult(moduleIndex, score, total, points) {
  const progress = getProgress();
  const prev = progress[moduleIndex];
  const passed = score >= Math.ceil(total * 0.6);
  if (prev && prev.points >= (points || 0) && prev.passed) return;
  progress[moduleIndex] = {
    score, total, points: points || 0,
    passed,
    date: new Date().toLocaleDateString('uk-UA'),
    user: getUserName() || 'Anonymous'
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  sendToGoogleSheet(moduleIndex, score, total, points);
}

function isModuleCompleted(i) { const p = getProgress()[i]; return p && p.passed; }
function getCompletedCount() { return Object.values(getProgress()).filter(v => v.passed).length; }
function getTotalPoints() { return Object.values(getProgress()).reduce((s, v) => s + (v.points || 0), 0); }

/* ===== GOOGLE SHEET ===== */

function sendToGoogleSheet(moduleIndex, score, total, points) {
  if (!GOOGLE_SHEET_URL) return;
  fetch(GOOGLE_SHEET_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: getUserName() || 'Anonymous',
      module: moduleIndex, score, total, points,
      date: new Date().toISOString(),
      passed: score >= Math.ceil(total * 0.6)
    })
  }).catch(() => {});
}

/* ===== INDEX PAGE UI ===== */

function updateProgressUI() {
  const completed = getCompletedCount();
  const pct = Math.round((completed / TOTAL_MODULES) * 100);
  const pts = getTotalPoints();

  const fill = document.querySelector('.hero-progress-fill');
  if (fill) fill.style.width = pct + '%';

  const label = document.querySelector('.hero-progress-label');
  if (label) label.textContent = `${completed} з ${TOTAL_MODULES} модулів`;

  const ptsEl = document.getElementById('total-points');
  if (ptsEl) ptsEl.textContent = pts.toLocaleString();

  document.querySelectorAll('.module-card').forEach(card => {
    const idx = parseInt(card.dataset.module, 10);
    const status = card.querySelector('.module-card-status');
    if (isNaN(idx) || !status) return;
    if (isModuleCompleted(idx)) {
      status.classList.add('completed');
      status.textContent = '✓';
    }
    const p = getProgress()[idx];
    const meta = card.querySelector('.module-card-meta');
    if (p && meta) meta.textContent = `${p.score}/${p.total} · ${p.points || 0} очок · ${p.date}`;
  });

  const nameEl = document.getElementById('user-greeting');
  const name = getUserName();
  if (nameEl && name) nameEl.textContent = `Привіт, ${name}!`;
}

/* ===== CONFETTI ===== */

function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 200,
    w: 6 + Math.random() * 8,
    h: 4 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI * 2,
    rv: (Math.random() - 0.5) * 0.2
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    pieces.forEach(p => {
      if (p.y > canvas.height + 20) return;
      alive = true;
      p.x += p.vx; p.y += p.vy; p.rot += p.rv; p.vy += 0.1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (alive && frame < 180) requestAnimationFrame(draw);
    else canvas.remove();
  }
  draw();
}

/* ===== FLOATING POINTS ===== */

function showFloatingPoints(pts, x, y) {
  const el = document.createElement('div');
  el.className = 'floating-points';
  el.textContent = `+${pts}`;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

/* ===== GAMIFIED QUIZ ENGINE ===== */

let game = {
  moduleIndex: 0,
  questions: [],
  current: 0,
  score: 0,
  points: 0,
  streak: 0,
  maxStreak: 0,
  answers: [],
  active: false
};

function initQuiz(moduleIndex, questions) {
  game = {
    moduleIndex, questions,
    current: 0, score: 0, points: 0,
    streak: 0, maxStreak: 0,
    answers: [], active: true
  };
  renderGameQuestion();
}

function renderGameQuestion() {
  const container = document.getElementById('quiz-container');
  if (!container) return;

  const { questions, current, score, points, streak } = game;

  if (current >= questions.length) {
    renderGameResult();
    return;
  }

  const q = questions[current];
  const pct = Math.round(((current) / questions.length) * 100);

  let html = '';

  html += `<div class="game-hud">
    <div class="game-hud-item"><div class="game-hud-label">Очки</div><div class="game-hud-value" id="hud-points">${points}</div></div>
    <div class="game-hud-item"><div class="game-hud-label">Стрік</div><div class="game-hud-value game-hud-streak" id="hud-streak">${streak > 0 ? '🔥'.repeat(Math.min(streak, 5)) : '—'}</div></div>
    <div class="game-hud-item"><div class="game-hud-label">Правильно</div><div class="game-hud-value">${score}/${questions.length}</div></div>
    <div class="game-hud-item"><div class="game-hud-label">Питання</div><div class="game-hud-value">${current + 1}/${questions.length}</div></div>
    <div class="game-progress-track"><div class="game-progress-fill" style="width:${pct}%"></div></div>
  </div>`;

  html += `<div class="game-question" id="game-q">`;

  const type = q.type || 'choice';

  if (type === 'truefalse') {
    html += `<div class="game-question-badge">Правда чи міф?</div>`;
    html += `<div class="game-question-text">${q.statement || q.question}</div>`;
    html += `<div class="game-tf-options">
      <div class="game-tf-btn true-btn" data-val="true"><span class="game-tf-emoji">✅</span>Правда</div>
      <div class="game-tf-btn false-btn" data-val="false"><span class="game-tf-emoji">❌</span>Міф</div>
    </div>`;
  } else if (type === 'match') {
    html += `<div class="game-question-badge">З'єднай пари 🔗</div>`;
    html += `<div class="game-question-text">${q.question || "З'єднай кожен інструмент з його аналогією:"}</div>`;
    html += `<div class="game-explanation correct-exp" style="margin-bottom:16px">💡 <strong>Як грати:</strong> Натисни елемент зліва, потім натисни відповідний елемент справа. Якщо пара правильна — обидва стануть зеленими!</div>`;
    const pairs = q.pairs;
    const shuffledRight = [...pairs].sort(() => Math.random() - 0.5);
    const leftLabel = q.leftLabel || 'Зліва';
    const rightLabel = q.rightLabel || 'Справа';
    html += `<div class="game-match-grid">`;
    html += `<div class="game-match-col-label">${leftLabel}</div><div class="game-match-col-label">${rightLabel}</div>`;
    for (let i = 0; i < pairs.length; i++) {
      html += `<div class="game-match-item match-left" data-idx="${i}">${pairs[i].left}</div>`;
      const origIdx = pairs.findIndex(op => op.right === shuffledRight[i].right);
      html += `<div class="game-match-item match-right" data-idx="${origIdx}">${shuffledRight[i].right}</div>`;
    }
    html += `</div>`;
  } else {
    const keys = ['1', '2', '3', '4'];
    html += `<div class="game-question-badge">Питання ${current + 1} з ${questions.length}</div>`;
    html += `<div class="game-question-text">${q.question}</div>`;
    html += `<div class="game-options">`;
    q.options.forEach((opt, oi) => {
      html += `<div class="game-option" data-idx="${oi}">
        <span class="game-option-key">${keys[oi]}</span>
        <span>${opt}</span>
      </div>`;
    });
    html += `</div>`;
  }

  html += `</div>`;

  container.innerHTML = html;

  const type2 = q.type || 'choice';
  if (type2 === 'truefalse') {
    container.querySelectorAll('.game-tf-btn').forEach(btn => {
      btn.addEventListener('click', () => handleTrueFalse(btn));
    });
  } else if (type2 === 'match') {
    initMatchGame(container);
  } else {
    container.querySelectorAll('.game-option').forEach(opt => {
      opt.addEventListener('click', () => handleChoice(opt));
    });
  }
}

/* ===== HANDLE CHOICE ===== */

function handleChoice(optEl) {
  if (!game.active) return;
  game.active = false;
  const idx = parseInt(optEl.dataset.idx, 10);
  const q = game.questions[game.current];
  const isCorrect = idx === q.correct;

  optEl.parentElement.querySelectorAll('.game-option').forEach(o => o.classList.add('locked'));

  if (isCorrect) {
    optEl.classList.add('correct-answer');
    handleCorrect(optEl);
  } else {
    optEl.classList.add('wrong-answer');
    const correctEl = optEl.parentElement.querySelector(`[data-idx="${q.correct}"]`);
    if (correctEl) correctEl.classList.add('correct-answer');
    handleWrong(q);
  }
}

/* ===== HANDLE TRUE/FALSE ===== */

function handleTrueFalse(btn) {
  if (!game.active) return;
  game.active = false;
  const val = btn.dataset.val === 'true';
  const q = game.questions[game.current];
  const isCorrect = val === q.correct;

  document.querySelectorAll('.game-tf-btn').forEach(b => b.classList.add('locked'));

  if (isCorrect) {
    btn.classList.add('correct-answer');
    handleCorrect(btn);
  } else {
    btn.classList.add('wrong-answer');
    const correctVal = q.correct ? 'true' : 'false';
    document.querySelector(`.game-tf-btn[data-val="${correctVal}"]`)?.classList.add('correct-answer');
    handleWrong(q);
  }
}

/* ===== HANDLE MATCH ===== */

function initMatchGame(container) {
  let selectedLeft = null;
  let matchedCount = 0;
  const q = game.questions[game.current];
  const totalPairs = q.pairs.length;

  container.querySelectorAll('.match-left').forEach(el => {
    el.addEventListener('click', () => {
      if (el.classList.contains('matched') || el.classList.contains('locked')) return;
      container.querySelectorAll('.match-left').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
      selectedLeft = parseInt(el.dataset.idx, 10);
    });
  });

  container.querySelectorAll('.match-right').forEach(el => {
    el.addEventListener('click', () => {
      if (selectedLeft === null || el.classList.contains('matched') || el.classList.contains('locked')) return;
      const rightIdx = parseInt(el.dataset.idx, 10);

      if (selectedLeft === rightIdx) {
        el.classList.add('matched');
        const leftEl = container.querySelector(`.match-left[data-idx="${selectedLeft}"]`);
        if (leftEl) leftEl.classList.add('matched');
        matchedCount++;
        selectedLeft = null;

        if (matchedCount === totalPairs) {
          game.active = false;
          handleCorrect(el);
        }
      } else {
        el.classList.add('wrong-match');
        setTimeout(() => el.classList.remove('wrong-match'), 500);
        selectedLeft = null;
        container.querySelectorAll('.match-left').forEach(e => e.classList.remove('active'));
      }
    });
  });
}

/* ===== CORRECT / WRONG ===== */

function handleCorrect(refEl) {
  game.score++;
  game.streak++;
  if (game.streak > game.maxStreak) game.maxStreak = game.streak;

  let pts = POINTS_CORRECT;
  if (game.streak >= 3) pts += POINTS_STREAK_BONUS * Math.min(game.streak - 2, 5);
  game.points += pts;

  const rect = refEl.getBoundingClientRect();
  showFloatingPoints(pts, rect.left + rect.width / 2, rect.top);

  const q = game.questions[game.current];
  showExplanation(true, q.explanation);
  game.answers.push({ correct: true, points: pts });
  showNextButton();
}

function handleWrong(q) {
  game.streak = 0;
  showExplanation(false, q.explanation);
  game.answers.push({ correct: false, points: 0 });
  showNextButton();
}

function showExplanation(isCorrect, text) {
  const qEl = document.getElementById('game-q');
  if (!qEl || !text) return;
  const div = document.createElement('div');
  div.className = `game-explanation ${isCorrect ? 'correct-exp' : 'wrong-exp'}`;
  div.innerHTML = (isCorrect ? '✅ ' : '❌ ') + text;
  qEl.appendChild(div);
}

function showNextButton() {
  const qEl = document.getElementById('game-q');
  if (!qEl) return;
  const btn = document.createElement('button');
  btn.className = 'game-next-btn';
  btn.textContent = game.current < game.questions.length - 1 ? 'Наступне питання →' : 'Показати результат 🏆';
  btn.addEventListener('click', () => {
    game.current++;
    game.active = true;
    renderGameQuestion();
  });
  qEl.appendChild(btn);
}

/* ===== RESULT SCREEN ===== */

function renderGameResult() {
  const container = document.getElementById('quiz-container');
  if (!container) return;

  const { questions, score, points, maxStreak, moduleIndex } = game;
  const total = questions.length;
  const pct = Math.round((score / total) * 100);
  const passed = score >= Math.ceil(total * 0.6);

  const stars = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 60 ? 1 : 0;
  const starHtml = Array.from({ length: 3 }, (_, i) =>
    `<span class="${i < stars ? 'star-earned' : 'star-empty'}" style="animation-delay:${i * 0.2}s">⭐</span>`
  ).join('');

  const messages = passed
    ? ['🎉 Чудова робота!', '🔥 Ти молодець!', '💪 Відмінний результат!', '🚀 Так тримати!']
    : ['😕 Спробуй ще раз!', '📚 Перечитай матеріал і повтори', '💪 Ти зможеш!'];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  let html = `<div class="game-result">
    <div class="game-stars">${starHtml}</div>
    <div class="game-result-score">${score}/${total}</div>
    <div class="game-result-label">правильних відповідей</div>
    <div class="game-result-points">🏆 ${points} очок${maxStreak >= 3 ? ` · 🔥 Макс. стрік: ${maxStreak}` : ''}</div>
    <div class="game-result-msg">${msg}</div>
    <div class="game-btn-group">`;

  if (passed) {
    const next = moduleIndex + 1;
    if (next < TOTAL_MODULES) {
      html += `<a href="module-${next}.html" class="game-btn-primary">Наступний модуль →</a>`;
    } else {
      html += `<a href="../index.html" class="game-btn-primary">На головну 🏠</a>`;
    }
  }

  html += `<button class="game-btn-secondary" onclick="retryGame()">Спробувати ще раз</button>`;
  html += `</div></div>`;

  container.innerHTML = html;
  saveModuleResult(moduleIndex, score, total, points);

  if (passed) launchConfetti();

  container.querySelector('.game-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function retryGame() {
  game.current = 0;
  game.score = 0;
  game.points = 0;
  game.streak = 0;
  game.maxStreak = 0;
  game.answers = [];
  game.active = true;
  renderGameQuestion();
  document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' });
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  ensureUserName();
  if (typeof updateProgressUI === 'function') updateProgressUI();
});
