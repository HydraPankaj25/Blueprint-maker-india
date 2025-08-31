/**
 * CanvasDrawing Component
 * Handles all canvas drawing operations, tools, and interactions
 */

class CanvasDrawing {
    constructor(containerId) {
        this.containerId = containerId;
        this.canvas = null;
        this.ctx = null;
        this.isInitialized = false;

        // Drawing state
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentPreview = null;

        // Canvas state
        this.gridSize = 20;
        this.snapToGrid = true;
        this.showMeasurements = true;

        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;

        this.init();
    }

    async init() {
        try {
            console.log('[CanvasDrawing] Initializing...');

            // Wait for DOM element to be available
            await this.waitForElement();

            // Create canvas and setup
            this.createCanvas();
            this.setupEventListeners();
            this.setupEventBusListeners();

            // Initial render
            this.resize();
            this.redraw();

            this.isInitialized = true;
            console.log('[CanvasDrawing] Initialized successfully');

            EventBus.emit('component:ready', { component: 'CanvasDrawing' });

        } catch (error) {
            console.error('[CanvasDrawing] Initialization failed:', error);
            EventBus.emit('component:error', { component: 'CanvasDrawing', error });
        }
    }

    waitForElement() {
        return new Promise((resolve, reject) => {
            const checkElement = () => {
                const container = document.getElementById(this.containerId);
                if (container) {
                    resolve(container);
                } else {
                    setTimeout(checkElement, 100);
                }
            };

            checkElement();

            // Timeout after 10 seconds
            setTimeout(() => {
                reject(new Error(`Container ${this.containerId} not found`));
            }, 10000);
        });
    }

    createCanvas() {
        const container = document.getElementById(this.containerId);

        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'drawingCanvas';
        this.ctx = this.canvas.getContext('2d');

        // Create overlay elements
        const overlay = this.createOverlay();

        // Clear container and add canvas
        container.innerHTML = '';
        container.appendChild(this.canvas);
        container.appendChild(overlay);

        console.log('[CanvasDrawing] Canvas created');
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'canvas-overlay';

        overlay.innerHTML = `
            <div class="canvas-info">
                <div>
                    <span>Zoom:</span>
                    <span id="zoomLevel">100%</span>
                </div>
                <div>
                    <span>Mouse:</span>
                    <span id="mousePosition">0, 0</span>
                </div>
                <div>
                    <span>Tool:</span>
                    <span id="currentTool">Select</span>
                </div>
            </div>
            <div class="canvas-controls">
                <button class="canvas-control-btn" onclick="app.components.canvasDrawing.zoomIn()" title="Zoom In">
                    🔍+
                </button>
                <button class="canvas-control-btn" onclick="app.components.canvasDrawing.zoomOut()" title="Zoom Out">
                    🔍-
                </button>
                <button class="canvas-control-btn" onclick="app.components.canvasDrawing.resetZoom()" title="Reset Zoom">
                    🔍
                </button>
                <button class="canvas-control-btn" onclick="app.components.canvasDrawing.fitToScreen()" title="Fit to Screen">
                    📏
                </button>
            </div>
        `;

        return overlay;
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Wheel event for zooming
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));

        // Window resize
        window.addEventListener('resize', this.resize.bind(this));

        // Context menu (right-click)
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));

        console.log('[CanvasDrawing] Event listeners set up');
    }

    setupEventBusListeners() {
        EventBus.on('tool:changed', this.handleToolChanged.bind(this));
        EventBus.on('grid:toggled', this.handleGridToggled.bind(this));
        EventBus.on('scale:changed', this.handleScaleChanged.bind(this));
        EventBus.on('project:loaded', this.handleProjectLoaded.bind(this));
        EventBus.on('canvas:clear', this.clear.bind(this));

        console.log('[CanvasDrawing] EventBus listeners set up');
    }

    // Mouse Event Handlers
    handleMouseDown(event) {
        event.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / AppState.zoom;
        const y = (event.clientY - rect.top) / AppState.zoom;

        this.startX = this.snapToGrid ? this.snapToGridCoord(x) : x;
        this.startY = this.snapToGrid ? this.snapToGridCoord(y) : y;

        if (AppState.currentTool !== 'select') {
            this.isDrawing = true;
            this.saveState(); // Save state for undo

            // Start new drawing
            this.currentPreview = {
                tool: AppState.currentTool,
                startX: this.startX,
                startY: this.startY,
                endX: this.startX,
                endY: this.startY,
                color: this.getStrokeColor(),
                width: this.getStrokeWidth(),
                fill: this.getFillColor(),
                properties: this.getCurrentToolProperties()
            };
        }

        EventBus.emit('canvas:mousedown', { x: this.startX, y: this.startY, tool: AppState.currentTool });
    }

    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / AppState.zoom;
        const y = (event.clientY - rect.top) / AppState.zoom;

        // Update mouse position display
        document.getElementById('mousePosition').textContent = `${Math.round(x)}, ${Math.round(y)}`;

        if (this.isDrawing && this.currentPreview) {
            this.currentPreview.endX = this.snapToGrid ? this.snapToGridCoord(x) : x;
            this.currentPreview.endY = this.snapToGrid ? this.snapToGridCoord(y) : y;

            // Redraw with preview
            this.redraw();
            this.drawPreview(this.currentPreview);
        }

        EventBus.emit('canvas:mousemove', { x, y, isDrawing: this.isDrawing });
    }

    handleMouseUp(event) {
        if (this.isDrawing && this.currentPreview) {
            // Finalize the drawing
            const drawing = { ...this.currentPreview };

            // Only add if the shape has meaningful dimensions
            if (this.isValidDrawing(drawing)) {
                AppState.drawings.push(drawing);
                EventBus.emit('drawing:added', drawing);
                console.log('[CanvasDrawing] Drawing added:', drawing);
            }

            this.currentPreview = null;
            this.redraw();
        }

        this.isDrawing = false;
        EventBus.emit('canvas:mouseup');
    }

    handleMouseLeave(event) {
        if (this.isDrawing) {
            // Cancel current drawing
            this.currentPreview = null;
            this.isDrawing = false;
            this.redraw();
        }
    }

    // Touch Event Handlers (for mobile support)
    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseDown(mouseEvent);
    }

    handleTouchMove(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
    }

    handleTouchEnd(event) {
        event.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        this.handleMouseUp(mouseEvent);
    }

    // Wheel Event Handler (zooming)
    handleWheel(event) {
        event.preventDefault();

        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, AppState.zoom * delta));

        if (newZoom !== AppState.zoom) {
            AppState.zoom = newZoom;
            this.updateZoomDisplay();
            this.redraw();
            EventBus.emit('canvas:zoomed', newZoom);
        }
    }

    handleContextMenu(event) {
        event.preventDefault();
        // Could implement context menu here
        console.log('[CanvasDrawing] Context menu at:', event.clientX, event.clientY);
    }

    // EventBus Handlers
    handleToolChanged(tool) {
        const toolNames = {
            select: 'Select',
            rectangle: 'Rectangle',
            circle: 'Circle',
            line: 'Line',
            text: 'Text'
        };

        document.getElementById('currentTool').textContent = toolNames[tool] || tool;
        this.updateCursor(tool);
        console.log('[CanvasDrawing] Tool changed to:', tool);
    }

    handleGridToggled(visible) {
        AppState.gridVisible = visible;
        this.redraw();
        console.log('[CanvasDrawing] Grid toggled:', visible);
    }

    handleScaleChanged(scale) {
        console.log('[CanvasDrawing] Scale changed:', scale);
        this.redraw();
    }

    handleProjectLoaded(projectData) {
        console.log('[CanvasDrawing] Project loaded');
        this.redraw();
    }

    // Drawing Methods
    redraw() {
        if (!this.canvas || !this.ctx) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply zoom and transformations
        this.ctx.save();
        this.ctx.scale(AppState.zoom, AppState.zoom);

        // Draw grid if visible
        if (AppState.gridVisible) {
            this.drawGrid();
        }

        // Draw all saved drawings
        AppState.drawings.forEach(drawing => {
            this.drawShape(drawing);
        });

        this.ctx.restore();
    }

    drawGrid() {
        const width = this.canvas.width / AppState.zoom;
        const height = this.canvas.height / AppState.zoom;

        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([1, 1]);

        // Vertical lines
        for (let x = 0; x < width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y < height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        this.ctx.setLineDash([]);
    }

    drawPreview(drawing) {
        if (!drawing) return;

        this.ctx.save();
        this.ctx.scale(AppState.zoom, AppState.zoom);

        // Set preview style (slightly transparent)
        this.ctx.globalAlpha = 0.7;
        this.drawShape(drawing);

        this.ctx.restore();
    }

    drawShape(drawing) {
        if (!drawing) return;

        this.ctx.strokeStyle = drawing.color || '#000000';
        this.ctx.lineWidth = drawing.width || 2;
        this.ctx.fillStyle = drawing.fill || 'transparent';

        switch (drawing.tool) {
            case 'rectangle':
                this.drawRectangle(drawing);
                break;
            case 'circle':
                this.drawCircle(drawing);
                break;
            case 'line':
                this.drawLine(drawing);
                break;
            case 'text':
                this.drawText(drawing);
                break;
            default:
                console.warn('[CanvasDrawing] Unknown drawing tool:', drawing.tool);
        }
    }

    drawRectangle(drawing) {
        const width = drawing.endX - drawing.startX;
        const height = drawing.endY - drawing.startY;

        this.ctx.beginPath();
        this.ctx.rect(drawing.startX, drawing.startY, width, height);

        if (drawing.fill && drawing.fill !== 'transparent') {
            this.ctx.fill();
        }
        this.ctx.stroke();

        // Draw measurements if enabled
        if (this.showMeasurements && Math.abs(width) > 20 && Math.abs(height) > 20) {
            this.drawMeasurements(drawing.startX, drawing.startY, width, height);
        }
    }

    drawCircle(drawing) {
        const radius = Math.sqrt(
            Math.pow(drawing.endX - drawing.startX, 2) +
            Math.pow(drawing.endY - drawing.startY, 2)
        );

        this.ctx.beginPath();
        this.ctx.arc(drawing.startX, drawing.startY, radius, 0, 2 * Math.PI);

        if (drawing.fill && drawing.fill !== 'transparent') {
            this.ctx.fill();
        }
        this.ctx.stroke();

        // Draw radius measurement if enabled
        if (this.showMeasurements && radius > 10) {
            this.drawRadiusMeasurement(drawing.startX, drawing.startY, drawing.endX, drawing.endY, radius);
        }
    }

    drawLine(drawing) {
        this.ctx.beginPath();
        this.ctx.moveTo(drawing.startX, drawing.startY);
        this.ctx.lineTo(drawing.endX, drawing.endY);
        this.ctx.stroke();

        // Draw length measurement if enabled
        if (this.showMeasurements) {
            const length = Math.sqrt(
                Math.pow(drawing.endX - drawing.startX, 2) +
                Math.pow(drawing.endY - drawing.startY, 2)
            );
            if (length > 20) {
                this.drawLineMeasurement(drawing.startX, drawing.startY, drawing.endX, drawing.endY, length);
            }
        }
    }

    drawText(drawing) {
        const text = drawing.text || 'Text';
        const fontSize = drawing.fontSize || 16;

        this.ctx.font = `${fontSize}px Inter, Arial, sans-serif`;
        this.ctx.fillStyle = drawing.color || '#000000';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        // Draw text background if specified
        if (drawing.background) {
            const metrics = this.ctx.measureText(text);
            this.ctx.fillStyle = drawing.background;
            this.ctx.fillRect(drawing.startX - 4, drawing.startY - 2, metrics.width + 8, fontSize + 4);
        }

        this.ctx.fillStyle = drawing.color || '#000000';
        this.ctx.fillText(text, drawing.startX, drawing.startY);
    }

    drawMeasurements(x, y, width, height) {
        const absWidth = Math.abs(width);
        const absHeight = Math.abs(height);

        // Convert pixels to real-world measurements based on scale
        const realWidth = this.pixelsToRealWorld(absWidth);
        const realHeight = this.pixelsToRealWorld(absHeight);

        this.ctx.save();
        this.ctx.fillStyle = '#2563eb';
        this.ctx.font = '12px Inter, Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Width measurement
        const widthX = x + width / 2;
        const widthY = y - 15;
        this.ctx.fillText(`${realWidth}`, widthX, widthY);

        // Height measurement
        const heightX = x - 15;
        const heightY = y + height / 2;
        this.ctx.save();
        this.ctx.translate(heightX, heightY);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText(`${realHeight}`, 0, 0);
        this.ctx.restore();

        this.ctx.restore();
    }

    drawRadiusMeasurement(centerX, centerY, endX, endY, radius) {
        const realRadius = this.pixelsToRealWorld(radius);

        this.ctx.save();
        this.ctx.fillStyle = '#2563eb';
        this.ctx.font = '12px Inter, Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Draw radius line
        this.ctx.strokeStyle = '#2563eb';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([2, 2]);
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw measurement text
        const textX = centerX + (endX - centerX) / 2;
        const textY = centerY + (endY - centerY) / 2 - 10;
        this.ctx.fillText(`r=${realRadius}`, textX, textY);

        this.ctx.restore();
    }

    drawLineMeasurement(startX, startY, endX, endY, length) {
        const realLength = this.pixelsToRealWorld(length);

        this.ctx.save();
        this.ctx.fillStyle = '#2563eb';
        this.ctx.font = '12px Inter, Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Draw measurement text at midpoint
        const textX = startX + (endX - startX) / 2;
        const textY = startY + (endY - startY) / 2 - 10;
        this.ctx.fillText(realLength, textX, textY);

        this.ctx.restore();
    }

    // Utility Methods
    snapToGridCoord(coord) {
        return Math.round(coord / this.gridSize) * this.gridSize;
    }

    pixelsToRealWorld(pixels) {
        // Convert pixels to real-world measurements based on current scale
        const scaleMap = {
            '1:50': { factor: 0.5, unit: 'm' },
            '1:100': { factor: 1, unit: 'm' },
            '1:200': { factor: 2, unit: 'm' }
        };

        const scale = scaleMap[AppState.scale] || scaleMap['1:100'];
        const realValue = (pixels / this.gridSize) * scale.factor;

        return `${realValue.toFixed(1)}${scale.unit}`;
    }

    isValidDrawing(drawing) {
        switch (drawing.tool) {
            case 'rectangle':
                const width = Math.abs(drawing.endX - drawing.startX);
                const height = Math.abs(drawing.endY - drawing.startY);
                return width > 5 && height > 5;

            case 'circle':
                const radius = Math.sqrt(
                    Math.pow(drawing.endX - drawing.startX, 2) +
                    Math.pow(drawing.endY - drawing.startY, 2)
                );
                return radius > 5;

            case 'line':
                const length = Math.sqrt(
                    Math.pow(drawing.endX - drawing.startX, 2) +
                    Math.pow(drawing.endY - drawing.startY, 2)
                );
                return length > 5;

            case 'text':
                return true; // Text is always valid

            default:
                return false;
        }
    }

    getStrokeColor() {
        const colorInput = document.getElementById('strokeColor');
        return colorInput ? colorInput.value : '#2563eb';
    }

    getStrokeWidth() {
        const widthInput = document.getElementById('strokeWidth');
        return widthInput ? parseInt(widthInput.value) : 2;
    }

    getFillColor() {
        const fillInput = document.getElementById('fillColor');
        return fillInput ? fillInput.value : 'transparent';
    }

    getCurrentToolProperties() {
        // Return tool-specific properties
        const properties = {};

        switch (AppState.currentTool) {
            case 'text':
                properties.text = prompt('Enter text:') || 'Text';
                properties.fontSize = 16;
                properties.fontFamily = 'Inter';
                break;

            case 'rectangle':
            case 'circle':
                properties.filled = document.getElementById('fillShape')?.checked || false;
                break;
        }

        return properties;
    }

    updateCursor(tool) {
        const cursors = {
            'select': 'default',
            'rectangle': 'crosshair',
            'circle': 'crosshair',
            'line': 'crosshair',
            'text': 'text'
        };

        this.canvas.style.cursor = cursors[tool] || 'crosshair';
    }

    updateZoomDisplay() {
        const zoomDisplay = document.getElementById('zoomLevel');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${Math.round(AppState.zoom * 100)}%`;
        }
    }

    // Public Methods
    resize() {
        if (!this.canvas) return;

        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        // Set canvas size to match container
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        // Redraw after resize
        this.redraw();

        console.log('[CanvasDrawing] Resized to:', rect.width, 'x', rect.height);
        EventBus.emit('canvas:resized', { width: rect.width, height: rect.height });
    }

    clear() {
        AppState.drawings = [];
        this.redraw();
        this.saveState(); // Save clear state for undo
        EventBus.emit('canvas:cleared');
        console.log('[CanvasDrawing] Canvas cleared');
    }

    toggleGrid(visible) {
        AppState.gridVisible = visible;
        this.redraw();
        console.log('[CanvasDrawing] Grid toggled:', visible);
    }

    // Zoom Controls
    zoomIn() {
        const newZoom = Math.min(5, AppState.zoom * 1.2);
        if (newZoom !== AppState.zoom) {
            AppState.zoom = newZoom;
            this.updateZoomDisplay();
            this.redraw();
            EventBus.emit('canvas:zoomed', newZoom);
        }
    }

    zoomOut() {
        const newZoom = Math.max(0.1, AppState.zoom / 1.2);
        if (newZoom !== AppState.zoom) {
            AppState.zoom = newZoom;
            this.updateZoomDisplay();
            this.redraw();
            EventBus.emit('canvas:zoomed', newZoom);
        }
    }

    resetZoom() {
        if (AppState.zoom !== 1) {
            AppState.zoom = 1;
            this.updateZoomDisplay();
            this.redraw();
            EventBus.emit('canvas:zoomed', 1);
        }
    }

    fitToScreen() {
        if (AppState.drawings.length === 0) return;

        // Calculate bounding box of all drawings
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        AppState.drawings.forEach(drawing => {
            minX = Math.min(minX, drawing.startX, drawing.endX);
            minY = Math.min(minY, drawing.startY, drawing.endY);
            maxX = Math.max(maxX, drawing.startX, drawing.endX);
            maxY = Math.max(maxY, drawing.startY, drawing.endY);
        });

        const drawingWidth = maxX - minX;
        const drawingHeight = maxY - minY;

        if (drawingWidth > 0 && drawingHeight > 0) {
            const canvasWidth = this.canvas.width;
            const canvasHeight = this.canvas.height;

            const scaleX = (canvasWidth * 0.8) / drawingWidth;
            const scaleY = (canvasHeight * 0.8) / drawingHeight;

            AppState.zoom = Math.min(scaleX, scaleY, 5);
            this.updateZoomDisplay();
            this.redraw();
            EventBus.emit('canvas:zoomed', AppState.zoom);
        }
    }

    // History Management (Undo/Redo)
    saveState() {
        // Remove any future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add current state
        const state = JSON.parse(JSON.stringify(AppState.drawings));
        this.history.push(state);
        this.historyIndex++;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }

        EventBus.emit('canvas:state-saved', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    }

    undo() {
        if (this.canUndo()) {
            this.historyIndex--;
            AppState.drawings = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.redraw();
            EventBus.emit('canvas:undone', { canUndo: this.canUndo(), canRedo: this.canRedo() });
            console.log('[CanvasDrawing] Undo performed');
        }
    }

    redo() {
        if (this.canRedo()) {
            this.historyIndex++;
            AppState.drawings = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.redraw();
            EventBus.emit('canvas:redone', { canUndo: this.canUndo(), canRedo: this.canRedo() });
            console.log('[CanvasDrawing] Redo performed');
        }
    }

    canUndo() {
        return this.historyIndex > 0;
    }

    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }

    // Export Methods
    toDataURL(type = 'image/png', quality = 0.9) {
        // Create a temporary canvas with white background
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Fill with white background
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw the original canvas on top
        tempCtx.drawImage(this.canvas, 0, 0);

        return tempCanvas.toDataURL(type, quality);
    }

    exportAsImage(filename = 'blueprint.png') {
        const dataURL = this.toDataURL();
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = filename;
        link.click();

        console.log('[CanvasDrawing] Image exported:', filename);
        EventBus.emit('canvas:exported', { type: 'image', filename });
    }

    // Touch and Mobile Support
    enableTouchDrawing() {
        // Prevent default touch behaviors that interfere with drawing
        this.canvas.style.touchAction = 'none';

        // Add touch-specific CSS classes for better UX
        this.canvas.classList.add('touch-enabled');

        console.log('[CanvasDrawing] Touch drawing enabled');
    }

    // Performance Optimization
    optimizeForPerformance() {
        // Use requestAnimationFrame for smooth drawing
        this.useRAF = true;

        // Implement object culling for large drawings
        this.enableObjectCulling = true;

        // Use layers for better performance
        this.enableLayers = true;

        console.log('[CanvasDrawing] Performance optimizations enabled');
    }

    // Debug Methods
    getDrawingStats() {
        return {
            totalDrawings: AppState.drawings.length,
            drawingsByType: AppState.drawings.reduce((acc, drawing) => {
                acc[drawing.tool] = (acc[drawing.tool] || 0) + 1;
                return acc;
            }, {}),
            canvasSize: {
                width: this.canvas.width,
                height: this.canvas.height
            },
            zoom: AppState.zoom,
            gridVisible: AppState.gridVisible,
            historySize: this.history.length,
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
    }

    // Cleanup
    destroy() {
        if (this.canvas) {
            // Remove event listeners
            this.canvas.removeEventListener('mousedown', this.handleMouseDown);
            this.canvas.removeEventListener('mousemove', this.handleMouseMove);
            this.canvas.removeEventListener('mouseup', this.handleMouseUp);
            this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
            this.canvas.removeEventListener('wheel', this.handleWheel);
            this.canvas.removeEventListener('contextmenu', this.handleContextMenu);

            // Clear canvas
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }

        // Clear history
        this.history = [];
        this.historyIndex = -1;

        console.log('[CanvasDrawing] Component destroyed');
        EventBus.emit('component:destroyed', { component: 'CanvasDrawing' });
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.CanvasDrawing = CanvasDrawing;
}