/**
 * Game Controller for Find the Differences
 * - Strict 13-click Focus Limit
 * - 2-minute mandatory reflection pause upon depleting clicks
 * - No spatial numbering order (markers use discovery badges / chronological find order)
 * - Clean, distraction-free interface with synchronized magnifying loupe
 */

class SpotDifferencesGame {
  constructor() {
    this.MAX_CLICKS = 13;
    this.TOTAL_DIFFERENCES = 10;
    this.LOCKOUT_SECONDS = 120; // 2 minutes mandatory pause

    this.clicksRemaining = this.MAX_CLICKS;
    this.found = new Set();
    this.discoveryOrder = []; // stores diff objects in the order found by player
    this.startTime = null;
    this.elapsedSeconds = 0;
    this.timerInterval = null;
    this.gameState = 'briefing'; // briefing, playing, won, lockout, review

    // Lockout countdown
    this.lockoutRemaining = this.LOCKOUT_SECONDS;
    this.lockoutInterval = null;

    // Magnifier state (2.5x high-definition inspection)
    this.magnifierEnabled = true;
    this.magnifierZoom = 2.5;
    this.magnifierSize = 140;

    this.initDOMElements();
    this.initRenderers();
    this.attachEventListeners();
  }

  initDOMElements() {
    this.canvasA = document.getElementById('canvas-a');
    this.canvasB = document.getElementById('canvas-b');
    this.markersLayerA = document.getElementById('markers-a');
    this.markersLayerB = document.getElementById('markers-b');

    this.loupeA = document.getElementById('loupe-a');
    this.loupeB = document.getElementById('loupe-b');
    this.loupeCanvasA = document.getElementById('loupe-canvas-a');
    this.loupeCanvasB = document.getElementById('loupe-canvas-b');

    this.clicksDisplay = document.getElementById('clicks-display');
    this.clicksPipsContainer = document.getElementById('clicks-pips');
    this.foundCountDisplay = document.getElementById('found-count');
    this.timerDisplay = document.getElementById('timer-display');
    this.caseNotesList = document.getElementById('case-notes-list');

    // Modals
    this.briefingModal = document.getElementById('briefing-modal');
    this.victoryModal = document.getElementById('victory-modal');
    this.lockoutModal = document.getElementById('lockout-modal');

    // Lockout elements
    this.lockoutTimerDisplay = document.getElementById('lockout-timer-display');
    this.lockoutProgressBar = document.getElementById('lockout-progress-bar');
    this.btnLockoutRetry = document.getElementById('btn-lockout-retry');
    this.btnLockoutReview = document.getElementById('btn-lockout-review');

    // Tool buttons
    this.btnLoupe = document.getElementById('btn-loupe');
    this.btnSound = document.getElementById('btn-sound');
    this.btnRestart = document.getElementById('btn-restart');
  }

  initRenderers() {
    this.sceneRenderer = new SceneRenderer(this.canvasA, this.canvasB);
    this.sceneRenderer.renderAll();

    this.loupeCanvasA.width = this.magnifierSize;
    this.loupeCanvasA.height = this.magnifierSize;
    this.loupeCanvasB.width = this.magnifierSize;
    this.loupeCanvasB.height = this.magnifierSize;
  }

  startGame() {
    // Clear any existing lockout
    if (this.lockoutInterval) {
      clearInterval(this.lockoutInterval);
      this.lockoutInterval = null;
    }

    this.clicksRemaining = this.MAX_CLICKS;
    this.found.clear();
    this.discoveryOrder = [];
    this.elapsedSeconds = 0;
    this.gameState = 'playing';

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => this.updateTimer(), 1000);

    // Reset UI
    this.markersLayerA.innerHTML = '';
    this.markersLayerB.innerHTML = '';
    this.caseNotesList.innerHTML = '<div class="text-stone-400 italic text-xs py-2">No differences identified yet. Inspect both scenes with the Synchronized Loupe...</div>';

    this.btnRestart.disabled = false;
    this.btnRestart.classList.remove('opacity-40', 'cursor-not-allowed');

    this.renderClicksPips();
    this.updateHUD();

    this.briefingModal.classList.add('hidden');
    this.victoryModal.classList.add('hidden');
    this.lockoutModal.classList.add('hidden');

    window.soundEngine.playClick();
  }

  updateTimer() {
    if (this.gameState !== 'playing') return;
    this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const mins = Math.floor(this.elapsedSeconds / 60).toString().padStart(2, '0');
    const secs = (this.elapsedSeconds % 60).toString().padStart(2, '0');
    this.timerDisplay.textContent = `${mins}:${secs}`;
  }

  renderClicksPips() {
    this.clicksPipsContainer.innerHTML = '';
    for (let i = 0; i < this.MAX_CLICKS; i++) {
      const pip = document.createElement('div');
      pip.className = 'w-3 h-6 rounded-sm border transition-all duration-300 ' +
        (i < this.clicksRemaining
          ? 'bg-amber-400 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
          : 'bg-stone-800 border-stone-700 opacity-30');
      this.clicksPipsContainer.appendChild(pip);
    }
  }

  updateHUD() {
    this.clicksDisplay.textContent = this.clicksRemaining;
    this.foundCountDisplay.textContent = `${this.found.size} / ${this.TOTAL_DIFFERENCES}`;
    this.renderClicksPips();

    if (this.clicksRemaining <= 3 && this.clicksRemaining > 0) {
      this.clicksDisplay.classList.add('text-rose-400', 'animate-pulse');
    } else {
      this.clicksDisplay.classList.remove('text-rose-400', 'animate-pulse');
    }
  }

  handleSceneClick(event, canvasTarget) {
    if (this.gameState !== 'playing') return;

    const rect = canvasTarget.getBoundingClientRect();
    const scaleX = SCENE_WIDTH / rect.width;
    const scaleY = SCENE_HEIGHT / rect.height;

    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;

    // Check hit against remaining undiscovered differences
    let hitDifference = null;
    for (const diff of DIFFERENCES) {
      if (this.found.has(diff.id)) continue;

      const dist = Math.hypot(clickX - diff.x, clickY - diff.y);
      if (dist <= diff.radius) {
        hitDifference = diff;
        break;
      }
    }

    // Every click deducts 1 Focus Charge
    this.clicksRemaining--;

    if (hitDifference) {
      this.onDifferenceFound(hitDifference);
    } else {
      this.onMiss(event.clientX - rect.left, event.clientY - rect.top, canvasTarget);
    }

    this.updateHUD();
    this.checkGameEndConditions();
  }

  onDifferenceFound(diff) {
    this.found.add(diff.id);
    this.discoveryOrder.push(diff);
    const chronologicalIndex = this.discoveryOrder.length;

    window.soundEngine.playFind(chronologicalIndex);

    // Place discovery marker (no static spatial number; uses chronological count)
    this.addDiscoveryMarker(diff, chronologicalIndex, false);

    // Log in Detective Notebook
    this.addCaseNote(diff, chronologicalIndex);
  }

  onMiss(relativeX, relativeY, container) {
    window.soundEngine.playMiss();

    // Tactile screen shake
    const workspace = document.getElementById('investigation-workspace');
    workspace.classList.remove('shake-anim');
    void workspace.offsetWidth;
    workspace.classList.add('shake-anim');

    // Red ripple effect
    const ripple = document.createElement('div');
    ripple.className = 'miss-ripple';
    ripple.style.left = `${relativeX}px`;
    ripple.style.top = `${relativeY}px`;
    container.parentElement.appendChild(ripple);

    setTimeout(() => {
      if (ripple.parentElement) ripple.remove();
    }, 650);
  }

  addDiscoveryMarker(diff, labelNumber, isReview = false) {
    const leftPct = (diff.x / SCENE_WIDTH) * 100;
    const topPct = (diff.y / SCENE_HEIGHT) * 100;
    const sizePct = (diff.radius * 2.2 / SCENE_WIDTH) * 100;

    const createMarker = () => {
      const el = document.createElement('div');
      el.className = `discovery-marker ${isReview ? 'review-mode' : 'found-anim'}`;
      el.style.left = `${leftPct}%`;
      el.style.top = `${topPct}%`;
      el.style.width = `${sizePct * 5.2}vw`;
      el.style.height = `${sizePct * 5.2}vw`;
      el.style.maxWidth = '70px';
      el.style.maxHeight = '70px';
      el.style.minWidth = '40px';
      el.style.minHeight = '40px';

      // Badge displays discovery glyph or discovery order (not spatial index)
      el.innerHTML = `<span class="marker-badge">${isReview ? '🔍' : `✓ ${labelNumber}`}</span>`;
      el.title = `${diff.name}: ${diff.description}`;
      return el;
    };

    this.markersLayerA.appendChild(createMarker());
    this.markersLayerB.appendChild(createMarker());
  }

  addCaseNote(diff, discoveryNum) {
    if (this.discoveryOrder.length === 1) {
      this.caseNotesList.innerHTML = '';
    }

    const note = document.createElement('div');
    note.className = 'bg-stone-900/90 border border-amber-900/40 rounded-lg p-3 text-xs shadow-md transition-all hover:border-amber-500/60 animate-fade-in';
    note.innerHTML = `
      <div class="flex items-center justify-between font-semibold text-amber-300 mb-1">
        <span>Discovery #${discoveryNum}: ${diff.name}</span>
        <span class="text-[10px] bg-amber-950/80 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800/60">${diff.category}</span>
      </div>
      <p class="text-stone-300 leading-relaxed">${diff.description}</p>
    `;
    this.caseNotesList.prepend(note);
  }

  checkGameEndConditions() {
    if (this.found.size === this.TOTAL_DIFFERENCES) {
      this.handleVictory();
    } else if (this.clicksRemaining <= 0) {
      this.triggerLockoutPause();
    }
  }

  handleVictory() {
    this.gameState = 'won';
    clearInterval(this.timerInterval);
    window.soundEngine.playVictory();

    document.getElementById('victory-time').textContent = this.timerDisplay.textContent;
    document.getElementById('victory-clicks-left').textContent = `${this.clicksRemaining} / ${this.MAX_CLICKS}`;

    setTimeout(() => {
      this.victoryModal.classList.remove('hidden');
    }, 450);
  }

  triggerLockoutPause() {
    this.gameState = 'lockout';
    clearInterval(this.timerInterval);
    window.soundEngine.playGameOver();

    // Disable in-game reset button during lockout
    this.btnRestart.disabled = true;
    this.btnRestart.classList.add('opacity-40', 'cursor-not-allowed');

    // Initialize 2-minute countdown (120 seconds)
    this.lockoutRemaining = this.LOCKOUT_SECONDS;
    this.updateLockoutDisplay();

    // Lock the retry button initially
    this.btnLockoutRetry.disabled = true;
    this.btnLockoutRetry.classList.add('opacity-40', 'cursor-not-allowed');
    this.btnLockoutRetry.textContent = `Locked (${this.formatSeconds(this.lockoutRemaining)})`;

    document.getElementById('lockout-found-count').textContent = `${this.found.size} / ${this.TOTAL_DIFFERENCES}`;

    this.lockoutModal.classList.remove('hidden');

    if (this.lockoutInterval) clearInterval(this.lockoutInterval);
    this.lockoutInterval = setInterval(() => {
      this.lockoutRemaining--;
      this.updateLockoutDisplay();

      if (this.lockoutRemaining <= 0) {
        clearInterval(this.lockoutInterval);
        this.lockoutInterval = null;
        this.onLockoutExpired();
      }
    }, 1000);
  }

  updateLockoutDisplay() {
    const timeFormatted = this.formatSeconds(this.lockoutRemaining);
    this.lockoutTimerDisplay.textContent = timeFormatted;

    // Update circular or linear progress bar
    const progressPct = ((this.LOCKOUT_SECONDS - this.lockoutRemaining) / this.LOCKOUT_SECONDS) * 100;
    this.lockoutProgressBar.style.width = `${progressPct}%`;

    if (this.lockoutRemaining > 0) {
      this.btnLockoutRetry.textContent = `Locked (${timeFormatted})`;
    }
  }

  formatSeconds(totalSecs) {
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  onLockoutExpired() {
    this.btnLockoutRetry.disabled = false;
    this.btnLockoutRetry.classList.remove('opacity-40', 'cursor-not-allowed');
    this.btnLockoutRetry.classList.add('bg-amber-500', 'hover:bg-amber-400', 'text-stone-950');
    this.btnLockoutRetry.textContent = "Start Next Attempt 🔄";

    this.btnRestart.disabled = false;
    this.btnRestart.classList.remove('opacity-40', 'cursor-not-allowed');

    window.soundEngine.playFind(1);
  }

  enableReviewMode() {
    this.gameState = 'review';
    this.briefingModal.classList.add('hidden');
    this.victoryModal.classList.add('hidden');
    this.lockoutModal.classList.add('hidden');

    if (this.lockoutInterval) {
      clearInterval(this.lockoutInterval);
      this.lockoutInterval = null;
    }

    this.btnRestart.disabled = false;
    this.btnRestart.classList.remove('opacity-40', 'cursor-not-allowed');

    // Reveal all remaining differences with observation notes
    DIFFERENCES.forEach(diff => {
      if (!this.found.has(diff.id)) {
        this.addDiscoveryMarker(diff, 0, true);
        this.addCaseNote(diff, "Unsolved");
      }
    });
  }

  updateMagnifier(event, sourceCanvas) {
    if (!this.magnifierEnabled) {
      this.hideMagnifiers();
      return;
    }

    const rect = sourceCanvas.getBoundingClientRect();
    const relX = event.clientX - rect.left;
    const relY = event.clientY - rect.top;

    if (relX < 0 || relX > rect.width || relY < 0 || relY > rect.height) {
      this.hideMagnifiers();
      return;
    }

    this.loupeA.style.display = 'block';
    this.loupeB.style.display = 'block';

    const sceneX = (relX / rect.width) * SCENE_WIDTH;
    const sceneY = (relY / rect.height) * SCENE_HEIGHT;

    this.loupeA.style.left = `${(sceneX / SCENE_WIDTH) * 100}%`;
    this.loupeA.style.top = `${(sceneY / SCENE_HEIGHT) * 100}%`;
    this.loupeB.style.left = `${(sceneX / SCENE_WIDTH) * 100}%`;
    this.loupeB.style.top = `${(sceneY / SCENE_HEIGHT) * 100}%`;

    this.renderLoupeCanvas(this.loupeCanvasA, this.canvasA, sceneX, sceneY);
    this.renderLoupeCanvas(this.loupeCanvasB, this.canvasB, sceneX, sceneY);
  }

  renderLoupeCanvas(targetCanvas, sourceCanvas, cx, cy) {
    const ctx = targetCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.magnifierSize, this.magnifierSize);

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.magnifierSize / 2, this.magnifierSize / 2, this.magnifierSize / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    const sampleW = this.magnifierSize / this.magnifierZoom;
    const sampleH = this.magnifierSize / this.magnifierZoom;
    const sx = Math.max(0, Math.min(SCENE_WIDTH - sampleW, cx - sampleW / 2));
    const sy = Math.max(0, Math.min(SCENE_HEIGHT - sampleH, cy - sampleH / 2));

    ctx.drawImage(
      sourceCanvas,
      sx, sy, sampleW, sampleH,
      0, 0, this.magnifierSize, this.magnifierSize
    );

    // Crosshair
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.magnifierSize / 2 - 12, this.magnifierSize / 2);
    ctx.lineTo(this.magnifierSize / 2 + 12, this.magnifierSize / 2);
    ctx.moveTo(this.magnifierSize / 2, this.magnifierSize / 2 - 12);
    ctx.lineTo(this.magnifierSize / 2, this.magnifierSize / 2 + 12);
    ctx.stroke();

    ctx.restore();
  }

  hideMagnifiers() {
    this.loupeA.style.display = 'none';
    this.loupeB.style.display = 'none';
  }

  attachEventListeners() {
    this.canvasA.addEventListener('click', (e) => this.handleSceneClick(e, this.canvasA));
    this.canvasB.addEventListener('click', (e) => this.handleSceneClick(e, this.canvasB));

    const setupLoupe = (canvas) => {
      canvas.addEventListener('mousemove', (e) => this.updateMagnifier(e, canvas));
      canvas.addEventListener('mouseleave', () => this.hideMagnifiers());
      canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
          this.updateMagnifier(e.touches[0], canvas);
        }
      }, { passive: true });
      canvas.addEventListener('touchend', () => this.hideMagnifiers());
    };

    setupLoupe(this.canvasA);
    setupLoupe(this.canvasB);

    // Buttons
    document.getElementById('btn-start-game').addEventListener('click', () => this.startGame());
    document.getElementById('btn-restart-won').addEventListener('click', () => this.startGame());
    this.btnRestart.addEventListener('click', () => {
      if (!this.btnRestart.disabled) this.startGame();
    });

    this.btnLockoutRetry.addEventListener('click', () => {
      if (!this.btnLockoutRetry.disabled) this.startGame();
    });

    this.btnLockoutReview.addEventListener('click', () => this.enableReviewMode());
    document.getElementById('btn-review-won').addEventListener('click', () => this.enableReviewMode());

    this.btnLoupe.addEventListener('click', () => {
      this.magnifierEnabled = !this.magnifierEnabled;
      this.btnLoupe.classList.toggle('bg-amber-600', this.magnifierEnabled);
      this.btnLoupe.classList.toggle('bg-stone-800', !this.magnifierEnabled);
      window.soundEngine.playClick();
    });

    this.btnSound.addEventListener('click', () => {
      const isMuted = window.soundEngine.toggleMute();
      this.btnSound.textContent = isMuted ? '🔇 Muted' : '🔊 Sound';
      this.btnSound.classList.toggle('text-rose-400', isMuted);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new SpotDifferencesGame();
});
