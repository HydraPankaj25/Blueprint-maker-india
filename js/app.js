/**
 * Blueprint Maker India - Main Application Controller
 * Manages application state, component initialization, and routing
 */

// Global Application State
const AppState = {
    // Drawing state
    currentTool: 'select',
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentPath: [],
    drawings: [],

    // View state
    currentView: 'loading', // loading, getStarted, main
    scale: '1:100',
    zoom: 1,
    gridVisible: true,

    // Project data
    projectData: {
        id: null,
        name: 'New Blueprint',
        location: '',
        plotSize: 0,
        buildingType: 'residential',
        builtupArea: 0,
        carpetArea: 0,
        totalArea: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },

    // Room data
    rooms: [],

    // API configuration
    chatgptApiKey: '',

    // UI state
    sidebarCollapsed: false,
    notifications: [],

    // Component instances
    components: {}
};

// Event Bus for Component Communication
const EventBus = {
    events: {},

    emit(event, data) {
        console.log(`[EventBus] Emitting: ${event}`, data);
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[EventBus] Error in event handler for ${event}:`, error);
                }
            });
        }
    },

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        console.log(`[EventBus] Registered listener for: ${event}`);
    },

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    },

    once(event, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
    }
};

// Application Controller
class App {
    constructor() {
        this.initialized = false;
        this.components = {};
        this.bindEvents();
    }

    async init() {
        if (this.initialized) return;

        console.log('[App] Initializing application...');
        this.updateLoadingText('Loading configuration...');

        try {
            // Initialize configuration
            await this.loadConfiguration();

            this.updateLoadingText('Initializing components...');

            // Initialize all components
            await this.initializeComponents();

            this.updateLoadingText('Setting up event handlers...');

            // Set up global event handlers
            this.setupGlobalEventHandlers();

            this.updateLoadingText('Loading saved data...');

            // Load any saved project data
            this.loadSavedData();

            this.updateLoadingText('Ready!');

            // Show get started page after loading
            setTimeout(() => {
                this.showGetStartedPage();
            }, 1000);

            this.initialized = true;
            console.log('[App] Application initialized successfully');

        } catch (error) {
            console.error('[App] Initialization failed:', error);
            this.showNotification('Failed to initialize application', 'error');
        }
    }

    async loadConfiguration() {
        // Load configuration from config files
        if (window.AppConfig) {
            Object.assign(AppState, window.AppConfig);
        }

        if (window.APIConfig) {
            AppState.apiEndpoints = window.APIConfig;
        }
    }

    async initializeComponents() {
        const componentInitializers = [
            () => this.components.dataManager = new DataManager(),
            () => this.components.canvasDrawing = new CanvasDrawing('drawingCanvas'),
            () => this.components.toolbar = new Toolbar('toolbar'),
            () => this.components.sidebar = new Sidebar('sidebar'),
            () => this.components.scaleDisplay = new ScaleDisplay('scaleDisplay'),
            () => this.components.areaCalculator = new AreaCalculator(),
            () => this.components.chatGPTPanel = new ChatGPTPanel('chatgptPanel'),
            () => this.components.exportOptions = new ExportOptions()
        ];

        for (const initializer of componentInitializers) {
            try {
                await initializer();
                await this.delay(100); // Small delay between component initializations
            } catch (error) {
                console.error('[App] Component initialization failed:', error);
            }
        }

        // Store component references in global state
        AppState.components = this.components;

        console.log('[App] All components initialized');
    }

    setupGlobalEventHandlers() {
        // Window resize handler
        window.addEventListener('resize', this.handleWindowResize.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

        // Before unload handler
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

        // Global error handler
        window.addEventListener('error', this.handleGlobalError.bind(this));

        // App-level event handlers
        EventBus.on('project:changed', this.handleProjectChanged.bind(this));
        EventBus.on('component:error', this.handleComponentError.bind(this));

        console.log('[App] Global event handlers set up');
    }

    bindEvents() {
        // Bind global functions to window for HTML onclick handlers
        window.startNewProject = this.startNewProject.bind(this);
        window.loadExistingProject = this.loadExistingProject.bind(this);

        // Component interaction functions
        window.setTool = this.setTool.bind(this);
        window.addRoom = this.addRoom.bind(this);
        window.clearCanvas = this.clearCanvas.bind(this);
        window.toggleGrid = this.toggleGrid.bind(this);
        window.updateScale = this.updateScale.bind(this);
        window.getSuggestions = this.getSuggestions.bind(this);
        window.checkCompliance = this.checkCompliance.bind(this);
        window.sendChatMessage = this.sendChatMessage.bind(this);
        window.handleChatEnter = this.handleChatEnter.bind(this);
        window.downloadPDF = this.downloadPDF.bind(this);
        window.downloadImage = this.downloadImage.bind(this);
        window.shareWhatsApp = this.shareWhatsApp.bind(this);
        window.saveProject = this.saveProject.bind(this);

        // Utility functions
        window.showNotification = this.showNotification.bind(this);
    }

    // View Management
    showGetStartedPage() {
        console.log('[App] Showing get started page');
        this.hideLoadingScreen();
        document.getElementById('getStartedPage').classList.remove('hidden');
        AppState.currentView = 'getStarted';
        EventBus.emit('view:changed', 'getStarted');
    }

    showMainApp() {
        console.log('[App] Showing main application');
        document.getElementById('getStartedPage').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        AppState.currentView = 'main';

        // Initialize canvas after DOM is visible
        setTimeout(() => {
            if (this.components.canvasDrawing) {
                this.components.canvasDrawing.resize();
            }
        }, 100);

        EventBus.emit('view:changed', 'main');
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }

    updateLoadingText(text) {
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = text;
        }
    }

    // Project Management
    startNewProject() {
        console.log('[App] Starting new project');

        try {
            // Get values from get started form
            const projectName = document.getElementById('initialProjectName').value || 'New Blueprint';
            const location = document.getElementById('initialLocation').value || '';
            const plotSize = parseFloat(document.getElementById('initialPlotSize').value) || 0;
            const buildingType = document.getElementById('initialBuildingType').value || 'residential';
            const apiKey = document.getElementById('initialApiKey').value || '';

            // Update project data
            AppState.projectData = {
                id: this.generateProjectId(),
                name: projectName,
                location: location,
                plotSize: plotSize,
                buildingType: buildingType,
                builtupArea: 0,
                carpetArea: 0,
                totalArea: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Set API key if provided
            if (apiKey) {
                AppState.chatgptApiKey = apiKey;
                if (this.components.chatGPTPanel) {
                    this.components.chatGPTPanel.setApiKey(apiKey);
                }
            }

            // Show main app
            this.showMainApp();

            // Update components with new project data
            EventBus.emit('project:loaded', AppState.projectData);

            this.showNotification('New project created successfully!', 'success');

        } catch (error) {
            console.error('[App] Error starting new project:', error);
            this.showNotification('Error creating new project', 'error');
        }
    }

    loadExistingProject() {
        console.log('[App] Loading existing project');

        try {
            if (this.components.dataManager) {
                const success = this.components.dataManager.loadProject();
                if (success) {
                    this.showMainApp();
                    this.showNotification('Project loaded successfully!', 'success');
                } else {
                    this.showNotification('No saved project found', 'warning');
                }
            }
        } catch (error) {
            console.error('[App] Error loading project:', error);
            this.showNotification('Error loading project', 'error');
        }
    }

    generateProjectId() {
        return 'project_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Tool Management
    setTool(tool) {
        console.log(`[App] Setting tool: ${tool}`);
        AppState.currentTool = tool;

        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });

        EventBus.emit('tool:changed', tool);
    }

    // Canvas Operations
    clearCanvas() {
        console.log('[App] Clearing canvas');
        if (this.components.canvasDrawing) {
            this.components.canvasDrawing.clear();
            this.showNotification('Canvas cleared', 'info');
        }
    }

    toggleGrid() {
        console.log('[App] Toggling grid');
        AppState.gridVisible = !AppState.gridVisible;

        if (this.components.canvasDrawing) {
            this.components.canvasDrawing.toggleGrid(AppState.gridVisible);
        }

        // Update button appearance
        const gridBtn = document.querySelector('[onclick="toggleGrid()"]');
        if (gridBtn) {
            gridBtn.style.background = AppState.gridVisible ? 'var(--primary-color)' : 'var(--bg-primary)';
            gridBtn.style.color = AppState.gridVisible ? 'white' : 'var(--text-primary)';
        }

        EventBus.emit('grid:toggled', AppState.gridVisible);
    }

    updateScale() {
        const scaleSelect = document.getElementById('scaleRatio');
        if (scaleSelect) {
            AppState.scale = scaleSelect.value;
            console.log(`[App] Scale updated: ${AppState.scale}`);
            EventBus.emit('scale:changed', AppState.scale);
        }
    }

    // Room Management
    addRoom() {
        console.log('[App] Adding room');
        if (this.components.areaCalculator) {
            this.components.areaCalculator.addRoom();
        }
    }

    // Chat Functions
    getSuggestions() {
        console.log('[App] Getting AI suggestions');
        if (this.components.chatGPTPanel) {
            this.components.chatGPTPanel.getSuggestions();
        } else {
            this.showNotification('ChatGPT panel not available', 'warning');
        }
    }

    checkCompliance() {
        console.log('[App] Checking building compliance');
        if (this.components.chatGPTPanel) {
            this.components.chatGPTPanel.checkCompliance();
        } else {
            this.showNotification('ChatGPT panel not available', 'warning');
        }
    }

    sendChatMessage() {
        console.log('[App] Sending chat message');
        if (this.components.chatGPTPanel) {
            this.components.chatGPTPanel.sendMessage();
        }
    }

    handleChatEnter(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendChatMessage();
        }
    }

    // Export Functions
    downloadPDF() {
        console.log('[App] Downloading PDF');
        if (this.components.exportOptions) {
            this.components.exportOptions.downloadPDF();
        }
    }

    downloadImage() {
        console.log('[App] Downloading image');
        if (this.components.exportOptions) {
            this.components.exportOptions.downloadImage();
        }
    }

    shareWhatsApp() {
        console.log('[App] Sharing to WhatsApp');
        if (this.components.exportOptions) {
            this.components.exportOptions.shareWhatsApp();
        }
    }

    saveProject() {
        console.log('[App] Saving project');
        if (this.components.dataManager) {
            this.components.dataManager.saveProject();
        }
    }

    // Event Handlers
    handleWindowResize() {
        console.log('[App] Window resized');
        if (this.components.canvasDrawing && AppState.currentView === 'main') {
            this.components.canvasDrawing.resize();
        }
        EventBus.emit('window:resized');
    }

    handleKeyboardShortcuts(event) {
        // Only handle shortcuts in main app view
        if (AppState.currentView !== 'main') return;

        // Handle keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key.toLowerCase()) {
                case 's':
                    event.preventDefault();
                    this.saveProject();
                    break;
                case 'z':
                    event.preventDefault();
                    // Undo functionality (to be implemented)
                    console.log('[App] Undo shortcut triggered');
                    break;
                case 'y':
                    event.preventDefault();
                    // Redo functionality (to be implemented)
                    console.log('[App] Redo shortcut triggered');
                    break;
            }
        } else {
            // Tool shortcuts
            switch (event.key.toLowerCase()) {
                case 'v':
                    this.setTool('select');
                    break;
                case 'r':
                    this.setTool('rectangle');
                    break;
                case 'c':
                    this.setTool('circle');
                    break;
                case 'l':
                    this.setTool('line');
                    break;
                case 't':
                    this.setTool('text');
                    break;
                case 'g':
                    this.toggleGrid();
                    break;
                case 'escape':
                    this.setTool('select');
                    break;
            }
        }
    }

    handleBeforeUnload(event) {
        // Auto-save before leaving
        if (AppState.currentView === 'main' && AppState.drawings.length > 0) {
            if (this.components.dataManager) {
                this.components.dataManager.autoSave();
            }

            // Show confirmation dialog for unsaved changes
            event.preventDefault();
            event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return event.returnValue;
        }
    }

    handleGlobalError(event) {
        console.error('[App] Global error:', event.error);
        this.showNotification('An unexpected error occurred', 'error');

        // Report error to EventBus
        EventBus.emit('app:error', {
            message: event.error.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
    }

    handleProjectChanged(data) {
        console.log('[App] Project data changed:', data);
        AppState.projectData.updatedAt = new Date().toISOString();

        // Auto-save after changes
        if (this.components.dataManager && AppState.currentView === 'main') {
            setTimeout(() => {
                this.components.dataManager.autoSave();
            }, 2000);
        }
    }

    handleComponentError(error) {
        console.error('[App] Component error:', error);
        this.showNotification(`Component error: ${error.message}`, 'error');
    }

    // Data Management
    loadSavedData() {
        try {
            // Load user preferences
            const preferences = localStorage.getItem('blueprintmaker_preferences');
            if (preferences) {
                const parsed = JSON.parse(preferences);
                if (parsed.chatgptApiKey) {
                    AppState.chatgptApiKey = parsed.chatgptApiKey;
                }
                console.log('[App] User preferences loaded');
            }

            // Check for auto-saved data
            const autoSave = localStorage.getItem('blueprintmaker_autosave');
            if (autoSave) {
                console.log('[App] Auto-save data found');
                // Could prompt user to restore
            }

        } catch (error) {
            console.error('[App] Error loading saved data:', error);
        }
    }

    // Notification System
    showNotification(message, type = 'info', duration = 4000) {
        console.log(`[App] Notification [${type}]: ${message}`);

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        // Add icon based on type
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        notification.innerHTML = `
            <span class="notification-icon">${icons[type] || icons.info}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">✕</button>
        `;

        // Add to notifications container
        const container = document.getElementById('notifications');
        if (container) {
            container.appendChild(notification);

            // Show notification
            setTimeout(() => notification.classList.add('show'), 100);

            // Auto-hide notification
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.parentElement.removeChild(notification);
                    }
                }, 300);
            }, duration);
        }

        // Add to state for tracking
        AppState.notifications.push({
            id: Date.now(),
            message,
            type,
            timestamp: new Date().toISOString()
        });

        // Keep only last 50 notifications in memory
        if (AppState.notifications.length > 50) {
            AppState.notifications = AppState.notifications.slice(-50);
        }

        EventBus.emit('notification:shown', { message, type });
    }

    // Utility Methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Performance Monitoring
    startPerformanceMonitor() {
        if ('performance' in window) {
            console.log('[App] Performance monitoring started');

            // Monitor memory usage if available
            if (performance.memory) {
                setInterval(() => {
                    const memory = performance.memory;
                    console.log('[Performance] Memory:', {
                        used: this.formatBytes(memory.usedJSHeapSize),
                        total: this.formatBytes(memory.totalJSHeapSize),
                        limit: this.formatBytes(memory.jsHeapSizeLimit)
                    });
                }, 30000); // Every 30 seconds
            }
        }
    }

    // Debug Methods
    getDebugInfo() {
        return {
            version: '1.0.0',
            initialized: this.initialized,
            currentView: AppState.currentView,
            componentsLoaded: Object.keys(this.components).length,
            drawingsCount: AppState.drawings.length,
            roomsCount: AppState.rooms.length,
            notifications: AppState.notifications.length,
            memoryUsage: performance.memory ? {
                used: this.formatBytes(performance.memory.usedJSHeapSize),
                total: this.formatBytes(performance.memory.totalJSHeapSize)
            } : 'Not available'
        };
    }

    exportDebugData() {
        const debugData = {
            ...this.getDebugInfo(),
            state: AppState,
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `blueprintmaker_debug_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize Application
let app;

// DOM Ready Handler
document.addEventListener('DOMContentLoaded', function () {
    console.log('[App] DOM Content Loaded');

    // Create and initialize app
    app = new App();

    // Start initialization
    app.init().catch(error => {
        console.error('[App] Failed to initialize:', error);
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: Arial, sans-serif;">
                <h1 style="color: #ef4444;">Failed to Load</h1>
                <p>Blueprint Maker India could not initialize properly.</p>
                <p style="color: #64748b;">Please refresh the page or contact support.</p>
                <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 0.25rem; cursor: pointer;">
                    Reload Page
                </button>
            </div>
        `;
    });

    // Enable debug mode in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.DEBUG = true;
        window.app = app;
        window.AppState = AppState;
        window.EventBus = EventBus;
        console.log('[App] Debug mode enabled');
        console.log('Available debug tools: window.app, window.AppState, window.EventBus');
    }
});

// Performance monitoring
window.addEventListener('load', function () {
    console.log('[App] Window loaded');
    if (app) {
        app.startPerformanceMonitor();
    }
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { App, AppState, EventBus };
}