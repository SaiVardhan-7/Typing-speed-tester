/** * STARFIELD BACKGROUND 
 */
(function () {
  const canvas = document.getElementById('stars-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, stars = [];

  function resize() { 
    W = canvas.width = window.innerWidth; 
    H = canvas.height = window.innerHeight; 
  }

  function createStars(n) {
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W, 
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.2, 
        a: Math.random(),
        da: (Math.random() * 0.004 + 0.001) * (Math.random() < 0.5 ? 1 : -1),
        col: Math.random() < 0.15 ? '#00e5ff' : Math.random() < 0.1 ? '#a78bfa' : '#fff'
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      s.a += s.da;
      if (s.a <= 0 || s.a >= 1) s.da *= -1;
      ctx.globalAlpha = Math.max(0, Math.min(1, s.a));
      ctx.beginPath(); 
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.col; 
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); createStars(220); });
  resize(); 
  createStars(220); 
  draw();
})();

/** * TYPING GAME LOGIC 
 */
const WORD_BANK = [
  'the','a','an','this','that','these','those','every','each','some','any','all','no',
  'i','you','he','she','it','we','they','me','him','her','us','them','my','your','his',
  'its','our','their','who','which','what',
  'is','are','was','were','be','been','have','has','had','do','does','did','will','would',
  'can','could','should','may','might','must','go','come','get','make','know','think',
  'take','see','look','want','give','use','find','tell','ask','seem','feel','try','leave',
  'call','keep','let','begin','show','hear','play','run','move','live','happen','write',
  'become','bring','hold','turn','start','follow','create','remember','believe','allow',
  'without','need','help','build','change','fall','follow','move',
  'time','year','people','way','day','man','woman','child','world','life','hand','part',
  'place','case','week','company','system','program','question','number','night','point',
  'city','home','word','fact','work','city','story','idea','body','information','back',
  'space','light','voice','power','country','water','room','book','eye','job','word',
  'line','group','problem','city','play','small','end',
  'good','new','first','last','long','great','own','other','old','right','big','high',
  'different','small','large','next','early','young','important','few','public','old',
  'real','best','free','fresh','dark','clear','full','open','hard','strong','true','same',
  'able','deep','sure','far','soon','still','just','often','here','also','now','then',
  'always','never','together','already','once','quite','quickly','easily','slowly',
  'usually','really','perhaps','simply','enough','however','around','below','above',
  'of','in','to','for','on','with','at','by','from','up','about','into','through',
  'during','before','after','between','out','against','without','under','along','and',
  'but','or','if','so','because','while','although','when','where','since','until','as'
];

let selectedDuration = 30;   
let currentPara     = '';
let charIndex        = 0;  
let timerInterval   = null;
let timeLeft        = selectedDuration;
let started         = false;
let gameOver        = false;
let totalKeystrokes   = 0;
let correctKeystrokes = 0;
let parasDone         = 0;
let allSpans = [];

const paraText      = document.getElementById('para-text');
const typeInput     = document.getElementById('type-input');
const wpmEl         = document.getElementById('wpm-value');
const accEl         = document.getElementById('acc-value');
const timerEl       = document.getElementById('timer-value');
const progressFill  = document.getElementById('progress-fill');
const focusPrompt   = document.getElementById('focus-prompt');
const reportOverlay = document.getElementById('report-overlay');
const reportSub     = document.getElementById('report-sub');
const pickerBtns    = document.querySelectorAll('.tp-btn');
const retryBtn      = document.getElementById('retry-btn');

function generateParagraph() {
  const TARGET = 60;   
  const bank = [...WORD_BANK];
  for (let i = bank.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bank[i], bank[j]] = [bank[j], bank[i]];
  }
  const words = [];
  for (let i = 0; i < TARGET; i++) {
    words.push(bank[i % bank.length]);
  }
  let result = '';
  let i = 0;
  while (i < words.length) {
    const chunkLen = 8 + Math.floor(Math.random() * 5); 
    const chunk = words.slice(i, i + chunkLen);
    if (i === 0) chunk[0] = chunk[0].charAt(0).toUpperCase() + chunk[0].slice(1);
    result += chunk.join(' ');
    i += chunkLen;
    if (i < words.length) result += ', ';  
  }
  result = result.replace(/,?\s*$/, '') + '.';
  return result;
}

function lockPicker(lock) {
  pickerBtns.forEach(b => { b.disabled = lock; });
}

function initGame() {
  timeLeft          = selectedDuration;
  started           = false;
  gameOver          = false;
  totalKeystrokes   = 0;
  correctKeystrokes = 0;
  parasDone         = 0;
  charIndex         = 0;

  clearInterval(timerInterval);
  timerEl.textContent = selectedDuration;
  timerEl.className   = '';
  wpmEl.textContent   = '0';
  accEl.textContent   = '100%';
  progressFill.style.width = '0%';

  typeInput.value = '';
  typeInput.disabled = false;

  lockPicker(false);  
  reportOverlay.classList.remove('show');
  focusPrompt.classList.remove('hidden');

  loadParagraph(false);
  typeInput.focus();
}

function loadParagraph(withAnimation) {
  currentPara = generateParagraph();
  charIndex   = 0;

  if (withAnimation) {
    paraText.classList.add('float-away');
    setTimeout(() => {
      paraText.classList.remove('float-away');
      renderParagraph();
    }, 520);
  } else {
    renderParagraph();
  }
}

function renderParagraph() {
  paraText.innerHTML = '';
  paraText.style.transform = 'translateY(0)';
  allSpans = [];
  const tokens = currentPara.split(/(\s)/);   
  tokens.forEach(token => {
    if (token === '') return;
    if (token === ' ') {
      const sp = document.createElement('span');
      sp.classList.add('ch', 'word-space');
      sp.textContent = '\u00a0';           
      sp.dataset.char = ' ';
      paraText.appendChild(sp);
      allSpans.push(sp);
    } else {
      const wordEl = document.createElement('span');
      wordEl.classList.add('word');

      for (const char of token) {
        const span = document.createElement('span');
        span.classList.add('ch');
        span.textContent = char;
        span.dataset.char = char;
        wordEl.appendChild(span);
        allSpans.push(span);
      }
      paraText.appendChild(wordEl);
    }
  });
  if (allSpans[charIndex]) allSpans[charIndex].classList.add('cursor');
}

function updateProgress() {
  const pct = currentPara.length > 0 ? (charIndex / currentPara.length) * 100 : 0;
  progressFill.style.width = pct + '%';
  scrollToCursor();
}

function scrollToCursor() {
  if (!allSpans[charIndex]) return;
  const cursorSpan  = allSpans[charIndex];
  const containerH  = document.getElementById('para-scroll').clientHeight;
  const lineH       = parseFloat(getComputedStyle(paraText).lineHeight) || 28;
  const cursorTop   = cursorSpan.offsetTop;
  const desiredScroll = cursorTop - (containerH / 2) + (lineH / 2);
  const clamped = Math.max(0, desiredScroll);
  paraText.style.transform = `translateY(${-clamped}px)`;
}

function startTimer() {
  lockPicker(true);  
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    const elapsed = selectedDuration - timeLeft;
    if (elapsed > 0) {
      const liveWPM = Math.round((correctKeystrokes / 5) / (elapsed / 60));
      wpmEl.textContent = liveWPM;
    }

    if      (timeLeft <= 5)  timerEl.className = 'danger';
    else if (timeLeft <= 10) timerEl.className = 'warning';

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      endGame();
    }
  }, 1000);
}

function endGame() {
  gameOver = true;
  typeInput.disabled = true;

  const wpm = Math.round((correctKeystrokes / 5) / (selectedDuration / 60));
  const acc = totalKeystrokes === 0 ? 100 : Math.round((correctKeystrokes / totalKeystrokes) * 100);

  let grade, emoji;
  if      (wpm >= 80 && acc >= 95) { grade = 'S'; emoji = '🌟'; }
  else if (wpm >= 60 && acc >= 90) { grade = 'A'; emoji = '🚀'; }
  else if (wpm >= 40 && acc >= 80) { grade = 'B'; emoji = '🛸'; }
  else if (wpm >= 25 && acc >= 70) { grade = 'C'; emoji = '🌙'; }
  else                             { grade = 'D'; emoji = '🪐'; }

  document.getElementById('final-wpm').textContent   = wpm;
  document.getElementById('final-acc').textContent   = acc + '%';
  document.getElementById('final-chars').textContent = correctKeystrokes;
  document.getElementById('final-paras').textContent = parasDone;
  document.getElementById('report-grade').textContent = `${emoji} Grade: ${grade}`;
  reportSub.textContent = `${selectedDuration}-second session complete`;

  reportOverlay.classList.add('show');
}

function handleKey(e) {
  if (gameOver) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length !== 1 && e.key !== 'Backspace') return;
  
  if (!started) {
    started = true;
    focusPrompt.classList.add('hidden');
    startTimer();
  }

  if (e.key === 'Backspace') {
    e.preventDefault();
    if (charIndex > 0) {
      charIndex--;
      allSpans[charIndex].classList.remove('correct', 'wrong', 'cursor');
      allSpans[charIndex].classList.add('cursor');
      if (allSpans[charIndex + 1]) allSpans[charIndex + 1].classList.remove('cursor');
      updateProgress();
    }
    return;
  }
  
  const expected = currentPara[charIndex];
  const typed    = e.key;
  totalKeystrokes++;
  const span = allSpans[charIndex];
  span.classList.remove('cursor');
  
  if (typed === expected) {
    span.classList.add('correct');
    correctKeystrokes++;
  } else {
    span.classList.add('wrong');
  }

  charIndex++;

  if (charIndex < currentPara.length) {
    allSpans[charIndex].classList.add('cursor');
    updateProgress();
  } else {
    parasDone++;
    updateProgress();
    const acc = Math.round((correctKeystrokes / totalKeystrokes) * 100);
    accEl.textContent = acc + '%';
    loadParagraph(true);
    return;
  }
  
  const acc = Math.round((correctKeystrokes / totalKeystrokes) * 100);
  accEl.textContent = acc + '%';
}

// Event Listeners
pickerBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (started && !gameOver) return;    
    selectedDuration = parseInt(btn.dataset.sec, 10);
    pickerBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    timerEl.textContent = selectedDuration;
    timerEl.className   = '';
  });
});

document.addEventListener('keydown', handleKey);
document.addEventListener('click', () => { if (!gameOver) typeInput.focus(); });
retryBtn.addEventListener('click', initGame);

// Start initial game
initGame();
