class PlotManager {
    constructor() {
        this.voltageChart = null;
        this.gateKineticsChart = null;
        this.voltageCanvasId = null;
        this.gateKineticsCanvasId = null;
        this.varList = [
            'm', 'h', 'n',
            'I_Na (uA)', 'I_K (uA)', 'g_Na (uS)',
            'g_K (uS)', 'I_leak (uA)', 'blank'
        ];
        this.selectedVars = ['m', 'h', 'n'];
        this.defaultXMin = 0;
        this.defaultXMax = 50;
        this.windowSize = 50;
        this.slideAmount = 10;
        this.bufferSize = 5000;
        this.updateCount = 0;
        this.updateThreshold = 4;

        // Fixed y-axis ranges (these are the source of truth)
        this.voltageYConfig = {
            type: 'linear',
            min: -100,
            max: 60,
            title: { display: true, text: 'Membrane Potential (mV)' },
            ticks: { stepSize: 20 },
        };
        this.stimulusYConfig = {
            type: 'linear',
            position: 'right',
            min: -20,
            max: 20,
            title: { display: true, text: 'Stimulus Current (μA/cm²)' },
            grid: { drawOnChartArea: false },
        };
        this.gateYConfig = {
            type: 'linear',
            min: 0,
            max: 1,
            title: { display: true, text: 'Gate Value' },
            ticks: { stepSize: 0.2 },
        };
    }

    initPlots(voltageCanvasId, gateKineticsCanvasId) {
        this.voltageCanvasId = voltageCanvasId;
        this.gateKineticsCanvasId = gateKineticsCanvasId;

        const voltageCanvas = document.getElementById(voltageCanvasId);
        const gateKineticsCanvas = document.getElementById(gateKineticsCanvasId);

        // Explicitly set canvas dimensions from CSS or desired fixed size
        // Ensure this matches your CSS, or set your desired fixed size directly here.
        const canvasWidth = 800; // As per your CSS
        const canvasHeight = 300; // As per your CSS

        voltageCanvas.width = canvasWidth;
        voltageCanvas.height = canvasHeight;
        gateKineticsCanvas.width = canvasWidth;
        gateKineticsCanvas.height = canvasHeight;

        const commonXAxisConfig = {
            type: 'linear',
            min: this.defaultXMin,
            max: this.defaultXMax,
            title: { display: true, text: 'Time (ms)' },
            ticks: { stepSize: 10 },
        };

        const voltageCtx = document.getElementById(voltageCanvasId).getContext('2d');
        this.voltageChart = new Chart(voltageCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Membrane Potential (mV)', data: [], borderColor: 'rgb(255, 0, 0)', tension: 0.1, yAxisID: 'y' },
                    { label: 'Stimulus Current (μA/cm²)', data: [], borderColor: 'rgb(128, 0, 128)', tension: 0.1, yAxisID: 'y2' }
                ]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: commonXAxisConfig,
                    y: { ...this.voltageYConfig },
                    y2: { ...this.stimulusYConfig },
                },
                plugins: { legend: { display: true, position: 'top' } }
            }
        });

        const gateKineticsCtx = document.getElementById(gateKineticsCanvasId).getContext('2d');
        this.gateKineticsChart = new Chart(gateKineticsCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'm (Na+ activation)', data: [], borderColor: 'rgb(255, 255, 0)', tension: 0.1 },
                    { label: 'h (Na+ inactivation)', data: [], borderColor: 'rgb(0, 255, 0)', tension: 0.1 },
                    { label: 'n (K+ activation)', data: [], borderColor: 'rgb(0, 255, 255)', tension: 0.1 }
                ]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: commonXAxisConfig,
                    y: { ...this.gateYConfig },
                },
                plugins: { legend: { display: true, position: 'top' } }
            }
        });
    }

    updatePlots(data, isReset = false) {
        if (!this.voltageChart || !this.gateKineticsChart) return;

        if (isReset) {
            this.resetView();
            return;
        }

        const stimulusCurrent = data.time.map((t, i) => {
            let iStim = 0;
            if (data.stim1 && data.stim1.active && t >= data.stim1.startTime && t < data.stim1.startTime + data.stim1.duration) {
                iStim += data.stim1.amplitude;
            }
            if (data.stim2 && data.stim2.active && t >= data.stim2.startTime && t < data.stim2.startTime + data.stim2.duration) {
                iStim += data.stim2.amplitude;
            }
            return iStim;
        });

        this.voltageChart.data.labels = data.time;
        this.voltageChart.data.datasets[0].data = data.voltage;
        this.voltageChart.data.datasets[1].data = stimulusCurrent;

        this.gateKineticsChart.data.labels = data.time;
        this.gateKineticsChart.data.datasets[0].data = data.gating.m;
        this.gateKineticsChart.data.datasets[1].data = data.gating.h;
        this.gateKineticsChart.data.datasets[2].data = data.gating.n;

        const currentXMin = this.voltageChart.options.scales.x.min;
        const currentXMax = this.voltageChart.options.scales.x.max;
        const lastTime = data.time[data.time.length - 1] || 0;

        if (lastTime > currentXMax) {
            const newMin = currentXMin + this.slideAmount;
            const newMax = currentXMin + this.windowSize + this.slideAmount;
            this.voltageChart.options.scales.x.min = newMin;
            this.voltageChart.options.scales.x.max = newMax;
            this.gateKineticsChart.options.scales.x.min = newMin;
            this.gateKineticsChart.options.scales.x.max = newMax;
        }

        if (data.time.length > this.bufferSize) {
            const excess = data.time.length - this.bufferSize;
            this.voltageChart.data.labels = data.time.slice(excess);
            this.voltageChart.data.datasets[0].data = data.voltage.slice(excess);
            this.voltageChart.data.datasets[1].data = stimulusCurrent.slice(excess);
            this.gateKineticsChart.data.labels = data.time.slice(excess);
            this.gateKineticsChart.data.datasets[0].data = data.gating.m.slice(excess);
            this.gateKineticsChart.data.datasets[1].data = data.gating.h.slice(excess);
            this.gateKineticsChart.data.datasets[2].data = data.gating.n.slice(excess);
        }
        
        // Force Y axis configuration on every update
        this.voltageChart.options.scales.y = { ...this.voltageYConfig };
        this.voltageChart.options.scales.y2 = { ...this.stimulusYConfig };
        this.gateKineticsChart.options.scales.y = { ...this.gateYConfig };

        this.voltageChart.update('none');
        this.gateKineticsChart.update('none');
    }

    resetView() {
        if (this.voltageChart) this.voltageChart.destroy();
        if (this.gateKineticsChart) this.gateKineticsChart.destroy();

        // Re-create canvases because destroy removes them
        const voltageParent = document.getElementById(this.voltageCanvasId).parentNode;
        const newVoltageCanvas = document.createElement('canvas');
        newVoltageCanvas.id = this.voltageCanvasId;
        newVoltageCanvas.width = 800; // Match CSS
        newVoltageCanvas.height = 300; // Match CSS
        voltageParent.innerHTML = ''; // Clear old canvas if any remnants
        voltageParent.appendChild(newVoltageCanvas);

        const gateParent = document.getElementById(this.gateKineticsCanvasId).parentNode;
        const newGateCanvas = document.createElement('canvas');
        newGateCanvas.id = this.gateKineticsCanvasId;
        newGateCanvas.width = 800; // Match CSS
        newGateCanvas.height = 300; // Match CSS
        gateParent.innerHTML = ''; // Clear old canvas
        gateParent.appendChild(newGateCanvas);

        this.initPlots(this.voltageCanvasId, this.gateKineticsCanvasId);
    }

    setXAxisLimits(center, width) {
        if (!this.voltageChart || !this.gateKineticsChart) return;
        const newMin = Math.max(0, center - width / 2);
        const newMax = center + width / 2;
        this.voltageChart.options.scales.x.min = newMin;
        this.voltageChart.options.scales.x.max = newMax;
        this.gateKineticsChart.options.scales.x.min = newMin;
        this.gateKineticsChart.options.scales.x.max = newMax;
        this.voltageChart.update('none');
        this.gateKineticsChart.update('none');
    }

    resizePlot(factor) { // This might not be needed with responsive:false
        if (!this.voltageChart || !this.gateKineticsChart) return;
        const currentMin = this.voltageChart.options.scales.x.min;
        const currentMax = this.voltageChart.options.scales.x.max;
        const currentWidth = currentMax - currentMin;
        const center = (currentMax + currentMin) / 2;
        const newWidth = factor > 0 ? currentWidth * 1.5 : currentWidth / 1.5;
        this.setXAxisLimits(center, newWidth);
    }

    destroy() {
        if (this.voltageChart) this.voltageChart.destroy();
        if (this.gateKineticsChart) this.gateKineticsChart.destroy();
    }
}

export default PlotManager; 