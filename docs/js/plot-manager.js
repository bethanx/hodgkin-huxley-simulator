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
        this.defaultYMin = -100;
        this.defaultYMax = 60;
        this.defaultXMin = 0;
        this.defaultXMax = 50;
        this.windowSize = 50;
        this.slideAmount = 10;
        this.bufferSize = 5000;
        this.updateCount = 0;
        this.updateThreshold = 4;

        // Fixed y-axis ranges
        this.voltageYMin = -100;
        this.voltageYMax = 60;
        this.stimulusYMin = -20;
        this.stimulusYMax = 20;
        this.gateYMin = 0;
        this.gateYMax = 1;
    }

    // Initialize both plots
    initPlots(voltageCanvasId, gateKineticsCanvasId) {
        this.voltageCanvasId = voltageCanvasId;
        this.gateKineticsCanvasId = gateKineticsCanvasId;
        
        // Initialize voltage plot
        const voltageCtx = document.getElementById(voltageCanvasId).getContext('2d');
        this.voltageChart = new Chart(voltageCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Membrane Potential (mV)',
                        data: [],
                        borderColor: 'rgb(255, 0, 0)',
                        tension: 0.1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Stimulus Current (μA/cm²)',
                        data: [],
                        borderColor: 'rgb(128, 0, 128)',
                        tension: 0.1,
                        yAxisID: 'y2'
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
                        min: this.defaultXMin,
                        max: this.defaultXMax,
                        title: {
                            display: true,
                            text: 'Time (ms)'
                        }
                    },
                    y: {
                        min: this.voltageYMin,
                        max: this.voltageYMax,
                        title: {
                            display: true,
                            text: 'Membrane Potential (mV)'
                        }
                    },
                    y2: {
                        type: 'linear',
                        position: 'right',
                        min: this.stimulusYMin,
                        max: this.stimulusYMax,
                        title: {
                            display: true,
                            text: 'Stimulus Current (μA/cm²)'
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
        const gateKineticsCtx = document.getElementById(gateKineticsCanvasId).getContext('2d');
        this.gateKineticsChart = new Chart(gateKineticsCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'm (Na+ activation)',
                        data: [],
                        borderColor: 'rgb(255, 255, 0)',
                        tension: 0.1
                    },
                    {
                        label: 'h (Na+ inactivation)',
                        data: [],
                        borderColor: 'rgb(0, 255, 0)',
                        tension: 0.1
                    },
                    {
                        label: 'n (K+ activation)',
                        data: [],
                        borderColor: 'rgb(0, 255, 255)',
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
                        min: this.defaultXMin,
                        max: this.defaultXMax,
                        title: {
                            display: true,
                            text: 'Time (ms)'
                        }
                    },
                    y: {
                        min: this.gateYMin,
                        max: this.gateYMax,
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

    // Reset plots to default view
    resetView() {
        if (!this.voltageChart || !this.gateKineticsChart) return;

        console.log('Starting charts reset...');
        
        // Reset voltage plot
        const oldVoltageCanvas = document.getElementById(this.voltageCanvasId);
        const voltageParent = oldVoltageCanvas.parentNode;
        const voltageWidth = oldVoltageCanvas.width;
        const voltageHeight = oldVoltageCanvas.height;
        
        this.voltageChart.destroy();
        this.voltageChart = null;
        oldVoltageCanvas.remove();
        
        const newVoltageCanvas = document.createElement('canvas');
        newVoltageCanvas.id = this.voltageCanvasId;
        newVoltageCanvas.width = voltageWidth;
        newVoltageCanvas.height = voltageHeight;
        voltageParent.appendChild(newVoltageCanvas);

        // Reset gate kinetics plot
        const oldGateCanvas = document.getElementById(this.gateKineticsCanvasId);
        const gateParent = oldGateCanvas.parentNode;
        const gateWidth = oldGateCanvas.width;
        const gateHeight = oldGateCanvas.height;
        
        this.gateKineticsChart.destroy();
        this.gateKineticsChart = null;
        oldGateCanvas.remove();
        
        const newGateCanvas = document.createElement('canvas');
        newGateCanvas.id = this.gateKineticsCanvasId;
        newGateCanvas.width = gateWidth;
        newGateCanvas.height = gateHeight;
        gateParent.appendChild(newGateCanvas);

        // Reinitialize both plots
        this.initPlots(this.voltageCanvasId, this.gateKineticsCanvasId);
        
        // Reset all internal state
        this.updateCount = 0;
        
        console.log('Charts reset complete');
    }

    // Update both plots with new data
    updatePlots(data, isReset = false) {
        if (!this.voltageChart || !this.gateKineticsChart) return;

        // If this is a reset, force window back to default position
        if (isReset) {
            console.log('Handling reset in updatePlots...');
            this.resetView();
            return;
        }

        // Calculate stimulus current data
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

        // Update voltage plot data
        this.voltageChart.data.labels = data.time;
        this.voltageChart.data.datasets[0].data = data.voltage;
        this.voltageChart.data.datasets[1].data = stimulusCurrent;

        // Update gate kinetics plot data
        this.gateKineticsChart.data.labels = data.time;
        this.gateKineticsChart.data.datasets[0].data = data.gating.m;
        this.gateKineticsChart.data.datasets[1].data = data.gating.h;
        this.gateKineticsChart.data.datasets[2].data = data.gating.n;

        // Get current window position
        const currentMin = this.voltageChart.options.scales.x.min;
        const currentMax = this.voltageChart.options.scales.x.max;
        
        // Get the latest time point
        const lastTime = data.time[data.time.length - 1] || 0;

        // Check if we need to slide the window
        if (lastTime > currentMax) {
            const timeOverflow = lastTime - currentMax;
            const slidesNeeded = Math.ceil(timeOverflow / this.slideAmount);
            const slideDistance = this.slideAmount;
            
            const newMin = currentMin + slideDistance;
            const newMax = currentMin + this.windowSize + slideDistance;
            
            console.log(`Sliding window by ${slideDistance}ms:`, newMin, 'to', newMax);
            
            // Update both plots' x-axis
            this.voltageChart.options.scales.x.min = newMin;
            this.voltageChart.options.scales.x.max = newMax;
            this.gateKineticsChart.options.scales.x.min = newMin;
            this.gateKineticsChart.options.scales.x.max = newMax;
        }

        // Keep data buffer at reasonable size
        if (data.time.length > this.bufferSize) {
            const excess = data.time.length - this.bufferSize;
            
            // Trim voltage plot data
            this.voltageChart.data.labels = data.time.slice(excess);
            this.voltageChart.data.datasets[0].data = data.voltage.slice(excess);
            this.voltageChart.data.datasets[1].data = stimulusCurrent.slice(excess);
            
            // Trim gate kinetics plot data
            this.gateKineticsChart.data.labels = data.time.slice(excess);
            this.gateKineticsChart.data.datasets[0].data = data.gating.m.slice(excess);
            this.gateKineticsChart.data.datasets[1].data = data.gating.h.slice(excess);
            this.gateKineticsChart.data.datasets[2].data = data.gating.n.slice(excess);
        }

        // Update both charts
        this.voltageChart.update('none');
        this.gateKineticsChart.update('none');
    }

    // Set the x-axis limits for both plots
    setXAxisLimits(center, width) {
        if (!this.voltageChart || !this.gateKineticsChart) return;
        
        const min = Math.max(0, center - width/2);
        const max = center + width/2;
        
        this.voltageChart.options.scales.x.min = min;
        this.voltageChart.options.scales.x.max = max;
        this.gateKineticsChart.options.scales.x.min = min;
        this.gateKineticsChart.options.scales.x.max = max;
        
        this.voltageChart.update('none');
        this.gateKineticsChart.update('none');
    }

    // Resize both plots
    resizePlot(factor) {
        if (!this.voltageChart || !this.gateKineticsChart) return;
        
        const currentMin = this.voltageChart.options.scales.x.min;
        const currentMax = this.voltageChart.options.scales.x.max;
        const currentWidth = currentMax - currentMin;
        const center = (currentMax + currentMin) / 2;
        
        const newWidth = factor > 0 ? currentWidth * 1.5 : currentWidth / 1.5;
        this.setXAxisLimits(center, newWidth);
    }

    // Destroy both plots
    destroy() {
        if (this.voltageChart) {
            this.voltageChart.destroy();
            this.voltageChart = null;
        }
        if (this.gateKineticsChart) {
            this.gateKineticsChart.destroy();
            this.gateKineticsChart = null;
        }
    }
}

export default PlotManager; 