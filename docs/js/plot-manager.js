class PlotManager {
    constructor() {
        this.voltageChart = null;
        this.gateChart = null;
        this.canvasId = null;  // Store canvas ID for reinitialization
        this.varList = [
            'm', 'h', 'n',
            'I_Na (uA)', 'I_K (uA)', 'g_Na (uS)',
            'g_K (uS)', 'I_leak (uA)', 'blank'
        ];
        this.selectedVars = ['m', 'h', 'n'];
        this.defaultYMin = -100;
        this.defaultYMax = 60;
        this.defaultXMin = 0;
        this.defaultXMax = 50;
        this.windowSize = 50;
        this.slideAmount = 10;
        this.bufferSize = 5000;  // Similar to MATLAB's nbins
        this.updateCount = 0;   // Track updates for throttling
        this.updateThreshold = 4; // Update every N points (like MATLAB's cachesize)
    }

    // Initialize both plots
    initMainPlot(canvasId) {
        // Initialize voltage plot
        const voltageCtx = document.getElementById('plotCanvas').getContext('2d');
        this.voltageChart = new Chart(voltageCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Membrane Potential (mV)',
                        data: [],
                        borderColor: 'rgb(255, 0, 0)', // Red for membrane voltage
                        tension: 0.1
                    },
                    {
                        label: 'Stimulus Current (μA/cm²)',
                        data: [],
                        borderColor: 'rgb(128, 0, 255)', // Purple for stimulus
                        tension: 0.1,
                        yAxisID: 'stimulus'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        type: 'linear',
                        bounds: 'data',
                        min: this.defaultXMin,
                        max: this.defaultXMax,
                        title: {
                            display: true,
                            text: 'Time (ms)'
                        }
                    },
                    y: {
                        type: 'linear',
                        bounds: 'data',
                        min: this.defaultYMin,
                        max: this.defaultYMax,
                        title: {
                            display: true,
                            text: 'Membrane Potential (mV)'
                        }
                    },
                    stimulus: {
                        type: 'linear',
                        bounds: 'data',
                        position: 'right',
                        min: -20,
                        max: 20,
                        title: {
                            display: true,
                            text: 'Current (μA/cm²)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });

        // Initialize gate kinetics plot
        const gateCtx = document.getElementById('gateCanvas').getContext('2d');
        this.gateChart = new Chart(gateCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'm (Na+ activation)',
                        data: [],
                        borderColor: 'rgb(255, 255, 0)', // Yellow for m
                        tension: 0.1
                    },
                    {
                        label: 'h (Na+ inactivation)',
                        data: [],
                        borderColor: 'rgb(0, 255, 0)', // Green for h
                        tension: 0.1
                    },
                    {
                        label: 'n (K+ activation)',
                        data: [],
                        borderColor: 'rgb(0, 255, 255)', // Cyan for n
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        type: 'linear',
                        bounds: 'data',
                        min: this.defaultXMin,
                        max: this.defaultXMax,
                        title: {
                            display: true,
                            text: 'Time (ms)'
                        }
                    },
                    y: {
                        type: 'linear',
                        bounds: 'data',
                        min: 0,
                        max: 1,
                        title: {
                            display: true,
                            text: 'Gate Value'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }

    resetView() {
        if (!this.voltageChart || !this.gateChart) return;

        // Destroy existing charts
        this.voltageChart.destroy();
        this.gateChart.destroy();

        // Reinitialize both charts
        this.initMainPlot();

        // Reset all internal state
        this.updateCount = 0;
        
        // Force an immediate update
        this.voltageChart.update('none');
        this.gateChart.update('none');
    }

    updatePlot(data, isReset = false) {
        if (!this.voltageChart || !this.gateChart) return;

        // Update voltage plot
        if (isReset) {
            this.voltageChart.data.labels = [];
            this.voltageChart.data.datasets[0].data = [];
            this.voltageChart.data.datasets[1].data = [];
            this.gateChart.data.labels = [];
            this.gateChart.data.datasets[0].data = [];
            this.gateChart.data.datasets[1].data = [];
            this.gateChart.data.datasets[2].data = [];
        }

        // Get the latest time point
        const lastTime = data.time[data.time.length - 1] || 0;

        // Check if we need to slide the window
        if (lastTime > this.voltageChart.options.scales.x.max) {
            const slideDistance = this.slideAmount;
            const newMin = Math.max(0, lastTime - this.windowSize);
            const newMax = lastTime;
            
            this.voltageChart.options.scales.x.min = newMin;
            this.voltageChart.options.scales.x.max = newMax;
            this.gateChart.options.scales.x.min = newMin;
            this.gateChart.options.scales.x.max = newMax;
        }

        // Update voltage and stimulus data
        this.voltageChart.data.labels = data.time;
        this.voltageChart.data.datasets[0].data = data.voltage;
        this.voltageChart.data.datasets[1].data = data.time.map((_, i) => data.stimCurrent[i] || 0);

        // Update gate kinetics data
        this.gateChart.data.labels = data.time;
        this.gateChart.data.datasets[0].data = data.gating.m;
        this.gateChart.data.datasets[1].data = data.gating.h;
        this.gateChart.data.datasets[2].data = data.gating.n;

        // Auto-adjust voltage plot y-axis if needed
        const voltages = data.voltage;
        if (voltages.length > 0) {
            const minV = Math.min(...voltages);
            const maxV = Math.max(...voltages);
            if (minV < this.voltageChart.options.scales.y.min) {
                this.voltageChart.options.scales.y.min = Math.floor(minV / 20) * 20;
            }
            if (maxV > this.voltageChart.options.scales.y.max) {
                this.voltageChart.options.scales.y.max = Math.ceil(maxV / 20) * 20;
            }
        }

        // Keep data buffer at reasonable size
        if (data.time.length > this.bufferSize) {
            const excess = data.time.length - this.bufferSize;
            // Trim voltage plot data
            this.voltageChart.data.labels = data.time.slice(excess);
            this.voltageChart.data.datasets[0].data = data.voltage.slice(excess);
            this.voltageChart.data.datasets[1].data = data.time.slice(excess).map((_, i) => data.stimCurrent[i + excess] || 0);
            
            // Trim gate plot data
            this.gateChart.data.labels = data.time.slice(excess);
            this.gateChart.data.datasets[0].data = data.gating.m.slice(excess);
            this.gateChart.data.datasets[1].data = data.gating.h.slice(excess);
            this.gateChart.data.datasets[2].data = data.gating.n.slice(excess);
        }

        // Update both charts
        this.voltageChart.update('none');
        this.gateChart.update('none');
    }

    // Set the x-axis limits
    setXAxisLimits(center, width) {
        if (!this.voltageChart || !this.gateChart) return;
        
        const min = Math.max(0, center - width/2);
        const max = center + width/2;
        
        this.voltageChart.options.scales.x.min = min;
        this.voltageChart.options.scales.x.max = max;
        this.gateChart.options.scales.x.min = min;
        this.gateChart.options.scales.x.max = max;
        this.voltageChart.update('none');
        this.gateChart.update('none');
    }

    // Resize the plot
    resizePlot(factor) {
        if (!this.voltageChart || !this.gateChart) return;
        
        const currentMin = this.voltageChart.options.scales.x.min;
        const currentMax = this.voltageChart.options.scales.x.max;
        const currentWidth = currentMax - currentMin;
        const center = (currentMax + currentMin) / 2;
        
        const newWidth = factor > 0 ? currentWidth * 1.5 : currentWidth / 1.5;
        this.setXAxisLimits(center, newWidth);
    }

    // Destroy the chart instance
    destroy() {
        if (this.voltageChart) {
            this.voltageChart.destroy();
            this.voltageChart = null;
        }
        if (this.gateChart) {
            this.gateChart.destroy();
            this.gateChart = null;
        }
    }
}

export default PlotManager; 