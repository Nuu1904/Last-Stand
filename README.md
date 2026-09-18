# LAST STAND

**LAST STAND** is an intense, arcade-inspired top-down 2D zombie survival shooter. Built from the ground up with pure Vanilla JavaScript and HTML5 Canvas, the game challenges players to survive escalating zombie hordes, complete dynamic tactical objectives, level up with choice-based roguelite upgrades, manage automatic weapon heat, and defeat colossal multi-phase bosses.

---

- **Complete Coin Economy & Field Armory System**:
  - **Dynamic In-Run Coin Rewards**: Earn coins from enemy kills (+10 Walker, +15 Runner, +20 Spitter/Crawler, +30 Brute, +35 Hunter, +200 Boss), headshot precision kills (+10 bonus), multi-kill streak multipliers, tactical objective milestones, and wave survival completions.
  - **Dual-Currency Architecture**:
    - **Run Coins (🪙)**: Active currency earned during combat for immediate upgrades, equipment, and supplies.
    - **Banked Coins (🏦)**: Unspent Run Coins automatically convert to permanent Banked Coins upon extraction or death, stored safely in versioned `localStorage` (`last_stand_save_v1`).
  - **6 Armory Categories**:
    - **Weapons**: Calibrate damage, fire rate, magazine size, and reload speed (Levels 1–5) and unlock locked armaments (Shotgun, SMG, Sniper, Grenade Launcher).
    - **Survivor (Player)**: Permanent per-run stat upgrades for Max Health, Sprint Stamina, Movement Speed, and Critical Chance.
    - **Tactical Equipment**: High-utility survival attachments including the High-Intensity Flashlight (widened & extended beam cone), Kevlar Weave (15% damage mitigation), Coin Magnet Sensor (doubled collection radius), Quick Holster (+25% stamina regen), and Tactical Ammo Rig (+50% ammo reserve capacity).
    - **Supplies & Munitions**: Tactical mid-run emergency field purchases including First Aid Kits (+35 HP), Emergency Stim (+60 HP), Reserve Ammo Packs, Grenade bundles, and Kevlar Armor Shield restoration.
    - **Rotating Black Market**: Rare high-risk, high-reward prototype gear that rerolls stock every 3 waves, including Hollow-Point Ammo (+25% headshot multiplier), Adrenaline Injector (+30% speed when below 35% HP), Explosive Rounds (22% chance of area-of-effect blast on impact), and Vampiric Shots (+3 HP restore on enemy kill).
    - **Permanent Base Upgrades**: Meta-progression funded with Banked Coins persisting across all play sessions, including Scavenger Sense (+15% extra coins), Reinforced Vests (+20 starting HP), Field Medic Training (+25% medkit heal bonus), and Starting Reserves (extra initial magazines).
  - **Non-Forced Wave Intermission**: Between waves, players are presented with `[ARMORY]` and `[CONTINUE]` options, or can press `B` at any time during wave intermission to open the Armory modal.
- **Hunter Zombie Archetype**:
  - Agile, aggressive infected variant that circles the player and performs rapid high-speed lunges when within strike distance (Wave 4+).
  - Yields 35 coins and 38 XP upon elimination.
  - **Structured Asset Organization**: Clean `assets/images/`, `assets/sounds/`, and `assets/icons/` hierarchy.
  - **Interactive Asset Preloader**: Sleek tactical boot screen with dynamic progress bar (`0%` to `100%`) and status messages.
  - **Dual-Layer Resilience & Procedural Fallbacks**: If any asset fails or 404s, the game gracefully falls back to built-in procedural HTML5 Canvas rendering and Web Audio API synthesis without freezing, crashing, or interrupting gameplay.
  - **Strict Relative Paths**: 100% compliant with GitHub Pages subpath hosting (`https://<username>.github.io/LAST-STAND/`).
- **Responsive Direct Movement**: Zero-drift, immediate stopping on key release, normalized diagonal speed, sprint stamina mechanics, and smooth obstacle collision sliding.
- **Custom Tactical Crosshair & Aiming System**:
  - **Screen-to-World Coordinate Accuracy**: Camera-aware aim calculation clamped to viewport bounds with automatic sub-pixel scaling and real-time motion compensation.
  - **Dynamic Reticle (`--●--`)**: Clean tactical survival design with crisp center dot, 4 cross-struts, and dual-layer high-contrast dark halo.
  - **Target Acquisition**: Center dot expands and shifts to vibrant hostile amber/red when hovering over normal zombies.
  - **Boss Target Lock**: Displays tactical corner bracket reticle (`[ ]`) when hovering over multi-phase bosses.
  - **Recoil Bloom & Hit Feedback**: Crosshair struts dynamically expand on weapon discharge and snap back; hit markers and golden skull kill confirmations pulse on impact.
  - **Dynamic Cursor Management**: System cursor is hidden inside the combat arena and seamlessly restored across all menus, modals, upgrade cards, and canvas exits.
- **Weapon Personality & SMG Overheat**:
  - **Pistol**: Accurate, reliable, infinite reserve ammo.
  - **Shotgun**: Lethal 8-pellet spread cone with heavy close-range knockback.
  - **SMG**: High cyclic fire rate featuring a balanced heat meter that overheats under continuous fire.
  - **Sniper**: Armor-piercing, long-range rifle with massive 3.5x critical multiplier.
  - **Grenade**: Bouncing projectile with flashing LED fuse and wide-area explosive shockwave.
- **Distinct Zombie Types & Multi-Phase Bosses**:
  - **Walker**: Standard relentless swarm infected.
  - **Runner**: Fast, agile sprinter with evasive zig-zag pathing.
  - **Brute**: Armored tank with heavy knockback resistance and ground stomp shockwave.
  - **Spitter**: Ranged threat launching toxic bile that creates lingering hazardous acid puddles.
  - **Crawler**: Low silhouette, fast scuttling speed bursts from blind spots.
  - **Boss Encounters**: Colossal bosses appearing every 5 waves with warning siren banner and 3 escalating attack phases.
- **Dynamic Wave Objectives**: Random tactical missions appear periodically:
  - **Supply Run**: Locate and secure 3 scattered supply crates.
  - **Rescue**: Protect an allied survivor NPC against attacks for 40 seconds.
  - **Generator**: Hold position near the generator landmark to repair it to 100%.
  - **Extraction**: Reach the landing helipad before the countdown timer expires.
  - **Defense**: Hold ground inside the designated perimeter ring for 35 seconds.
  - Compass pointer arrow points toward off-screen objectives.
- **Choice-Based Roguelite Upgrades & XP**:
  - Defeat zombies to gain XP and level up.
  - Wave completion and level-ups present 3 randomized perk cards (Gunslinger, Heavy Hitter, Runner, Juggernaut, Fast Hands, Extended Mags, Deadeye, Executioner, Vampire, Kevlar Plating, Adrenaline, Bounty Hunter).
- **Tactical Power-Up Drops**: Defeated enemies occasionally drop Medkits, Ammo Crates, Kevlar Shields, Rapid Fire, Damage Boosts, or Speed Surges.
- **Audio System**: Audio element playback of asset sound effects with instant fallback to procedural Web Audio API synthesizers.
- **Dark Abandoned-City Visuals**: Flashlight night atmosphere with radial ambient lighting, city streets, destructible crates, blood decals, and mini-radar.
- **Local Persistence**: Tracks high scores, best wave, and kills in `localStorage` with safe fallbacks.

---

## Project Structure

```
LAST-STAND/
├── index.html
├── style.css
├── game.js
├── README.md
└── assets/
    ├── images/
    │   ├── player.png
    │   ├── zombie-walker.png
    │   ├── zombie-runner.png
    │   ├── zombie-brute.png
    │   ├── zombie-spitter.png
    │   ├── zombie-crawler.png
    │   ├── zombie-boss.png
    │   ├── medkit.png
    │   ├── ammo-crate.png
    │   └── blood-splatter.png
    ├── sounds/
    │   ├── shoot.mp3
    │   ├── reload.mp3
    │   ├── hit.mp3
    │   ├── enemy-death.mp3
    │   ├── wave-start.mp3
    │   ├── powerup.mp3
    │   ├── game-over.mp3
    │   ├── boss-warning.mp3
    │   └── button-click.mp3
    └── icons/
        └── favicon.png
```

---

## Controls

### Desktop
- **`W`, `A`, `S`, `D` / `Arrow Keys`**: Move survivor (instant stop on release, normalized diagonal speed)
- **`Shift`**: Tactical sprint (consumes stamina)
- **`Mouse`**: Aim 360° with custom tactical crosshair & target lock
- **`Left Click`**: Fire weapon directly toward crosshair (hold for automatic SMG)
- **`1` – `5` / `Mouse Wheel`**: Switch weapon (Pistol, Shotgun, SMG, Sniper, Grenade)
- **`R`**: Reload magazine
- **`B`**: Open Field Armory shop (between waves)
- **`ESC` / `P`**: Tactical pause / Close modal (restores default system cursor)

### Mobile & Touch (Landscape-First Architecture)
- **Edge-to-Edge Responsive Viewport**: Fixed full-viewport container (`100dvw`, `100dvh`) powered by `visualViewport` and dynamic `worldScale` calculation, intelligently expanding arena visibility on ultra-wide phone displays with zero letterbox black bars or squeezed visuals.
- **Top-Anchored Independent HUD**:
  - **Top-Left**: Vitality module (Level, Health bar, Stamina bar, XP progression).
  - **Top-Center**: Wave counter, remaining enemy telemetry, objective tracker, and boss health bar.
  - **Top-Right**: Ammo counter, active weapon badge (`🔫 PISTOL`, etc.), gold coins, and pause trigger.
  - **Bottom Screen**: 100% free of HUD elements, preventing any overlap with movement or firing controls.
- **Dedicated Virtual Joystick (Bottom-Left)**: Responsive thumbstick centered at 10–15% from left and 15–20% from bottom with dynamic throw radius (`35%` of zone width) and instant return to neutral on release (zero drift).
- **Non-Overlapping Action Buttons Arc (Bottom-Right)**:
  - **SHOOT (🎯)**: Prominent primary fire button at bottom-right corner.
  - **RELOAD (🔄)**: Quick-reload button positioned with certified physical clearance to the left of SHOOT.
  - **SPRINT (⚡)**: Sprint surge toggle positioned directly above SHOOT.
  - **GRENADE (💣)**: Quick-throw grenade button positioned diagonally above SHOOT with active ammo badge.
  - **SWAP (⇄)**: Fast weapon cycle button positioned on outer wing.
  - *Certified Geometric Clearance*: All buttons maintain $>12\text{px}$ physical separation on all phone sizes.
- **Twin-Stick Touch Aim Zone**: Touch and drag anywhere on the right screen half for 360° twin-stick aiming and automatic firing.
- **Portrait Orientation Protection**: Automatic detection of vertical phone orientation displaying "PLEASE ROTATE YOUR DEVICE", pausing physics, and cleanly resuming upon rotating back to landscape.
- **Safe Area Inset Compliance**: All controls and HUD modules account for phone notches, dynamic islands, and gesture bars via `env(safe-area-inset-*)`.

---

## How to Play

1. **Move & Position**: Keep moving to avoid getting cornered by runners and crawlers. Use cover and slide along walls.
2. **Aim & Fire**: Aim for headshots to deal massive damage. Monitor your ammo count and reload during quiet moments.
3. **Manage Heat**: While firing the SMG, feather the trigger so the heat meter doesn't reach 100% and lock you out.
4. **Avoid Toxic Acid**: Stay clear of green acid puddles left by Spitters to prevent taking damage over time.
5. **Complete Objectives**: Follow the off-screen compass pointer to complete tactical missions for bonus gold, XP, and combat advantages.
6. **Upgrade Wisely**: Select upgrades that complement your survival strategy.

---

## GitHub Pages Deployment

This project uses strictly relative asset paths (`assets/images/...`, `assets/sounds/...`, `assets/icons/...`), ensuring 100% out-of-the-box compatibility with GitHub Pages custom domains as well as repository subpaths (`https://<username>.github.io/<repo-name>/`).

1. Create a repository on GitHub named `last-stand` (or any name).
2. Commit and push the project files and `assets` folder:
   ```bash
   git init
   git add .
   git commit -m "Deploy LAST STAND with asset pipeline"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo-name>.git
   git push -u origin main
   ```
3. In your repository on GitHub:
   - Go to **Settings** > **Pages** (in the sidebar).
   - Under **Build and deployment** > **Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` (or `master`) and `/ (root)`.
   - Click **Save**.
4. GitHub Pages will publish your game at:
   `https://<username>.github.io/<repo-name>/`

---

## Technologies

- **HTML5 Canvas**: High-performance 60 FPS 2D rendering with sprite texture support
- **Vanilla JavaScript (ES6+)**: Modular game loop, collision sliding, AI state machines, and asset preloading
- **Vanilla CSS3**: Modern dark tactical industrial HUD, responsive layouts, preloader bar, and animations
- **Web Audio API & Audio Elements**: Dual-mode audio pipeline with asset sound playback and procedural synth fallbacks
- **Web Storage API**: Local high-score and preference persistence

---

## Developer Credits

Created & Hosted by **Ly Lindarina**  
GitHub: [@Nuu1904](https://github.com/Nuu1904)
