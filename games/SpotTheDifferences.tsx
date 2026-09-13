import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  useGameLogic,
  renderCanvasScene,
  DIFFERENCES,
  SCENE_WIDTH,
  SCENE_HEIGHT,
  MAX_CLICKS,
  TOTAL_DIFFERENCES,
  LOCKOUT_SECONDS,
  Difference
} from './logic';

export const SpotTheDifferences: React.FC = () => {
  const {
    gameState,
    clicksRemaining,
    foundSet,
    discoveryOrder,
    elapsedSeconds,
    lockoutRemaining,
    missRipples,
    isMuted,
    magnifierEnabled,
    startGame,
    handleSceneClick,
    enableReviewMode,
    toggleSound,
    toggleLoupe,
    formatTime
  } = useGameLogic();

  // Canvas refs
  const canvasARef = useRef<HTMLCanvasElement | null>(null);
  const canvasBRef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasARef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasBRef = useRef<HTMLCanvasElement | null>(null);

  // Loupe tracking state
  const [loupePos, setLoupePos] = useState<{ xPct: number; yPct: number; visible: boolean }>({
    xPct: 50,
    yPct: 50,
    visible: false
  });

  const [shaking, setShaking] = useState<boolean>(false);

  const MAGNIFIER_SIZE = 140;
  const MAGNIFIER_ZOOM = 2.5;

  // Initial and reactive canvas rendering
  useEffect(() => {
    if (canvasARef.current && canvasBRef.current) {
      const ctxA = canvasARef.current.getContext('2d');
      const ctxB = canvasBRef.current.getContext('2d');
      if (ctxA) renderCanvasScene(ctxA, 'A');
      if (ctxB) renderCanvasScene(ctxB, 'B');
    }
  }, []);

  // Synchronized Loupe snapshot renderer
  const renderLoupeCanvas = useCallback((
    targetCanvas: HTMLCanvasElement,
    sourceCanvas: HTMLCanvasElement,
    cx: number,
    cy: number
  ) => {
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);

    ctx.save();
    ctx.beginPath();
    ctx.arc(MAGNIFIER_SIZE / 2, MAGNIFIER_SIZE / 2, MAGNIFIER_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    const sampleW = MAGNIFIER_SIZE / MAGNIFIER_ZOOM;
    const sampleH = MAGNIFIER_SIZE / MAGNIFIER_ZOOM;
    const sx = Math.max(0, Math.min(SCENE_WIDTH - sampleW, cx - sampleW / 2));
    const sy = Math.max(0, Math.min(SCENE_HEIGHT - sampleH, cy - sampleH / 2));

    ctx.drawImage(
      sourceCanvas,
      sx, sy, sampleW, sampleH,
      0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE
    );

    // Precise alignment crosshair
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MAGNIFIER_SIZE / 2 - 12, MAGNIFIER_SIZE / 2);
    ctx.lineTo(MAGNIFIER_SIZE / 2 + 12, MAGNIFIER_SIZE / 2);
    ctx.moveTo(MAGNIFIER_SIZE / 2, MAGNIFIER_SIZE / 2 - 12);
    ctx.lineTo(MAGNIFIER_SIZE / 2, MAGNIFIER_SIZE / 2 + 12);
    ctx.stroke();

    ctx.restore();
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>, sourceCanvas: HTMLCanvasElement) => {
    if (!magnifierEnabled) {
      setLoupePos(prev => ({ ...prev, visible: false }));
      return;
    }

    const rect = sourceCanvas.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    if (relX < 0 || relX > rect.width || relY < 0 || relY > rect.height) {
      setLoupePos(prev => ({ ...prev, visible: false }));
      return;
    }

    const sceneX = (relX / rect.width) * SCENE_WIDTH;
    const sceneY = (relY / rect.height) * SCENE_HEIGHT;
    const xPct = (sceneX / SCENE_WIDTH) * 100;
    const yPct = (sceneY / SCENE_HEIGHT) * 100;

    setLoupePos({ xPct, yPct, visible: true });

    if (canvasARef.current && loupeCanvasARef.current) {
      renderLoupeCanvas(loupeCanvasARef.current, canvasARef.current, sceneX, sceneY);
    }
    if (canvasBRef.current && loupeCanvasBRef.current) {
      renderLoupeCanvas(loupeCanvasBRef.current, canvasBRef.current, sceneX, sceneY);
    }
  }, [magnifierEnabled, renderLoupeCanvas]);

  const handlePointerLeave = useCallback(() => {
    setLoupePos(prev => ({ ...prev, visible: false }));
  }, []);

  const onCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>, variant: 'A' | 'B') => {
    const canvas = variant === 'A' ? canvasARef.current : canvasBRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Check if it's a miss to trigger camera shake
    const prevClicks = clicksRemaining;
    handleSceneClick(e.clientX, e.clientY, rect, variant);

    // If a miss occurs, trigger tactile shake
    if (clicksRemaining <= prevClicks) {
      setShaking(true);
      setTimeout(() => setShaking(false), 350);
    }
  }, [clicksRemaining, handleSceneClick]);

  // Lockout progress calculation
  const lockoutProgressPct = ((LOCKOUT_SECONDS - lockoutRemaining) / LOCKOUT_SECONDS) * 100;

  return (
    <div className="min-h-screen bg-[#0d0c11] text-stone-100 flex flex-col select-none font-sans">
      {/* Scoped CSS Styles for Visual Effects & Animations */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(20, 18, 28, 0.6);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.35);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.65);
        }

        .scene-frame {
          position: relative;
          background: #0b0a10;
          border: 2px solid rgba(212, 175, 55, 0.35);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.65), inset 0 0 20px rgba(0, 0, 0, 0.8);
          cursor: crosshair;
        }
        .scene-frame:hover {
          border-color: rgba(212, 175, 55, 0.7);
        }

        .discovery-marker {
          position: absolute;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 15;
        }
        .discovery-marker.found-anim {
          border: 3px solid #22c55e;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, rgba(34, 197, 94, 0) 75%);
          box-shadow: 0 0 16px rgba(34, 197, 94, 0.8), inset 0 0 8px rgba(34, 197, 94, 0.5);
          animation: pulse-ring 2.2s infinite ease-in-out, pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .discovery-marker.review-mode {
          border: 3px dashed #fbbf24;
          background: radial-gradient(circle, rgba(251, 191, 36, 0.25) 0%, rgba(251, 191, 36, 0) 75%);
          box-shadow: 0 0 14px rgba(251, 191, 36, 0.65);
          animation: pop-in 0.35s ease-out;
        }

        .marker-badge {
          background: #15141e;
          color: #fef08a;
          border: 1.5px solid #d4af37;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          padding: 1px 6px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.8);
        }

        @keyframes pop-in {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
          80% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.0); }
        }
        @keyframes pulse-ring {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.95; }
          50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.7; }
        }

        .miss-ripple {
          position: absolute;
          transform: translate(-50%, -50%);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid #ef4444;
          background: rgba(239, 68, 68, 0.3);
          pointer-events: none;
          animation: ripple-fade 0.65s ease-out forwards;
          z-index: 25;
        }
        @keyframes ripple-fade {
          0% { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }

        .shake-anim {
          animation: camera-shake 0.35s ease-in-out;
        }
        @keyframes camera-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(2px); }
        }

        .loupe-container {
          position: absolute;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          border: 3.5px solid #d4af37;
          box-shadow: 0 0 24px rgba(212, 175, 55, 0.7), inset 0 0 14px rgba(0, 0, 0, 0.85);
          pointer-events: none;
          transform: translate(-50%, -50%);
          z-index: 35;
          overflow: hidden;
          background: #0f0e15;
        }
        .loupe-lens-glare {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, 0.25) 100%);
          pointer-events: none;
        }
      `}</style>

      {/* Top Navigation & Live Detective HUD */}
      <header className="border-b border-amber-900/40 bg-[#14121b]/95 backdrop-blur-md px-6 py-3.5 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-950/80 border border-amber-600/50 flex items-center justify-center text-xl shadow-[0_0_12px_rgba(217,119,6,0.3)]">
              🔬
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg md:text-xl text-amber-200 tracking-wide">
                The Alchemist's Celestial Laboratory
              </h1>
              <p className="text-xs text-stone-400">
                Micro-Observation Academy • Spot 10 Concealed Differences
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            {/* Focus Stamina (13 Clicks Limit) */}
            <div className="flex flex-col items-center px-4 py-1.5 rounded-lg bg-stone-900/90 border border-amber-800/40 shadow-inner">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-400/80">
                Focus Clicks Remaining
              </span>
              <div className="flex items-center gap-2">
                <span className={`font-serif text-xl font-bold ${clicksRemaining <= 3 && clicksRemaining > 0 ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
                  {clicksRemaining}
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: MAX_CLICKS }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-6 rounded-sm border transition-all duration-300 ${
                        i < clicksRemaining
                          ? 'bg-amber-400 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                          : 'bg-stone-800 border-stone-700 opacity-30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Differences Found */}
            <div className="flex flex-col items-center px-4 py-1.5 rounded-lg bg-stone-900/90 border border-stone-800">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400/80">
                Differences Found
              </span>
              <span className="font-serif text-xl font-bold text-emerald-400">
                {foundSet.size} / {TOTAL_DIFFERENCES}
              </span>
            </div>

            {/* Live Timer */}
            <div className="flex flex-col items-center px-4 py-1.5 rounded-lg bg-stone-900/90 border border-stone-800">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-sky-400/80">
                Time
              </span>
              <span className="font-mono text-lg font-semibold text-sky-300">
                {formatTime(elapsedSeconds)}
              </span>
            </div>

            {/* Sound & Reset Controls */}
            <div className="flex items-center gap-2 border-l border-stone-800 pl-3">
              <button
                onClick={toggleSound}
                className={`px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-xs font-medium transition-colors ${
                  isMuted ? 'text-rose-400' : 'text-stone-300'
                }`}
                title="Toggle Sound"
              >
                {isMuted ? '🔇 Muted' : '🔊 Sound'}
              </button>
              <button
                onClick={startGame}
                disabled={gameState === 'lockout'}
                className={`px-3 py-1.5 rounded bg-stone-800 text-xs font-medium transition-colors ${
                  gameState === 'lockout'
                    ? 'opacity-40 cursor-not-allowed text-stone-500'
                    : 'hover:bg-rose-950/60 hover:text-rose-300 text-stone-300'
                }`}
                title="Restart Investigation"
              >
                🔄 Reset
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main Workspace */}
      <main className={`max-w-7xl mx-auto w-full p-4 md:p-6 flex-1 flex flex-col gap-6 ${shaking ? 'shake-anim' : ''}`}>
        
        {/* Directive & Loupe Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900/60 border border-stone-800/80 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs text-stone-300">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-semibold text-amber-300">Observation Rule:</span>
            Inspect fine engravings, tick marks, and counts using the loupe. 13 clicks max!
          </div>

          <div>
            <button
              onClick={toggleLoupe}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow transition-all ${
                magnifierEnabled ? 'bg-amber-600 hover:bg-amber-500 text-stone-950' : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              <span>🔎</span> Synchronized Loupe: {magnifierEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Dual Viewports (Side-by-Side Comparison) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          
          {/* Scene A (Left Viewport) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="font-serif text-xs uppercase tracking-wider font-semibold text-amber-400/90 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Scene A: Original Laboratory
              </span>
              <span className="text-[11px] text-stone-400">Reference Archive</span>
            </div>

            <div className="scene-frame aspect-[10/7]">
              <canvas
                ref={canvasARef}
                width={SCENE_WIDTH}
                height={SCENE_HEIGHT}
                onClick={(e) => onCanvasClick(e, 'A')}
                onPointerMove={(e) => canvasARef.current && handlePointerMove(e, canvasARef.current)}
                onPointerLeave={handlePointerLeave}
                className="w-full h-full block"
              />

              {/* Markers Overlay A */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Found Markers */}
                {discoveryOrder.map((diff) => (
                  <div
                    key={diff.id}
                    className="discovery-marker found-anim"
                    style={{
                      left: `${(diff.x / SCENE_WIDTH) * 100}%`,
                      top: `${(diff.y / SCENE_HEIGHT) * 100}%`,
                      width: `${(diff.radius * 2.2 / SCENE_WIDTH) * 520}px`,
                      height: `${(diff.radius * 2.2 / SCENE_WIDTH) * 520}px`,
                      maxWidth: '70px',
                      maxHeight: '70px',
                      minWidth: '40px',
                      minHeight: '40px'
                    }}
                    title={`${diff.name}: ${diff.description}`}
                  >
                    <span className="marker-badge">✓ #{diff.discoveryNumber}</span>
                  </div>
                ))}

                {/* Review Mode Markers for Unfound Items */}
                {gameState === 'review' && DIFFERENCES.filter(d => !foundSet.has(d.id)).map((diff) => (
                  <div
                    key={`review-${diff.id}`}
                    className="discovery-marker review-mode"
                    style={{
                      left: `${(diff.x / SCENE_WIDTH) * 100}%`,
                      top: `${(diff.y / SCENE_HEIGHT) * 100}%`,
                      width: `${(diff.radius * 2.2 / SCENE_WIDTH) * 520}px`,
                      height: `${(diff.radius * 2.2 / SCENE_WIDTH) * 520}px`,
                      maxWidth: '70px',
                      maxHeight: '70px',
                      minWidth: '40px',
                      minHeight: '40px'
                    }}
                    title={`${diff.name}: ${diff.description}`}
                  >
                    <span className="marker-badge">🔍</span>
                  </div>
                ))}

                {/* Miss Ripples */}
                {missRipples.filter(r => r.canvas === 'A').map((r) => (
                  <div
                    key={r.id}
                    className="miss-ripple"
                    style={{ left: `${r.x}px`, top: `${r.y}px` }}
                  />
                ))}
              </div>

              {/* Synchronized Magnifier Loupe A */}
              <div
                className="loupe-container"
                style={{
                  display: loupePos.visible ? 'block' : 'none',
                  left: `${loupePos.xPct}%`,
                  top: `${loupePos.yPct}%`
                }}
              >
                <canvas
                  ref={loupeCanvasARef}
                  width={MAGNIFIER_SIZE}
                  height={MAGNIFIER_SIZE}
                  className="w-full h-full"
                />
                <div className="loupe-lens-glare" />
              </div>
            </div>
          </div>

          {/* Scene B (Right Viewport) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="font-serif text-xs uppercase tracking-wider font-semibold text-rose-400/90 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Scene B: Altered Anomaly
              </span>
              <span className="text-[11px] text-stone-400">Inspect with Loupe</span>
            </div>

            <div className="scene-frame aspect-[10/7]">
              <canvas
                ref={canvasBRef}
                width={SCENE_WIDTH}
                height={SCENE_HEIGHT}
                onClick={(e) => onCanvasClick(e, 'B')}
                onPointerMove={(e) => canvasBRef.current && handlePointerMove(e, canvasBRef.current)}
                onPointerLeave={handlePointerLeave}
                className="w-full h-full block"
              />

              {/* Markers Overlay B */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Found Markers */}
                {discoveryOrder.map((diff) => (
                  <div
                    key={diff.id}
                    className="discovery-marker found-anim"
                    style={{
                      left: `${(diff.x / SCENE_WIDTH) * 100}%`,
                      top: `${(diff.y / SCENE_HEIGHT) * 100}%`,
                      width: `${(diff.radius * 2.2 / SCENE_WIDTH) * 520}px`,
                      height: `${(diff.radius * 2.2 / SCENE_WIDTH) * 520}px`,
                      maxWidth: '70px',
                      maxHeight: '70px',
                      minWidth: '40px',
                      minHeight: '40px'
                    }}
                    title={`${diff.name}: ${diff.description}`}
                  >
                    <span className="marker-badge">✓ #{diff.discoveryNumber}</span>
                  </div>
                ))}

                {/* Review Mode Markers for Unfound Items */}
                {gameState === 'review' && DIFFERENCES.filter(d => !foundSet.has(d.id)).map((diff) => (
                  <div
                    key={`review-${diff.id}`}
                    className="discovery-marker review-mode"
                    style={{
                      left: `${(diff.x / SCENE_WIDTH) * 100}%`,
                      top: `${(diff.y / SCENE_HEIGHT) * 100}%`,
                      width: `${(diff.radius * 2.2 / SCENE_WIDTH) * 520}px`,
                      height: `${(diff.radius * 2.2 / SCENE_WIDTH) * 520}px`,
                      maxWidth: '70px',
                      maxHeight: '70px',
                      minWidth: '40px',
                      minHeight: '40px'
                    }}
                    title={`${diff.name}: ${diff.description}`}
                  >
                    <span className="marker-badge">🔍</span>
                  </div>
                ))}

                {/* Miss Ripples */}
                {missRipples.filter(r => r.canvas === 'B').map((r) => (
                  <div
                    key={r.id}
                    className="miss-ripple"
                    style={{ left: `${r.x}px`, top: `${r.y}px` }}
                  />
                ))}
              </div>

              {/* Synchronized Magnifier Loupe B */}
              <div
                className="loupe-container"
                style={{
                  display: loupePos.visible ? 'block' : 'none',
                  left: `${loupePos.xPct}%`,
                  top: `${loupePos.yPct}%`
                }}
              >
                <canvas
                  ref={loupeCanvasBRef}
                  width={MAGNIFIER_SIZE}
                  height={MAGNIFIER_SIZE}
                  className="w-full h-full"
                />
                <div className="loupe-lens-glare" />
              </div>
            </div>
          </div>

        </div>

        {/* Detective Observation Log Drawer */}
        <div className="bg-[#14121b] border border-amber-900/30 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-base">📜</span>
              <h2 className="font-serif font-bold text-sm text-amber-200 tracking-wide">
                Detective Observation Log
              </h2>
            </div>
            <span className="text-xs text-stone-400">
              Anomalies are cataloged in the order you discover them
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {discoveryOrder.length === 0 && gameState !== 'review' ? (
              <div className="text-stone-400 italic text-xs py-2">
                No differences identified yet. Inspect both scenes with the Synchronized Loupe...
              </div>
            ) : (
              <>
                {discoveryOrder.map((diff) => (
                  <div
                    key={diff.id}
                    className="bg-stone-900/90 border border-amber-900/40 rounded-lg p-3 text-xs shadow-md transition-all hover:border-amber-500/60"
                  >
                    <div className="flex items-center justify-between font-semibold text-amber-300 mb-1">
                      <span>Discovery #{diff.discoveryNumber}: {diff.name}</span>
                      <span className="text-[10px] bg-amber-950/80 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800/60">
                        {diff.category}
                      </span>
                    </div>
                    <p className="text-stone-300 leading-relaxed">{diff.description}</p>
                  </div>
                ))}

                {gameState === 'review' && DIFFERENCES.filter(d => !foundSet.has(d.id)).map((diff) => (
                  <div
                    key={`unsolved-${diff.id}`}
                    className="bg-stone-900/90 border border-amber-500/40 rounded-lg p-3 text-xs shadow-md"
                  >
                    <div className="flex items-center justify-between font-semibold text-amber-400 mb-1">
                      <span>Unsolved Anomaly: {diff.name}</span>
                      <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700">
                        {diff.category}
                      </span>
                    </div>
                    <p className="text-stone-300 leading-relaxed">{diff.description}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

      </main>

      {/* MODAL: Case Briefing & Rules (Initial Launch) */}
      {gameState === 'briefing' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#171520] border-2 border-amber-600/70 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-center">
            
            <div className="w-16 h-16 rounded-full bg-amber-950 border-2 border-amber-500 mx-auto flex items-center justify-center text-3xl mb-4 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              🕵️
            </div>

            <h2 className="font-serif font-bold text-2xl text-amber-200 mb-1">
              Detective Academy: Case Briefing
            </h2>
            <p className="text-xs font-semibold text-amber-400/90 mb-4">
              The Alchemist's Celestial Laboratory
            </p>

            <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-4 text-left text-xs text-stone-300 space-y-3 mb-6 leading-relaxed">
              <p className="flex items-start gap-2.5">
                <span className="text-amber-400 font-bold">1.</span>
                <span><strong>10 Micro-Differences:</strong> There are 10 concealed structural differences between Scene A and Scene B. They are not in sequential order across the room.</span>
              </p>
              <p className="flex items-start gap-2.5">
                <span className="text-amber-400 font-bold">2.</span>
                <span><strong>Strict 13-Click Limit:</strong> You have only <strong>13 Focus Charges</strong> total. Every click counts (whether correct or a miss). You have room for only <strong>3 misclicks</strong>!</span>
              </p>
              <p className="flex items-start gap-2.5">
                <span className="text-amber-400 font-bold">3.</span>
                <span><strong>Magnifying Loupe Essential:</strong> Differences test fine details (microscopic star companions, ribbon knot counts, tick notches, mathematical notation θ vs φ, crystal fractures). Move your cursor to zoom in with the twin lens!</span>
              </p>
              <div className="flex items-start gap-2.5 bg-rose-950/50 border border-rose-800/60 rounded-lg p-2.5 text-rose-200">
                <span className="text-rose-400 font-bold text-sm">⚠️</span>
                <span><strong>Mandatory 2-Minute Reflection Pause:</strong> If you exhaust all 13 clicks without finding all 10 differences, the investigation will automatically <strong>pause and lock out for 2 full minutes</strong>. Blind guessing is penalized!</span>
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-stone-950 font-serif font-bold text-base shadow-lg shadow-amber-600/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              I Understand the Rules — Begin Investigation
            </button>

          </div>
        </div>
      )}

      {/* MODAL: 2-Minute Reflection Lockout Screen */}
      {gameState === 'lockout' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 z-50">
          <div className="bg-[#171520] border-2 border-rose-600/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-center">
            
            <div className="w-16 h-16 rounded-full bg-rose-950 border-2 border-rose-500 mx-auto flex items-center justify-center text-3xl mb-3 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
              ⏳
            </div>

            <h2 className="font-serif font-bold text-2xl text-rose-300 mb-1">
              13 Focus Charges Depleted
            </h2>
            <p className="text-xs text-stone-400 mb-4">
              Mandatory Reflection Lockout Active
            </p>

            <div className="bg-stone-900/90 border border-rose-950 rounded-xl p-5 mb-5">
              <span className="text-[11px] uppercase tracking-wider text-rose-400 block mb-1">
                Time Remaining Before Next Attempt
              </span>
              <div className="font-mono text-4xl font-bold text-amber-300 mb-3">
                {formatTime(lockoutRemaining)}
              </div>
              
              <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-amber-500 transition-all duration-1000"
                  style={{ width: `${lockoutProgressPct}%` }}
                />
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                You identified <strong className="text-amber-300">{foundSet.size} / {TOTAL_DIFFERENCES}</strong> differences. To discourage hasty spam-clicking and cultivate patient observation, take this time to review the twin scenes calmly and plan your next investigation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={enableReviewMode}
                className="flex-1 py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium text-xs transition-colors"
              >
                Surrender Case & Inspect Solution
              </button>
              <button
                onClick={startGame}
                disabled={lockoutRemaining > 0}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  lockoutRemaining > 0
                    ? 'bg-stone-800 text-stone-500 opacity-40 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                }`}
              >
                {lockoutRemaining > 0 ? `Locked (${formatTime(lockoutRemaining)})` : 'Start Next Attempt 🔄'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Victory Screen */}
      {gameState === 'won' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#171520] border-2 border-emerald-500/80 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center">
            
            <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-400 mx-auto flex items-center justify-center text-3xl mb-4 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              🏆
            </div>

            <h2 className="font-serif font-bold text-2xl text-emerald-300 mb-1">
              Master of Observation!
            </h2>
            <p className="text-xs text-stone-300 mb-5">
              All 10 Celestial Micro-Anomalies Identified
            </p>

            <div className="grid grid-cols-2 gap-3 bg-stone-900/80 border border-stone-800 rounded-xl p-4 mb-6 text-center">
              <div>
                <span className="text-[10px] uppercase text-stone-400 block mb-1">Time Elapsed</span>
                <span className="font-mono text-xl font-bold text-sky-300">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-stone-400 block mb-1">Focus Conserved</span>
                <span className="font-serif text-xl font-bold text-amber-300">
                  {clicksRemaining} / {MAX_CLICKS}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={enableReviewMode}
                className="flex-1 py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs transition-colors"
              >
                Inspect Case Notes
              </button>
              <button
                onClick={startGame}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs transition-colors"
              >
                Investigate Again
              </button>
            </div>

          </div>
        </div>
      )}

      <footer className="text-center py-3 text-xs text-stone-500 border-t border-stone-900">
        Observation Academy • Find the Differences • 13-Click Focus Rule • 2-Minute Lockout
      </footer>
    </div>
  );
};

export default SpotTheDifferences;
