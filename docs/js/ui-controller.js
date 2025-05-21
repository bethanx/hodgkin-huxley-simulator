import Simulator from './simulator.js';
import PlotManager from './plot-manager.js';

class UIController {
    constructor() {
        this.simulator = new Simulator();
        this.plotManager = new PlotManager();
        this.activeTab = 'membrane';
        
        // Bind simulator update callback
        this.simulator.onUpdate = (data, isReset) => this.plotManager.updatePlots(data, isReset);
    }

    // Initialize the UI
    init() {
        this.initializePlots();
        this.setupEventListeners();
        this.setupTabSystem();
        this.loadInitialParameters();
    }

    // Initialize plots
    initializePlots() {
        this.plotManager.initPlots('plotCanvas', 'gateKineticsCanvas');
    }

    // Set up event listeners for all UI elements
    setupEventListeners() {
        // Stimulus buttons
        document.getElementById('stim1').addEventListener('click', () => {
            this.simulator.applyStim1();
        });
        
        document.getElementById('stim2').addEventListener('click', () => {
            this.simulator.applyStim2();
        });
        
        // Control buttons
        document.getElementById('resetBtn').addEventListener('click', () => {
            console.log('Reset button clicked - starting reset sequence');
            
            // Reset the simulator which will trigger the plot reset through the update callback
            this.simulator.reset();
            
            // Update all UI inputs to match reset state
            this.updateAllInputs();
            
            console.log('Reset sequence complete');
        });
        
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.simulator.clearHistory();
        });

        // Drug controls
        document.getElementById('ttxLevel').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('ttxValue').textContent = `${value}%`;
            this.simulator.updateParameters({ ttxBlock: value / 100 });
        });
        
        document.getElementById('teaLevel').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('teaValue').textContent = `${value}%`;
            this.simulator.updateParameters({ teaBlock: value / 100 });
        });
        
        document.getElementById('pronaseCheck').addEventListener('change', (e) => {
            this.simulator.updateParameters({ pronase: e.target.checked });
        });

        // Add input event listeners for all numeric inputs
        const numericInputs = document.querySelectorAll('input[type="number"]');
        numericInputs.forEach(input => {
            input.addEventListener('change', () => this.handleParameterChange());
        });
    }

    // Set up tab switching system
    setupTabSystem() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all tabs
                document.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Add active class to selected tab
                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                document.getElementById(`${tabId}-tab`).classList.add('active');
                this.activeTab = tabId;
            });
        });
    }

    // Load initial parameters from the UI
    loadInitialParameters() {
        const params = {
            // Membrane properties
            Cm: parseFloat(document.getElementById('capacitance').value),
            V: parseFloat(document.getElementById('restingPotential').value),
            
            // Channel conductances and reversal potentials
            gNaMax: parseFloat(document.getElementById('gNaMax').value),
            gKMax: parseFloat(document.getElementById('gKMax').value),
            gL: parseFloat(document.getElementById('gL').value),
            ENa: parseFloat(document.getElementById('ENa').value),
            EK: parseFloat(document.getElementById('EK').value),
            EL: parseFloat(document.getElementById('EL').value),
            
            // Stimulus parameters
            stim1: {
                amplitude: parseFloat(document.getElementById('stim1Amp').value),
                duration: parseFloat(document.getElementById('stim1Duration').value)
            },
            stim2: {
                amplitude: parseFloat(document.getElementById('stim2Amp').value),
                duration: parseFloat(document.getElementById('stim2Duration').value)
            },
            
            // Drug effects
            ttxBlock: parseFloat(document.getElementById('ttxLevel').value) / 100,
            teaBlock: parseFloat(document.getElementById('teaLevel').value) / 100,
            pronase: document.getElementById('pronaseCheck').checked
        };
        
        this.simulator.updateParameters(params);
    }

    // Update all input elements to match model state
    updateAllInputs() {
        // Set flag to prevent parameter updates while we update inputs
        this._updatingInputs = true;
        
        const model = this.simulator.model;
        
        try {
            // Update membrane properties
            document.getElementById('capacitance').value = model.Cm;
            document.getElementById('restingPotential').value = model.V;
            
            // Update channel properties
            document.getElementById('gNaMax').value = model.gNaMax;
            document.getElementById('gKMax').value = model.gKMax;
            document.getElementById('gL').value = model.gL;
            document.getElementById('ENa').value = model.ENa;
            document.getElementById('EK').value = model.EK;
            document.getElementById('EL').value = model.EL;
            
            // Update stimulus properties
            document.getElementById('stim1Amp').value = this.simulator.stim1.amplitude;
            document.getElementById('stim1Duration').value = this.simulator.stim1.duration;
            document.getElementById('stim2Amp').value = this.simulator.stim2.amplitude;
            document.getElementById('stim2Duration').value = this.simulator.stim2.duration;
            
            // Update drug controls
            document.getElementById('ttxLevel').value = model.ttxBlock * 100;
            document.getElementById('ttxValue').textContent = `${model.ttxBlock * 100}%`;
            document.getElementById('teaLevel').value = model.teaBlock * 100;
            document.getElementById('teaValue').textContent = `${model.teaBlock * 100}%`;
            document.getElementById('pronaseCheck').checked = model.pronase;
        } finally {
            // Always clear the flag, even if an error occurs
            this._updatingInputs = false;
        }
    }

    // Handle parameter changes from the UI
    handleParameterChange() {
        // Skip if we're just updating the input values programmatically
        if (this._updatingInputs) return;
        
        this.loadInitialParameters();
    }

    // Clean up resources
    destroy() {
        this.plotManager.destroy();
    }
}

export default UIController; 