import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { io } from "socket.io-client";



const COLORS = ["#f8f8f2", "#ff6188", "#fc9867", "#ffd866", "#a9dc76", "#78dce8", "#ab9df2", "#1a1a2e"];
const BRUSH_SIZES = [2, 6, 12, 24];



export default function Canvas({socket}) {


  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const [color, setColor] = useState("#f8f8f2");
  const [brushSize, setBrushSize] = useState(6);
  const [tool, setTool] = useState("pen"); // pen | eraser

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.fillStyle = "#16213e";
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
    ctx.strokeStyle = tool === "eraser" ? "#16213e" : color;
    ctx.lineWidth = tool === "eraser" ? brushSize * 3 : brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();


    socket.emit("draw",{
        x0: lastPos.current.x,   // where the stroke segment started
        y0: lastPos.current.y,
        x1: pos.x,               // where it ended (current mouse position)
        y1: pos.y,
        color: color,            // active color
        size: brushSize,         // brush size
        tool: tool               // "pen" or "eraser"
    })

    lastPos.current = pos;

  }, [color, brushSize, tool]);

  const stopDrawing = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#16213e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    socket.on('draw', (data) => {
        const { x0, y0, x1, y1, color, size, tool } = data;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = tool === "eraser" ? "#16213e" : color;
        ctx.lineWidth = tool === "eraser" ? size * 3 : size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        lastPos.current = { x: x1, y: y1 };
    })

    return () => socket.off('draw')
  })

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      background: "#0f0e17",
      fontFamily: "'DM Mono', monospace",
      userSelect: "none",
    }}>

      {/* Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "20px",
        padding: "12px 20px",
        background: "#1a1a2e",
        borderBottom: "1px solid #2a2a4a",
        flexWrap: "wrap",
      }}>

        {/* Title */}
        <span style={{ color: "#78dce8", fontSize: "13px", letterSpacing: "0.15em", fontWeight: "bold", marginRight: 8 }}>
          CANVAS
        </span>

        {/* Colors */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool("pen"); }}
              style={{
                width: color === c && tool === "pen" ? 28 : 22,
                height: color === c && tool === "pen" ? 28 : 22,
                borderRadius: "50%",
                background: c,
                border: color === c && tool === "pen" ? "2px solid #78dce8" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
                outline: "none",
              }}
            />
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: "#2a2a4a" }} />

        {/* Brush sizes */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {BRUSH_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setBrushSize(s)}
              style={{
                width: 36, height: 36,
                borderRadius: "6px",
                background: brushSize === s ? "#2a2a4a" : "transparent",
                border: brushSize === s ? "1px solid #78dce8" : "1px solid #2a2a4a",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                outline: "none",
              }}
            >
              <div style={{
                width: Math.max(s, 2),
                height: Math.max(s, 2),
                borderRadius: "50%",
                background: "#f8f8f2",
              }} />
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: "#2a2a4a" }} />

        {/* Eraser */}
        <button
          onClick={() => setTool(tool === "eraser" ? "pen" : "eraser")}
          style={{
            padding: "6px 14px",
            borderRadius: "6px",
            background: tool === "eraser" ? "#ff6188" : "transparent",
            border: tool === "eraser" ? "1px solid #ff6188" : "1px solid #2a2a4a",
            color: tool === "eraser" ? "#0f0e17" : "#f8f8f2",
            fontSize: "12px",
            cursor: "pointer",
            letterSpacing: "0.08em",
            fontFamily: "inherit",
            fontWeight: tool === "eraser" ? "bold" : "normal",
            outline: "none",
          }}
        >
          ERASER
        </button>

        {/* Clear */}
        <button
          onClick={clearCanvas}
          style={{
            padding: "6px 14px",
            borderRadius: "6px",
            background: "transparent",
            border: "1px solid #2a2a4a",
            color: "#888",
            fontSize: "12px",
            cursor: "pointer",
            letterSpacing: "0.08em",
            fontFamily: "inherit",
            outline: "none",
          }}
        >
          CLEAR
        </button>

        {/* Current color swatch */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#555", fontSize: "11px" }}>
            {tool === "eraser" ? "ERASER" : color.toUpperCase()}
          </span>
          <div style={{
            width: 20, height: 20, borderRadius: 4,
            background: tool === "eraser" ? "#16213e" : color,
            border: "1px solid #2a2a4a"
          }} />
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            cursor: tool === "eraser" ? "cell" : "crosshair",
          }}
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
  );
}