//Your JavaScript goes in here

(() => {
    const canvas = document.getElementById('waveCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const gainRange = document.getElementById('gainRange');
    const gainValue = document.getElementById('gainValue');
    const inputAmplitudeRange = document.getElementById('inputAmplitudeRange');
    const inputAmpValue = document.getElementById('inputAmpValue');
    const freqRange = document.getElementById('freqRange');
    const freqValue = document.getElementById('freqValue');
    const offsetInput = document.getElementById('offsetInput');
    const offsetValue = document.getElementById('offsetValue');
    const outputText = document.getElementById("calculatedOutput");

    // Update UI labels and output voltage
    function updateAllLabelsAndOutput() {
        const gain = parseFloat(gainRange.value);
        const amp = parseFloat(inputAmplitudeRange.value);
        const freq = parseFloat(freqRange.value);
        const offset = parseFloat(offsetInput.value);

        gainValue.textContent = gain.toFixed(1);
        inputAmpValue.textContent = amp.toFixed(1);
        freqValue.textContent = freq.toFixed(1);
        offsetValue.textContent = offset.toFixed(1);

        // Calculate and display Vout_peak with clipping
        const vout_peak = gain * amp;
        const clipped_vout = Math.max(-10, Math.min(10, vout_peak));
        outputText.textContent = `Vout_peak = ${gain.toFixed(1)} × ${amp.toFixed(1)}V = ${clipped_vout.toFixed(2)}V`;
    }

    function updateLabels() {
        const gain = parseFloat(gainRange.value);
        const amp = parseFloat(inputAmplitudeRange.value);
        const offset = parseFloat(offsetInput.value);

        gainValue.textContent = gain.toFixed(1);
        inputAmpValue.textContent = amp.toFixed(1);
        freqValue.textContent = parseFloat(freqRange.value).toFixed(1);
        offsetValue.textContent = offset.toFixed(1);

        // Calculate peak output
        let vout_peak = gain * amp;
        const clipped_vout = Math.max(-10, Math.min(10, vout_peak)); // clipping

        document.getElementById("calculatedOutput").textContent =
            `Vout_peak = ${gain.toFixed(1)} × ${amp.toFixed(1)}V = ${clipped_vout.toFixed(2)}V`;
    }

    // Draw axes
    function drawAxes() {
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 1;
        ctx.font = '12px monospace';
        ctx.fillStyle = '#81c784';
        ctx.clearRect(0, 0, width, height);

        // Draw horizontal axis
        ctx.beginPath();
        ctx.moveTo(40, height / 2);
        ctx.lineTo(width - 10, height / 2);
        ctx.stroke();

        // Draw vertical axis
        ctx.beginPath();
        ctx.moveTo(40, 10);
        ctx.lineTo(40, height - 20);
        ctx.stroke();

        // Labels
        ctx.fillText('Time →', width - 80, height / 2 - 10);
        ctx.fillText('Voltage (V)', 10, 20);
        ctx.fillText('Vout', 50, 30);
        ctx.fillText('Vin', 50, height - 30);

        // Voltage scale lines horizontal center
        for (let y = height / 2 - 80; y <= height / 2 + 80; y += 40) {
            ctx.strokeStyle = '#2e7d3222';
            ctx.beginPath();
            ctx.moveTo(40, y);
            ctx.lineTo(width - 10, y);
            ctx.stroke();
        }
    }

    // Draw waveforms
    function drawWaveforms() {
        const gain = parseFloat(gainRange.value);
        const amp = parseFloat(inputAmplitudeRange.value);
        const freq = parseFloat(freqRange.value);
        const offset = parseFloat(offsetInput.value);

        // Time scale for 1 sec simulated across canvas width (excluding 40px y-axis margin)
        const samples = width - 50;
        const vinData = new Array(samples);
        const voutData = new Array(samples);

        // Calculate input and output wave samples
        for (let i = 0; i < samples; i++) {
            let t = i / samples; // normalize time 0-1 for one cycle approx
            let omega = 2 * Math.PI * freq;
            // Input voltage - sine wave plus DC offset
            vinData[i] = offset + amp * Math.sin(omega * t);
            // Output voltage - amplified input but clipped to ±10V (simulate power supply rails)
            let voutRaw = gain * vinData[i];
            voutData[i] = Math.max(-10, Math.min(10, voutRaw));
        }

        // Draw Vin waveform (Bottom half)
        ctx.strokeStyle = '#81c784';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < samples; i++) {
            let x = 40 + i;
            // Map vin from -maxAmplitude..+maxAmplitude to bottom half area (height/2..height-20)
            let maxAmp = 5; // max expected amplitude for scaling
            let yCenter = height - 70;
            let y = yCenter - (vinData[i] / maxAmp) * 50;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw Vout waveform (Top half)
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < samples; i++) {
            let x = 40 + i;
            // Map vout from -10V..+10V to top half area (20..height/2-20)
            let yCenter = height / 2 - 50;
            let y = yCenter - (voutData[i] / 10) * 50;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw legends
        ctx.fillStyle = '#81c784';
        ctx.fillRect(70, height - 45, 12, 8);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(70, 15, 12, 8);
        ctx.fillStyle = '#eee';
        ctx.font = '14px monospace';
        ctx.fillText('Vin (Input)', 90, height - 38);
        ctx.fillText('Vout (Output)', 90, 24);
    }

    function refresh() {
        updateLabels();
        drawAxes();
        drawWaveforms();
    }

    gainRange.addEventListener('input', refresh);
    inputAmplitudeRange.addEventListener('input', refresh);
    freqRange.addEventListener('input', refresh);
    offsetInput.addEventListener('input', refresh);

    refresh();
})();