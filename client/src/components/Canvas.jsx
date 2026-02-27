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
        x0: lastPos.current.x / canvas.width,
        y0: lastPos.current.y / canvas.height,
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
        ctx.moveTo(x0 * canvas.width, y0 * canvas.height);
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
    <div className="flex flex-col h-screen bg-[#0f0e17] font-mono select-none">
      {/* Toolbar */}
      <div className="flex items-center gap-5 px-5 py-3 bg-[#1a1a2e] border-b border-[#2a2a4a] flex-wrap">

        {/* Title */}
        <span className="text-[#78dce8] text-xs tracking-wider font-bold mr-2">
          CANVAS
        </span>

        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool("pen"); }}
              className={`
                w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all duration-150
                ${color === c && tool === "pen"
                  ? "w-7 h-7 sm:w-8 sm:h-8 ring-2 ring-[#78dce8] ring-offset-2 ring-offset-[#1a1a2e]"
                  : "border-2 border-transparent"}
              `}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-[#2a2a4a]" />

        {/* Brush sizes */}
        <div className="flex items-center gap-2">
          {BRUSH_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setBrushSize(s)}
              className={`
                w-9 h-9 rounded-md flex items-center justify-center transition-colors
                ${brushSize === s
                  ? "bg-[#2a2a4a] border border-[#78dce8]"
                  : "border border-[#2a2a4a] hover:bg-[#24243a]"}
              `}
            >
              <div
                className="rounded-full bg-[#f8f8f2]"
                style={{ width: Math.max(s, 2), height: Math.max(s, 2) }}
              />
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-[#2a2a4a]" />

        {/* Eraser */}
        <button
          onClick={() => setTool(tool === "eraser" ? "pen" : "eraser")}
          className={`
            px-3.5 py-1.5 rounded-md text-xs tracking-wide font-medium transition-colors
            ${tool === "eraser"
              ? "bg-[#ff6188] text-[#0f0e17] border border-[#ff6188] font-semibold"
              : "border border-[#2a2a4a] text-[#f8f8f2] hover:bg-[#24243a]"}
          `}
        >
          ERASER
        </button>

        {/* Clear */}
        <button
          onClick={clearCanvas}
          className="
            px-3.5 py-1.5 rounded-md text-xs tracking-wide
            border border-[#2a2a4a] text-gray-500 hover:text-gray-300 hover:border-gray-600
            transition-colors
          "
        >
          CLEAR
        </button>

        {/* Current color indicator */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-600">
            {tool === "eraser" ? "ERASER" : color.toUpperCase()}
          </span>
          <div
            className="w-5 h-5 rounded border border-[#2a2a4a]"
            style={{
              backgroundColor: tool === "eraser" ? "#16213e" : color,
            }}
          />
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className={`
            w-full h-full block
            ${tool === "eraser" ? "cursor-cell" : "cursor-crosshair"}
          `}
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
