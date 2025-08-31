// LayerManager.js - Manages layers for blueprint elements
class Layer {
    constructor(id, name, options = {}) {
        this.id = id;
        this.name = name;
        this.visible = options.visible !== false;
        this.locked = options.locked || false;
        this.opacity = options.opacity || 1.0;
        this.color = options.color || '#000000';
        this.shapes = [];
        this.index = options.index || 0;
    }

    addShape(shape) {
        if (!this.shapes.includes(shape)) {
            this.shapes.push(shape);
            shape.layer = this.id;
        }
    }

    removeShape(shape) {
        const index = this.shapes.indexOf(shape);
        if (index > -1) {
            this.shapes.splice(index, 1);
            shape.layer = null;
        }
    }

    clear() {
        this.shapes.forEach(shape => {
            shape.layer = null;
        });
        this.shapes = [];
    }

    getShapeCount() {
        return this.shapes.length;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            visible: this.visible,
            locked: this.locked,
            opacity: this.opacity,
            color: this.color,
            index: this.index
        };
    }
}

class LayerManager {
    constructor() {
        this.layers = new Map();
        this.activeLayerId = null;
        this.layerOrder = [];
        this.nextLayerId = 1;

        // Create default layer
        this.createDefaultLayer();
    }

    createDefaultLayer() {
        const defaultLayer = new Layer('layer_0', 'Default Layer', { index: 0 });
        this.layers.set(defaultLayer.id, defaultLayer);
        this.layerOrder.push(defaultLayer.id);
        this.activeLayerId = defaultLayer.id;
    }

    createLayer(name, options = {}) {
        const id = `layer_${this.nextLayerId++}`;
        const index = options.index !== undefined ? options.index : this.layerOrder.length;

        const layer = new Layer(id, name, { ...options, index });
        this.layers.set(id, layer);

        // Insert layer at specified index
        if (index >= this.layerOrder.length) {
            this.layerOrder.push(id);
        } else {
            this.layerOrder.splice(index, 0, id);
        }

        // Update indices of other layers
        this.updateLayerIndices();

        return layer;
    }

    deleteLayer(layerId) {
        const layer = this.layers.get(layerId);
        if (!layer) return false;

        // Can't delete the last layer
        if (this.layers.size <= 1) {
            console.warn('Cannot delete the last remaining layer');
            return false;
        }

        // Move shapes to default layer or another layer
        const defaultLayer = this.getDefaultLayer();
        if (layer !== defaultLayer) {
            layer.shapes.forEach(shape => {
                defaultLayer.addShape(shape);
            });
        } else {
            // If deleting default layer, move shapes to first available layer
            const otherLayer = Array.from(this.layers.values()).find(l => l !== layer);
            if (otherLayer) {
                layer.shapes.forEach(shape => {
                    otherLayer.addShape(shape);
                });
            }
        }

        // Remove from order array
        const orderIndex = this.layerOrder.indexOf(layerId);
        if (orderIndex > -1) {
            this.layerOrder.splice(orderIndex, 1);
        }

        // Delete the layer
        this.layers.delete(layerId);

        // Update active layer if necessary
        if (this.activeLayerId === layerId) {
            this.activeLayerId = this.layerOrder[0] || null;
        }

        this.updateLayerIndices();
        return true;
    }

    getLayer(layerId) {
        return this.layers.get(layerId);
    }

    getActiveLayer() {
        return this.layers.get(this.activeLayerId);
    }

    setActiveLayer(layerId) {
        if (this.layers.has(layerId)) {
            this.activeLayerId = layerId;
            return true;
        }
        return false;
    }

    getDefaultLayer() {
        return this.layers.get('layer_0');
    }

    getAllLayers() {
        return this.layerOrder.map(id => this.layers.get(id)).filter(layer => layer);
    }

    getVisibleLayers() {
        return this.getAllLayers().filter(layer => layer.visible);
    }

    moveLayer(layerId, newIndex) {
        const currentIndex = this.layerOrder.indexOf(layerId);
        if (currentIndex === -1) return false;

        // Remove from current position
        this.layerOrder.splice(currentIndex, 1);

        // Insert at new position
        const insertIndex = Math.max(0, Math.min(newIndex, this.layerOrder.length));
        this.layerOrder.splice(insertIndex, 0, layerId);

        this.updateLayerIndices();
        return true;
    }

    moveLayerUp(layerId) {
        const currentIndex = this.layerOrder.indexOf(layerId);
        if (currentIndex <= 0) return false;

        return this.moveLayer(layerId, currentIndex - 1);
    }

    moveLayerDown(layerId) {
        const currentIndex = this.layerOrder.indexOf(layerId);
        if (currentIndex >= this.layerOrder.length - 1) return false;

        return this.moveLayer(layerId, currentIndex + 1);
    }

    updateLayerIndices() {
        this.layerOrder.forEach((layerId, index) => {
            const layer = this.layers.get(layerId);
            if (layer) {
                layer.index = index;
            }
        });
    }

    addShapeToLayer(shape, layerId = null) {
        const targetLayerId = layerId || this.activeLayerId;
        const layer = this.layers.get(targetLayerId);

        if (layer && !layer.locked) {
            // Remove from current layer if exists
            this.removeShapeFromAllLayers(shape);
            layer.addShape(shape);
            return true;
        }
        return false;
    }

    removeShapeFromAllLayers(shape) {
        this.layers.forEach(layer => {
            layer.removeShape(shape);
        });
    }

    moveShapeToLayer(shape, targetLayerId) {
        this.removeShapeFromAllLayers(shape);
        return this.addShapeToLayer(shape, targetLayerId);
    }

    getShapeLayer(shape) {
        for (let layer of this.layers.values()) {
            if (layer.shapes.includes(shape)) {
                return layer;
            }
        }
        return null;
    }

    toggleLayerVisibility(layerId) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.visible = !layer.visible;
            return layer.visible;
        }
        return null;
    }

    toggleLayerLock(layerId) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.locked = !layer.locked;
            return layer.locked;
        }
        return null;
    }

    setLayerOpacity(layerId, opacity) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.opacity = Math.max(0, Math.min(1, opacity));
            return true;
        }
        return false;
    }

    setLayerColor(layerId, color) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.color = color;
            return true;
        }
        return false;
    }

    renameLayer(layerId, newName) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.name = newName;
            return true;
        }
        return false;
    }

    duplicateLayer(layerId, newName = null) {
        const sourceLayer = this.layers.get(layerId);
        if (!sourceLayer) return null;

        const name = newName || `${sourceLayer.name} Copy`;
        const newLayer = this.createLayer(name, {
            visible: sourceLayer.visible,
            locked: false, // Unlock the duplicate
            opacity: sourceLayer.opacity,
            color: sourceLayer.color
        });

        // Duplicate shapes (this would need to be implemented in the main drawing class)
        // For now, we just create an empty layer

        return newLayer;
    }

    getLayerStats() {
        const stats = {
            totalLayers: this.layers.size,
            visibleLayers: 0,
            lockedLayers: 0,
            totalShapes: 0,
            shapesByLayer: {}
        };

        this.layers.forEach((layer, id) => {
            if (layer.visible) stats.visibleLayers++;
            if (layer.locked) stats.lockedLayers++;
            stats.totalShapes += layer.shapes.length;
            stats.shapesByLayer[id] = {
                name: layer.name,
                shapeCount: layer.shapes.length
            };
        });

        return stats;
    }

    exportLayers() {
        return {
            layers: Array.from(this.layers.values()).map(layer => layer.toJSON()),
            layerOrder: [...this.layerOrder],
            activeLayerId: this.activeLayerId,
            nextLayerId: this.nextLayerId
        };
    }

    importLayers(data) {
        // Clear existing layers
        this.layers.clear();
        this.layerOrder = [];

        // Import layers
        if (data.layers) {
            data.layers.forEach(layerData => {
                const layer = new Layer(
                    layerData.id,
                    layerData.name,
                    {
                        visible: layerData.visible,
                        locked: layerData.locked,
                        opacity: layerData.opacity,
                        color: layerData.color,
                        index: layerData.index
                    }
                );
                this.layers.set(layer.id, layer);
            });
        }

        // Import layer order
        if (data.layerOrder) {
            this.layerOrder = [...data.layerOrder];
        }

        // Set active layer
        if (data.activeLayerId && this.layers.has(data.activeLayerId)) {
            this.activeLayerId = data.activeLayerId;
        } else if (this.layerOrder.length > 0) {
            this.activeLayerId = this.layerOrder[0];
        }

        // Set next layer ID
        if (data.nextLayerId) {
            this.nextLayerId = data.nextLayerId;
        }

        // If no layers were imported, create default
        if (this.layers.size === 0) {
            this.createDefaultLayer();
        }
    }

    clear() {
        this.layers.forEach(layer => layer.clear());
        this.layers.clear();
        this.layerOrder = [];
        this.activeLayerId = null;
        this.nextLayerId = 1;
        this.createDefaultLayer();
    }

    // Get shapes from all visible layers in drawing order (bottom to top)
    getVisibleShapes() {
        const shapes = [];

        // Iterate through layers in reverse order (bottom to top)
        for (let i = this.layerOrder.length - 1; i >= 0; i--) {
            const layerId = this.layerOrder[i];
            const layer = this.layers.get(layerId);

            if (layer && layer.visible) {
                shapes.push(...layer.shapes);
            }
        }

        return shapes;
    }

    // Get all shapes from all layers
    getAllShapes() {
        const shapes = [];
        this.layers.forEach(layer => {
            shapes.push(...layer.shapes);
        });
        return shapes;
    }
}