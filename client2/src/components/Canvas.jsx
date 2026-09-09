import { useRef, useState, useEffect, useCallback } from "react";
import "../styles/Canvas.css";


const COLORS = ["#f8f8f2", "#ff6188", "#fc9867", "#ffd866", "#a9dc76", "#78dce8", "#ab9df2", "#1a1a2e"];
const BRUSH_SIZES = [2, 6, 12, 24];
const FILL_TOLERANCE = 32; 


export default function Canvas({socket, roomCode, username, snapshot}) {


  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const currentStrokeId = useRef(null);
  const myActionCount = useRef(0); 

  const [color, setColor] = useState("#1a1a2e");
  const [brushSize, setBrushSize] = useState(6);
  const [tool, setTool] = useState("pen"); 
  const [timeLeft, setTimeLeft] = useState(0);
  const [isOverlayFadingOut, setIsOverlayFadingOut] = useState(false);
  const [isWaitingOverlayVisible, setIsWaitingOverlayVisible] = useState(false);
  const [prevGameState, setPrevGameState] = useState(null);
  const [canUndo, setCanUndo] = useState(false);

  // Check if current user is allowed to draw
  const canDraw = snapshot?.gamestate === 'player_guessing' && snapshot?.chooser?.drawer === username;

  // Handle game state change sounds
  useEffect(() => {
    if (!snapshot?.gamestate) return;

    // Only play sounds if there was a previous state (not on initial mount)
    if (prevGameState !== null && prevGameState !== snapshot.gamestate) {
      // Play round-start sound when entering player_guessing
      if (snapshot.gamestate === 'player_guessing') {
        console.log("round-start.mp3 playing");
        const audio = new Audio('/sounds/round-start.mp3');
        audio.play().catch(err => console.log('Audio play failed:', err));
      }

      // Play round-over sound when entering hidden_word
      if (snapshot.gamestate === 'hidden_word') {
        console.log("round-over.mp3 playing");
        const audio = new Audio('/sounds/round-over.mp3');
        audio.play().catch(err => console.log('Audio play failed:', err));
      }

      // Play end-game sound when entering ended
      if (snapshot.gamestate === 'ended') {
        console.log("end-game.wav playing");
        const audio = new Audio('/sounds/end-game.wav');
        audio.play().catch(err => console.log('Audio play failed:', err));
      }
    }

    setPrevGameState(snapshot.gamestate);
  }, [snapshot?.gamestate, prevGameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resizeCanvas = () => {
        const imageData = canvas.width && canvas.height 
            ? ctx.getImageData(0, 0, canvas.width, canvas.height) 
            : null;

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (imageData) {
            ctx.putImageData(imageData, 0, 0); 
        }
    };

    resizeCanvas(); 

    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect(); 
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const genStrokeId = () => `${username}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;


  const hexToRgba = (hex) => {
    let h = hex.replace("#", "");
    if (h.length === 3) {
      h = h.split("").map((c) => c + c).join("");
    }
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return [r, g, b, 255];
  };

  const colorsMatch = (data, idx, target, tolerance) => {
    const dr = data[idx] - target[0];
    const dg = data[idx + 1] - target[1];
    const db = data[idx + 2] - target[2];
    const da = data[idx + 3] - target[3];
    return (dr * dr + dg * dg + db * db + da * da) <= tolerance * tolerance * 4;
  };

  const floodFillAt = useCallback((startX, startY, fillHex) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    startX = Math.floor(startX);
    startY = Math.floor(startY);
    if (startX < 0 || startY < 0 || startX >= width || startY >= height) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const startIdx = (startY * width + startX) * 4;
    const targetColor = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]];
    const fillColor = hexToRgba(fillHex);

    if (colorsMatch(data, startIdx, fillColor, 4)) return;

    const visited = new Uint8Array(width * height);
    const stack = [[startX, startY]];

    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || y < 0 || x >= width || y >= height) continue;

      const pixelPos = y * width + x;
      if (visited[pixelPos]) continue;

      const idx = pixelPos * 4;
      if (!colorsMatch(data, idx, targetColor, FILL_TOLERANCE)) continue;

      visited[pixelPos] = 1;
      data[idx] = fillColor[0];
      data[idx + 1] = fillColor[1];
      data[idx + 2] = fillColor[2];
      data[idx + 3] = fillColor[3];

      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
  }, []);

  const performFill = useCallback((clientPos) => {
    const canvas = canvasRef.current;
    floodFillAt(clientPos.x, clientPos.y, color);

    socket.emit("bucketFill", {
      room: roomCode,
      payload: {
        x: clientPos.x / canvas.width,
        y: clientPos.y / canvas.height,
        color: color,
        tool: "fill",
      },
      username: username,
    });

    myActionCount.current += 1;
    setCanUndo(true);
  }, [color, floodFillAt, socket, roomCode, username]);

  // unified replay: walks a mixed array of stroke segments + fill entries
  // (this is exactly game.canvasSnapshot from the server)
  const replayEntries = useCallback((entries) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    entries.forEach(entry => {
      if (entry.tool === 'fill') {
        floodFillAt(entry.x * canvas.width, entry.y * canvas.height, entry.color);
        return;
      }
      // stroke segment
      ctx.beginPath();
      ctx.moveTo(entry.x0 * canvas.width, entry.y0 * canvas.height);
      ctx.lineTo(entry.x1 * canvas.width, entry.y1 * canvas.height);
      ctx.strokeStyle = entry.tool === 'eraser' ? '#ffffff' : entry.color;
      ctx.lineWidth = entry.tool === 'eraser' ? entry.size * 3 : entry.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });
  }, [floodFillAt]);

  const handleUndo = useCallback(() => {
    if (myActionCount.current <= 0) return;
    socket.emit("undoLastAction", { room: roomCode, username: username });
  }, [socket, roomCode, username]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isUndoCombo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z";
      if (isUndoCombo) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo]);

  useEffect(() => {
    socket.on('canvasUndo', (fullSnapshot) => {
      replayEntries(fullSnapshot);
      myActionCount.current = Math.max(0, myActionCount.current - 1);
      setCanUndo(myActionCount.current > 0);
    });

    return () => socket.off('canvasUndo');
  }, [replayEntries]);

  // ---------- Drawing handlers ----------

  const startDrawing = useCallback((e) => {
    if (!canDraw) return; // Block drawing if not the drawer during player_guessing
    
    e.preventDefault();
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);

    if (tool === "fill") {
      performFill(pos);
      return;
    }

    isDrawing.current = true;
    currentStrokeId.current = genStrokeId();
    lastPos.current = pos;
  }, [tool, performFill, canDraw]);

  const draw = useCallback((e) => {
    if (!canDraw) return; // Block drawing if not the drawer during player_guessing

    e.preventDefault();
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === "eraser" ? "#ffffffff" : color;
    ctx.lineWidth = tool === "eraser" ? brushSize * 3 : brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();


      socket.emit("draw", { 
        room: roomCode, 
        payload:{
          x0: lastPos.current.x / canvas.width,
          y0: lastPos.current.y / canvas.height,
          x1: pos.x / canvas.width,
          y1: pos.y / canvas.height,
          color: color,           
          size: brushSize,         
          tool: tool,              
          strokeId: currentStrokeId.current, 
          },
        username: username
      })

    lastPos.current = pos;

  }, [color, brushSize, tool, canDraw]);

  const stopDrawing = useCallback(() => {
    if (isDrawing.current && currentStrokeId.current) {
      myActionCount.current += 1;
      setCanUndo(true);
    }
    isDrawing.current = false;
    currentStrokeId.current = null;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit("clearCanvas", { room: roomCode, username: username });
    
    myActionCount.current = 0;
    setCanUndo(false);
  };

  useEffect(() => {
    socket.on('updateDrawing', (payload) => {

        const { x0, y0, x1, y1, color, size, tool } = payload;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        ctx.beginPath();
        ctx.moveTo(x0 * canvas.width, y0 * canvas.height);
        ctx.lineTo(x1 * canvas.width, y1 * canvas.height);
        ctx.strokeStyle = tool === "eraser" ? "#ffffffff" : color;
        ctx.lineWidth = tool === "eraser" ? size * 3 : size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        lastPos.current = { x: x1, y: y1 };
    })

    return () => socket.off('updateDrawing')
  })

  // remote bucket fill
  useEffect(() => {
    socket.on('updateBucketFill', (payload) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      floodFillAt(payload.x * canvas.width, payload.y * canvas.height, payload.color);
    });

    return () => socket.off('updateBucketFill');
  }, [floodFillAt]);

  useEffect(() => {
    socket.on("updateCanvas", () => {

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    })
    return () => socket.off('updateCanvas')
  }, [])

  // listen for replay — canvasSnapshot from server is now a mixed array of
  // stroke segments and fill entries, so replayEntries() handles both
  useEffect(() => {
    socket.emit("requestReplay", { room: roomCode });

    socket.on('replayDrawing', (entries) => {
      replayEntries(entries);
    });

    return () => socket.off('replayDrawing');
  }, [replayEntries, roomCode]);


  // Reset per-turn undo tracking whenever the drawer/turn changes
  useEffect(() => {
    myActionCount.current = 0;
    setCanUndo(false);
  }, [snapshot?.chooser?.drawer, snapshot?.gamestate]);

  // Handle waiting overlay fade-out when state changes from player_choosing
  useEffect(() => {
    if (prevGameState === 'player_choosing' && snapshot?.gamestate !== 'player_choosing') {
      setIsWaitingOverlayVisible(true);
      setTimeout(() => {
        setIsWaitingOverlayVisible(false);
      }, 300);
    } else if (snapshot?.gamestate === 'player_choosing' && snapshot?.chooser?.drawer !== username) {
      setIsWaitingOverlayVisible(true);
    }
  }, [snapshot?.gamestate, snapshot?.chooser?.drawer, username, prevGameState]);

  useEffect(() => {
    setIsOverlayFadingOut(false);
  }, [snapshot?.gamestate]);

  const handleWordSelection = (word) => {
    setIsOverlayFadingOut(true);
    
    setTimeout(() => {
      socket.emit("chosen-word", { room: roomCode, chosenWord: word, username: username });
      setIsOverlayFadingOut(false);
    }, 300);
  };

  useEffect(() => {
    const showTimerStates = ['player_choosing', 'player_guessing', 'hidden_word'];

    if (!showTimerStates.includes(snapshot?.gamestate) || snapshot?.timeLeft === undefined) {
        setTimeLeft(0);
        return;
    }

    const initialSeconds = snapshot.timeLeft;
    setTimeLeft(initialSeconds);

    let tenSecondSoundPlayed = false;

    const interval = setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) {
                clearInterval(interval);
                return 0;
            }
            
            // Play ten-seconds sound at 10 second mark during player_guessing
            if (prev === 11 && snapshot?.gamestate === 'player_guessing' && !tenSecondSoundPlayed) {
                const audio = new Audio('/sounds/ten-seconds.mp3');
                audio.play().catch(err => console.log('Audio play failed:', err));
                tenSecondSoundPlayed = true;
            }
            
            return prev - 1;
        });
    }, 1000);

    return () => clearInterval(interval);

  }, [snapshot]);

  return (
    <>
      <div className="cb-wrap">

        <div className="cb-toolbar">

          <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "3px" }}>
              {["D","R","A","W"].map((l, i) => (
                <div className="cb-mini-tile" key={i}>
                  {l}<span>{[2,1,1,4][i]}</span>
                </div>
              ))}
            </div>
            
            {snapshot?.gamestate && ['player_choosing', 'player_guessing', 'hidden_word'].includes(snapshot.gamestate) && timeLeft > 0 && (
              <div className={`ml-3 px-4 py-2 rounded-xl font-black text-lg border-4 shadow-lg transition-all duration-300 ${
                timeLeft <= 10 
                  ? 'bg-gradient-to-r from-red-400 to-red-500 border-red-700 text-white animate-pulse' 
                  : timeLeft <= 30
                  ? 'bg-gradient-to-r from-yellow-300 to-yellow-400 border-yellow-600 text-gray-900'
                  : 'bg-gradient-to-r from-green-300 to-green-400 border-green-600 text-gray-900'
              }`}>
                ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>

          <div className="cb-sep" />

          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
            {COLORS.map(c => (
              <button
                key={c}
                className={`cb-swatch${color === c && tool !== "eraser" ? " on" : ""}${c === "#ffffff" ? " white" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => { setColor(c); if (tool === "eraser") setTool("pen"); }}
              />
            ))}
          </div>

          <div className="cb-sep" />

          <div style={{ display: "flex", gap: "4px" }}>
            {BRUSH_SIZES.map(s => (
              <button key={s} className={`cb-brush${brushSize === s ? " on" : ""}`} onClick={() => setBrushSize(s)}>
                <div className="cb-brush-dot" style={{ width: Math.min(s, 18), height: Math.min(s, 18) }} />
              </button>
            ))}
          </div>

          <div className="cb-sep" />

          <button
            className={`cb-btn cb-fill${tool === "fill" ? " on" : ""}`}
            onClick={() => setTool(tool === "fill" ? "pen" : "fill")}
            title="Bucket fill"
          >
            🪣 Fill
          </button>

          <button
            className={`cb-btn cb-eraser${tool === "eraser" ? " on" : ""}`}
            onClick={() => setTool(tool === "eraser" ? "pen" : "eraser")}
          >
            🧹 Eraser
          </button>

          <button
            className="cb-btn cb-undo"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            style={{ opacity: canUndo ? 1 : 0.5, cursor: canUndo ? "pointer" : "not-allowed" }}
          >
            ↩️ Undo
          </button>

          <button className="cb-btn cb-clear" onClick={clearCanvas}>
            🗑️ Clear
          </button>

          <div className="cb-pill">
            <div className="cb-pill-dot" style={{ backgroundColor: tool === "eraser" ? "#ffffff" : color }} />
            <span className="cb-pill-label">
              {tool === "eraser" ? "ERASER" : tool === "fill" ? "FILL: " + color.toUpperCase() : color.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="cb-canvas-wrap" style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            className={canDraw ? (tool === "eraser" ? "cur-erase" : tool === "fill" ? "cur-fill" : "cur-pen") : ""}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{ cursor: canDraw ? undefined : 'default' }}
          />

          {snapshot?.gamestate === 'player_choosing' && snapshot?.chooser?.drawer === username && snapshot?.chooser?.guessWords && (
            <div className={`absolute inset-0 bg-purple-900/80 backdrop-blur-sm flex items-center justify-center z-50 ${isOverlayFadingOut ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
              <div className="bg-white rounded-3xl border-8 border-purple-600 shadow-2xl p-8 max-w-md w-full mx-4 transform hover:scale-[1.02] transition-transform duration-300">
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-black text-purple-900 mb-2">Choose Your Word</h2>
                  <p className="text-gray-600 font-bold">Pick wisely, artist!</p>
                </div>
                <div className="space-y-3">
                  {snapshot.chooser.guessWords.map((word, index) => (
                    <button
                      key={index}
                      onClick={() => handleWordSelection(word)}
                      disabled={isOverlayFadingOut}
                      className="w-full py-4 px-6 bg-gradient-to-r from-yellow-300 to-yellow-400 hover:from-yellow-400 hover:to-yellow-500 text-purple-900 font-black text-xl rounded-2xl border-4 border-yellow-600 shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {((snapshot?.gamestate === 'player_choosing' && snapshot?.chooser?.drawer !== username) || isWaitingOverlayVisible) && snapshot?.chooser?.drawer !== username ? (
            <div className={`absolute inset-0 bg-gradient-to-br from-purple-900/80 via-pink-900/80 to-yellow-900/80 backdrop-blur-sm flex items-center justify-center z-50 ${
              snapshot?.gamestate === 'player_choosing' && snapshot?.chooser?.drawer !== username ? 'animate-fadeIn' : 'animate-fadeOut'
            }`}>
              <div className="bg-white rounded-3xl border-8 border-purple-600 shadow-2xl p-8 max-w-md w-full mx-4 text-center">
                <div className="text-6xl mb-4 animate-bounce">🎨</div>
                <h2 className="text-2xl font-black text-purple-900 mb-3">
                  {snapshot?.chooser?.drawer} is selecting the word...
                </h2>
                <p className="text-gray-600 font-bold">Get ready to guess!</p>
                <div className="mt-6 flex justify-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          ) : null}

          {snapshot?.gamestate === 'hidden_word' && snapshot?.currentWord && (
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/80 via-orange-900/80 to-yellow-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
              <div className="bg-white rounded-3xl border-8 border-red-600 shadow-2xl p-8 max-w-md w-full mx-4 text-center">
                <div className="text-6xl mb-4">⏰</div>
                <h2 className="text-3xl font-black text-red-900 mb-6">
                  Time's up!!!
                </h2>
                <div className="bg-gradient-to-r from-yellow-200 to-yellow-300 border-4 border-yellow-600 rounded-2xl p-6 shadow-lg">
                  <p className="text-gray-700 font-bold text-lg mb-2">The correct word was:</p>
                  <p className="text-purple-900 font-black text-3xl tracking-wide uppercase">
                    {snapshot.currentWord}
                  </p>
                </div>
              </div>
            </div>
          )}

          {snapshot?.gamestate === 'ended' && snapshot?.scoreBoards && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 via-pink-900/90 to-yellow-900/90 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn overflow-hidden">
              {/* Floating confetti decorations */}
              <div className="absolute top-10 left-10 text-6xl animate-confettiFloat" style={{ animationDelay: '0s' }}>🎉</div>
              <div className="absolute top-20 right-16 text-5xl animate-confettiFloat" style={{ animationDelay: '0.3s' }}>✨</div>
              <div className="absolute bottom-32 left-20 text-5xl animate-confettiFloat" style={{ animationDelay: '0.6s' }}>🎊</div>
              <div className="absolute bottom-20 right-24 text-6xl animate-confettiFloat" style={{ animationDelay: '0.9s' }}>⭐</div>
              <div className="absolute top-1/3 left-1/4 text-4xl animate-confettiFloat" style={{ animationDelay: '1.2s' }}>🎈</div>
              <div className="absolute top-1/2 right-1/4 text-4xl animate-confettiFloat" style={{ animationDelay: '1.5s' }}>🎆</div>

              <div className="bg-white rounded-3xl border-8 border-yellow-500 shadow-2xl p-8 max-w-3xl w-full mx-4 relative">
                <div className="text-center mb-8">
                  <div className="text-7xl mb-4 animate-trophy-glow">🏆</div>
                  <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 mb-2">
                    GAME OVER!
                  </h2>
                  <p className="text-gray-600 font-bold text-xl">Champions of the Game</p>
                </div>

                <div className="flex items-end justify-center gap-4 mb-8">
                  {(() => {
                    const sortedPlayers = Object.entries(snapshot.scoreBoards).sort((a, b) => b[1] - a[1]);
                    const top3 = sortedPlayers.slice(0, 3);
                    
                    const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : 
                                        top3.length === 2 ? [null, top3[0], top3[1]] : 
                                        top3.length === 1 ? [null, top3[0], null] : [];
                    
                    return podiumOrder.map((player, visualIndex) => {
                      if (!player) return <div key={visualIndex} className="w-32" />;
                      
                      const [playerName, score] = player;
                      const actualRank = visualIndex === 1 ? 1 : visualIndex === 0 ? 2 : 3;
                      const heights = { 1: 'h-56', 2: 'h-44', 3: 'h-36' };
                      const bgColors = { 1: 'from-yellow-400 to-yellow-500', 2: 'from-orange-400 to-orange-500', 3: 'from-gray-300 to-gray-400' };
                      const borderColors = { 1: 'border-yellow-600', 2: 'border-gray-500', 3: 'border-orange-600' };
                      const medals = { 1: '👑', 2: '🥈', 3: '🥉' };
                      const textSizes = { 1: 'text-2xl', 2: 'text-xl', 3: 'text-lg' };
                      const medalSizes = { 1: 'text-6xl', 2: 'text-5xl', 3: 'text-4xl' };

                      return (
                        <div 
                          key={playerName} 
                          className="flex flex-col items-center animate-podiumRise"
                          style={{ animationDelay: `${visualIndex * 0.2}s` }}
                        >
                          <div className={`${actualRank === 1 ? 'animate-crownBounce' : ''} ${medalSizes[actualRank]} mb-2`}>
                            {medals[actualRank]}
                          </div>
                          <div className="text-center mb-2 px-2">
                            <p className={`font-black text-gray-800 ${textSizes[actualRank]} truncate max-w-[120px]`}>
                              {playerName}
                            </p>
                            <p className="text-gray-600 font-bold text-sm">
                              {score} pts
                            </p>
                          </div>
                          <div className={`${heights[actualRank]} w-32 bg-gradient-to-t ${bgColors[actualRank]} border-4 ${borderColors[actualRank]} rounded-t-2xl shadow-lg flex items-center justify-center`}>
                            <span className="text-white font-black text-4xl drop-shadow-lg">
                              {actualRank}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                <div className="text-center text-gray-500 font-bold">
                  Thanks for playing! 🎨
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}