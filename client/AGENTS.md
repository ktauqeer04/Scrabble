# Scribble

Multiplayer drawing & guessing game (Pictionary-style). One player is the drawer and everyone else guesses the word being drawn. After N rounds (default 3), the top 3 scorers win.

## Monorepo Layout

- `server/` — NestJS 11 + Socket.IO backend (TypeScript)
- `client/` — React 19 + Vite + Tailwind frontend (JSX)

## Commands

Server (from `server/`):
- `npm run start:dev` — run with watch mode (defaults to port 3000)

Client (from `client/`):
- `npm run dev` — Vite dev server
- `npm run lint` — ESLint
- `npm run build` — production build

## Architecture

### Server

- `src/websockets/chat.gateway.ts` — ALL game/chat/canvas logic lives in this one Socket.IO gateway. No services/controllers.
- `src/game.model.ts` — `Game` class: state machine, timers, word selection, guess checking, scoring, `getSnapshot()`.
- `src/enums.ts` — `GameState` (`waiting`, `player_choosing`, `player_guessing`, `hidden_word`, `ended`) and `GameMode` (`EASY`/`MEDIUM`/`HARD`).
- `src/words.ts` — 50 words per difficulty (`easy`, `medium`, `hard`).

State machine flow: `WAITING` → `PLAYER_CHOOSING` → `PLAYER_GUESSING` → `HIDDEN_WORD` → repeat per round → `ENDED`.

Key socket events (client → server):
- `createRoom`, `joinRoom` — room membership
- `Start-Game` — host starts the game
- `chosen-word` — drawer picks one of 3 words
- `draw` — broadcast normalized stroke `{x0,y0,x1,y1,color,size,tool}`
- `clearCanvas`
- `chatMessage` — guesses during `player_guessing`; chat only among correct guessers + drawer during guessing
- `Game-Settings` — host sets maxPlayers, drawTimer, maxRounds, gameMode (only in `WAITING`)
- `requestSnapshot`, `requestReplay` — for late/rejoining clients

Important server notes:
- `roomsWithGame`, `usernameWithClientId`, `clientWithRoom` maps track state. `handleDisconnect` removes the player and, if the drawer leaves, advances the game via the `complete*Action` callbacks.
- `Game` uses callback-based sequencing (`completeChooseAction`, `completeGuessAction`, `completeHiddenAction`) wired through chained emissions in `handleEventStartGame` and `Game.nextTurn`. This is tightly coupled and fragile — timers + callbacks coordinate the whole flow.
- Scores: `markPlayerScores()` computes 100 base − 10/rank + time bonus; `getTop3Players()` ranks winners. `getSnapshot()` shapes the broadcast payload per game state (note `scoreBoard` (Map) vs `scoreBoards` (object) key naming).

### Client

- `src/context/RoomContext.jsx` — single global socket (`io("http://localhost:3000")`) + `roomCode`/`username` persisted in `sessionStorage`. Also handles refresh/reconnect ("refreshPage" emit is commented out server-side).
- `src/App.jsx` — routes: `/` → RoomLobby, `/game` → Playground.
- `components/RoomLobby.jsx` — landing page: username + 8 character tiles, create/join room. Create room instantly navigates to `/game`.
- `components/Playground.jsx` — main screen: canvas, player list with scores, chat, lobby overlay (host-only settings + Start button). All UI driven by `game-snapshot` state.
- `components/Canvas.jsx` — drawing canvas (pen/eraser, colors, brush sizes), word-selection popup for the drawer, networked stroke replay. Coordinates are normalized (÷ canvas width/height) on emit and denormalized on receive.
- `components/ChatRoom.jsx` — chat with special styling for close guesses, correct-guess-only messages, round-over/drawing announcements.

## UI/UX Patterns

### Canvas Overlays
Canvas overlays are used to show modal-like content directly on top of the drawing canvas. They include fade-in animations for smooth appearance.

**Implementation Pattern:**
```jsx
{/* Overlay positioned absolutely within canvas container */}
<div className="absolute inset-0 bg-purple-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
  <div className="bg-white rounded-3xl border-8 border-purple-600 shadow-2xl p-8 max-w-md w-full mx-4">
    {/* Overlay content */}
  </div>
</div>
```

**Key CSS Classes (defined in `src/index.css`):**
```css
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes fadeOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}

.animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
.animate-fadeOut { animation: fadeOut 0.3s ease-in forwards; }
```

**Usage Examples:**
1. **Word Selection (Drawer)**: Shows 3 word choices on canvas during `player_choosing` state
2. **Waiting Message (Other Players)**: Shows "{drawer} is selecting the word..." during `player_choosing` state

**Positioning Requirements:**
- Canvas container must have `position: relative`
- Overlay uses `absolute inset-0` to cover entire canvas
- Use `z-50` to ensure overlay appears above canvas content
- Include `backdrop-blur-sm` for depth effect

### Timer Display
Client-side countdown timer appears in the toolbar during active game states (`player_choosing`, `player_guessing`, `hidden_word`).

**Implementation:**
- Initializes from `snapshot.timeLeft` (converted from ms to seconds)
- Runs independently on client (no server sync after initial start)
- Color-coded: green (>30s), yellow (10-30s), red with pulse (<10s)
- Format: ⏱️ MM:SS
- Resets on game state changes (triggered by `snapshot?.gamestate`, `snapshot?.round`, `snapshot?.chooser?.drawer`)

## Conventions & Gotchas

- Server is raw socket-event-driven; there is a stale `websockets.service.spec.ts` referencing a non-existent `WebsocketsService` (gateway is `ChatGateway`). The service file doesn't exist.
- Word selection popup was recently fixed; verify `snapshot.chooser.drawer == username` gating when changing canvas logic.
- Canvas overlays use absolute positioning within the canvas container; ensure `position: relative` is set on parent.
- Client components receive `socket`, `roomCode`, `username` via props from `App`/`Playground` (only `RoomContext` uses context directly).
- No test infrastructure for the client; server has jest but the spec is broken/outdated.
- Ports: server 3000, client Vite default 5173. Client socket URL is hardcoded to `http://localhost:3000`.
- Drawer leaving mid-game is handled in `handleDisconnect` (advances state machine). Other players leaving also broadcast `playerLeft`.
