// Shapes.js - Base classes and specific shape implementations for blueprint elements

// Base Shape class
class Shape {
    constructor(x, y, options = {}) {
        this.id = options.id || this.generateId();
        this.x = x;
        this.y = y;
        this.selected = false;
        this.visible = true;
        this.strokeStyle = options.strokeStyle || '#000000';
        this.fillStyle = options.fillStyle || 'transparent';
        this.lineWidth = options.lineWidth || 2;
        this.rotation = options.rotation || 0;
        this.scale = options.scale || 1;
        this.layer = options.layer || 0;
    }

    generateId() {
        return 'shape_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.scale(this.scale, this.scale);
        ctx.strokeStyle = this.strokeStyle;
        ctx.fillStyle = this.fillStyle;
        ctx.lineWidth = this.lineWidth;

        this.drawShape(ctx);

        if (this.selected) {
            this.drawSelectionHandles(ctx);
        }

        ctx.restore();
    }

    drawShape(ctx) {
        // Override in subclasses
    }

    drawSelectionHandles(ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(this.x, this.y);

        const bounds = this.getBounds();
        const handleSize = 6;

        ctx.fillStyle = '#007ACC';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;

        // Draw corner handles
        const positions = [
            { x: bounds.left - handleSize / 2, y: bounds.top - handleSize / 2 },
            { x: bounds.right - handleSize / 2, y: bounds.top - handleSize / 2 },
            { x: bounds.right - handleSize / 2, y: bounds.bottom - handleSize / 2 },
            { x: bounds.left - handleSize / 2, y: bounds.bottom - handleSize / 2 }
        ];

        positions.forEach(pos => {
            ctx.fillRect(pos.x, pos.y, handleSize, handleSize);
            ctx.strokeRect(pos.x, pos.y, handleSize, handleSize);
        });

        ctx.restore();
    }

    getBounds() {
        // Override in subclasses
        return { left: -10, top: -10, right: 10, bottom: 10 };
    }

    contains(x, y) {
        const bounds = this.getBounds();
        return x >= this.x + bounds.left &&
            x <= this.x + bounds.right &&
            y >= this.y + bounds.top &&
            y <= this.y + bounds.bottom;
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;
    }

    clone() {
        const cloned = new this.constructor(this.x, this.y);
        Object.assign(cloned, JSON.parse(JSON.stringify(this)));
        cloned.id = this.generateId();
        cloned.selected = false;
        return cloned;
    }

    toJSON() {
        return {
            type: this.constructor.name,
            id: this.id,
            x: this.x,
            y: this.y,
            strokeStyle: this.strokeStyle,
            fillStyle: this.fillStyle,
            lineWidth: this.lineWidth,
            rotation: this.rotation,
            scale: this.scale,
            layer: this.layer,
            visible: this.visible
        };
    }
}

// Wall class
class Wall extends Shape {
    constructor(x1, y1, x2, y2, options = {}) {
        super(x1, y1, options);
        this.x2 = x2 || x1;
        this.y2 = y2 || y1;
        this.thickness = options.thickness || 8;
        this.strokeStyle = options.strokeStyle || '#000000';
        this.fillStyle = options.fillStyle || '#cccccc';
    }

    drawShape(ctx) {
        const dx = this.x2 - this.x;
        const dy = this.y2 - this.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return;

        const angle = Math.atan2(dy, dx);

        ctx.save();
        ctx.rotate(angle);

        // Draw wall body
        ctx.fillRect(-this.thickness / 2, -this.thickness / 2, length, this.thickness);
        ctx.strokeRect(-this.thickness / 2, -this.thickness / 2, length, this.thickness);

        ctx.restore();
    }

    getBounds() {
        const minX = Math.min(0, this.x2 - this.x) - this.thickness / 2;
        const maxX = Math.max(0, this.x2 - this.x) + this.thickness / 2;
        const minY = Math.min(0, this.y2 - this.y) - this.thickness / 2;
        const maxY = Math.max(0, this.y2 - this.y) + this.thickness / 2;

        return { left: minX, top: minY, right: maxX, bottom: maxY };
    }

    contains(x, y) {
        // Check if point is near the wall line
        const dx = this.x2 - this.x;
        const dy = this.y2 - this.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return false;

        const t = ((x - this.x) * dx + (y - this.y) * dy) / (length * length);
        const clampedT = Math.max(0, Math.min(1, t));

        const closestX = this.x + clampedT * dx;
        const closestY = this.y + clampedT * dy;

        const distance = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);
        return distance <= this.thickness / 2 + 5;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            x2: this.x2,
            y2: this.y2,
            thickness: this.thickness
        };
    }
}

// Door class
class Door extends Shape {
    constructor(x, y, options = {}) {
        super(x, y, options);
        this.width = options.width || 80;
        this.height = options.height || 10;
        this.openAngle = options.openAngle || 90;
        this.strokeStyle = options.strokeStyle || '#8B4513';
        this.fillStyle = options.fillStyle || '#DEB887';
    }

    drawShape(ctx) {
        // Draw door frame
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Draw door swing arc
        ctx.save();
        ctx.strokeStyle = '#888888';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(-this.width / 2, 0, this.width, 0, (this.openAngle * Math.PI) / 180);
        ctx.stroke();
        ctx.restore();

        // Draw door handle
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.arc(this.width / 2 - 10, 0, 3, 0, 2 * Math.PI);
        ctx.fill();
    }

    getBounds() {
        return {
            left: -this.width / 2,
            top: -this.height / 2,
            right: this.width / 2,
            bottom: this.height / 2
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            openAngle: this.openAngle
        };
    }
}

// Window class
class Window extends Shape {
    constructor(x, y, options = {}) {
        super(x, y, options);
        this.width = options.width || 100;
        this.height = options.height || 10;
        this.strokeStyle = options.strokeStyle || '#4169E1';
        this.fillStyle = options.fillStyle || '#E6F3FF';
    }

    drawShape(ctx) {
        // Draw window frame
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Draw window panes
        ctx.strokeStyle = '#4169E1';
        ctx.lineWidth = 1;

        // Vertical divider
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(0, this.height / 2);
        ctx.stroke();

        // Horizontal divider
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, 0);
        ctx.lineTo(this.width / 2, 0);
        ctx.stroke();
    }

    getBounds() {
        return {
            left: -this.width / 2,
            top: -this.height / 2,
            right: this.width / 2,
            bottom: this.height / 2
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height
        };
    }
}

// Room class
class Room extends Shape {
    constructor(x, y, width, height, options = {}) {
        super(x, y, options);
        this.width = width || 200;
        this.height = height || 200;
        this.name = options.name || 'Room';
        this.strokeStyle = options.strokeStyle || '#333333';
        this.fillStyle = options.fillStyle || 'rgba(200, 200, 200, 0.3)';
    }

    drawShape(ctx) {
        // Draw room area
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Draw room name
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.name, 0, 0);
        ctx.restore();
    }

    getBounds() {
        return {
            left: -this.width / 2,
            top: -this.height / 2,
            right: this.width / 2,
            bottom: this.height / 2
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            name: this.name
        };
    }
}

// Text Label class
class TextLabel extends Shape {
    constructor(x, y, text, options = {}) {
        super(x, y, options);
        this.text = text || 'Text';
        this.fontSize = options.fontSize || 16;
        this.fontFamily = options.fontFamily || 'Arial';
        this.fillStyle = options.fillStyle || '#000000';
        this.strokeStyle = 'transparent';
    }

    drawShape(ctx) {
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(this.text, 0, 0);
    }

    getBounds() {
        // Approximate text bounds
        const width = this.text.length * this.fontSize * 0.6;
        const height = this.fontSize;
        return {
            left: 0,
            top: 0,
            right: width,
            bottom: height
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily
        };
    }
}

// Measurement Line class
class MeasurementLine extends Shape {
    constructor(x1, y1, x2, y2, options = {}) {
        super(x1, y1, options);
        this.x2 = x2 || x1;
        this.y2 = y2 || y1;
        this.unit = options.unit || 'px';
        this.strokeStyle = options.strokeStyle || '#FF0000';
        this.fillStyle = options.fillStyle || '#FF0000';
    }

    drawShape(ctx) {
        const dx = this.x2 - this.x;
        const dy = this.y2 - this.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Draw measurement line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dx, dy);
        ctx.stroke();

        // Draw arrows
        const arrowLength = 10;
        const arrowAngle = Math.PI / 6;

        // Start arrow
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(arrowLength * Math.cos(angle + Math.PI - arrowAngle),
            arrowLength * Math.sin(angle + Math.PI - arrowAngle));
        ctx.moveTo(0, 0);
        ctx.lineTo(arrowLength * Math.cos(angle + Math.PI + arrowAngle),
            arrowLength * Math.sin(angle + Math.PI + arrowAngle));
        ctx.stroke();

        // End arrow
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx + arrowLength * Math.cos(angle - arrowAngle),
            dy + arrowLength * Math.sin(angle - arrowAngle));
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx + arrowLength * Math.cos(angle + arrowAngle),
            dy + arrowLength * Math.sin(angle + arrowAngle));
        ctx.stroke();

        // Draw measurement text
        ctx.save();
        ctx.translate(dx / 2, dy / 2);
        ctx.rotate(angle);
        ctx.fillStyle = this.fillStyle;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${Math.round(length)}${this.unit}`, 0, -5);
        ctx.restore();
    }

    getBounds() {
        const minX = Math.min(0, this.x2 - this.x);
        const maxX = Math.max(0, this.x2 - this.x);
        const minY = Math.min(0, this.y2 - this.y);
        const maxY = Math.max(0, this.y2 - this.y);

        return { left: minX, top: minY, right: maxX, bottom: maxY };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            x2: this.x2,
            y2: this.y2,
            unit: this.unit
        };
    }
}

// Factory function to create shapes from JSON data
function createShapeFromJSON(data) {
    const shapeClasses = {
        Wall,
        Door,
        Window,
        Room,
        TextLabel,
        MeasurementLine
    };

    const ShapeClass = shapeClasses[data.type];
    if (!ShapeClass) {
        console.warn(`Unknown shape type: ${data.type}`);
        return null;
    }

    // Create shape with specific parameters based on type
    let shape;
    switch (data.type) {
        case 'Wall':
            shape = new Wall(data.x, data.y, data.x2, data.y2);
            if (data.thickness) shape.thickness = data.thickness;
            break;
        case 'Door':
            shape = new Door(data.x, data.y);
            if (data.width) shape.width = data.width;
            if (data.height) shape.height = data.height;
            if (data.openAngle) shape.openAngle = data.openAngle;
            break;
        case 'Window':
            shape = new Window(data.x, data.y);
            if (data.width) shape.width = data.width;
            if (data.height) shape.height = data.height;
            break;
        case 'Room':
            shape = new Room(data.x, data.y, data.width, data.height);
            if (data.name) shape.name = data.name;
            break;
        case 'TextLabel':
            shape = new TextLabel(data.x, data.y, data.text);
            if (data.fontSize) shape.fontSize = data.fontSize;
            if (data.fontFamily) shape.fontFamily = data.fontFamily;
            break;
        case 'MeasurementLine':
            shape = new MeasurementLine(data.x, data.y, data.x2, data.y2);
            if (data.unit) shape.unit = data.unit;
            break;
        default:
            shape = new Shape(data.x, data.y);
    }

    // Apply common properties
    if (data.id) shape.id = data.id;
    if (data.strokeStyle) shape.strokeStyle = data.strokeStyle;
    if (data.fillStyle) shape.fillStyle = data.fillStyle;
    if (data.lineWidth) shape.lineWidth = data.lineWidth;
    if (data.rotation) shape.rotation = data.rotation;
    if (data.scale) shape.scale = data.scale;
    if (data.layer !== undefined) shape.layer = data.layer;
    if (data.visible !== undefined) shape.visible = data.visible;

    return shape;
}