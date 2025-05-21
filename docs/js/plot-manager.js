class PlotManager {
    constructor() {
        this.chart = null;
        this.varList = [
            'm', 'h', 'n',
            'I_Na (uA)', 'I_K (uA)', 'g_Na (uS)',
            'g_K (uS)', 'I_leak (uA)', 'blank'
        ];
        this.selectedVars = ['m', 'h', 'n'];
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
                animation: false,
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Time (ms)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Membrane Potential (mV)'
                        }
                    }
                }
            }
        });
    }

    // Update the plot with new data
    updatePlot(data) {
        if (!this.chart) return;

        this.chart.data.labels = data.time;
        this.chart.data.datasets[0].data = data.voltage;
        this.chart.update('none'); // 'none' for no animation to improve performance
    }

    // Change the variables being plotted in the lower panel
    changeVariables(varIndices) {
        this.selectedVars = varIndices.map(i => this.varList[i]);
        // Implementation for changing plotted variables would go here
    }

    // Get the value for a specific variable from the simulation data
    getVarValue(varName, data) {
        switch(varName) {
            case 'm':
                return data.gating.m;
            case 'h':
                return data.gating.h;
            case 'n':
                return data.gating.n;
            case 'I_Na (uA)':
                return data.iNa;
            case 'I_K (uA)':
                return data.iK;
            case 'I_leak (uA)':
                return data.iL;
            case 'g_Na (uS)':
                // Calculate Na conductance
                return data.gating.m.map((m, i) => 
                    120 * Math.pow(m, 3) * data.gating.h[i]
                );
            case 'g_K (uS)':
                // Calculate K conductance
                return data.gating.n.map(n => 
                    36 * Math.pow(n, 4)
                );
            default:
                return Array(data.time.length).fill(0);
        }
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