class PlotManager {
    constructor() {
        this.chart = null;
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
    }

    // Initialize the main voltage plot
    initMainPlot(canvasId) {
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

    // Update the plot with new data
    updatePlot(data) {
        if (!this.chart) return;

        // Update data
        this.chart.data.labels = data.time;
        this.chart.data.datasets[0].data = data.voltage;

        // Get current window position
        const currentMin = this.chart.options.scales.x.min;
        const currentMax = this.chart.options.scales.x.max;
        
        // Check if we need to slide the window
        const lastTime = data.time[data.time.length - 1] || 0;
        if (lastTime > currentMax) {
            // Calculate how many slide increments we need
            const slidesNeeded = Math.floor((lastTime - currentMax) / this.slideAmount) + 1;
            const slideDistance = this.slideAmount * slidesNeeded;
            
            // Update the window position, maintaining the fixed window size
            const newMin = currentMin + slideDistance;
            const newMax = newMin + this.windowSize;
            
            this.chart.options.scales.x.min = newMin;
            this.chart.options.scales.x.max = newMax;
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

        this.chart.update('none'); // 'none' for no animation to improve performance
    }

    // Reset plot to default view
    resetView() {
        if (!this.chart) return;
        
        this.chart.options.scales.x.min = this.defaultXMin;
        this.chart.options.scales.x.max = this.defaultXMax;
        this.chart.options.scales.y.min = this.defaultYMin;
        this.chart.options.scales.y.max = this.defaultYMax;
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