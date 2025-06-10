//Your JavaScript goes in here
document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const workspace = document.getElementById('workspace');
    const components = document.querySelectorAll('.component');
    const simulateBtn = document.getElementById('simulate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const sampleCeBtn = document.getElementById('sample-ce-btn');
    const sampleOpampBtn = document.getElementById('sample-opamp-btn');
    const modal = document.getElementById('properties-modal');
    const closeBtn = document.querySelector('.close-btn');
    const propertiesForm = document.getElementById('properties-form');

    // Simulation elements
    const inputSignal = document.getElementById('input-signal');
    const frequency = document.getElementById('frequency');
    const amplitude = document.getElementById('amplitude');
    const inputGraphCanvas = document.getElementById('input-graph');
    const outputGraphCanvas = document.getElementById('output-graph');
    const inputGraphCtx = inputGraphCanvas.getContext('2d');
    const outputGraphCtx = outputGraphCanvas.getContext('2d');
    const downloadInputBtn = document.getElementById('input-graph_downloadBtn');
    const downloadOutputBtn = document.getElementById('output-graph_downloadBtn');


    // Variables
    let draggedComponent = null;
    let currentElement = null;
    let isDrawingWire = false;
    let wireStartPoint = null;
    let circuitElements = [];
    let wires = [];

    // Initialize Chart.js graphs
    let inputChart = new Chart(inputGraphCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Input Signal',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    let outputChart = new Chart(outputGraphCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Output Signal',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Event Listeners for Components
    components.forEach(component => {
        component.addEventListener('dragstart', function (e) {
            draggedComponent = this;
            e.dataTransfer.setData('text/plain', this.dataset.type);
        });
    });

    // Workspace Event Listeners
    workspace.addEventListener('dragover', function (e) {
        e.preventDefault();
    });

    workspace.addEventListener('drop', function (e) {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        createCircuitElement(type, e.clientX - workspace.getBoundingClientRect().left, e.clientY - workspace.getBoundingClientRect().top);
    });

    workspace.addEventListener('mousedown', function (e) {
        if (e.target.classList.contains('connection-point')) {
            isDrawingWire = true;
            const rect = e.target.getBoundingClientRect();
            const workspaceRect = workspace.getBoundingClientRect();
            wireStartPoint = {
                x: rect.left - workspaceRect.left + rect.width / 2,
                y: rect.top - workspaceRect.top + rect.height / 2,
                element: e.target.parentElement,
                connection: e.target
            };

            // Create a temporary wire starting point
            const tempDot = document.createElement('div');
            tempDot.className = 'wire-dot';
            tempDot.style.left = `${wireStartPoint.x - 2}px`;
            tempDot.style.top = `${wireStartPoint.y - 2}px`;
            tempDot.id = 'wire-start-dot';
            workspace.appendChild(tempDot);
        } else if (e.target.classList.contains('circuit-element')) {
            currentElement = e.target;
            let offsetX = e.clientX - currentElement.getBoundingClientRect().left;
            let offsetY = e.clientY - currentElement.getBoundingClientRect().top;

            function moveElement(e) {
                currentElement.style.left = `${e.clientX - workspace.getBoundingClientRect().left - offsetX}px`;
                currentElement.style.top = `${e.clientY - workspace.getBoundingClientRect().top - offsetY}px`;
                updateWires(); // Update wires when component moves
            }

            function stopMoving() {
                workspace.removeEventListener('mousemove', moveElement);
                workspace.removeEventListener('mouseup', stopMoving);
                currentElement = null;
            }

            workspace.addEventListener('mousemove', moveElement);
            workspace.addEventListener('mouseup', stopMoving);
        }
    });

    workspace.addEventListener('mousemove', function (e) {
        if (!isDrawingWire) return;

        // Remove any previous temporary wire
        const tempWire = document.querySelector('.temp-wire');
        if (tempWire) tempWire.remove();

        const workspaceRect = workspace.getBoundingClientRect();
        const x = e.clientX - workspaceRect.left;
        const y = e.clientY - workspaceRect.top;

        // Calculate length and angle for the wire
        const dx = x - wireStartPoint.x;
        const dy = y - wireStartPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Create a new temporary wire
        const wire = document.createElement('div');
        wire.className = 'wire temp-wire';
        wire.style.left = `${wireStartPoint.x}px`;
        wire.style.top = `${wireStartPoint.y}px`;
        wire.style.width = `${length}px`;
        wire.style.transform = `rotate(${angle}rad)`;

        workspace.appendChild(wire);
    });

    workspace.addEventListener('mouseup', function (e) {
        if (!isDrawingWire) return;

        // Remove temporary elements
        const tempWire = document.querySelector('.temp-wire');
        const tempDot = document.getElementById('wire-start-dot');
        if (tempWire) tempWire.remove();
        if (tempDot) tempDot.remove();

        // Check if we're ending on a connection point
        if (e.target.classList.contains('connection-point')) {
            const rect = e.target.getBoundingClientRect();
            const workspaceRect = workspace.getBoundingClientRect();
            const wireEndPoint = {
                x: rect.left - workspaceRect.left + rect.width / 2,
                y: rect.top - workspaceRect.top + rect.height / 2,
                element: e.target.parentElement,
                connection: e.target
            };

            // Don't connect to the same point or the same element
            if (wireStartPoint.element !== wireEndPoint.element && wireStartPoint.connection !== wireEndPoint.connection) {
                createWire(wireStartPoint, wireEndPoint);
            }
        }

        isDrawingWire = false;
        wireStartPoint = null;
    });

    // Update the createWire function:
    function createWire(startPoint, endPoint) {
        // Don't allow wires from a component to itself or to the same connection point
        if (startPoint.element === endPoint.element && startPoint.connection === endPoint.connection) return;

        const wire = document.createElement('div');
        wire.className = 'wire';

        // Store references to the connection points
        wire.dataset.startElementId = startPoint.element.id || (startPoint.element.id = generateId());
        wire.dataset.startConnectionId = startPoint.connection.id || (startPoint.connection.id = generateId());

        wire.dataset.endElementId = endPoint.element.id || (endPoint.element.id = generateId());
        wire.dataset.endConnectionId = endPoint.connection.id || (endPoint.connection.id = generateId());

        workspace.appendChild(wire);
        wires.push(wire);

        // Update wire position immediately after creation
        updateWirePosition(wire, startPoint, endPoint);
    }

    function updateWirePosition(wire, startPoint, endPoint) {
        const workspaceRect = workspace.getBoundingClientRect();

        // Recalculate coordinates relative to the workspace for the connection points
        const startRect = startPoint.connection.getBoundingClientRect();
        const endRect = endPoint.connection.getBoundingClientRect();

        const x1 = startRect.left - workspaceRect.left + startRect.width / 2;
        const y1 = startRect.top - workspaceRect.top + startRect.height / 2;
        const x2 = endRect.left - workspaceRect.left + endRect.width / 2;
        const y2 = endRect.top - workspaceRect.top + endRect.height / 2;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        wire.style.left = `${x1}px`;
        wire.style.top = `${y1}px`;
        wire.style.width = `${length}px`;
        wire.style.transform = `rotate(${angle}rad)`;
        wire.style.transformOrigin = '0 0';
    }

    function updateWires() {
        wires.forEach(wire => {
            const startElement = document.getElementById(wire.dataset.startElementId);
            const startConnection = document.getElementById(wire.dataset.startConnectionId);
            const endElement = document.getElementById(wire.dataset.endElementId);
            const endConnection = document.getElementById(wire.dataset.endConnectionId);

            if (startElement && startConnection && endElement && endConnection) {
                updateWirePosition(wire, { element: startElement, connection: startConnection }, { element: endElement, connection: endConnection });
            } else {
                // If an element or connection point is missing (e.g., deleted), remove the wire
                wire.remove();
                wires = wires.filter(w => w !== wire);
            }
        });
    }

    // Button Event Listeners
    simulateBtn.addEventListener('click', simulateCircuit);
    clearBtn.addEventListener('click', clearWorkspace);
    sampleCeBtn.addEventListener('click', createSampleCeAmplifier);
    sampleOpampBtn.addEventListener('click', createSampleOpAmp);
    downloadInputBtn.addEventListener('click', () => downloadGraph(inputGraphCanvas, 'input-signal'));
    downloadOutputBtn.addEventListener('click', () => downloadGraph(outputGraphCanvas, 'output-signal'));

    // Modal Event Listeners
    closeBtn.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    propertiesForm.addEventListener('submit', function (e) {
        e.preventDefault();
        saveProperties();
        modal.style.display = 'none';
    });

    // Functions
    function createCircuitElement(type, x, y) {
        const element = document.createElement('div');
        element.className = `circuit-element ${type}`;
        element.dataset.type = type;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.id = generateId(); // Assign a unique ID

        // Add connection points based on component type
        switch (type) {
            case 'resistor':
                element.innerHTML = `
                    <div class="connection-point" style="left: -4px; top: 8px;"></div>
                    <div class="connection-point" style="right: -4px; top: 8px;"></div>
                `;
                element.dataset.resistance = '1000'; // Default 1k ohm
                break;

            case 'capacitor':
                element.innerHTML = `
                    <div class="connection-point" style="left: -4px; top: 18px;"></div>
                    <div class="connection-point" style="right: -4px; top: 18px;"></div>
                `;
                element.dataset.capacitance = '0.000001'; // Default 1μF
                break;

            case 'transistor':
                element.innerHTML = `
                    <div class="connection-point" style="left: 18px; top: -4px;">B</div>
                    <div class="connection-point" style="left: -4px; bottom: -4px;">E</div>
                    <div class="connection-point" style="right: -4px; bottom: -4px;">C</div>
                `;
                element.dataset.transistorType = 'npn'; // Changed to transistorType to avoid conflict with dataset.type
                element.dataset.beta = '100'; // Default beta value
                break;

            case 'opamp':
                element.innerHTML = `
                    <div class="connection-point" style="left: 30px; top: -4px;">+</div>
                    <div class="connection-point" style="left: 30px; bottom: -4px;">-</div>
                    <div class="connection-point" style="right: -4px; top: 30px;">Out</div>
                    <div class="connection-point" style="left: -4px; top: 15px;">V+</div>
                    <div class="connection-point" style="left: -4px; top: 45px;">V-</div>
                `;
                element.dataset.gain = '100000'; // Default open-loop gain
                break;

            case 'voltage':
                element.innerHTML = `
                    <div class="connection-point" style="left: 20px; top: -4px;">+</div>
                    <div class="connection-point" style="left: 20px; bottom: -4px;">-</div>
                `;
                element.dataset.voltage = '9'; // Default 9V
                break;

            case 'ground':
                element.innerHTML = `
                    <div class="connection-point" style="left: 20px; top: -4px;"></div>
                `;
                break;

            case 'wire':
                // Wires are handled separately
                return;
        }

        // Double-click to edit properties
        element.addEventListener('dblclick', function () {
            showPropertiesModal(this);
        });

        workspace.appendChild(element);
        circuitElements.push(element);

        // Assign IDs to connection points and add event listeners
        const connectionPoints = element.querySelectorAll('.connection-point');
        connectionPoints.forEach(point => {
            point.id = generateId(); // Assign unique ID to connection points
            point.addEventListener('mousedown', function (e) {
                e.stopPropagation(); // Prevent triggering workspace mousedown
            });
            point.addEventListener('mouseup', function (e) {
                e.stopPropagation(); // Prevent triggering workspace mouseup
            });
        });
    }

    function generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    function showPropertiesModal(element) {
        currentElement = element;
        const type = element.dataset.type;
        const modalTitle = document.getElementById('modal-title');
        const propertiesFields = document.getElementById('properties-fields');

        modalTitle.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Properties`;
        propertiesFields.innerHTML = '';

        switch (type) {
            case 'resistor':
                propertiesFields.innerHTML = `
                    <label for="resistance">Resistance (Ω):</label>
                    <input type="number" id="resistance" value="${element.dataset.resistance}" min="1" step="1">
                `;
                break;

            case 'capacitor':
                propertiesFields.innerHTML = `
                    <label for="capacitance">Capacitance (F):</label>
                    <input type="number" id="capacitance" value="${element.dataset.capacitance}" min="0.000000001" step="0.000000001">
                `;
                break;

            case 'transistor':
                propertiesFields.innerHTML = `
                    <label for="transistor-type">Type:</label>
                    <select id="transistor-type">
                        <option value="npn" ${element.dataset.transistorType === 'npn' ? 'selected' : ''}>NPN</option>
                        <option value="pnp" ${element.dataset.transistorType === 'pnp' ? 'selected' : ''}>PNP</option>
                    </select>
                    <label for="beta">Beta (β):</label>
                    <input type="number" id="beta" value="${element.dataset.beta}" min="20" max="1000" step="1">
                `;
                break;

            case 'opamp':
                propertiesFields.innerHTML = `
                    <label for="gain">Open-loop Gain:</label>
                    <input type="number" id="gain" value="${element.dataset.gain}" min="1000" step="1000">
                `;
                break;

            case 'voltage':
                propertiesFields.innerHTML = `
                    <label for="voltage">Voltage (V):</label>
                    <input type="number" id="voltage" value="${element.dataset.voltage}" min="0.1" max="100" step="0.1">
                `;
                break;
        }

        modal.style.display = 'block';
    }

    function saveProperties() {
        if (!currentElement) return;

        const type = currentElement.dataset.type;

        switch (type) {
            case 'resistor':
                currentElement.dataset.resistance = document.getElementById('resistance').value;
                break;

            case 'capacitor':
                currentElement.dataset.capacitance = document.getElementById('capacitance').value;
                break;

            case 'transistor':
                currentElement.dataset.transistorType = document.getElementById('transistor-type').value;
                currentElement.dataset.beta = document.getElementById('beta').value;
                break;

            case 'opamp':
                currentElement.dataset.gain = document.getElementById('gain').value;
                break;

            case 'voltage':
                currentElement.dataset.voltage = document.getElementById('voltage').value;
                break;
        }
    }

    function simulateCircuit() {
        // In a real application, this would send the circuit data to a simulation engine
        // For this demo, we'll just generate some sample waveforms

        const freq = parseFloat(frequency.value);
        const amp = parseFloat(amplitude.value);
        const signalType = inputSignal.value;

        // Generate input signal data
        const timePoints = [];
        const inputData = [];
        const outputData = [];

        // Simple simulation - output is just amplified input with some distortion
        for (let i = 0; i < 100; i++) {
            const t = i / 100 * 2 * Math.PI;
            timePoints.push(i);

            let inputValue;
            switch (signalType) {
                case 'sine':
                    inputValue = amp * Math.sin(freq * t);
                    break;
                case 'square':
                    inputValue = amp * (Math.sin(freq * t) > 0 ? amp : -amp);
                    break;
                case 'triangle':
                    inputValue = (2 * amp / Math.PI) * Math.asin(Math.sin(freq * t));
                    break;
                default:
                    inputValue = amp * Math.sin(freq * t);
            }

            inputData.push(inputValue);

            // Simple amplifier model with clipping
            let gain = 5; // Default gain
            let outputValue = inputValue * gain;

            // Check for clipping (assuming ±12V power supply)
            if (outputValue > 12) outputValue = 12;
            if (outputValue < -12) outputValue = -12;

            // Add some noise
            outputValue += (Math.random() - 0.5) * 0.2;

            outputData.push(outputValue);
        }

        // Update charts
        inputChart.data.labels = timePoints;
        inputChart.data.datasets[0].data = inputData;
        inputChart.update();

        outputChart.data.labels = timePoints;
        outputChart.data.datasets[0].data = outputData;
        outputChart.update();

        // Update measurements (simplified)
        document.getElementById('gain-value').textContent = (20 * Math.log10(5)).toFixed(1); // 5x gain in dB
        document.getElementById('bandwidth-value').textContent = (freq * 10).toFixed(0);
        document.getElementById('input-z-value').textContent = '1000';
        document.getElementById('output-z-value').textContent = '100';
    }

    function downloadGraph(canvas, filename) {
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function clearWorkspace() {
        workspace.innerHTML = '<div class="grid-overlay"></div>';
        circuitElements = [];
        wires = [];

        // Clear graphs
        inputChart.data.labels = [];
        inputChart.data.datasets[0].data = [];
        inputChart.update();

        outputChart.data.labels = [];
        outputChart.data.datasets[0].data = [];
        outputChart.update();
    }

    function createSampleCeAmplifier() {
        clearWorkspace();

        // Create components
        const transistor = document.createElement('div');
        transistor.className = 'circuit-element transistor';
        transistor.dataset.type = 'transistor';
        transistor.dataset.transistorType = 'npn'; // Use transistorType
        transistor.dataset.beta = '100';
        transistor.style.left = '200px';
        transistor.style.top = '150px';
        transistor.id = generateId(); // Assign ID
        transistor.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: 18px; top: -4px;">B</div>
            <div class="connection-point" id="${generateId()}" style="left: -4px; bottom: -4px;">E</div>
            <div class="connection-point" id="${generateId()}" style="right: -4px; bottom: -4px;">C</div>
        `;
        workspace.appendChild(transistor);
        circuitElements.push(transistor);

        const rc = document.createElement('div');
        rc.className = 'circuit-element resistor';
        rc.dataset.type = 'resistor';
        rc.dataset.resistance = '2200';
        rc.style.left = '270px';
        rc.style.top = '120px';
        rc.id = generateId(); // Assign ID
        rc.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: -4px; top: 8px;"></div>
            <div class="connection-point" id="${generateId()}" style="right: -4px; top: 8px;"></div>
        `;
        workspace.appendChild(rc);
        circuitElements.push(rc);

        const re = document.createElement('div');
        re.className = 'circuit-element resistor';
        re.dataset.type = 'resistor';
        re.dataset.resistance = '1000';
        re.style.left = '150px';
        re.style.top = '220px';
        re.id = generateId(); // Assign ID
        re.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: -4px; top: 8px;"></div>
            <div class="connection-point" id="${generateId()}" style="right: -4px; top: 8px;"></div>
        `;
        workspace.appendChild(re);
        circuitElements.push(re);

        const rb1 = document.createElement('div');
        rb1.className = 'circuit-element resistor';
        rb1.dataset.type = 'resistor';
        rb1.dataset.resistance = '10000';
        rb1.style.left = '50px';
        rb1.style.top = '50px';
        rb1.id = generateId(); // Assign ID
        rb1.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: -4px; top: 8px;"></div>
            <div class="connection-point" id="${generateId()}" style="right: -4px; top: 8px;"></div>
        `;
        workspace.appendChild(rb1);
        circuitElements.push(rb1);

        const rb2 = document.createElement('div');
        rb2.className = 'circuit-element resistor';
        rb2.dataset.type = 'resistor';
        rb2.dataset.resistance = '10000';
        rb2.style.left = '50px';
        rb2.style.top = '100px';
        rb2.id = generateId(); // Assign ID
        rb2.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: -4px; top: 8px;"></div>
            <div class="connection-point" id="${generateId()}" style="right: -4px; top: 8px;"></div>
        `;
        workspace.appendChild(rb2);
        circuitElements.push(rb2);

        const cc1 = document.createElement('div');
        cc1.className = 'circuit-element capacitor';
        cc1.dataset.type = 'capacitor';
        cc1.dataset.capacitance = '0.00001';
        cc1.style.left = '50px';
        cc1.style.top = '200px';
        cc1.id = generateId(); // Assign ID
        cc1.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: -4px; top: 18px;"></div>
            <div class="connection-point" id="${generateId()}" style="right: -4px; top: 18px;"></div>
        `;
        workspace.appendChild(cc1);
        circuitElements.push(cc1);

        const cc2 = document.createElement('div');
        cc2.className = 'circuit-element capacitor';
        cc2.dataset.type = 'capacitor';
        cc2.dataset.capacitance = '0.00001';
        cc2.style.left = '270px';
        cc2.style.top = '200px';
        cc2.id = generateId(); // Assign ID
        cc2.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: -4px; top: 18px;"></div>
            <div class="connection-point" id="${generateId()}" style="right: -4px; top: 18px;"></div>
        `;
        workspace.appendChild(cc2);
        circuitElements.push(cc2);

        const ce = document.createElement('div');
        ce.className = 'circuit-element capacitor';
        ce.dataset.type = 'capacitor';
        ce.dataset.capacitance = '0.0001';
        ce.style.left = '150px';
        ce.style.top = '270px';
        ce.id = generateId(); // Assign ID
        ce.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: -4px; top: 18px;"></div>
            <div class="connection-point" id="${generateId()}" style="right: -4px; top: 18px;"></div>
        `;
        workspace.appendChild(ce);
        circuitElements.push(ce);

        const voltageSource = document.createElement('div');
        voltageSource.className = 'circuit-element voltage';
        voltageSource.dataset.type = 'voltage';
        voltageSource.dataset.voltage = '12';
        voltageSource.style.left = '200px';
        voltageSource.style.top = '20px';
        voltageSource.id = generateId(); // Assign ID
        voltageSource.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: 20px; top: -4px;">+</div>
            <div class="connection-point" id="${generateId()}" style="left: 20px; bottom: -4px;">-</div>
        `;
        workspace.appendChild(voltageSource);
        circuitElements.push(voltageSource);

        const ground = document.createElement('div');
        ground.className = 'circuit-element ground';
        ground.dataset.type = 'ground';
        ground.style.left = '100px';
        ground.style.top = '320px';
        ground.id = generateId(); // Assign ID
        ground.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: 20px; top: -4px;"></div>
        `;
        workspace.appendChild(ground);
        circuitElements.push(ground);

        // Make elements draggable and add double-click listener
        [transistor, rc, re, rb1, rb2, cc1, cc2, ce, voltageSource, ground].forEach(el => {
            el.addEventListener('dblclick', function () {
                showPropertiesModal(this);
            });
            // Ensure connection points have event listeners
            el.querySelectorAll('.connection-point').forEach(point => {
                point.addEventListener('mousedown', function (e) {
                    e.stopPropagation();
                });
                point.addEventListener('mouseup', function (e) {
                    e.stopPropagation();
                });
            });
        });

        // Helper to get connection point by element and text content
        const getConnectionPoint = (element, textContent) => {
            return Array.from(element.querySelectorAll('.connection-point')).find(point => point.textContent === textContent);
        };
        const getConnectionPointByIndex = (element, index) => {
            return element.querySelectorAll('.connection-point')[index];
        };


        // Connect components for CE Amplifier
        // VCC to Rc
        createWire(
            { element: voltageSource, connection: getConnectionPoint(voltageSource, '+') },
            { element: rc, connection: getConnectionPointByIndex(rc, 0) }
        );

        // Rc to Collector
        createWire(
            { element: rc, connection: getConnectionPointByIndex(rc, 1) },
            { element: transistor, connection: getConnectionPoint(transistor, 'C') }
        );

        // Emitter to Re
        createWire(
            { element: transistor, connection: getConnectionPoint(transistor, 'E') },
            { element: re, connection: getConnectionPointByIndex(re, 0) }
        );

        // Re to Ce
        createWire(
            { element: re, connection: getConnectionPointByIndex(re, 1) },
            { element: ce, connection: getConnectionPointByIndex(ce, 0) }
        );

        // Ce to Ground
        createWire(
            { element: ce, connection: getConnectionPointByIndex(ce, 1) },
            { element: ground, connection: getConnectionPointByIndex(ground, 0) }
        );

        // Voltage Source negative to Ground
        createWire(
            { element: voltageSource, connection: getConnectionPoint(voltageSource, '-') },
            { element: ground, connection: getConnectionPointByIndex(ground, 0) }
        );

        // Rb1 top to VCC
        createWire(
            { element: rb1, connection: getConnectionPointByIndex(rb1, 0) },
            { element: voltageSource, connection: getConnectionPoint(voltageSource, '+') }
        );

        // Rb1 bottom to Rb2 top
        createWire(
            { element: rb1, connection: getConnectionPointByIndex(rb1, 1) },
            { element: rb2, connection: getConnectionPointByIndex(rb2, 0) }
        );

        // Rb2 bottom to Ground
        createWire(
            { element: rb2, connection: getConnectionPointByIndex(rb2, 1) },
            { element: ground, connection: getConnectionPointByIndex(ground, 0) }
        );

        // Base to Rb1/Rb2 junction (connecting to Rb1 bottom, Rb2 top)
        createWire(
            { element: transistor, connection: getConnectionPoint(transistor, 'B') },
            { element: rb1, connection: getConnectionPointByIndex(rb1, 1) }
        );

        // Base to Cc1 output (Cc1 to Base)
        createWire(
            { element: cc1, connection: getConnectionPointByIndex(cc1, 1) },
            { element: transistor, connection: getConnectionPoint(transistor, 'B') }
        );

        // Cc1 input (This would normally connect to an input signal, leaving floating for now or connecting to an arbitrary point for demo)
        // For demonstration, let's connect it to a dummy point or imply an input source.
        // For now, no explicit source element is created for the input signal in this sample,
        // so we'll just ensure the connection logic is there if you add one later.

        // Cc2 input to Collector
        createWire(
            { element: cc2, connection: getConnectionPointByIndex(cc2, 0) },
            { element: transistor, connection: getConnectionPoint(transistor, 'C') }
        );

        // Cc2 output (This would be your output signal, leaving floating or connecting to an arbitrary point for demo)

        // Ensure all newly added elements are part of circuitElements
        updateWires();
    }

    function createSampleOpAmp() {
        clearWorkspace();

        // Create Op-Amp
        const opamp = document.createElement('div');
        opamp.className = 'circuit-element opamp';
        opamp.dataset.type = 'opamp';
        opamp.dataset.gain = '200000';
        opamp.style.left = '250px';
        opamp.style.top = '150px';
        opamp.id = generateId(); // Assign ID
        opamp.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: 30px; top: -4px;">+</div>
            <div class="connection-point" id="${generateId()}" style="left: 30px; bottom: -4px;">-</div>
            <div class="connection-point" id="${generateId()}" style="right: -4px; top: 30px;">Out</div>
            <div class="connection-point" id="${generateId()}" style="left: -4px; top: 15px;">V+</div>
            <div class="connection-point" id="${generateId()}" style="left: -4px; top: 45px;">V-</div>
        `;
        workspace.appendChild(opamp);
        circuitElements.push(opamp);

        // Create Resistors for Feedback and Input (Inverting Op-Amp Configuration)
        const r_in = document.createElement('div');
        r_in.className = 'circuit-element resistor';
        r_in.dataset.type = 'resistor';
        r_in.dataset.resistance = '10000'; // 10kΩ
        r_in.style.left = '100px';
        r_in.style.top = '150px';
        r_in.id = generateId(); // Assign ID
        r_in.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: -4px; top: 8px;"></div>
            <div class="connection-point" id="${generateId()}" style="right: -4px; top: 8px;"></div>
        `;
        workspace.appendChild(r_in);
        circuitElements.push(r_in);

        const r_f = document.createElement('div');
        r_f.className = 'circuit-element resistor';
        r_f.dataset.type = 'resistor';
        r_f.dataset.resistance = '100000'; // 100kΩ
        r_f.style.left = '320px';
        r_f.style.top = '70px';
        r_f.id = generateId(); // Assign ID
        r_f.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: -4px; top: 8px;"></div>
            <div class="connection-point" id="${generateId()}" style="right: -4px; top: 8px;"></div>
        `;
        workspace.appendChild(r_f);
        circuitElements.push(r_f);

        // Voltage Source (for V+)
        const vcc = document.createElement('div');
        vcc.className = 'circuit-element voltage';
        vcc.dataset.type = 'voltage';
        vcc.dataset.voltage = '15';
        vcc.style.left = '400px';
        vcc.style.top = '50px';
        vcc.id = generateId(); // Assign ID
        vcc.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: 20px; top: -4px;">+</div>
            <div class="connection-point" id="${generateId()}" style="left: 20px; bottom: -4px;">-</div>
        `;
        workspace.appendChild(vcc);
        circuitElements.push(vcc);

        // Voltage Source (for V-)
        const vee = document.createElement('div');
        vee.className = 'circuit-element voltage';
        vee.dataset.type = 'voltage';
        vee.dataset.voltage = '-15'; // Negative voltage
        vee.style.left = '400px';
        vee.style.top = '250px';
        vee.id = generateId(); // Assign ID
        vee.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: 20px; top: -4px;">+</div>
            <div class="connection-point" id="${generateId()}" style="left: 20px; bottom: -4px;">-</div>
        `;
        workspace.appendChild(vee);
        circuitElements.push(vee);

        // Ground
        const ground = document.createElement('div');
        ground.className = 'circuit-element ground';
        ground.dataset.type = 'ground';
        ground.style.left = '100px';
        ground.style.top = '300px';
        ground.id = generateId(); // Assign ID
        ground.innerHTML = `
            <div class="connection-point" id="${generateId()}" style="left: 20px; top: -4px;"></div>
        `;
        workspace.appendChild(ground);
        circuitElements.push(ground);


        // Make elements draggable and add double-click listener
        [opamp, r_in, r_f, vcc, vee, ground].forEach(el => {
            el.addEventListener('dblclick', function () {
                showPropertiesModal(this);
            });
            el.querySelectorAll('.connection-point').forEach(point => {
                point.addEventListener('mousedown', function (e) {
                    e.stopPropagation();
                });
                point.addEventListener('mouseup', function (e) {
                    e.stopPropagation();
                });
            });
        });

        // Helper to get connection point by element and text content
        const getConnectionPoint = (element, textContent) => {
            return Array.from(element.querySelectorAll('.connection-point')).find(point => point.textContent === textContent);
        };
        const getConnectionPointByIndex = (element, index) => {
            return element.querySelectorAll('.connection-point')[index];
        };

        // Connect components for Inverting Op-Amp
        // R_in left to an assumed input signal (not explicitly placed, but connectable)
        // R_in right to Op-Amp Inverting Input (-)
        createWire(
            { element: r_in, connection: getConnectionPointByIndex(r_in, 1) },
            { element: opamp, connection: getConnectionPoint(opamp, '-') }
        );

        // Op-Amp Non-Inverting Input (+) to Ground
        createWire(
            { element: opamp, connection: getConnectionPoint(opamp, '+') },
            { element: ground, connection: getConnectionPointByIndex(ground, 0) }
        );

        // R_f left to Op-Amp Inverting Input (-)
        createWire(
            { element: r_f, connection: getConnectionPointByIndex(r_f, 0) },
            { element: opamp, connection: getConnectionPoint(opamp, '-') }
        );

        // R_f right to Op-Amp Output
        createWire(
            { element: r_f, connection: getConnectionPointByIndex(r_f, 1) },
            { element: opamp, connection: getConnectionPoint(opamp, 'Out') }
        );

        // VCC positive to Op-Amp V+
        createWire(
            { element: vcc, connection: getConnectionPoint(vcc, '+') },
            { element: opamp, connection: getConnectionPoint(opamp, 'V+') }
        );

        // VCC negative to ground
        createWire(
            { element: vcc, connection: getConnectionPoint(vcc, '-') },
            { element: ground, connection: getConnectionPointByIndex(ground, 0) }
        );

        // VEE negative to Op-Amp V-
        createWire(
            { element: vee, connection: getConnectionPoint(vee, '-') },
            { element: opamp, connection: getConnectionPoint(opamp, 'V-') }
        );

        // VEE positive to ground
        createWire(
            { element: vee, connection: getConnectionPoint(vee, '+') },
            { element: ground, connection: getConnectionPointByIndex(ground, 0) }
        );

        updateWires();
    }
});

// // dark mode conver
//   const toggleButton = document.getElementById("theme-toggle");

//   toggleButton.addEventListener("click", () => {
//     document.body.classList.toggle("dark-mode");

//     // Optional: Save preference in localStorage
//     if (document.body.classList.contains("dark-mode")) {
//       localStorage.setItem("theme", "dark");
//     } else {
//       localStorage.setItem("theme", "light");
//     }
//   });

//   // Optional: Load saved theme on page load
//   window.addEventListener("load", () => {
//     const savedTheme = localStorage.getItem("theme");
//     if (savedTheme === "dark") {
//       document.body.classList.add("dark-mode");
//     }
//   });
