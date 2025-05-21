class PlotManager {
    constructor() {
        this.chart = null;
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
        this.bufferSize = 500;  // Similar to MATLAB's nbins
        this.updateCount = 0;   // Track updates for throttling
        this.updateThreshold = 4; // Update every N points (like MATLAB's cachesize)
    }

    // Initialize the main voltage plot
    initMainPlot(canvasId) {
        this.canvasId = canvasId;  // Store canvas ID
        const ctx = document.getElementById(canvasId).getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Membrane Potential (mV)',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        yAxisID: 'y'
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
                        min: this.defaultYMin,
                        max: this.defaultYMax,
                        title: {
                            display: true,
                            text: 'Membrane Potential (mV)'
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

    // Reset plot to default view
    resetView() {
        if (!this.chart || !this.canvasId) return;

        console.log('Destroying old chart...');
        // Destroy and remove the old chart completely
        this.chart.destroy();
        
        console.log('Creating new chart...');
        // Get a fresh context
        const canvas = document.getElementById(this.canvasId);
        const ctx = canvas.getContext('2d');
        
        // Clear any remaining pixels
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Create a completely new chart instance
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Membrane Potential (mV)',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        yAxisID: 'y'
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
                        min: this.defaultYMin,
                        max: this.defaultYMax,
                        title: {
                            display: true,
                            text: 'Membrane Potential (mV)'
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

        // Reset internal state
        this.updateCount = 0;
        console.log('Chart reset complete. Axis range:', this.defaultXMin, 'to', this.defaultXMax);
    }

    // Update the plot with new data
    updatePlot(data, isReset = false) {
        if (!this.chart) return;

        // If this is a reset, force window back to default position
        if (isReset) {
            console.log('Handling reset in updatePlot...');
            this.resetView();
            return;
        }

        // Update data
        this.chart.data.labels = data.time;
        this.chart.data.datasets[0].data = data.voltage;

        // Get current window position
        const currentMin = this.chart.options.scales.x.min;
        const currentMax = this.chart.options.scales.x.max;
        
        // Get the latest time point
        const lastTime = data.time[data.time.length - 1] || 0;

        // Only update window position every N points
        this.updateCount++;
        if (this.updateCount >= this.updateThreshold) {
            this.updateCount = 0;

            // If we're beyond the current window
            if (lastTime > currentMax) {
                // Calculate new window position based on slideAmount (10ms)
                const slidesToAdd = Math.floor((lastTime - currentMax) / this.slideAmount) + 1;
                const slideDistance = this.slideAmount * slidesToAdd;
                const newMin = currentMin + slideDistance;
                const newMax = newMin + this.windowSize;
                
                console.log('Sliding window:', newMin, 'to', newMax);
                
                // Update the window position
                this.chart.options.scales.x.min = newMin;
                this.chart.options.scales.x.max = newMax;
            }
        }

        // Auto-adjust y-axis if data extends beyond current view
        const voltages = data.voltage;
        if (voltages.length > 0) {
            const minV = Math.min(...voltages);
            const maxV = Math.max(...voltages);
            if (minV < this.chart.options.scales.y.min) {
                this.chart.options.scales.y.min = Math.floor(minV / 20) * 20;
            }
            if (maxV > this.chart.options.scales.y.max) {
                this.chart.options.scales.y.max = Math.ceil(maxV / 20) * 20;
            }
        }

        // Keep data buffer at reasonable size
        if (data.time.length > this.bufferSize) {
            const excess = data.time.length - this.bufferSize;
            this.chart.data.labels = data.time.slice(excess);
            this.chart.data.datasets[0].data = data.voltage.slice(excess);
        }

        this.chart.update('none');
    }

    // Set the x-axis limits
    setXAxisLimits(center, width) {
        if (!this.chart) return;
        
        const min = Math.max(0, center - width/2);
        const max = center + width/2;
        
        this.chart.options.scales.x.min = min;
        this.chart.options.scales.x.max = max;
        this.chart.update('none');
    }

    // Resize the plot
    resizePlot(factor) {
        if (!this.chart) return;
        
        const currentMin = this.chart.options.scales.x.min;
        const currentMax = this.chart.options.scales.x.max;
        const currentWidth = currentMax - currentMin;
        const center = (currentMax + currentMin) / 2;
        
        const newWidth = factor > 0 ? currentWidth * 1.5 : currentWidth / 1.5;
        this.setXAxisLimits(center, newWidth);
    }

    // Destroy the chart instance
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

export default PlotManager; 