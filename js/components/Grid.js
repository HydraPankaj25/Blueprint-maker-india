// Grid.js - Grid system for blueprint canvas with snapping functionality
class Grid {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.size = options.size || 20;
        this.visible = options.visible !== false;
        this.snapEnabled = options.snapEnabled !== false;
        this.majorGridSize = options.majorGridSize || this.size * 5;

        // Grid colors
        this.minorGridColor = options.minorGridColor || '#e0e0e0';
        this.majorGridColor = options.majorGridColor || '#b0b0b0';
        this.originColor = options.originColor || '#ff0000';

        // Grid line styles
        this.minorLineWidth = 0.5;
        this.majorLineWidth = 1;
        this.originLineWidth = 2;

        // Offset for panning
        this.offsetX = 0;
        this.offsetY = 0;
    }

    draw() {
        if (!this.visible) return;

        this.ctx.save();

        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        // Calculate grid bounds
        const startX = Math.floor(-this.offsetX / this.size) * this.size + this.offsetX;
        const startY = Math.floor(-this.offsetY / this.size) * this.size + this.offsetY;
        const endX = canvasWidth - this.offsetX;
        const endY = canvasHeight - this.offsetY;

        // Draw minor grid lines
        this.drawMinorGrid(startX, startY, endX, endY);

        // Draw major grid lines
        this.drawMajorGrid(startX, startY, endX, endY);

        // Draw origin lines
        this.drawOrigin();

        this.ctx.restore();
    }

    drawMinorGrid(startX, startY, endX, endY) {
        this.ctx.strokeStyle = this.minorGridColor;
        this.ctx.lineWidth = this.minorLineWidth;
        this.ctx.beginPath();

        // Vertical lines
        for (let x = startX; x <= endX + this.size; x += this.size) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
        }

        // Horizontal lines
        for (let y = startY; y <= endY + this.size; y += this.size) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
        }

        this.ctx.stroke();
    }

    drawMajorGrid(startX, startY, endX, endY) {
        this.ctx.strokeStyle = this.majorGridColor;
        this.ctx.lineWidth = this.majorLineWidth;
        this.ctx.beginPath();

        const majorStartX = Math.floor(-this.offsetX / this.majorGridSize) * this.majorGridSize + this.offsetX;
        const majorStartY = Math.floor(-this.offsetY / this.majorGridSize) * this.majorGridSize + this.offsetY;

        // Vertical major lines
        for (let x = majorStartX; x <= endX + this.majorGridSize; x += this.majorGridSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
        }

        // Horizontal major lines
        for (let y = majorStartY; y <= endY + this.majorGridSize; y += this.majorGridSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
        }

        this.ctx.stroke();
    }

    drawOrigin() {
        const originX = this.offsetX;
        const originY = this.offsetY;

        // Only draw if origin is visible
        if (originX >= 0 && originX <= this.canvas.width &&
            originY >= 0 && originY <= this.canvas.height) {

            this.ctx.strokeStyle = this.originColor;
            this.ctx.lineWidth = this.originLineWidth;
            this.ctx.beginPath();

            // Horizontal origin line
            this.ctx.moveTo(0, originY);
            this.ctx.lineTo(this.canvas.width, originY);

            // Vertical origin line
            this.ctx.moveTo(originX, 0);
            this.ctx.lineTo(originX, this.canvas.height);

            this.ctx.stroke();

            // Draw origin point
            this.ctx.fillStyle = this.originColor;
            this.ctx.beginPath();
            this.ctx.arc(originX, originY, 4, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }

    snapToGrid(x, y) {
        if (!this.snapEnabled) {
            return { x, y };
        }

        // Account for grid offset
        const adjustedX = x - this.offsetX;
        const adjustedY = y - this.offsetY;

        // Snap to nearest grid point
        const snappedX = Math.round(adjustedX / this.size) * this.size + this.offsetX;
        const snappedY = Math.round(adjustedY / this.size) * this.size + this.offsetY;

        return { x: snappedX, y: snappedY };
    }

    snapToMajorGrid(x, y) {
        if (!this.snapEnabled) {
            return { x, y };
        }

        // Account for grid offset
        const adjustedX = x - this.offsetX;
        const adjustedY = y - this.offsetY;

        // Snap to nearest major grid point
        const snappedX = Math.round(adjustedX / this.majorGridSize) * this.majorGridSize + this.offsetX;
        const snappedY = Math.round(adjustedY / this.majorGridSize) * this.majorGridSize + this.offsetY;

        return { x: snappedX, y: snappedY };
    }

    getNearestGridPoint(x, y) {
        return this.snapToGrid(x, y);
    }

    getNearestMajorGridPoint(x, y) {
        return this.snapToMajorGrid(x, y);
    }

    setSize(size) {
        this.size = Math.max(1, size);
        this.majorGridSize = this.size * 5;
    }

    getSize() {
        return this.size;
    }

    setVisible(visible) {
        this.visible = visible;
    }

    isVisible() {
        return this.visible;
    }

    setSnapEnabled(enabled) {
        this.snapEnabled = enabled;
    }

    isSnapEnabled() {
        return this.snapEnabled;
    }

    setOffset(x, y) {
        this.offsetX = x;
        this.offsetY = y;
    }

    getOffset() {
        return { x: this.offsetX, y: this.offsetY };
    }

    // Convert screen coordinates to grid coordinates
    screenToGrid(screenX, screenY) {
        return {
            x: screenX - this.offsetX,
            y: screenY - this.offsetY
        };
    }

    // Convert grid coordinates to screen coordinates
    gridToScreen(gridX, gridY) {
        return {
            x: gridX + this.offsetX,
            y: gridY + this.offsetY
        };
    }

    // Get grid line positions for given screen bounds
    getGridLines(bounds) {
        const lines = {
            vertical: [],
            horizontal: [],
            majorVertical: [],
            majorHorizontal: []
        };

        // Minor grid lines
        const startX = Math.floor((bounds.left - this.offsetX) / this.size) * this.size + this.offsetX;
        const startY = Math.floor((bounds.top - this.offsetY) / this.size) * this.size + this.offsetY;

        for (let x = startX; x <= bounds.right; x += this.size) {
            lines.vertical.push(x);
        }

        for (let y = startY; y <= bounds.bottom; y += this.size) {
            lines.horizontal.push(y);
        }

        // Major grid lines
        const majorStartX = Math.floor((bounds.left - this.offsetX) / this.majorGridSize) * this.majorGridSize + this.offsetX;
        const majorStartY = Math.floor((bounds.top - this.offsetY) / this.majorGridSize) * this.majorGridSize + this.offsetY;

        for (let x = majorStartX; x <= bounds.right; x += this.majorGridSize) {
            lines.majorVertical.push(x);
        }

        for (let y = majorStartY; y <= bounds.bottom; y += this.majorGridSize) {
            lines.majorHorizontal.push(y);
        }

        return lines;
    }

    // Check if point is on grid line
    isOnGridLine(x, y, tolerance = 2) {
        const snapped = this.snapToGrid(x, y);
        const distance = Math.sqrt((x - snapped.x) ** 2 + (y - snapped.y) ** 2);
        return distance <= tolerance;
    }

    // Get grid statistics
    getGridInfo() {
        return {
            size: this.size,
            majorGridSize: this.majorGridSize,
            visible: this.visible,
            snapEnabled: this.snapEnabled,
            offset: { x: this.offsetX, y: this.offsetY },
            colors: {
                minor: this.minorGridColor,
                major: this.majorGridColor,
                origin: this.originColor
            }
        };
    }

    // Reset grid to default state
    reset() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.size = 20;
        this.majorGridSize = 100;
        this.visible = true;
        this.snapEnabled = true;
    }

    // Export grid settings
    exportSettings() {
        return {
            size: this.size,
            majorGridSize: this.majorGridSize,
            visible: this.visible,
            snapEnabled: this.snapEnabled,
            offsetX: this.offsetX,
            offsetY: this.offsetY,
            minorGridColor: this.minorGridColor,
            majorGridColor: this.majorGridColor,
            originColor: this.originColor
        };
    }

    // Import grid settings
    importSettings(settings) {
        if (settings.size) this.size = settings.size;
        if (settings.majorGridSize) this.majorGridSize = settings.majorGridSize;
        if (settings.visible !== undefined) this.visible = settings.visible;
        if (settings.snapEnabled !== undefined) this.snapEnabled = settings.snapEnabled;
        if (settings.offsetX !== undefined) this.offsetX = settings.offsetX;
        if (settings.offsetY !== undefined) this.offsetY = settings.offsetY;
        if (settings.minorGridColor) this.minorGridColor = settings.minorGridColor;
        if (settings.majorGridColor) this.majorGridColor = settings.majorGridColor;
        if (settings.originColor) this.originColor = settings.originColor;
    }
}