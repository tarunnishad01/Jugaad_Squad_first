const canvas = document.getElementById('circuitCanvas');
const ctx = canvas.getContext('2d');
const runSimulationBtn = document.getElementById('runSimulationBtn');
const resetCircuitBtn = document.getElementById('resetCircuitBtn');
const loadInvertingSampleBtn = document.getElementById('loadInvertingSampleBtn');
const loadNonInvertingSampleBtn = document.getElementById('loadNonInvertingSampleBtn');
const simulationResultsDiv = document.getElementById('simulationResults');
const simulationOutputDiv = document.getElementById('simulationOutput');
const componentPropertiesPanel = document.getElementById('componentProperties');
const propertiesContentDiv = document.getElementById('propertiesContent');
const closePropertiesBtn = document.getElementById('closePropertiesBtn');

let components = [];
let wires = [];
let selectedComponent = null;
let isDraggingComponent = false;
let dragOffsetX, dragOffsetY;
let currentWireStartNode = null;
let drawingWire = false;

// Grid snap settings
const GRID_SIZE = 20;

// --- Voice Announcement Function ---
function speakMessage(message) {
    // Check if the SpeechSynthesis API is available
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(message);
        // Optional: Set voice properties (e.g., language, pitch, rate)
        // You might want to choose a specific voice if available
        // let voices = speechSynthesis.getVoices();
        // utterance.voice = voices.find(voice => voice.name === 'Google US English'); // Example voice
        utterance.pitch = 1; // Default pitch
        utterance.rate = 1; // Default rate

        speechSynthesis.speak(utterance);
    } else {
        console.warn("SpeechSynthesis API not supported in this browser.");
    }
}


// --- Utility Functions ---
function getMousePos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function snapToGrid(coord) {
    return Math.round(coord / GRID_SIZE) * GRID_SIZE;
}

/**
 * Finds a node connected to the given startNode via a wire,
 * where the connected node belongs to a component of `targetComponentType`
 * and optionally matches `targetNodePartId` (e.g., '-inv', '-nin', '-out').
 *
 * @param {object} startNode The node to start searching from.
 * @param {string} targetComponentType The type of component the target node should belong to.
 * @param {string|null} targetNodePartId Optional. A part of the target node's ID (e.g., '-inv' for inverting input).
 * @returns {object|null} The connected node that matches the criteria, or null if not found.
 */
function findConnectedNode(startNode, targetComponentType, targetNodePartId = null) {
    for (const wire of wires) {
        let potentialConnectedNode = null;
        if (wire.start === startNode) {
            potentialConnectedNode = wire.end;
        } else if (wire.end === startNode) {
            potentialConnectedNode = wire.start;
        }

        if (potentialConnectedNode && potentialConnectedNode !== startNode) {
            const connectedComponent = components.find(comp => comp.nodes.includes(potentialConnectedNode));
            if (connectedComponent && connectedComponent.type === targetComponentType) {
                if (targetNodePartId === null || potentialConnectedNode.id.includes(targetNodePartId)) {
                    return potentialConnectedNode;
                }
            }
        }
    }
    return null;
}

/**
 * Finds a specific resistor connected between two nodes.
 * @param {object} node1 First node of the connection.
 * @param {object} node2 Second node of the connection.
 * @param {Array} resistors A list of resistor components to search through.
 * @param {string[]} excludeResistorIds Optional array of resistor IDs to exclude (to find unique resistors).
 * @returns {object|null} The resistor component if found, otherwise null.
 */
function findResistorBetweenNodes(node1, node2, resistors, excludeResistorIds = []) {
    for (const res of resistors) {
        if (excludeResistorIds.includes(res.id)) {
            continue; // Skip excluded resistors
        }

        const resNodes = res.nodes;
        // Check if resistor nodes are connected to node1 and node2
        const isResNode1ConnectedToNode1 = wires.some(w => (w.start === resNodes[0] && w.end === node1) || (w.start === node1 && w.end === resNodes[0]));
        const isResNode1ConnectedToNode2 = wires.some(w => (w.start === resNodes[0] && w.end === node2) || (w.start === node2 && w.end === resNodes[0]));

        const isResNode2ConnectedToNode1 = wires.some(w => (w.start === resNodes[1] && w.end === node1) || (w.start === node1 && w.end === resNodes[1]));
        const isResNode2ConnectedToNode2 = wires.some(w => (w.start === resNodes[1] && w.end === node2) || (w.start === node2 && w.end === resNodes[1]));

        // Case 1: resNode[0] connects to node1 AND resNode[1] connects to node2
        if (isResNode1ConnectedToNode1 && isResNode2ConnectedToNode2) {
            return res;
        }
        // Case 2: resNode[0] connects to node2 AND resNode[1] connects to node1 (order reversed)
        if (isResNode1ConnectedToNode2 && isResNode2ConnectedToNode1) {
            return res;
        }
    }
    return null;
}


// --- Component Classes ---
class Component {
    constructor(type, x, y, value = 1000) {
        this.id = 'comp-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 40;
        this.value = value; // Value is only relevant for R, C, V sources
        this.rotation = 0; // 0, 90, 180, 270 degrees
        this.selected = false;
        this.nodes = []; // Connection points for wires
        this.generateNodes(); // Initialize nodes based on type
    }

    generateNodes() {
        // Nodes are relative to the component's center (x, y)
        this.nodes = [];
        switch (this.type) {
            case 'Resistor':
            case 'Capacitor':
            case 'VoltageSource':
                this.nodes.push({ id: this.id + '-n1', x: this.x - this.width / 2, y: this.y, connectedWires: [] });
                this.nodes.push({ id: this.id + '-n2', x: this.x + this.width / 2, y: this.y, connectedWires: [] });
                break;
            case 'OpAmp': // Ideal Op-Amp has 5 pins: Inverting (-), Non-inverting (+), Output, Vcc+, Vcc-
                this.width = 80;
                this.height = 80;
                this.nodes.push({ id: this.id + '-nin', x: this.x - this.width / 2, y: this.y - this.height / 4, connectedWires: [] }); // Non-inverting (+)
                this.nodes.push({ id: this.id + '-inv', x: this.x - this.width / 2, y: this.y + this.height / 4, connectedWires: [] }); // Inverting (-)
                this.nodes.push({ id: this.id + '-out', x: this.x + this.width / 2, y: this.y, connectedWires: [] }); // Output
                this.nodes.push({ id: this.id + '-vcc+', x: this.x, y: this.y - this.height / 2, connectedWires: [] }); // VCC+ (top)
                this.nodes.push({ id: this.id + '-vcc-', x: this.x, y: this.y + this.height / 2, connectedWires: [] }); // VCC- (bottom)
                break;
            case 'Ground':
                this.width = 40;
                this.height = 40;
                this.nodes.push({ id: this.id + '-gnd', x: this.x, y: this.y - this.height / 2, connectedWires: [] }); // Top connection point
                break;
            case 'Transistor': // NPN BJT for simplicity
                this.width = 60;
                this.height = 70; // Taller to accommodate three pins
                // Nodes: Collector (top), Base (left), Emitter (bottom)
                this.nodes.push({ id: this.id + '-collector', x: this.x, y: this.y - this.height / 2, connectedWires: [] });
                this.nodes.push({ id: this.id + '-base', x: this.x - this.width / 2, y: this.y, connectedWires: [] });
                this.nodes.push({ id: this.id + '-emitter', x: this.x, y: this.y + this.height / 2, connectedWires: [] });
                break;
        }
    }

    // Updates node positions after component moves
    updateNodePositions() {
        this.generateNodes(); // Re-generate nodes based on new x, y
    }

    draw(context) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.rotation * Math.PI / 180);

        context.font = '12px Inter';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.strokeStyle = '#000';
        context.lineWidth = 2;

        switch (this.type) {
            case 'Resistor':
                context.beginPath();
                context.moveTo(-this.width / 2, 0);
                context.lineTo(-this.width / 4, 0);
                // Zig-zag
                for (let i = 0; i < 3; i++) {
                    context.lineTo(-this.width / 4 + (this.width / 6) * i, -this.height / 4);
                    context.lineTo(-this.width / 4 + (this.width / 6) * i + (this.width / 12), this.height / 4);
                }
                context.lineTo(this.width / 4, 0);
                context.lineTo(this.width / 2, 0);
                context.stroke();
                context.fillStyle = '#000';
                context.fillText(`${this.value}Ω`, 0, this.height / 2 + 5);
                break;
            case 'Capacitor':
                context.beginPath();
                context.moveTo(-this.width / 2, 0);
                context.lineTo(-10, 0);
                context.moveTo(-10, -this.height / 2 + 5);
                context.lineTo(-10, this.height / 2 - 5);
                context.moveTo(10, -this.height / 2 + 5);
                context.lineTo(10, this.height / 2 - 5);
                context.lineTo(this.width / 2, 0); // No actual connection to right line
                context.stroke();
                context.fillStyle = '#000';
                context.fillText(`${this.value}F`, 0, this.height / 2 + 5);
                break;
            case 'VoltageSource':
                context.beginPath();
                context.moveTo(-this.width / 2, 0);
                context.lineTo(-this.width / 4, 0);
                context.arc(0, 0, this.width / 4, 0, Math.PI * 2); // Circle for voltage source
                context.moveTo(this.width / 4, 0);
                context.lineTo(this.width / 2, 0);
                // Plus and Minus signs
                context.stroke();
                context.fillStyle = '#000';
                context.lineWidth = 1;
                context.fillText('+', -this.width / 8, -this.height / 8);
                context.fillText('-', this.width / 8, -this.height / 8);
                context.fillText(`${this.value}V`, 0, this.height / 2 + 5);
                break;
            case 'OpAmp':
                // Draw triangle
                context.beginPath();
                context.moveTo(-this.width / 2, -this.height / 2);
                context.lineTo(this.width / 2, 0);
                context.lineTo(-this.width / 2, this.height / 2);
                context.closePath();
                context.stroke();

                // Input lines
                context.beginPath();
                context.moveTo(-this.width / 2 - 20, this.height / 4); // Inverting (-)
                context.lineTo(-this.width / 2, this.height / 4);
                context.moveTo(-this.width / 2 - 20, -this.height / 4); // Non-inverting (+)
                context.lineTo(-this.width / 2, -this.height / 4);
                context.stroke();

                // Output line
                context.beginPath();
                context.moveTo(this.width / 2, 0);
                context.lineTo(this.width / 2 + 20, 0);
                context.stroke();

                // Power lines (Vcc+ and Vcc-)
                context.beginPath();
                context.moveTo(0, -this.height / 2 - 20); // Vcc+
                context.lineTo(0, -this.height / 2);
                context.moveTo(0, this.height / 2 + 20); // Vcc-
                context.lineTo(0, this.height / 2);
                context.stroke();

                // Labels for pins
                context.fillStyle = '#000';
                context.font = '16px Inter';
                context.fillText('+', -this.width / 2 + 10, -this.height / 4 - 5);
                context.fillText('-', -this.width / 2 + 10, this.height / 4 + 5);
                context.font = '10px Inter';
                context.fillText('V+', 0, -this.height / 2 + 10);
                context.fillText('V-', 0, this.height / 2 - 10);
                break;
            case 'Ground':
                context.beginPath();
                // Main vertical line (connection point)
                context.moveTo(0, -this.height / 2);
                context.lineTo(0, this.height / 2);

                // Horizontal lines (ground symbol)
                context.moveTo(-this.width / 2, this.height / 2);
                context.lineTo(this.width / 2, this.height / 2);

                context.moveTo(-this.width / 3, this.height / 2 + 5);
                context.lineTo(this.width / 3, this.height / 2 + 5);

                context.moveTo(-this.width / 4, this.height / 2 + 10);
                context.lineTo(this.width / 4, this.height / 2 + 10);
                context.stroke();
                break;
            case 'Transistor': // NPN BJT Symbol
                context.beginPath();
                // Body circle
                context.arc(0, 0, this.width / 2, 0, Math.PI * 2);

                // Base line
                context.moveTo(-this.width / 2 - 10, 0); // Extended line from base
                context.lineTo(-this.width / 2, 0);
                context.stroke();

                // Collector line
                context.beginPath();
                context.moveTo(0, -this.height / 2);
                context.lineTo(0, -10); // End of line inside circle
                context.stroke();

                // Emitter line with arrow
                context.beginPath();
                context.moveTo(0, this.height / 2);
                context.lineTo(0, 10); // End of line inside circle
                context.stroke();

                // Arrow on Emitter for NPN (points outwards)
                context.beginPath();
                // Calculate arrow head coordinates for emitter (pointing away from base)
                const arrowLength = 10;
                const arrowAngle = Math.PI / 6; // 30 degrees
                const emitterX = 0;
                const emitterY = 10; // Point where line meets circle
                const lineAngle = Math.PI / 2; // Vertical line (90 degrees)

                context.moveTo(emitterX, emitterY);
                context.lineTo(
                    emitterX + arrowLength * Math.cos(lineAngle - arrowAngle),
                    emitterY + arrowLength * Math.sin(lineAngle - arrowAngle)
                );
                context.moveTo(emitterX, emitterY);
                context.lineTo(
                    emitterX + arrowLength * Math.cos(lineAngle + arrowAngle),
                    emitterY + arrowLength * Math.sin(lineAngle + arrowAngle)
                );
                context.stroke();

                // Labels for pins (optional but helpful for transistors)
                context.fillStyle = '#000';
                context.font = '10px Inter';
                context.textAlign = 'right';
                context.fillText('B', -this.width / 2 - 5, 0); // Base
                context.textAlign = 'center';
                context.fillText('C', 0, -this.height / 2 - 5); // Collector
                context.fillText('E', 0, this.height / 2 + 10); // Emitter
                break;
        }

        context.restore(); // Restore context to original state

        // Draw nodes as small circles (always visible)
        this.nodes.forEach(node => {
            context.beginPath();
            context.arc(node.x, node.y, 4, 0, Math.PI * 2);
            context.fillStyle = node.connectedWires.length > 0 ? '#3b82f6' : '#9ca3af'; // Blue if connected, gray if not
            if (node === currentWireStartNode) {
                context.fillStyle = '#ef4444'; // Red if active for wiring
            }
            context.fill();
            context.strokeStyle = '#374151'; // Dark gray border
            context.lineWidth = 1;
            context.stroke();
        });

        if (this.selected) {
            context.strokeStyle = '#4f46e5'; /* Indigo-600 */
            context.lineWidth = 2;
            context.setLineDash([5, 5]); // Dashed line for selection
            context.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            context.setLineDash([]); // Reset line dash
        }
    }

    isClicked(mouseX, mouseY) {
        // Check if click is within component's bounding box
        return mouseX >= this.x - this.width / 2 &&
               mouseX <= this.x + this.width / 2 &&
               mouseY >= this.y - this.height / 2 &&
               mouseY <= this.y + this.height / 2;
    }

    getClosestNode(mouseX, mouseY, maxDistance = 10) {
        for (const node of this.nodes) {
            const dist = Math.sqrt(Math.pow(mouseX - node.x, 2) + Math.pow(mouseY - node.y, 2));
            if (dist < maxDistance) {
                return node;
            }
        }
        return null;
    }
}

class Wire {
    constructor(startNode, endNode) {
        this.id = 'wire-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        this.start = startNode;
        this.end = endNode;
        // Add this wire to the connectedWires array of its nodes
        if (this.start) this.start.connectedWires.push(this);
        if (this.end) this.end.connectedWires.push(this);
    }

    draw(context) {
        if (!this.start || !this.end) return; // Don't draw incomplete wires

        context.strokeStyle = '#3b82f6'; /* Blue-500 */
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(this.start.x, this.start.y);
        context.lineTo(this.end.x, this.end.y);
        context.stroke();
    }

    // Remove this wire from its connected nodes' wire lists
    disconnect() {
        if (this.start) {
            this.start.connectedWires = this.start.connectedWires.filter(w => w !== this);
        }
        if (this.end) {
            this.end.connectedWires = this.end.connectedWires.filter(w => w !== this);
        }
    }
}


// --- Canvas Drawing Function ---
function drawCircuit() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

    // Draw grid
    ctx.strokeStyle = '#e2e8f0'; // Gray-200
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    // Draw all components
    components.forEach(comp => comp.draw(ctx));

    // Draw all wires
    wires.forEach(wire => wire.draw(ctx));

    // If a wire is currently being drawn
    if (drawingWire && currentWireStartNode) {
        ctx.strokeStyle = '#ef4444'; /* Red-500 */
        ctx.lineWidth = 3;
        ctx.beginPath();
        const mousePos = getMousePos(event);
        ctx.moveTo(currentWireStartNode.x, currentWireStartNode.y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
    }
}

// --- Event Listeners ---

// Handle drag over canvas (allow drop)
canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});

// Handle drop on canvas (create new component)
canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const componentType = e.dataTransfer.getData('text/plain');
    const mousePos = getMousePos(e);
    const snappedX = snapToGrid(mousePos.x);
    const snappedY = snapToGrid(mousePos.y);

    const newComponent = new Component(componentType, snappedX, snappedY);
    components.push(newComponent);
    drawCircuit();
});

// Handle drag start from component icons
document.querySelectorAll('.component-icon').forEach(icon => {
    icon.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', e.target.dataset.componentType);
    });
});

// Handle mouse down on canvas (for selecting, dragging, or starting wire)
canvas.addEventListener('mousedown', (e) => {
    const mousePos = getMousePos(e);

    // Check if clicking on an existing wire node
    for (const comp of components) {
        const node = comp.getClosestNode(mousePos.x, mousePos.y);
        if (node) {
            currentWireStartNode = node;
            drawingWire = true;
            // Mark the node as active for visual feedback
            drawCircuit(); // Redraw to show active node
            return; // Don't proceed to component drag/select
        }
    }

    // Check if clicking on an existing component
    selectedComponent = null;
    let componentClicked = false;
    for (let i = components.length - 1; i >= 0; i--) { // Iterate backwards to select top-most
        const comp = components[i];
        if (comp.isClicked(mousePos.x, mousePos.y)) {
            selectedComponent = comp;
            isDraggingComponent = true;
            dragOffsetX = mousePos.x - comp.x;
            dragOffsetY = mousePos.y - comp.y;
            componentClicked = true;
            // Deselect all others
            components.forEach(c => c.selected = false);
            selectedComponent.selected = true;
            // Only show properties for components that have adjustable values
            if (selectedComponent.type !== 'Ground' && selectedComponent.type !== 'OpAmp' && selectedComponent.type !== 'Transistor') {
                showComponentProperties(selectedComponent); // Show properties on click
            } else {
                hideComponentProperties(); // Hide properties for ground, OpAmp, and Transistor
            }
            break;
        }
    }

    if (!componentClicked) {
        // If clicked outside any component, deselect all and hide properties
        components.forEach(c => c.selected = false);
        selectedComponent = null;
        hideComponentProperties();
    }
    drawCircuit();
});

// Handle mouse move on canvas (for dragging component or drawing wire)
canvas.addEventListener('mousemove', (e) => {
    const mousePos = getMousePos(e);

    if (isDraggingComponent && selectedComponent) {
        selectedComponent.x = snapToGrid(mousePos.x - dragOffsetX);
        selectedComponent.y = snapToGrid(mousePos.y - dragOffsetY);
        selectedComponent.updateNodePositions(); // Update node positions when component moves
        drawCircuit();
    } else if (drawingWire && currentWireStartNode) {
        drawCircuit(); // Redraw to show the rubber-banding wire
    }
});

// Handle mouse up on canvas (stop dragging or finalize wire)
canvas.addEventListener('mouseup', (e) => {
    const mousePos = getMousePos(e);

    if (isDraggingComponent) {
        isDraggingComponent = false;
        // No need to snap here again, already snapped during mousemove
    } else if (drawingWire && currentWireStartNode) {
        let wireEnded = false;
        // Check if wire ends on another component's node
        for (const comp of components) {
            const endNode = comp.getClosestNode(mousePos.x, mousePos.y);
            if (endNode && endNode !== currentWireStartNode) { // Cannot connect to self
                // Prevent duplicate wires between the exact same two nodes
                const existingWire = wires.find(w =>
                    (w.start === currentWireStartNode && w.end === endNode) ||
                    (w.start === endNode && w.end === currentWireStartNode)
                );
                if (!existingWire) {
                    wires.push(new Wire(currentWireStartNode, endNode));
                }
                wireEnded = true;
                break;
            }
        }
        // If wire didn't connect to a node, discard it
        currentWireStartNode = null;
        drawingWire = false;
    }
    drawCircuit();
});

// Handle context menu (right-click) for rotation or deletion
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Prevent default browser context menu
    const mousePos = getMousePos(e);

    // Check if right-clicking on a component
    for (let i = components.length - 1; i >= 0; i--) {
        const comp = components[i];
        if (comp.isClicked(mousePos.x, mousePos.y)) {
            // Simple context menu for rotation and deletion
            const menu = document.createElement('div');
            menu.className = 'absolute bg-white border border-gray-300 rounded-md shadow-lg p-2 z-50';
            menu.style.left = `${e.clientX}px`;
            menu.style.top = `${e.clientY}px`;

            // Only allow rotation for components that actually benefit from it (not Ground, OpAmp, Transistor)
            if (comp.type !== 'Ground' && comp.type !== 'OpAmp' && comp.type !== 'Transistor') {
                const rotateBtn = document.createElement('button');
                rotateBtn.className = 'block w-full text-left py-1 px-2 hover:bg-gray-100 rounded-sm';
                rotateBtn.textContent = 'Rotate 90°';
                rotateBtn.onclick = () => {
                    comp.rotation = (comp.rotation + 90) % 360;
                    comp.updateNodePositions(); // Update node positions after rotation
                    document.body.removeChild(menu);
                    drawCircuit();
                };
                menu.appendChild(rotateBtn);
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'block w-full text-left py-1 px-2 text-red-600 hover:bg-red-50 rounded-sm';
            deleteBtn.textContent = 'Delete Component';
            deleteBtn.onclick = () => {
                // Remove component and all associated wires
                // Filter wires where either start or end node belongs to the component being deleted
                wires = wires.filter(wire => {
                    const isStartNodeOfComp = comp.nodes.some(node => node === wire.start);
                    const isEndNodeOfComp = comp.nodes.some(node => node === wire.end);
                    // Disconnect from nodes before filtering the wire
                    if (isStartNodeOfComp) wire.start.connectedWires = wire.start.connectedWires.filter(w => w !== wire);
                    if (isEndNodeOfComp) wire.end.connectedWires = wire.end.connectedWires.filter(w => w !== wire);
                    return !(isStartNodeOfComp || isEndNodeOfComp);
                });

                components = components.filter(c => c.id !== comp.id);
                hideComponentProperties(); // Hide if deleted
                document.body.removeChild(menu);
                drawCircuit();
            };
            menu.appendChild(deleteBtn);

            document.body.appendChild(menu);

            // Close menu if clicked outside
            const closeMenu = (e2) => {
                if (!menu.contains(e2.target)) {
                    document.body.removeChild(menu);
                    document.removeEventListener('click', closeMenu);
                }
            };
            setTimeout(() => document.addEventListener('click', closeMenu), 0); // Delay to prevent immediate close
            return;
        }
    }
});


// --- Component Property Panel ---
function showComponentProperties(comp) {
    selectedComponent = comp;
    propertiesContentDiv.innerHTML = ''; // Clear previous content

    const typeLabel = document.createElement('p');
    typeLabel.className = 'text-sm font-semibold mb-2 text-gray-700';
    typeLabel.textContent = `Type: ${comp.type}`;
    propertiesContentDiv.appendChild(typeLabel);

    if (comp.type === 'Resistor' || comp.type === 'Capacitor' || comp.type === 'VoltageSource') {
        const valueLabel = document.createElement('label');
        valueLabel.className = 'block text-sm font-medium text-gray-700 mb-1';
        valueLabel.textContent = `Value: ${comp.value}${comp.type === 'Resistor' ? 'Ω' : comp.type === 'Capacitor' ? 'F' : 'V'}`;
        propertiesContentDiv.appendChild(valueLabel);

        const valueInput = document.createElement('input');
        valueInput.type = 'range';
        valueInput.min = '1';
        valueInput.max = '100000'; // Max value for R, C, V
        valueInput.step = '1';
        valueInput.value = comp.value;
        valueInput.className = 'w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-xl';
        valueInput.oninput = (e) => {
            comp.value = parseInt(e.target.value);
            valueLabel.textContent = `Value: ${comp.value}${comp.type === 'Resistor' ? 'Ω' : comp.type === 'Capacitor' ? 'F' : 'V'}`;
            drawCircuit();
        };
        propertiesContentDiv.appendChild(valueInput);
    }
    // No properties for OpAmp, Ground, or Transistor (yet)

    componentPropertiesPanel.classList.remove('hidden');
}

function hideComponentProperties() {
    componentPropertiesPanel.classList.add('hidden');
    selectedComponent = null; // Clear selected component
}

closePropertiesBtn.addEventListener('click', hideComponentProperties);


// --- Sample Circuit Loading Functions ---
function loadInvertingOpAmpSample() {
    // Clear current circuit
    components = [];
    wires = [];
    hideComponentProperties();
    simulationResultsDiv.textContent = 'Build a circuit and click "Run Simulation".';
    simulationOutputDiv.innerHTML = '';

    // Define component positions relative to canvas center
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Create components
    const opAmp = new Component('OpAmp', centerX + 100, centerY);
    const vinSource = new Component('VoltageSource', centerX - 200, centerY + 100, 5); // 5V input
    const resistorInput = new Component('Resistor', centerX - 100, centerY + 100, 1000); // 1kΩ
    const resistorFeedback = new Component('Resistor', centerX + 100, centerY - 50, 10000); // 10kΩ
    const ground = new Component('Ground', centerX + 100, centerY - 150);
    const groundVin = new Component('Ground', centerX - 200, centerY + 200); // Ground for Vin source

    components.push(opAmp, vinSource, resistorInput, resistorFeedback, ground, groundVin);

    // Get specific nodes
    const opAmpInv = opAmp.nodes.find(n => n.id.includes('-inv'));
    const opAmpNonInv = opAmp.nodes.find(n => n.id.includes('-nin'));
    const opAmpOut = opAmp.nodes.find(n => n.id.includes('-out'));

    const vinPos = vinSource.nodes.find(n => n.id.includes('-n2')); // Positive terminal of V-source
    const vinNeg = vinSource.nodes.find(n => n.id.includes('-n1')); // Negative terminal of V-source

    const resInput1 = resistorInput.nodes.find(n => n.id.includes('-n1'));
    const resInput2 = resistorInput.nodes.find(n => n.id.includes('-n2'));

    const resFeedback1 = resistorFeedback.nodes.find(n => n.id.includes('-n1'));
    const resFeedback2 = resistorFeedback.nodes.find(n => n.id.includes('-n2'));

    const groundNode = ground.nodes.find(n => n.id.includes('-gnd'));
    const groundVinNode = groundVin.nodes.find(n => n.id.includes('-gnd'));

    // Create wires
    wires.push(new Wire(vinPos, resInput1)); // Vin to Ri
    wires.push(new Wire(resInput2, opAmpInv)); // Ri to Op-Amp Inverting input
    wires.push(new Wire(opAmpOut, resFeedback1)); // Op-Amp Output to Rf
    wires.push(new Wire(resFeedback2, opAmpInv)); // Rf to Op-Amp Inverting input (feedback)
    wires.push(new Wire(opAmpNonInv, groundNode)); // Op-Amp Non-Inverting input to Ground
    wires.push(new Wire(vinNeg, groundVinNode)); // Vin negative to Ground

    drawCircuit();
    simulationResultsDiv.textContent = 'Inverting Op-Amp sample circuit loaded!';
    simulationOutputDiv.innerHTML = '';
    speakMessage('Inverting Op Amp sample circuit loaded.');
}

function loadNonInvertingOpAmpSample() {
    // Clear current circuit
    components = [];
    wires = [];
    hideComponentProperties();
    simulationResultsDiv.textContent = 'Build a circuit and click "Run Simulation".';
    simulationOutputDiv.innerHTML = '';

    // Define component positions relative to canvas center
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Create components
    const opAmp = new Component('OpAmp', centerX + 100, centerY);
    const vinSource = new Component('VoltageSource', centerX - 200, centerY - 50, 5); // 5V input
    const resistor1 = new Component('Resistor', centerX, centerY + 100, 1000); // R1 = 1kΩ
    const resistorFeedback = new Component('Resistor', centerX + 100, centerY - 50, 10000); // Rf = 10kΩ
    const groundR1 = new Component('Ground', centerX, centerY + 150); // Ground for R1
    const groundVin = new Component('Ground', centerX - 200, centerY); // Ground for Vin source

    components.push(opAmp, vinSource, resistor1, resistorFeedback, groundR1, groundVin);

    // Get specific nodes
    const opAmpInv = opAmp.nodes.find(n => n.id.includes('-inv'));
    const opAmpNonInv = opAmp.nodes.find(n => n.id.includes('-nin'));
    const opAmpOut = opAmp.nodes.find(n => n.id.includes('-out'));

    const vinPos = vinSource.nodes.find(n => n.id.includes('-n2')); // Positive terminal of V-source
    const vinNeg = vinSource.nodes.find(n => n.id.includes('-n1')); // Negative terminal of V-source

    const res1_1 = resistor1.nodes.find(n => n.id.includes('-n1'));
    const res1_2 = resistor1.nodes.find(n => n.id.includes('-n2'));

    const resFeedback1 = resistorFeedback.nodes.find(n => n.id.includes('-n1'));
    const resFeedback2 = resistorFeedback.nodes.find(n => n.id.includes('-n2'));

    const groundR1Node = groundR1.nodes.find(n => n.id.includes('-gnd'));
    const groundVinNode = groundVin.nodes.find(n => n.id.includes('-gnd'));

    // Create wires
    wires.push(new Wire(vinPos, opAmpNonInv)); // Vin to Op-Amp Non-Inverting input
    wires.push(new Wire(opAmpInv, res1_1)); // Op-Amp Inverting input to R1
    wires.push(new Wire(res1_2, groundR1Node)); // R1 to Ground
    wires.push(new Wire(opAmpOut, resFeedback1)); // Op-Amp Output to Rf
    wires.push(new Wire(resFeedback2, opAmpInv)); // Rf to Op-Amp Inverting input (feedback)
    wires.push(new Wire(vinNeg, groundVinNode)); // Vin negative to Ground

    drawCircuit();
    simulationResultsDiv.textContent = 'Non-Inverting Op-Amp sample circuit loaded!';
    simulationOutputDiv.innerHTML = '';
    speakMessage('Non-Inverting Op Amp sample circuit loaded.');
}

// --- Simulation Logic (Simplified) ---
runSimulationBtn.addEventListener('click', () => {
    simulationResultsDiv.textContent = 'Running simulation...';
    simulationOutputDiv.innerHTML = '';
    let output = '';
    let speechOutput = '';

    // Filter components for simulation
    const opAmps = components.filter(c => c.type === 'OpAmp');
    const voltageSources = components.filter(c => c.type === 'VoltageSource');
    const resistors = components.filter(c => c.type === 'Resistor');
    const grounds = components.filter(c => c.type === 'Ground');
    const transistors = components.filter(c => c.type === 'Transistor'); // New: Get transistor components

    // Basic check for Op-Amp circuits (not transistor circuits for now)
    if (opAmps.length === 0 || voltageSources.length === 0 || resistors.length < 2 || grounds.length === 0) {
        output = `<p class="text-red-600">Insufficient components for a recognizable amplifier circuit.</p>
                  <p class="text-sm text-gray-700 mt-2">Please ensure you have: One Op-Amp, at least one Voltage Source, at least two Resistors, and at least one Ground.</p>
                  <p class="text-sm text-gray-700 mt-1">Or load a sample circuit.</p>`;
        speechOutput = 'Simulation failed: Insufficient components for a recognizable amplifier circuit. Please add components or load a sample circuit.';
        simulationOutputDiv.innerHTML = output;
        simulationResultsDiv.textContent = 'Simulation failed: Missing components!';
        speakMessage(speechOutput);
        return;
    }

    // Only simulate Op-Amp circuits for now. Transistor simulation would require more advanced logic.
    if (opAmps.length > 0) {
        const opAmp = opAmps[0]; // Assuming only one Op-Amp for simplicity
        const vinSource = voltageSources[0]; // Assuming one input source for simplicity
        const vinPositiveNode = vinSource.nodes.find(n => n.id.includes('-n2')); // Positive terminal of V-source

        // Get key Op-Amp nodes
        const opAmpInv = opAmp.nodes.find(n => n.id.includes('-inv'));
        const opAmpNonInv = opAmp.nodes.find(n => n.id.includes('-nin'));
        const opAmpOut = opAmp.nodes.find(n => n.id.includes('-out'));

        let circuitType = 'Unidentified';
        let Vout = 'N/A';

        // --- Try to identify Inverting Op-Amp configuration ---
        const nonInvConnectedToGround = findConnectedNode(opAmpNonInv, 'Ground');
        const inputResistorForInv = findResistorBetweenNodes(vinPositiveNode, opAmpInv, resistors); // Ri
        const feedbackResistorForInv = findResistorBetweenNodes(opAmpOut, opAmpInv, resistors, [inputResistorForInv ? inputResistorForInv.id : null]); // Rf

        if (nonInvConnectedToGround && inputResistorForInv && feedbackResistorForInv) {
            circuitType = 'Inverting Op-Amp Amplifier';
            const Rf = feedbackResistorForInv.value;
            const Ri = inputResistorForInv.value;
            const Vin = vinSource.value;
            Vout = (-Rf / Ri) * Vin;

            output = `
                <p class="font-bold text-lg mb-2">Identified: ${circuitType}</p>
                <p>Input Voltage (Vin): ${Vin}V</p>
                <p>Input Resistor (Ri): ${Ri}Ω</p>
                <p>Feedback Resistor (Rf): ${Rf}Ω</p>
                <p class="mt-2 text-xl font-semibold text-indigo-700">Calculated Output Voltage (Vout): ${Vout.toFixed(2)}V</p>
                <p class="text-sm text-gray-500 mt-4"> (Assuming ideal op-amp and non-inverting input is grounded.)</p>
            `;
            speechOutput = `Identified as Inverting Op Amp Amplifier. Input voltage: ${Vin} volts. Input resistor: ${Ri} ohms. Feedback resistor: ${Rf} ohms. Calculated output voltage: ${Vout.toFixed(2)} volts.`;
        }

        // --- Try to identify Non-Inverting Op-Amp configuration ---
        // Only attempt if not already identified as Inverting
        if (circuitType === 'Unidentified') {
            // Check if non-inverting input is connected to voltage source
            const nonInvConnectedToVin = findConnectedNode(opAmpNonInv, 'VoltageSource');
            
            // Find R1: one end connected to opAmpInv, other end connected to a Ground component
            let R1Resistor = null;
            if (opAmpInv) {
                for (const wire of wires) {
                    let nodeConnectedToInv = null;
                    let otherNode = null;

                    if (wire.start === opAmpInv) {
                        nodeConnectedToInv = wire.start;
                        otherNode = wire.end;
                    } else if (wire.end === opAmpInv) {
                        nodeConnectedToInv = wire.end;
                        otherNode = wire.start;
                    }

                    if (nodeConnectedToInv && otherNode) {
                        const compOfOtherNode = components.find(c => c.nodes.includes(otherNode));
                        if (compOfOtherNode && compOfOtherNode.type === 'Resistor') {
                            // This resistor is connected to the inverting input
                            const resNodes = compOfOtherNode.nodes;
                            const resistorOtherEndNode = (resNodes[0] === otherNode) ? resNodes[1] : resNodes[0];
                            
                            // Check if the other end of this resistor is connected to ground
                            const isOtherEndGrounded = findConnectedNode(resistorOtherEndNode, 'Ground');
                            if (isOtherEndGrounded) {
                                R1Resistor = compOfOtherNode;
                                break;
                            }
                        }
                    }
                }
            }

            // Find feedback resistor (Rf): connected between opAmpOut and opAmpInv
            const feedbackResistorForNonInv = findResistorBetweenNodes(opAmpOut, opAmpInv, resistors, [R1Resistor ? R1Resistor.id : null]); // Exclude R1

            if (nonInvConnectedToVin && R1Resistor && feedbackResistorForNonInv) {
                circuitType = 'Non-Inverting Op-Amp Amplifier';
                const Rf = feedbackResistorForNonInv.value;
                const R1 = R1Resistor.value;
                const Vin = vinSource.value;
                Vout = Vin * (1 + (Rf / R1)); // Non-inverting gain formula

                output = `
                    <p class="font-bold text-lg mb-2">Identified: ${circuitType}</p>
                    <p>Input Voltage (Vin): ${Vin}V</p>
                    <p>Resistor (R1): ${R1}Ω</p>
                    <p>Feedback Resistor (Rf): ${Rf}Ω</p>
                    <p class="mt-2 text-xl font-semibold text-indigo-700">Calculated Output Voltage (Vout): ${Vout.toFixed(2)}V</p>
                    <p class="text-sm text-gray-500 mt-4"> (Assuming ideal op-amp and R1 is grounded.)</p>
                `;
                speechOutput = `Identified as Non Inverting Op Amp Amplifier. Input voltage: ${Vin} volts. Resistor R1: ${R1} ohms. Feedback resistor: ${Rf} ohms. Calculated output voltage: ${Vout.toFixed(2)} volts.`;
            }
        }

        // If still unidentified for Op-Amp circuits
        if (circuitType === 'Unidentified') {
            output = `<p class="text-red-600">No recognized amplifier circuit found for simulation.</p>
                      <p class="text-sm text-gray-700 mt-2">Currently, the simulator can only recognize and calculate for a simple Inverting or Non-Inverting Op-Amp Amplifier.</p>
                      <p class="text-sm text-gray-700 mt-1">Please refer to the "Load Samples" buttons for example configurations.</p>`;
            speechOutput = 'No recognized amplifier circuit found for simulation. Please refer to the load samples buttons for example configurations.';
        }
    } else if (transistors.length > 0) {
        // Placeholder for transistor simulation logic
        output = `<p class="text-yellow-600">Transistor detected!</p>
                  <p class="text-sm text-gray-700 mt-2">Simulation for transistor circuits is not yet implemented.</p>
                  <p class="text-sm text-gray-700 mt-1">Stay tuned for future updates!</p>`;
        speechOutput = 'Transistor detected. Simulation for transistor circuits is not yet implemented. Stay tuned for future updates!';
    } else {
        // Fallback for no recognized components or circuits
        output = `<p class="text-red-600">No recognizable amplifier circuit found for simulation.</p>
                  <p class="text-sm text-gray-700 mt-2">Please add components to the canvas to simulate, or load a sample circuit.</p>`;
        speechOutput = 'No recognizable amplifier circuit found for simulation. Please add components to the canvas to simulate, or load a sample circuit.';
    }

    simulationOutputDiv.innerHTML = output;
    simulationResultsDiv.textContent = 'Simulation complete!';
    speakMessage(speechOutput); // Speak the final simulation result
});

resetCircuitBtn.addEventListener('click', () => {
    components = [];
    wires = [];
    selectedComponent = null;
    isDraggingComponent = false;
    currentWireStartNode = null;
    drawingWire = false;
    simulationResultsDiv.textContent = 'Build a circuit and click "Run Simulation".';
    simulationOutputDiv.innerHTML = '';
    hideComponentProperties();
    drawCircuit();
    speakMessage('Circuit has been reset.');
});

// Attach event listeners for sample circuit buttons
loadInvertingSampleBtn.addEventListener('click', loadInvertingOpAmpSample);
loadNonInvertingSampleBtn.addEventListener('click', loadNonInvertingOpAmpSample);

// --- Initial Setup ---
// Resize canvas to fill available space
const resizeCanvas = () => {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth - 32; // Adjust for padding
    canvas.height = container.clientHeight - 80; // Adjust for padding and header (main's internal padding + header height)
    drawCircuit();
};

window.addEventListener('resize', resizeCanvas);
// Initial draw on load
window.onload = () => {
    resizeCanvas();
    speakMessage('Welcome to the Amplifier Circuit Simulation Lab. You can build circuits by dragging components, connect them with wires, and run simulations.');
};
