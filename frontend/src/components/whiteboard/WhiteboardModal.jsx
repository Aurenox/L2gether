import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Pen,
  Brush,
  Highlighter,
  Pencil,
  Eraser,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Share2,
  Maximize2,
  Minimize2,
  Move,
  X,
  Palette,
  Sparkles,
  Crop,
  Layers,
  Monitor,
  SidebarClose,
  Maximize
} from 'lucide-react';

const PRESET_COLORS = [
  '#FFFFFF', // White
  '#38BDF8', // Sky Blue
  '#34D399', // Emerald Green
  '#F59E0B', // Amber
  '#F87171', // Red Coral
  '#A78BFA', // Purple
  '#FB7185', // Rose
  '#4ADE80', // Lime
  '#FBBF24', // Yellow
  '#1E293B'  // Dark Charcoal
];

const STROKE_WIDTHS = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Bold', value: 8 },
  { label: 'Thick', value: 16 }
];

const ERASER_SIZES = [
  { label: '16px', value: 16 },
  { label: '36px', value: 36 },
  { label: '72px', value: 72 },
  { label: '140px', value: 140 }
];

const RESOLUTION_PRESETS = [
  { id: 'fit', label: 'Fit View', width: null, height: null },
  { id: '360', label: '360p (640×360)', width: 640, height: 360 },
  { id: '480', label: '480p (854×480)', width: 854, height: 480 },
  { id: '720', label: '720p (1280×720)', width: 1280, height: 720 },
  { id: '1080', label: '1080p (1920×1080)', width: 1920, height: 1080 }
];

export default function WhiteboardModal({
  isOpen,
  onClose,
  socket,
  roomId,
  currentUser,
  onShareToChat
}) {
  // Display Mode: 'slider' (docked drawer), 'floating' (draggable anywhere), 'corner' (mini sticky in 4 corners)
  const [displayMode, setDisplayMode] = useState('slider'); // 'slider', 'floating', 'corner'
  const [dockSide, setDockSide] = useState('left'); // 'left' or 'right'
  const [cornerPosition, setCornerPosition] = useState('bottom-right'); // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  const [sliderWidth, setSliderWidth] = useState(580);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Floating Window Position
  const [windowPos, setWindowPos] = useState({ x: 80, y: 60 });
  const [windowSize, setWindowSize] = useState({ width: 780, height: 530 });
  const isDraggingWindowRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });

  // Tools: 'pen', 'pencil', 'brush', 'highlighter', 'eraser', 'area_erase', 'rectangle', 'circle', 'arrow', 'line', 'text'
  const [currentTool, setCurrentTool] = useState('pen');
  const [strokeColor, setStrokeColor] = useState('#38BDF8');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fillShape, setFillShape] = useState(false);
  const [eraserSize, setEraserSize] = useState(36);
  const [resolutionPreset, setResolutionPreset] = useState('fit');
  const [shareNotice, setShareNotice] = useState(null);

  // Drawing State & Persistent Drawing Buffer
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const persistentDataRef = useRef(null); // Never loses drawing on resize/remount!
  const isDrawingRef = useRef(false);
  const startPointRef = useRef({ x: 0, y: 0 });
  const lastPointRef = useRef({ x: 0, y: 0 });
  const lastMidPointRef = useRef({ x: 0, y: 0 });
  const currentPathRef = useRef([]);

  // Area Erase selection box overlay
  const [areaSelection, setAreaSelection] = useState(null); // { x, y, w, h }

  // Undo / Redo history
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Text tool inline editing
  const [textInputPos, setTextInputPos] = useState(null);
  const [textInputValue, setTextInputValue] = useState('');
  const textInputRef = useRef(null);

  // Save canvas state to history & persistent buffer
  const saveStateToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      persistentDataRef.current = dataUrl;

      const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      nextHistory.push(dataUrl);
      if (nextHistory.length > 35) nextHistory.shift();
      historyRef.current = nextHistory;
      historyIndexRef.current = nextHistory.length - 1;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(false);
    } catch (e) {}
  }, []);

  // Restore canvas state from a dataURL
  const restoreFromDataUrl = useCallback((dataUrl, targetCanvas = null) => {
    const canvas = targetCanvas || canvasRef.current;
    if (!canvas || !dataUrl) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  }, []);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prevDataUrl = historyRef.current[historyIndexRef.current];
      persistentDataRef.current = prevDataUrl;
      restoreFromDataUrl(prevDataUrl);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
    }
  }, [restoreFromDataUrl]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const nextDataUrl = historyRef.current[historyIndexRef.current];
      persistentDataRef.current = nextDataUrl;
      restoreFromDataUrl(nextDataUrl);
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, [restoreFromDataUrl]);

  // Resize canvas without ever blanking existing drawings!
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 50 || rect.height <= 50) return;

    let targetWidth = Math.floor(rect.width);
    let targetHeight = Math.floor(rect.height);

    const preset = RESOLUTION_PRESETS.find((p) => p.id === resolutionPreset);
    if (preset && preset.width && preset.height) {
      targetWidth = preset.width;
      targetHeight = preset.height;
    }

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      // Retain drawing in persistent ref before resizing
      if (canvas.width > 0 && canvas.height > 0) {
        try {
          persistentDataRef.current = canvas.toDataURL('image/png');
        } catch (e) {}
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      if (persistentDataRef.current) {
        restoreFromDataUrl(persistentDataRef.current);
      } else {
        saveStateToHistory();
      }
    }
  }, [resolutionPreset, restoreFromDataUrl, saveStateToHistory]);

  // When modal opens or mode changes: resize and restore drawing
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        resizeCanvas();
        if (persistentDataRef.current) {
          restoreFromDataUrl(persistentDataRef.current);
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, displayMode, dockSide, isFullScreen, resolutionPreset, resizeCanvas, restoreFromDataUrl]);

  // Window resize handler
  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Draw a complete stroke or shape onto canvas context
  const drawStroke = (ctx, stroke) => {
    const { tool, color, width, points, fill, eraserSize: strokeEraserSize } = stroke;
    if (!points || points.length === 0) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = strokeEraserSize || width || 36;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      if (tool === 'highlighter') {
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = width * 2.5;
      } else if (tool === 'pencil') {
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = Math.max(1, width * 0.7);
      } else if (tool === 'brush') {
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = width * 2.0;
      } else {
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = width;
      }
    }

    if (tool === 'pen' || tool === 'brush' || tool === 'highlighter' || tool === 'pencil' || tool === 'eraser') {
      if (points.length === 1) {
        ctx.beginPath();
        const r = Math.max(1, (tool === 'eraser' ? (strokeEraserSize || width || 36) : (ctx.lineWidth || width)) / 2);
        ctx.arc(points[0].x, points[0].y, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          const midX = (points[i - 1].x + points[i].x) / 2;
          const midY = (points[i - 1].y + points[i].y) / 2;
          ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, midX, midY);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.stroke();
      }
    } else if (tool === 'rectangle') {
      const start = points[0];
      const end = points[points.length - 1];
      const w = end.x - start.x;
      const h = end.y - start.y;
      if (fill) {
        ctx.fillRect(start.x, start.y, w, h);
      } else {
        ctx.strokeRect(start.x, start.y, w, h);
      }
    } else if (tool === 'circle') {
      const start = points[0];
      const end = points[points.length - 1];
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      const cx = start.x + (end.x - start.x) / 2;
      const cy = start.y + (end.y - start.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      if (fill) ctx.fill();
      else ctx.stroke();
    } else if (tool === 'line') {
      const start = points[0];
      const end = points[points.length - 1];
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else if (tool === 'arrow') {
      const start = points[0];
      const end = points[points.length - 1];
      const headlen = Math.max(10, width * 3);
      const angle = Math.atan2(end.y - start.y, end.x - start.x);

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - headlen * Math.cos(angle + Math.PI / 6), end.y - headlen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else if (tool === 'text' && stroke.text) {
      ctx.font = `${Math.max(14, width * 3.5)}px sans-serif`;
      ctx.fillText(stroke.text, points[0].x, points[0].y);
    }

    ctx.restore();
  };

  // Coordinates helper taking resolution preset scaling into account
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Pointer Down
  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    const coords = getCanvasCoords(e);

    // Text Tool Click
    if (currentTool === 'text') {
      setTextInputPos(coords);
      setTextInputValue('');
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    // Area Erase (Particular Portion Only)
    if (currentTool === 'area_erase') {
      isDrawingRef.current = true;
      startPointRef.current = coords;
      setAreaSelection({ x: coords.x, y: coords.y, w: 0, h: 0 });
      return;
    }

    isDrawingRef.current = true;
    startPointRef.current = coords;
    lastPointRef.current = coords;
    lastMidPointRef.current = coords;
    currentPathRef.current = [coords];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (currentTool === 'pen' || currentTool === 'brush' || currentTool === 'highlighter' || currentTool === 'pencil' || currentTool === 'eraser') {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let drawWidth = strokeWidth;
      if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#000000';
        drawWidth = eraserSize;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = strokeColor;
        if (currentTool === 'highlighter') {
          ctx.globalAlpha = 0.35;
          drawWidth = strokeWidth * 2.5;
        } else if (currentTool === 'pencil') {
          ctx.globalAlpha = 0.85;
          drawWidth = Math.max(1, strokeWidth * 0.7);
        } else if (currentTool === 'brush') {
          ctx.globalAlpha = 1.0;
          drawWidth = strokeWidth * 2.0;
        } else {
          ctx.globalAlpha = 1.0;
          drawWidth = strokeWidth;
        }
      }

      ctx.beginPath();
      ctx.arc(coords.x, coords.y, Math.max(0.5, drawWidth / 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  // Pointer Move
  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Area Erase Marquee Drag
    if (currentTool === 'area_erase') {
      const x = Math.min(startPointRef.current.x, coords.x);
      const y = Math.min(startPointRef.current.y, coords.y);
      const w = Math.abs(coords.x - startPointRef.current.x);
      const h = Math.abs(coords.y - startPointRef.current.y);
      setAreaSelection({ x, y, w, h });
      return;
    }

    if (currentTool === 'pen' || currentTool === 'brush' || currentTool === 'highlighter' || currentTool === 'pencil' || currentTool === 'eraser') {
      currentPathRef.current.push(coords);
      const p1 = coords;
      const p0 = lastPointRef.current;
      const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = eraserSize;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = strokeColor;
        if (currentTool === 'highlighter') {
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = strokeWidth * 2.5;
        } else if (currentTool === 'pencil') {
          ctx.globalAlpha = 0.85;
          ctx.lineWidth = Math.max(1, strokeWidth * 0.7);
        } else if (currentTool === 'brush') {
          ctx.globalAlpha = 1.0;
          ctx.lineWidth = strokeWidth * 2.0;
        } else {
          ctx.globalAlpha = 1.0;
          ctx.lineWidth = strokeWidth;
        }
      }

      ctx.beginPath();
      ctx.moveTo(lastMidPointRef.current.x, lastMidPointRef.current.y);
      ctx.quadraticCurveTo(p0.x, p0.y, mid.x, mid.y);
      ctx.stroke();
      ctx.restore();

      lastPointRef.current = p1;
      lastMidPointRef.current = mid;
    } else {
      // Shapes dynamic preview
      const lastState = historyRef.current[historyIndexRef.current];
      if (lastState) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          drawStroke(ctx, {
            tool: currentTool,
            color: strokeColor,
            width: strokeWidth,
            points: [startPointRef.current, coords],
            fill: fillShape
          });
        };
        img.src = lastState;
      }
    }
  };

  // Pointer Up
  const handlePointerUp = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;

    // Apply Area Erase (Particular Portion Only)
    if (currentTool === 'area_erase') {
      if (canvas && areaSelection) {
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillRect(areaSelection.x, areaSelection.y, areaSelection.w, areaSelection.h);
        ctx.restore();
        saveStateToHistory();
      }
      setAreaSelection(null);
      return;
    }

    if (canvas && (currentTool === 'pen' || currentTool === 'brush' || currentTool === 'highlighter' || currentTool === 'pencil' || currentTool === 'eraser')) {
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = eraserSize;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = strokeColor;
        if (currentTool === 'highlighter') {
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = strokeWidth * 2.5;
        } else if (currentTool === 'pencil') {
          ctx.globalAlpha = 0.85;
          ctx.lineWidth = Math.max(1, strokeWidth * 0.7);
        } else if (currentTool === 'brush') {
          ctx.globalAlpha = 1.0;
          ctx.lineWidth = strokeWidth * 2.0;
        } else {
          ctx.globalAlpha = 1.0;
          ctx.lineWidth = strokeWidth;
        }
      }

      ctx.beginPath();
      ctx.moveTo(lastMidPointRef.current.x, lastMidPointRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      ctx.restore();
    }

    currentPathRef.current.push(coords);
    saveStateToHistory();
  };

  // Confirm inline text entry
  const handleCommitText = () => {
    if (!textInputPos || !textInputValue.trim()) {
      setTextInputPos(null);
      return;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawStroke(ctx, {
        tool: 'text',
        color: strokeColor,
        width: strokeWidth,
        points: [textInputPos],
        text: textInputValue.trim()
      });
      saveStateToHistory();
    }

    setTextInputPos(null);
    setTextInputValue('');
  };

  // Clear All Canvas
  const handleClearAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveStateToHistory();
  };

  // Export as PNG
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Share Snapshot into Room Chat
  const handleShareSnapshotToRoom = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');

    if (onShareToChat) {
      onShareToChat(dataUrl);
    } else if (socket && roomId) {
      socket.emit('whiteboard_share_snapshot', {
        roomId,
        dataUrl,
        title: 'Whiteboard Diagram'
      });
    }

    setShareNotice('Whiteboard diagram snapshot shared to Room Chat!');
    setTimeout(() => setShareNotice(null), 4000);
  };

  // Free Dragging Handlers with 4-Corner & 2-Side Snapping
  const handleWindowDragStart = (e) => {
    if (displayMode !== 'floating') return;
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
    isDraggingWindowRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: windowPos.x,
      startY: windowPos.y
    };
    document.body.style.userSelect = 'none';
  };

  const handleWindowDragMove = useCallback((e) => {
    if (!isDraggingWindowRef.current) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    const nextX = Math.max(10, Math.min(window.innerWidth - 200, dragStartRef.current.startX + dx));
    const nextY = Math.max(10, Math.min(window.innerHeight - 150, dragStartRef.current.startY + dy));

    setWindowPos({ x: nextX, y: nextY });
  }, []);

  const handleWindowDragEnd = useCallback(() => {
    if (!isDraggingWindowRef.current) return;
    isDraggingWindowRef.current = false;
    document.body.style.userSelect = '';

    const x = windowPos.x;
    const y = windowPos.y;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Corner Snapping (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
    if (x < 90 && y < 90) {
      setCornerPosition('top-left');
      setDisplayMode('corner');
      return;
    }
    if (x > w - 280 && y < 90) {
      setCornerPosition('top-right');
      setDisplayMode('corner');
      return;
    }
    if (x < 90 && y > h - 190) {
      setCornerPosition('bottom-left');
      setDisplayMode('corner');
      return;
    }
    if (x > w - 280 && y > h - 190) {
      setCornerPosition('bottom-right');
      setDisplayMode('corner');
      return;
    }

    // Side Docking (Left Edge or Right Edge)
    if (x < 25 && y > 100 && y < h - 200) {
      setDockSide('left');
      setDisplayMode('slider');
      return;
    }
    if (x > w - 90 && y > 100 && y < h - 200) {
      setDockSide('right');
      setDisplayMode('slider');
      return;
    }
  }, [windowPos]);

  useEffect(() => {
    window.addEventListener('pointermove', handleWindowDragMove);
    window.addEventListener('pointerup', handleWindowDragEnd);
    return () => {
      window.removeEventListener('pointermove', handleWindowDragMove);
      window.removeEventListener('pointerup', handleWindowDragEnd);
    };
  }, [handleWindowDragMove, handleWindowDragEnd]);

  if (!isOpen) return null;

  // CORNER MINI STICKY WIDGET (Positioned at one of the 4 exact corners)
  if (displayMode === 'corner') {
    let cornerStyle = { position: 'fixed', zIndex: 9999, width: '220px', height: '145px' };
    if (cornerPosition === 'top-left') {
      cornerStyle.top = '16px';
      cornerStyle.left = '16px';
    } else if (cornerPosition === 'top-right') {
      cornerStyle.top = '16px';
      cornerStyle.right = '16px';
    } else if (cornerPosition === 'bottom-left') {
      cornerStyle.bottom = '16px';
      cornerStyle.left = '16px';
    } else {
      cornerStyle.bottom = '16px';
      cornerStyle.right = '16px';
    }

    return (
      <div
        className="corner-whiteboard-widget"
        style={{
          ...cornerStyle,
          backgroundColor: '#0F172A',
          border: '2px solid #38BDF8',
          borderRadius: '10px',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.75)',
          cursor: 'pointer',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={() => {
          setWindowPos({ x: 120, y: 70 });
          setDisplayMode('floating');
        }}
        title="Whiteboard Pinned in Corner (Click to restore large whiteboard view)"
      >
        <div
          style={{
            padding: '5px 8px',
            backgroundColor: '#0284C7',
            color: '#FFFFFF',
            fontSize: '0.72rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Palette size={12} />
            <span>Whiteboard ({cornerPosition.replace('-', ' ')})</span>
          </div>
          <button
            type="button"
            className="btn btn-subtle btn-icon sm"
            style={{ width: '16px', height: '16px', color: '#fff', padding: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close Whiteboard"
          >
            <X size={10} />
          </button>
        </div>

        {/* Thumbnail Preview Area */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#0B0D12',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {persistentDataRef.current ? (
            <img
              src={persistentDataRef.current}
              alt="Whiteboard Thumbnail"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ color: '#94A3B8', fontSize: '0.72rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={16} color="#38BDF8" />
              <span>Click to Expand</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Styles for Slider Mode vs Floating Mode vs Fullscreen
  let containerStyle = {};
  if (isFullScreen) {
    containerStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999
    };
  } else if (displayMode === 'slider') {
    containerStyle = {
      position: 'fixed',
      top: 0,
      [dockSide === 'right' ? 'right' : 'left']: 0,
      width: `${Math.min(window.innerWidth * 0.95, sliderWidth)}px`,
      height: '100vh',
      zIndex: 9990,
      boxShadow: dockSide === 'right' ? '-8px 0 35px rgba(0, 0, 0, 0.75)' : '8px 0 35px rgba(0, 0, 0, 0.75)'
    };
  } else {
    // Floating draggable window
    containerStyle = {
      position: 'fixed',
      top: `${windowPos.y}px`,
      left: `${windowPos.x}px`,
      width: `${Math.min(window.innerWidth - 30, windowSize.width)}px`,
      height: `${Math.min(window.innerHeight - 30, windowSize.height)}px`,
      zIndex: 9990,
      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)'
    };
  }

  return (
    <div
      className="whiteboard-container"
      style={{
        ...containerStyle,
        backgroundColor: '#0B0F19',
        border: isFullScreen ? 'none' : '1px solid #1E293B',
        borderRadius: isFullScreen || displayMode === 'slider' ? '0' : '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header Toolbar: Drag Handle & Quick Actions */}
      <div
        onPointerDown={handleWindowDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.45rem 0.75rem',
          backgroundColor: '#0F172A',
          borderBottom: '1px solid #1E293B',
          cursor: displayMode === 'floating' ? 'move' : 'default',
          flexShrink: 0,
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        {/* Title & Mode Switchers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38BDF8', fontWeight: 700, fontSize: '0.85rem' }}>
            <Palette size={16} />
            <span>Interactive Whiteboard</span>
          </div>

          {/* Mode Switchers: Stick Left, Stick Right, Draggable Float, Corner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '2px', borderRadius: '4px' }}>
            <button
              type="button"
              className={`btn btn-sm ${displayMode === 'slider' && dockSide === 'left' ? 'btn-secondary' : 'btn-subtle'}`}
              style={{ fontSize: '0.68rem', padding: '1px 6px', height: '22px' }}
              onClick={() => { setDockSide('left'); setDisplayMode('slider'); setIsFullScreen(false); }}
              title="Stick to Left Side"
            >
              Stick Left
            </button>
            <button
              type="button"
              className={`btn btn-sm ${displayMode === 'slider' && dockSide === 'right' ? 'btn-secondary' : 'btn-subtle'}`}
              style={{ fontSize: '0.68rem', padding: '1px 6px', height: '22px' }}
              onClick={() => { setDockSide('right'); setDisplayMode('slider'); setIsFullScreen(false); }}
              title="Stick to Right Side"
            >
              Stick Right
            </button>
            <button
              type="button"
              className={`btn btn-sm ${displayMode === 'floating' ? 'btn-secondary' : 'btn-subtle'}`}
              style={{ fontSize: '0.68rem', padding: '1px 6px', height: '22px' }}
              onClick={() => { setDisplayMode('floating'); setIsFullScreen(false); }}
              title="Draggable Window Mode (Drop near any corner to stick small!)"
            >
              Float
            </button>
            <button
              type="button"
              className="btn btn-subtle btn-sm"
              style={{ fontSize: '0.68rem', padding: '1px 6px', height: '22px' }}
              onClick={() => setDisplayMode('corner')}
              title="Stick Small in Corner"
            >
              Corner
            </button>
          </div>

          {/* Resolution Presets: 360p, 480p, 720p, 1080p, Fit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
            <Monitor size={12} color="#94A3B8" />
            <select
              value={resolutionPreset}
              onChange={(e) => setResolutionPreset(e.target.value)}
              className="form-input"
              style={{
                height: '22px',
                fontSize: '0.68rem',
                padding: '0 4px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#38BDF8',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Adjust canvas resolution / size presets"
            >
              {RESOLUTION_PRESETS.map((p) => (
                <option key={p.id} value={p.id} style={{ backgroundColor: '#0F172A', color: '#fff' }}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {shareNotice && (
            <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 600 }}>
              ✓ {shareNotice}
            </span>
          )}

          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.7rem', padding: '2px 8px', height: '24px', gap: '4px' }}
            onClick={handleShareSnapshotToRoom}
            title="Snapshot & Share to Room Chat"
          >
            <Share2 size={12} />
            <span className="hide-on-mobile">Share to Chat</span>
          </button>

          <button
            type="button"
            className="btn btn-subtle btn-icon sm"
            style={{ width: '24px', height: '24px', padding: 0 }}
            onClick={() => setIsFullScreen((prev) => !prev)}
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <button
            type="button"
            className="btn btn-subtle btn-icon sm"
            style={{ width: '24px', height: '24px', padding: 0 }}
            onClick={onClose}
            title="Close Whiteboard"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Unified Compact Toolbar: All Tools in ONE View (No Scrolling Below!) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0.4rem 0.75rem',
          backgroundColor: '#161B26',
          borderBottom: '1px solid #293142',
          flexShrink: 0,
          flexWrap: 'wrap',
          fontSize: '0.75rem'
        }}
      >
        {/* Drawing Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            type="button"
            className={`btn btn-sm ${currentTool === 'pen' ? 'btn-primary' : 'btn-subtle'}`}
            style={{ padding: '2px 6px', height: '24px' }}
            onClick={() => setCurrentTool('pen')}
            title="Pen (Natural ink)"
          >
            <Pen size={12} />
          </button>

          <button
            type="button"
            className={`btn btn-sm ${currentTool === 'pencil' ? 'btn-primary' : 'btn-subtle'}`}
            style={{ padding: '2px 6px', height: '24px' }}
            onClick={() => setCurrentTool('pencil')}
            title="Pencil (Fine precision sketch)"
          >
            <Pencil size={12} />
          </button>

          <button
            type="button"
            className={`btn btn-sm ${currentTool === 'brush' ? 'btn-primary' : 'btn-subtle'}`}
            style={{ padding: '2px 6px', height: '24px' }}
            onClick={() => setCurrentTool('brush')}
            title="Marker / Brush"
          >
            <Brush size={12} />
          </button>

          <button
            type="button"
            className={`btn btn-sm ${currentTool === 'highlighter' ? 'btn-primary' : 'btn-subtle'}`}
            style={{ padding: '2px 6px', height: '24px' }}
            onClick={() => setCurrentTool('highlighter')}
            title="Highlighter"
          >
            <Highlighter size={12} />
          </button>

          {/* Regular Eraser */}
          <button
            type="button"
            className={`btn btn-sm ${currentTool === 'eraser' ? 'btn-primary' : 'btn-subtle'}`}
            style={{ padding: '2px 6px', height: '24px' }}
            onClick={() => setCurrentTool('eraser')}
            title="Eraser (Clean Wipe)"
          >
            <Eraser size={12} />
          </button>

          {/* Area Eraser (Particular Portion Only) */}
          <button
            type="button"
            className={`btn btn-sm ${currentTool === 'area_erase' ? 'btn-primary' : 'btn-subtle'}`}
            style={{
              padding: '2px 6px',
              height: '24px',
              borderColor: currentTool === 'area_erase' ? '#F87171' : undefined
            }}
            onClick={() => setCurrentTool('area_erase')}
            title="Area Box Eraser: Drag a rectangle over any particular portion to clear just that area"
          >
            <Crop size={12} />
            <span style={{ fontSize: '0.65rem', marginLeft: '3px' }}>Area Erase</span>
          </button>
        </div>

        {/* Eraser Width Pills if Eraser is Active */}
        {currentTool === 'eraser' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1px 4px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <span style={{ fontSize: '0.65rem', color: '#F87171', fontWeight: 600 }}>Size:</span>
            {ERASER_SIZES.map((es) => (
              <button
                key={es.value}
                type="button"
                className={`btn btn-sm ${eraserSize === es.value ? 'btn-primary' : 'btn-subtle'}`}
                style={{ fontSize: '0.65rem', padding: '1px 4px', height: '20px' }}
                onClick={() => setEraserSize(es.value)}
              >
                {es.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ width: '1px', height: '16px', backgroundColor: '#334155' }} />

        {/* Shapes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            type="button"
            className={`btn btn-sm ${currentTool === 'rectangle' ? 'btn-primary' : 'btn-subtle'}`}
            style={{ padding: '2px 6px', height: '24px' }}
            onClick={() => setCurrentTool('rectangle')}
            title="Rectangle"
          >
            <Square size={12} />
          </button>

          <button
            type="button"
            className={`btn btn-sm ${currentTool === 'circle' ? 'btn-primary' : 'btn-subtle'}`}
            style={{ padding: '2px 6px', height: '24px' }}
            onClick={() => setCurrentTool('circle')}
            title="Circle"
          >
            <Circle size={12} />
          </button>

          <button
            type="button"
            className={`btn btn-sm ${currentTool === 'arrow' ? 'btn-primary' : 'btn-subtle'}`}
            style={{ padding: '2px 6px', height: '24px' }}
            onClick={() => setCurrentTool('arrow')}
            title="Arrow"
          >
            <ArrowRight size={12} />
          </button>

          <button
            type="button"
            className={`btn btn-sm ${currentTool === 'line' ? 'btn-primary' : 'btn-subtle'}`}
            style={{ padding: '2px 6px', height: '24px' }}
            onClick={() => setCurrentTool('line')}
            title="Line"
          >
            <Minus size={12} />
          </button>

          <button
            type="button"
            className={`btn btn-sm ${currentTool === 'text' ? 'btn-primary' : 'btn-subtle'}`}
            style={{ padding: '2px 6px', height: '24px' }}
            onClick={() => setCurrentTool('text')}
            title="Add Text"
          >
            <Type size={12} />
          </button>
        </div>

        <div style={{ width: '1px', height: '16px', backgroundColor: '#334155' }} />

        {/* Color Palette (Compact 8 Swatches) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {PRESET_COLORS.slice(0, 8).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setStrokeColor(c)}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: c,
                border: strokeColor === c ? '2px solid #FFFFFF' : '1px solid rgba(255,255,255,0.2)',
                boxShadow: strokeColor === c ? '0 0 6px ' + c : 'none',
                cursor: 'pointer',
                padding: 0
              }}
              title={c}
            />
          ))}
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            style={{ width: '18px', height: '18px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
            title="Custom Color"
          />
        </div>

        <div style={{ width: '1px', height: '16px', backgroundColor: '#334155' }} />

        {/* Stroke Widths */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {STROKE_WIDTHS.map((sw) => (
            <button
              key={sw.value}
              type="button"
              className={`btn btn-sm ${strokeWidth === sw.value ? 'btn-primary' : 'btn-subtle'}`}
              style={{ fontSize: '0.65rem', padding: '1px 5px', height: '22px' }}
              onClick={() => setStrokeWidth(sw.value)}
            >
              {sw.label}
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '16px', backgroundColor: '#334155' }} />

        {/* Undo / Redo / Clear / Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: 'auto' }}>
          <button
            type="button"
            className="btn btn-subtle btn-sm"
            style={{ padding: '2px 5px', height: '22px' }}
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo"
          >
            <Undo2 size={12} />
          </button>

          <button
            type="button"
            className="btn btn-subtle btn-sm"
            style={{ padding: '2px 5px', height: '22px' }}
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo"
          >
            <Redo2 size={12} />
          </button>

          <button
            type="button"
            className="btn btn-subtle btn-sm"
            style={{ padding: '2px 5px', height: '22px', color: '#F87171' }}
            onClick={handleClearAll}
            title="Clear entire whiteboard"
          >
            <Trash2 size={12} />
          </button>

          <button
            type="button"
            className="btn btn-subtle btn-sm"
            style={{ padding: '2px 5px', height: '22px' }}
            onClick={handleDownloadPNG}
            title="Export as PNG image"
          >
            <Download size={12} />
          </button>
        </div>
      </div>

      {/* Canvas Drawing Area */}
      <div
        ref={canvasContainerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          backgroundColor: '#090D16',
          backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none'
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            display: 'block',
            cursor:
              currentTool === 'eraser'
                ? 'cell'
                : currentTool === 'area_erase'
                ? 'crosshair'
                : currentTool === 'text'
                ? 'text'
                : 'crosshair',
            boxShadow: resolutionPreset !== 'fit' ? '0 10px 35px rgba(0,0,0,0.7)' : 'none',
            border: resolutionPreset !== 'fit' ? '1px solid #334155' : 'none',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        />

        {/* Area Erase (Particular Portion) Marquee Box Overlay */}
        {areaSelection && (
          <div
            style={{
              position: 'absolute',
              left: `${areaSelection.x}px`,
              top: `${areaSelection.y}px`,
              width: `${areaSelection.w}px`,
              height: `${areaSelection.h}px`,
              border: '2px dashed #EF4444',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              pointerEvents: 'none'
            }}
          />
        )}

        {/* Inline Text Input for Text Tool */}
        {textInputPos && (
          <div
            style={{
              position: 'absolute',
              left: `${textInputPos.x}px`,
              top: `${textInputPos.y}px`,
              zIndex: 20
            }}
          >
            <input
              ref={textInputRef}
              type="text"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitText();
                if (e.key === 'Escape') setTextInputPos(null);
              }}
              onBlur={handleCommitText}
              placeholder="Type text & press Enter..."
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                color: strokeColor,
                border: '1px solid #38BDF8',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: `${Math.max(14, strokeWidth * 3.5)}px`,
                outline: 'none',
                minWidth: '150px'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
