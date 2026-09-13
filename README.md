# The Alchemist's Celestial Laboratory — Spot the Differences (React TSX)

An interactive micro-observation game built with **React and TypeScript (`.tsx`)**, designed to cultivate deep visual inspection, patience, and analytical observation skills in students.

---

## 📁 Repository Structure

```
find-the-differences/
├── games/
│   ├── logic.tsx              # Game state hook (useGameLogic), sound engine, constants, canvas scene drawing
│   ├── SpotTheDifferences.tsx # Full React TSX Component (HUD, Viewports, Loupe, Modals)
│   ├── index.tsx              # Public exports (default export: SpotTheDifferences)
│   └── styles.css             # Standalone animations & visual effects styles
├── package.json               # Node / NPM package metadata
├── tsconfig.json              # TypeScript configuration
└── README.md                  # Documentation and integration guide
```

---

## 🎯 Game Rules & Features

### 1. Strict 13-Click Focus Rule
- Students start with **13 Focus Charges (clicks)** to identify **10 differences**.
- Every click on either scene consumes 1 Focus Charge (whether a hit or a miss).
- This allows **at most 3 mistakes**. Spam-clicking rapidly exhausts Focus.

### 2. Mandatory 2-Minute Reflection Lockout
- Depleting all 13 Focus Charges without discovering all 10 differences activates a **mandatory 2-minute cooling lockout** (`02:00` live countdown).
- Retry and reset controls are disabled during this period to discourage blind guessing and prompt students to study the static scenes calmly before attempting again.

### 3. Synchronized Magnifying Loupe (2.5x HD Zoom)
- The 10 differences are calibrated micro-details specifically designed for loupe inspection (hairline tick marks, binary star companions, knot counts, mathematical notation, and crystal cleavage veins).
- Hovering or dragging across either image dynamically updates twin 2.5x circular loupes on both scenes simultaneously.

### 4. Non-Spatial Numbering Order
- Discovered anomalies display chronological badges (`✓ #1`, `✓ #2`, etc.) in the exact order the student found them, preventing students from deducing remaining locations from missing sequential numbers.

### 5. Zero-Asset Web Audio Synthesizer
- Built-in sound engine using native browser Web Audio API (ascending harmonic chimes, buzzers, click ticks, and victory fanfare) without any external audio file dependencies.

---

## 💻 How to Use in Your React / Next.js / Vite Project

### 1. Import Component
```tsx
import SpotTheDifferences from './games';
// or
import { SpotTheDifferences } from './games/SpotTheDifferences';

export default function App() {
  return (
    <main>
      <SpotTheDifferences />
    </main>
  );
}
```

### 2. Custom Game Logic Usage (Headless)
If you want to build your own custom UI using the game logic:
```tsx
import { useGameLogic, renderCanvasScene, DIFFERENCES } from './games/logic';

function CustomGame() {
  const {
    gameState,
    clicksRemaining,
    foundSet,
    discoveryOrder,
    startGame,
    handleSceneClick
  } = useGameLogic();

  // Your custom UI here
}
```

---

## 🔍 The 10 Calibrated Micro-Observations

| Anomaly Name | Category | Observation Challenge | Scene A (Original) | Scene B (Altered) |
|---|---|---|---|---|
| **Dried Botanical Twine Bindings** | Botany | Wrap Count | 4 tight horizontal twine wraps | 3 horizontal twine wraps |
| **Celestial Binary Star Companion** | Astronomy | Microscopic Feature | Single 4th constellation star | Faint companion star orbiting beside it |
| **Scholar's Parchment Wax Signet** | Archives | Geometric Rings | Single stamped outer ring | Double concentric stamped rings |
| **Astronomical Clock Hand Tip** | Horology | Silhouette Shape | Open crescent-moon counterweight | Solid sharp lance-point counterweight |
| **Condenser Collar Etched Scale** | Apparatus | Graduations Count | 6 delicate etched scale tick marks | 5 etched scale tick marks |
| **Specimen Crystal Prismatic Vein** | Minerals | Internal Cleavage | Flawless crystal interior | Delicate internal diagonal fracture vein |
| **Armillary Horizon Ring Calibrations** | Instrumentation | Calibration Tick Notch | 5 fine calibration tick marks | Missing 15° graduation tick mark (4 ticks) |
| **Alembic Suspended Micro-Flakes** | Alchemy | Particle Count | 3 suspended glowing gold flakes | 5 suspended glowing gold flakes |
| **High Grimoire Silk Ribbon Tassels** | Symbology | Microscopic Bead Count | 3 embroidered knot beads on ribbon tip | 2 embroidered knot beads on ribbon tip |
| **Geometric Proof Angle Notation** | Mathematics | Greek Symbol Notation | Inscribed circle angle marked with θ | Inscribed circle angle marked with φ |
