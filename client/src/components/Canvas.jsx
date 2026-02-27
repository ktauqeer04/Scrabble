import { useRef, useState, useEffect, useCallback } from "react";
import "../styles/Canvas.css";


const COLORS = ["#f8f8f2", "#ff6188", "#fc9867", "#ffd866", "#a9dc76", "#78dce8", "#ab9df2", "#1a1a2e"];
const BRUSH_SIZES = [2, 6, 12, 24];



export default function Canvas({socket, roomCode}) {


  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const [color, setColor] = useState("#1a1a2e");
  const [brushSize, setBrushSize] = useState(6);
  const [tool, setTool] = useState("pen"); // pen | eraser

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.fillStyle = "#ffffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    isDrawing.current = true;
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e) => {

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
          x1: pos.x,               // where it ended (current mouse position)
          y1: pos.y,
          color: color,            // active color
          size: brushSize,         // brush size
          tool: tool               // "pen" or "eraser"
          }
      })

    lastPos.current = pos;

  }, [color, brushSize, tool]);

  const stopDrawing = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit("clearCanvas", { room: roomCode });
  };

  useEffect(() => {
    socket.on('updateDrawing', (payload) => {
        const { x0, y0, x1, y1, color, size, tool } = payload;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        ctx.beginPath();
        ctx.moveTo(x0 * canvas.width, y0 * canvas.height);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = tool === "eraser" ? "#ffffffff" : color;
        ctx.lineWidth = tool === "eraser" ? size * 3 : size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        lastPos.current = { x: x1, y: y1 };
    })

    return () => socket.off('updateDrawing')
  })

  useEffect(() => {
    socket.on("updateCanvas", () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    })
    return () => socket.off('updateCanvas')
  }, [])

  return (
    <>
      <div className="cb-wrap">

        {/* Toolbar */}
        <div className="cb-toolbar">

          {/* DRAW tiles */}
          <div style={{ display: "flex", gap: "3px" }}>
            {["D","R","A","W"].map((l, i) => (
              <div className="cb-mini-tile" key={i}>
                {l}<span>{[2,1,1,4][i]}</span>
              </div>
            ))}
          </div>

          <div className="cb-sep" />

          {/* Colors */}
          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
            {COLORS.map(c => (
              <button
                key={c}
                className={`cb-swatch${color === c && tool === "pen" ? " on" : ""}${c === "#ffffff" ? " white" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => { setColor(c); setTool("pen"); }}
              />
            ))}
          </div>

          <div className="cb-sep" />

          {/* Brush sizes */}
          <div style={{ display: "flex", gap: "4px" }}>
            {BRUSH_SIZES.map(s => (
              <button key={s} className={`cb-brush${brushSize === s ? " on" : ""}`} onClick={() => setBrushSize(s)}>
                <div className="cb-brush-dot" style={{ width: Math.min(s, 18), height: Math.min(s, 18) }} />
              </button>
            ))}
          </div>

          <div className="cb-sep" />

          {/* Eraser */}
          <button
            className={`cb-btn cb-eraser${tool === "eraser" ? " on" : ""}`}
            onClick={() => setTool(tool === "eraser" ? "pen" : "eraser")}
          >
            🧹 Eraser
          </button>

          {/* Clear */}
          <button className="cb-btn cb-clear" onClick={clearCanvas}>
            🗑️ Clear
          </button>

          {/* Pill */}
          <div className="cb-pill">
            <div className="cb-pill-dot" style={{ backgroundColor: tool === "eraser" ? "#ffffff" : color }} />
            <span className="cb-pill-label">{tool === "eraser" ? "ERASER" : color.toUpperCase()}</span>
          </div>
        </div>

        {/* Canvas */}
        <div className="cb-canvas-wrap">
          <canvas
            ref={canvasRef}
            className={tool === "eraser" ? "cur-erase" : "cur-pen"}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

      </div>
    </>
  );
}
