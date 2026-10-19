# Castle Crashers Remastered PC -> Web Port — Working Notes
(Updated 2026-10-18/19 by Jcode, resuming two Hermes sessions)

## Layout
- Source PC build: ~/castle-pc/CastleCrashers (blowfish-encrypted .COK6.NREC paks)
- Build pipeline: ~/castle-pc/build_pc_web.py (592 lines; decrypt -> AVM1 opcode rewrite -> shim inject -> deploy)
- Web root: ~/castle-pc-web/web (157 scenes, index.html = router/host, port 9135)
- Pristine rebuilt SWFs: ~/castle-pc-web/swf/
- Test pages: bare.html?swf=<name>/<name>.swf (same-origin, minimal host), lvltest.html?lvl=N

## Server
- python3 http.server on 9135 serving ~/castle-pc-web/web (transient systemd unit, no file on disk)
- start: `nohup python3 -m http.server 9135 --directory ~/castle-pc-web/web &`

## Headless test setup (works well)
- Playwright + Chromium SwiftShader flags:
  --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --disable-gpu-sandbox
- preserveDrawingBuffer:true via getContext patch to readPixels
- NODE_PATH=/home/jewboy420/.npm-global/lib/node_modules (playwright is global)
- Canvas is inside ruffle-player SHADOW DOM: p.shadowRoot.querySelector('canvas')

## Fixed this session
1. lobby/lobby.swf: corrupted DoAction tag header @819111 ('d9 03' instead of '3f 03' + len 725). All /tmp lobby_* variants shared it. Fixed = rewrite header bytes as struct('<HI', 831, 725). 368 tags walk clean.
2. lobby auto-join path string was 'map_new/ab/ab.swf' (broken 17-char hack) -> patched in place to 'map_new?via=lobby' (contains 'map' so router loads map_new/map_new.swf).
3. index.html router ORDER bug: 'lobby' check preceded 'map' check, so 'map_new?via=lobby' looped back to lobby. Fixed: map check first.
4. index.html: exposed window.handleFlashCommand (SWFs call it via getURL javascript:), boot timers now cancel on Digit hotkeys, stopBoot() hides #boot overlay on scene jumps, window.getCurrentMovie() getter added.
5. VERIFIED: lobby auto-join chain works headlessly: Digit3 -> lobby -> OL_JOINED -> map_new/map_new.swf loads and RENDERS (campaign map w/ level nodes, Home/Store/Stats).
6. Digit5 -> level1 loads and renders (alien ship banquet scene IS level1 content; music 013_ALIEN_SHIP.wav).

## Current blocker: level1 players never activate
- RESOLVED/WORKAROUND: level1 (alien ship) is gated by an intro cinematic that never completes standalone. **level2 (Home Castle) IS fully playable standalone**: knights standing, ArrowRight scrolls camera, enemies present, combat works. Digit5 now loads level2 (was level1).
- VERIFIED 2026-10-19: Digit5 in index.html -> level2/level2.swf fullscreen, playable, camera + combat live.
- Scene renders, knights idle-bob, but camera never scrolls; ArrowRight/D held (trusted keys) does nothing.
- 60s wait does not complete the intro. Input mashing (all keys) does nothing.
- AVM1 analysis of level1/level1.swf:
  * init chain: loader.game.container.skipintro n_state p_game console_version -> bsp1.f_BSPLoadLevel -> f_InitLevelBSP f_InitCamera f_SetPortals f_SetEdges f_LoadLevelClips f_CreateShadows f_LevelInitSpawnPlayers f_ResetCamera f_Main f_SetMainfp PlayMusic ... f_ActivatePlayers fader.f_FadeIn
  * There is an intro cinematic: cinema_cam gotoAndPlay('countdown'), ends at label 'done' -> _root.f_PlayersGo -> f_ActivatePlayers + f_HudWaitEnd + f_SetCinematicCamera
  * Levels expect to be loaded INSIDE main.swf hierarchy (_root.loader.game.container) — standalone loads lack that state
  * level1 exits via portal to ../level54/level54.swf
- HYPOTHESIS: levels must be loaded by the GAME'S OWN flow (map node -> play) so the SWF is loaded into the running movie natively by Ruffle (relative loadMovie '../levelN/levelN.swf'), preserving hierarchy. Hotkey Digit5 standalone load will never be playable without a self-init shim.
- map_new interaction state: clicking nodes pans/zooms map; character marker sits at Home Castle; small 2-row button panel below marker (Play/?) at approx (298-341, 293-312) in 848x480 stage at default zoom; level bar tooltip at top. Panel clicks + Enter/Space haven't triggered level load yet. Red dots on level bar = path endpoints/locked state. NEED: exact hit on panel buttons or correct confirm key.
- Unknown opcodes 160/162/163 spam from map_new: 19 unrewritten CUSTOM_PUSH (0xA0-0xA4) survive in deployed map_new (29 pre-rewrite). Root cause: deployed map_new predates current rewrite? Rebuild from map_new.pak attempted but pristine extract itself has tag-walk corruption near offset 862972 (DefineBitsJPEG2 region); Ruffle tolerates it (renders fine) — don't trust naive tag walk for this file.

## Tooling notes
- tag walker: rect nbits at data[8]>>3, tags start at 8 + ceil((5+4*nbits)/8) + 4. Long tag header word is (code<<6)|0x3F little-endian ('3f 03' for DoAction code 12).
- lobby repair one-liner: data[819111:819117] = struct.pack('<HI', 831, 725)
- map_new rebuild attempt: importlib load build_pc_web.py, decrypt map_new.pak, rewrite_swf_deep('map_new', swf, stats, inject_shim=True) — output has walk corruption but Ruffle loads it; verify by rendering, not by tag walk.

## Next steps (ordered)
1. Map -> level: get the panel Play button hit exactly (hit-test sweep 1px grid around (298-341, 293-312) after selecting Home Castle node), or find the confirm key. Goal: native load of level2/level2.swf inside map player.
2. Once native level load works, verify knight stands + ArrowRight scrolls camera in that context.
3. If standalone levels still needed (Digit5), write a self-init shim injected into each level SWF: define _root.loader.game.container stubs, set skipintro=true, force f_ActivatePlayers after f_Main.
4. map_new vertical stretch: 4:3 content on 16:9 stage — scale mode fix in index.html (letterbox) or SWF stage scaleMode.
5. Save persistence: host-side via ccSaveSet/ccSaveGet FSCommand bridge (already stubbed in index.html); needs AVM1-side ReadStorage writes rerouted.
6. Missing sounds cleanup (sound_*_magic.wav etc.) — mostly cosmetic warnings.

## Session 2 findings (2026-10-19)
- **BREAKTHROUGH: level2 (Home Castle) is FULLY PLAYABLE standalone** — knights spawn standing, ArrowRight scrolls camera, enemies visible, combat input works. Digit5 in index.html now boots level2 (changed from level1). Verified in main port fullscreen.
- Level sweep results (standalone, bare.html): level3/4/5/7/8 render full terrain but NO player spawns and no camera motion. Same-class failure as level1 but without the cinema gate. Only level2 self-activates players standalone.
- main.swf boots to black (plus unmute overlay). It is the authentic loader (has f_ChangeLevel, f_SetLevelCompleted, loads ../levelN/levelN.swf relative — paths resolve correctly from web/main/). Needs debugging: likely stuck in preloader or waiting on host calls before showing splash.
- map_new Play panel: grid sweep over the button panel did not trigger level load. Level bar tooltip shows 'level 2-1 Progress N' and panel below marker. Nodes may be locked pending f_GetLevelUnlocked host function or save state (map_new only REFERENCES it — definition must come from injected _global shim; verify shim actually executes in map_new like it does in lobby).
- Sweep method note: identical nonBlack counts (5500 exactly) across levels 3/4/5/7/8 suggest readPixels sampling artifact or fully-terrain scenes; use screenshots, not pixel sampling alone, for playability judgment.
- main.swf black screen ROOT CAUSE: main.swf had NO injected shim (first tag is SetBackgroundColor; lobby's first tag is the 8996-byte shim DoAction). Injected build_host_shim_tag() manually -> still black => main.swf is NOT a boot entry point, it's the in-game HUD/manager library (f_ChangeLevel/QuitTo/victory handlers). Black is expected standalone. The index.html logo->legal->attract chain already replaces its boot role.
- character select (select/select.swf) WORKS standalone: renders 4 player slots with Gamertag 99 placeholders (host shim functional — GetLocalGamerTag responding), level display, arrows for character cycling. Didn't reach level load via synthetic Enter/Space yet; portraits may need player/player_new.swf or arrow cycling. Select has StartSession + SetKeyboardMapping + arena level refs (level24/46/47/48/49).
- main.swf shim-injected copy saved to web/main/main.swf and web/g/main.swf (harmless; walk-validated 402 tags).
- level3 in MAIN port after Digit5->BracketRight: terrain renders AND camera scrolls on ArrowRight (left-edge displacement confirmed). In main-port context levels initialize better than bare standalone. Player knights still not visible in frame — need on-screen confirmation of spawns, but input reaches the level.
- Select UI: slot arrows/portraits don't respond standalone (no player port assigned — SetLastUsedPort context missing outside the amenu flow).
- CONFIRMED FRONTIER: level3 in main port, even after 20s wait + ArrowRight walk, NEVER spawns knights. Terrain + camera + a small level progress HUD top-right. So the spawn chain (f_LevelInitSpawnPlayers/f_ActivatePlayers) silently fails for all levels except level2. Prime suspect: per-level host state (n_state, p_game, loader.game.container chain) that only level2 tolerates missing. Fix = self-init shim per level SWF or authentic in-movie loading.

## Spawn-chain reverse engineering (session 2, deep dive)
- level3 init DoAction: ConstantPool(254) then f_Init/f_Main/f_SetPortals/f_LeaveLevel/f_LoadLevelClips/f_CreateSnakes... all DefineFunction2 named functions.
- Init UNCONDITIONALLY calls r1.f_SetDepths(0), r1.f_LevelInitSpawnPlayers(0), r1.f_PlayerArray(0) around code offset 805-858, then jumps to the main body at 2173. The 864-branch (ResetCamera/f_Main/f_SetMainfp/f_LevelItems/PlayMusic/f_ActivatePlayers(0)/f_FadeIn) is a separate path.
- f_ActivatePlayers IS called (once, ~offset 957). Spawn failure is INSIDE f_LevelInitSpawnPlayers or its data (active_players roster empty without host session state).
- Injected loader.game.container stubs + n_state=1 + p_game=true + console_version=1 + skipintro=true pre-DoAction into level3 (/tmp/level3_full_shim.swf, deployed): still no knights. Stub hypothesis insufficient.
- The injected lobby-style shim (8996B DoAction) defines ~40 _global host functions as NO-OPS returning empty string (GetPlayerPort(slot)->'', GetLanguage->'', ReadStorage->'', etc). GetLocalGamerTag returns 'Player 1'. IsPlayerLocal/IsPlayerInSession/IsPlayerJoinComplete do slot-compare logic returning constants.
- PRIME SUSPECT for no-spawn: GetPlayerPort returns '' and session/roster functions return empties, so f_LevelInitSpawnPlayers iterates 0 players. NEXT LEVER: patch the shim inside each level SWF to return port=1, one local player, and IsPlayerLocal=true. NOTE: level SWFs currently have NO shim at all — the shim must first be PREPENDED (build_host_shim_tag()) then its GetPlayerPort body patched from push-empty to push-int-1.
- level2 mystery: works WITHOUT any of this; its f_LevelInitSpawnPlayers path must self-bootstrap a default player. Comparing level2 vs level3 spawn function bodies byte-by-byte is the highest-value next step.
- Fresh rebuild of level3 from level3.pak (full shim + rewrites, 264226B) renders identically — still no knights. Rules out deployment corruption; spawn gate is data/state based. Two viable paths forward: (a) patch shim host fns in each level (GetPlayerPort→1, IsPlayerLocal→true, session fns→true) then prepend shim, (b) authentic in-movie load via map Play flow. Note: fresh level3 build hung one headless Chrome once (820 big Function2 defs) — use timeouts.
- Session 2 late note: attempted full authentic menu-flow drive (attract->menu->amenu->select via clicks/Enter). Headless Chrome became unstable late in session (screenshots hang, pages die) - flow drive inconclusive, retry fresh next session. The chain itself is wired (router + FSCommand) and Digit-hotkeys remain the reliable driver.
- Deployed state: level3 = fresh rebuild + full patched shim (GetPlayerPort=1.0 etc), walks clean 279 tags. Still no knight spawns in level3 - roster gate is deeper (likely needs StartSession-created session objects, not just port returns). level2 remains the playable deliverable.

## Session 3 deep-dive (2026-10-19, resuming) — pixel-verified ceilings
- **CRITICAL TEST METHOD:** earlier "gray screen / no render" for levels was a **WebGL context-loss artifact**, NOT a game bug. The reliable headless launch is Playwright + `executablePath=/home/jewboy420/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome` + `args=['--no-sandbox','--disable-setuid-sandbox','--autoplay-policy=no-user-gesture-required','--mute-audio','--disable-gpu']` + `headless:false` + `DISPLAY=:99`. With `--disable-gpu` (SwiftShader CPU), readPixels works and gives true knight color counts. Do NOT use `--use-gl=desktop`/default (context lost -> 503k gray px, false "no content").
- Verified knight counts (25s wait, ?level=N direct):
  - level1: R=38 B=91 G=1674 Y=749 (ALL 4 knights — the ONLY fully-spawning level)
  - level2: R=186 B=2 G=0 Y=1253 (red+yellow only — the playable deliverable)
  - level3: R=0 B=138 G=0 Y=0 (blue only)
  - level4: all 0
- `f_LevelInitSpawnPlayers`/`f_CreatePlayers`/`f_ActivatePlayers` ARE `DefineFunction2` (0x8e) bodies inside main.swf only (levels only string-ref them). main.swf's copies reference ITS constant-pool indices -> cannot be transplanted into level SWFs without pool remap. The full engine is ~80 functions; a complete port needs authentic in-movie loading, not per-level stubs.
- Added levels 2-61 to build_pc_web.py SHIM_TARGETS (was level1 only) + added player-roster host fns (GetPlayerPort→1, IsPlayerLocal→true, GetNumLocalPlayers→1, session predicates). Rebuilt level3/4 with roster shim: brings back the single blue knight (B=138) but it is a STATIC prop (blue count unchanged through ArrowRight/jump) — NOT a controllable player. Regression-free.
- CONFIRMED honest ceiling: only level2 self-bootstraps a controllable player standalone. All other levels render terrain + 1 static knight at best because f_ActivatePlayers needs StartSession-created session/video objects (character-load state) that no amount of host-fn stubbing recreates.
- NEXT BEST LEVER (untried): authentic in-movie load via map_new Play panel (PORT_NOTES step 1, line 50) — requires exact panel hit or confirm key, so the level loads into the running lobby/map player which already holds the session objects. This is the only path to controllable knights on 3-61.

## Session 3b — authentic-path driver BLOCKED by headless runtime instability
- Attempted the documented next lever (map_new Play panel → native in-movie level load). Results:
  - `?movie=map_new/map_new.swf` now renders (angle-swiftshader flags: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --disable-gpu-sandbox`) but the **map art renders as grayscale/black only — zero colored terrain/nodes.** This is the known map_new DefineBitsJPEG2 corruption (PORT_NOTES line 42); can't visually locate the Play panel/nodes to click.
  - Lobby → map_new auto-join: lobby reaches the staging screen (wood textures visible) but **does NOT auto-advance to map_new** without selecting a knight, and pressing Enter/keys to join a player CRASHES the headless Chrome (`Target page closed`). PORT_NOTES 79 instability confirmed, reproducible.
  - net: the authentic lobby→map→Play path cannot be driven in the current headless SwiftShader harness (both lobby + map_new are too heavy, crash the browser / corrupt art). This is a TEST-INFRA blocker for that path, not proof the path is dead.
- Correctness note: map_new/swf DOES natively call f_ChangeLevel → fscommand('javascript:handleFlashCommand('f_ChangeLevel',target)'), and contains a hardcoded default `../level2/level2.swf`. So in-movie launching is wired; the holdup is purely that our harness can't reach a stable interactive map state.
- RECOMMENDATION for next real (interactive/desktop-chrome) session: drive the port in a REAL headed browser (chromium on the desktop, not Xvfb+SwiftShader) where map_new renders its art and lobby doesn't crash. Then click the Home Castle node + Play panel to confirm in-movie level load. This is the single highest-value next step and canNOT be validated headlessly.
- Standing engineering truth (3 sessions confirmed): only level2 fully playable standalone (controllable knight). Levels 3-61 need authentic in-movie loading (holding session objects) OR a full ~80-fn engine transplant with constant-pool remap. The roster/self-init shims are necessary but NOT sufficient.

## Session 3c — map_new art & L2/L3 structural findings
- **map_new non-standard JPEG is PRISTINE, not deploy corruption.** Fresh decrypt of map_new.pak → the 28 DefineBitsJPEG3 tags byte-for-byte identical to deployed, and NONE start with FFD8/FFD9 (start `f150fb00`, `fcd603fb`, etc). The input data is a non-standard/custom encoding that the real engine decodes; Ruffle renders those bitmaps as blank, hence grayscale map art. NOT fixable in the SWF — it's how the original data is stored.
- Earlier `tag corruption near 862972` note was a FALSE ALARM from a naive tag walker flagging code=69 (SetTabIndex) and long tags as errors. The tag stream actually walks clean: 931 tags, 4 giant code-148 tags (~1MB each = DefineFont/Sound data).
- **L2 vs L3 spawn model difference (key):** L2's init DoAction is `code_after_pool = 0 bytes` — pure constant-pool declaration, NO immediate init bytecode (the timeline frame clips drive spawn → works standalone). L3's init DoAction has `5101 bytes` of immediate bytecode that runs the full spawn chain synchronously → fails without engine state. So "make levelN behave like level2" = neutralize the immediate-init spawn gate per level, a fragile per-file task.
- Conclusion reaffirmed: the ONLY tractable path to controllable knights on 3-61 is authentic in-movie load in a REAL interactive browser (map art is blank headlessly but the nodes/playwright click targets aren't visible to drive it). Headless validation of that path is blocked on all three fronts (map art blank + lobby crashes SwiftShader + JPEG non-standard).

## Session 3 (2026-10-19 morning)
- **lobby.swf was OVERWRITTEN at 06:56 by another process** (likely a build/redeploy) with a stripped 785KB variant missing the shim (LOBBY_SHIM=0, no map_new?via path). Restored repaired+patched lobby (/tmp/lobby_final_deploy.swf, 819844B, 368 tags clean). Auto-join works again.
- **DISCOVERY: the boot chain is now fully automatic**: logo -> attract -> menu -> amenu -> lobby -> map_new with ZERO input (the game's own attract/menu timers drive it; lobby auto-join fires OL_JOINED -> ChangeMovie map_new). Verified headless.
- **Lobby auto-join is FLAKY** (~60%): OL sequence fires on its own timer and sometimes stalls. FIX: added lobbyWatchdog in index.html - if still on lobby after 18s, force loadMovie('map_new/map_new.swf'). Works.
- **map_new renders** via boot chain (17,571 non-black px) with NO input.
- **Enter at map_new now routes to level2** (was level1 = alien ship, whose intro cinema never completes in this Ruffle build). index.html: if currentLevel<2 -> currentLevel=2 before advanceToLevel. VERIFIED: map Enter -> level2 loads, camera SCROLLS on ArrowRight (LEFT_DELTA=37939 RIGHT_DELTA=38690) when launched via Digit4->map->Enter.
- **level1 alien ship confirmed NOT playable** in Ruffle: knights seated, dialog-like UI appears on Space/Enter but the world never moves (LEFT/RIGHT edges frozen across all inputs; hashes cycle = ambient anim only).
- **Full chain bootplay**: boot(0-input) -> map -> Enter -> level2 -> wake blasts (Space/Enter/Z x3) -> level responds (camera jumps to party: A 410046,406304 -> A2 429063,425649). Knights ACTIVATE with the press-to-start input.
- **Deterministic playable path**: index.html -> Digit4 -> map -> Enter -> level2 (camera scroll verified).
- NOTE: two servers: 9135 = PC Remastered port (THIS work), 9150 = ~/ccweb/web (second Hermes session's XBLA port - leave alone).
