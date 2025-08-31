// Toolbar.js - Manages drawing tools and tool selection
class Toolbar {
    constructor(canvasDrawing) {
        this.canvasDrawing = canvasDrawing;
        this.currentTool = 'select';
        this.toolButtons = {};
        this.init();
    }

    init() {
        this.createToolbar();
        this.bindEvents();
    }

    createToolbar() {
        const toolbarContainer = document.getElementById('toolbar');
        if (!toolbarContainer) {
            console.error('Toolbar container not found');
            return;
        }

        const tools = [
            { id: 'select', name: 'Select', icon: '🖱️', tooltip: 'Select and move objects' },
            { id: 'wall', name: 'Wall', icon: '━', tooltip: 'Draw walls' },
            { id: 'door', name: 'Door', icon: '🚪', tooltip: 'Add doors' },
            { id: 'window', name: 'Window', icon: '⬜', tooltip: 'Add windows' },
            { id: 'room', name: 'Room', icon: '🏠', tooltip: 'Create rooms' },
            { id: 'text', name: 'Text', icon: 'T', tooltip: 'Add text labels' },
            { id: 'measure', name: 'Measure', icon: '📏', tooltip: 'Measure distances' },
            { id: 'pan', name: 'Pan', icon: '✋', tooltip: 'Pan the view' },
            { id: 'zoom', name: 'Zoom', icon: '🔍', tooltip: 'Zoom in/out' }
        ];

        // Create tool buttons
        const toolsSection = document.createElement('div');
        toolsSection.className = 'toolbar-section';
        toolsSection.innerHTML = '<h3>Tools</h3>';

        const toolGrid = document.createElement('div');
        toolGrid.className = 'tool-grid';

        tools.forEach(tool => {
            const button = document.createElement('button');
            button.id = `tool-${tool.id}`;
            button.className = 'tool-btn';
            button.innerHTML = `
                <span class="tool-icon">${tool.icon}</span>
                <span class="tool-name">${tool.name}</span>
            `;
            button.title = tool.tooltip;
            button.addEventListener('click', () => this.selectTool(tool.id));

            this.toolButtons[tool.id] = button;
            toolGrid.appendChild(button);
        });

        toolsSection.appendChild(toolGrid);
        toolbarContainer.appendChild(toolsSection);

        // Create action buttons
        this.createActionButtons(toolbarContainer);

        // Create properties panel
        this.createPropertiesPanel(toolbarContainer);

        // Set default tool
        this.selectTool('select');
    }

    createActionButtons(container) {
        const actionsSection = document.createElement('div');
        actionsSection.className = 'toolbar-section';
        actionsSection.innerHTML = '<h3>Actions</h3>';

        const actions = [
            { id: 'clear', name: 'Clear', icon: '🗑️', action: () => this.clearCanvas() },
            { id: 'undo', name: 'Undo', icon: '↶', action: () => this.undo() },
            { id: 'redo', name: 'Redo', icon: '↷', action: () => this.redo() },
            { id: 'save', name: 'Save', icon: '💾', action: () => this.save() },
            { id: 'load', name: 'Load', icon: '📂', action: () => this.load() },
            { id: 'export', name: 'Export', icon: '📤', action: () => this.export() }
        ];

        const actionGrid = document.createElement('div');
        actionGrid.className = 'action-grid';

        actions.forEach(action => {
            const button = document.createElement('button');
            button.className = 'action-btn';
            button.innerHTML = `
                <span class="action-icon">${action.icon}</span>
                <span class="action-name">${action.name}</span>
            `;
            button.addEventListener('click', action.action);
            actionGrid.appendChild(button);
        });

        actionsSection.appendChild(actionGrid);
        container.appendChild(actionsSection);
    }

    createPropertiesPanel(container) {
        const propertiesSection = document.createElement('div');
        propertiesSection.className = 'toolbar-section';
        propertiesSection.innerHTML = '<h3>Properties</h3>';

        const propertiesPanel = document.createElement('div');
        propertiesPanel.className = 'properties-panel';
        propertiesPanel.id = 'properties-panel';

        // Grid settings
        const gridSettings = document.createElement('div');
        gridSettings.className = 'property-group';
        gridSettings.innerHTML = `
            <label>
                <input type="checkbox" id="snap-to-grid" checked>
                Snap to Grid
            </label>
            <label>
                Grid Size: 
                <input type="range" id="grid-size" min="10" max="50" value="20">
                <span id="grid-size-value">20px</span>
            </label>
        `;

        propertiesPanel.appendChild(gridSettings);
        propertiesSection.appendChild(propertiesPanel);
        container.appendChild(propertiesSection);

        // Bind property events
        this.bindPropertyEvents();
    }

    bindEvents() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch (e.key) {
                    case 'z':
                        e.preventDefault();
                        this.undo();
                        break;
                    case 'y':
                        e.preventDefault();
                        this.redo();
                        break;
                    case 's':
                        e.preventDefault();
                        this.save();
                        break;
                }
            }

            // Tool shortcuts
            switch (e.key) {
                case 'v': this.selectTool('select'); break;
                case 'w': this.selectTool('wall'); break;
                case 'd': this.selectTool('door'); break;
                case 'n': this.selectTool('window'); break;
                case 'r': this.selectTool('room'); break;
                case 't': this.selectTool('text'); break;
                case 'm': this.selectTool('measure'); break;
                case 'h': this.selectTool('pan'); break;
                case 'z': if (!e.ctrlKey) this.selectTool('zoom'); break;
            }
        });
    }

    bindPropertyEvents() {
        const snapToGrid = document.getElementById('snap-to-grid');
        const gridSize = document.getElementById('grid-size');
        const gridSizeValue = document.getElementById('grid-size-value');

        if (snapToGrid) {
            snapToGrid.addEventListener('change', (e) => {
                this.canvasDrawing.setSnapToGrid(e.target.checked);
            });
        }

        if (gridSize && gridSizeValue) {
            gridSize.addEventListener('input', (e) => {
                const value = e.target.value;
                gridSizeValue.textContent = `${value}px`;
                this.canvasDrawing.setGridSize(parseInt(value));
            });
        }
    }

    selectTool(toolId) {
        // Remove active class from all tools
        Object.values(this.toolButtons).forEach(button => {
            button.classList.remove('active');
        });

        // Add active class to selected tool
        if (this.toolButtons[toolId]) {
            this.toolButtons[toolId].classList.add('active');
        }

        this.currentTool = toolId;
        this.canvasDrawing.setCurrentTool(toolId);

        // Update cursor
        this.updateCursor(toolId);
    }

    updateCursor(toolId) {
        const canvas = this.canvasDrawing.canvas;
        const cursors = {
            select: 'default',
            wall: 'crosshair',
            door: 'pointer',
            window: 'pointer',
            room: 'crosshair',
            text: 'text',
            measure: 'crosshair',
            pan: 'grab',
            zoom: 'zoom-in'
        };

        canvas.style.cursor = cursors[toolId] || 'default';
    }

    clearCanvas() {
        if (confirm('Are you sure you want to clear the entire blueprint?')) {
            this.canvasDrawing.clear();
        }
    }

    undo() {
        this.canvasDrawing.undo();
    }

    redo() {
        this.canvasDrawing.redo();
    }

    save() {
        const data = this.canvasDrawing.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'blueprint.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    }

    load() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        this.canvasDrawing.importData(data);
                    } catch (error) {
                        alert('Error loading file: Invalid JSON format');
                    }
                };
                reader.readAsText(file);
            }
        });

        input.click();
    }

    export() {
        // Create export modal
        this.showExportModal();
    }

    showExportModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Export Blueprint</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="export-options">
                        <button class="export-btn" data-format="png">Export as PNG</button>
                        <button class="export-btn" data-format="pdf">Export as PDF</button>
                        <button class="export-btn" data-format="svg">Export as SVG</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Bind modal events
        modal.querySelector('.close-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        modal.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.dataset.format;
                this.exportAs(format);
                document.body.removeChild(modal);
            });
        });
    }

    exportAs(format) {
        switch (format) {
            case 'png':
                this.exportAsPNG();
                break;
            case 'pdf':
                this.exportAsPDF();
                break;
            case 'svg':
                this.exportAsSVG();
                break;
        }
    }

    exportAsPNG() {
        const canvas = this.canvasDrawing.canvas;
        const link = document.createElement('a');
        link.download = 'blueprint.png';
        link.href = canvas.toDataURL();
        link.click();
    }

    exportAsPDF() {
        // This would require a PDF library like jsPDF
        alert('PDF export requires additional library. Exporting as PNG instead.');
        this.exportAsPNG();
    }

    exportAsSVG() {
        // Convert canvas to SVG - simplified version
        alert('SVG export not implemented yet. Exporting as PNG instead.');
        this.exportAsPNG();
    }

    getCurrentTool() {
        return this.currentTool;
    }
}