import HHModel from './hh-model.js';

class Simulator {
    constructor() {
        this.model = new HHModel();
        this.running = false;
        this.animationFrameId = null;
        this._isResetting = false;  // Flag to track reset state
        this.dataBuffer = {
            time: [],
            voltage: [],
            iNa: [],
            iK: [],
            iL: [],
            gating: {
                m: [],
                h: [],
                n: []
            },
            stim1: this.stim1,
            stim2: this.stim2
        };
        this.bufferSize = 2000;
        this.onUpdate = null;
        this.stim1 = {
            amplitude: 10,   // μA/cm²
            duration: 1,     // ms
            active: false,
            startTime: 0     // ms
        };
        this.stim2 = {
            amplitude: -10,  // μA/cm²
            duration: 2,     // ms (Changed from 1ms to 2ms to match MATLAB)
            active: false,
            startTime: 0     // ms
        };
        
        // Add arrays to track multiple stimulus events
        this.stim1Events = [];
        this.stim2Events = [];
        
        // Store initial state
        this.storeData(this.model.time, {
            V: this.model.V,
            m: this.model.m,
            h: this.model.h,
            n: this.model.n,
            iNa: 0,
            iK: 0,
            iL: 0
        });
    }

    // Stop the simulation
    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.running = false;
        this.stim1.active = false;
        this.stim2.active = false;
    }

    // Calculate total stimulus current at a given time
    calculateStimulusCurrent(t) {
        let iStim = 0;
        
        // Check all stim1 events
        for (const event of this.stim1Events) {
            if (t >= event.startTime && t < event.startTime + event.duration) {
                iStim += event.amplitude;
            }
        }
        
        // Check all stim2 events
        for (const event of this.stim2Events) {
            if (t >= event.startTime && t < event.startTime + event.duration) {
                iStim += event.amplitude;
            }
        }
        
        // Match MATLAB implementation scaling (no conversion needed since we're already in μA/cm²)
        return iStim;
    }

    // Store simulation data
    storeData(time, data) {
        // Only store data every few steps to avoid overwhelming the chart
        if (this.dataBuffer.time.length === 0 || 
            time - this.dataBuffer.time[this.dataBuffer.time.length - 1] >= 0.05) {
            
            this.dataBuffer.time.push(time);
            this.dataBuffer.voltage.push(data.V);
            this.dataBuffer.iNa.push(data.iNa);
            this.dataBuffer.iK.push(data.iK);
            this.dataBuffer.iL.push(data.iL);
            this.dataBuffer.gating.m.push(data.m);
            this.dataBuffer.gating.h.push(data.h);
            this.dataBuffer.gating.n.push(data.n);
            this.dataBuffer.stim1Events = this.stim1Events;  // Include stimulus events
            this.dataBuffer.stim2Events = this.stim2Events;
            
            // Keep data arrays at reasonable size
            if (this.dataBuffer.time.length > this.bufferSize) {
                this.dataBuffer.time.shift();
                this.dataBuffer.voltage.shift();
                this.dataBuffer.iNa.shift();
                this.dataBuffer.iK.shift();
                this.dataBuffer.iL.shift();
                this.dataBuffer.gating.m.shift();
                this.dataBuffer.gating.h.shift();
                this.dataBuffer.gating.n.shift();
            }
        }
    }

    // Run simulation for a specified duration
    runFor(duration) {
        if (!this.running) {
            this.running = true;
            this.endTime = this.model.time + duration;
        }
        
        let lastUpdateTime = performance.now();
        const targetFrameTime = 1000 / 60; // Target 60 FPS
        let accumulatedTime = 0;
        const maxTimeStep = 0.1; // Maximum time step in ms (matching MATLAB's default)
        
        const simulate = (currentTime) => {
            if (!this.running) return;

            const deltaTime = Math.min(currentTime - lastUpdateTime, 50); // Cap at 50ms to prevent huge jumps
            accumulatedTime += deltaTime;
            
            // Only update if enough time has passed
            while (accumulatedTime >= targetFrameTime) {
                // Run multiple steps per frame for efficiency
                const numSteps = Math.ceil(targetFrameTime / maxTimeStep); // Use ceil to ensure we don't exceed maxTimeStep
                const dt = targetFrameTime / numSteps;
                
                for (let i = 0; i < numSteps; i++) {
                    const iStim = this.calculateStimulusCurrent(this.model.time);
                    const data = this.model.step(iStim);
                    this.storeData(this.model.time, data);
                    
                    if (this.model.time >= this.endTime) {
                        this.stop();
                        if (this.onUpdate) this.onUpdate(this.dataBuffer, false); // Explicitly pass false for non-reset updates
                        return;
                    }
                }
                
                accumulatedTime -= targetFrameTime;
                if (this.onUpdate) this.onUpdate(this.dataBuffer, false); // Explicitly pass false for non-reset updates
            }
            
            lastUpdateTime = currentTime;
            
            if (this.model.time < this.endTime) {
                this.animationFrameId = requestAnimationFrame(simulate);
            } else {
                this.stop();
            }
        };
        
        this.animationFrameId = requestAnimationFrame(simulate);
    }

    // Apply stimulus 1
    applyStim1() {
        // Create a new stimulus event
        const newEvent = {
            amplitude: this.stim1.amplitude,
            duration: this.stim1.duration,
            startTime: this.model.time
        };
        this.stim1Events.push(newEvent);
        
        // Start simulation if not running
        if (!this.running) {
            this.runFor(50);
        } else {
            // Extend simulation time if running
            const endTime = this.model.time + 50;
            if (endTime > this.endTime) {
                this.endTime = endTime;
            }
        }
    }

    // Apply stimulus 2
    applyStim2() {
        // Create a new stimulus event
        const newEvent = {
            amplitude: this.stim2.amplitude,
            duration: this.stim2.duration,
            startTime: this.model.time
        };
        this.stim2Events.push(newEvent);
        
        // Start simulation if not running
        if (!this.running) {
            this.runFor(50);
        } else {
            // Extend simulation time if running
            const endTime = this.model.time + 50;
            if (endTime > this.endTime) {
                this.endTime = endTime;
            }
        }
    }

    // Reset simulation
    reset() {
        console.log('Starting simulator reset...');
        
        this._isResetting = true;  // Set reset flag
        
        try {
            // Stop any ongoing simulation
            this.stop();
            
            // Reset the model to initial conditions
            this.model.reset();
            this.endTime = 0;
            
            // Reset stimulus states and clear events
            this.stim1.active = false;
            this.stim2.active = false;
            this.stim1Events = [];
            this.stim2Events = [];
            
            // Clear all data buffers
            this.dataBuffer = {
                time: [0],  // Start with initial time point
                voltage: [this.model.V],  // Start with initial voltage
                iNa: [0],
                iK: [0],
                iL: [0],
                gating: {
                    m: [this.model.m],
                    h: [this.model.h],
                    n: [this.model.n]
                },
                stim1: this.stim1,
                stim2: this.stim2
            };
            
            // Store initial state
            this.storeData(0, {
                V: this.model.V,
                m: this.model.m,
                h: this.model.h,
                n: this.model.n,
                iNa: 0,
                iK: 0,
                iL: 0
            });
            
            console.log('Simulator reset complete with initial state:', {
                time: this.dataBuffer.time[0],
                voltage: this.dataBuffer.voltage[0]
            });
            
            // Notify plot manager with reset flag
            if (this.onUpdate) {
                console.log('Notifying plot manager of reset');
                this.onUpdate(this.dataBuffer, true);
            }
        } finally {
            this._isResetting = false;  // Always clear reset flag
        }
    }

    // Clear history but keep current state
    clearHistory() {
        const currentTime = this.model.time;
        const currentV = this.model.V;
        
        // Clear data buffers but keep current state
        this.dataBuffer.time = [currentTime];
        this.dataBuffer.voltage = [currentV];
        this.dataBuffer.iNa = [0];
        this.dataBuffer.iK = [0];
        this.dataBuffer.iL = [0];
        this.dataBuffer.gating.m = [this.model.m];
        this.dataBuffer.gating.h = [this.model.h];
        this.dataBuffer.gating.n = [this.model.n];
        
        if (this.onUpdate) this.onUpdate(this.dataBuffer);
    }

    // Update model parameters
    updateParameters(params) {
        this.model.updateParameters(params);
        if (params.stim1) Object.assign(this.stim1, params.stim1);
        if (params.stim2) Object.assign(this.stim2, params.stim2);
        
        // Only notify of updates if we're not in the middle of a reset
        if (!this._isResetting && this.onUpdate) {
            this.onUpdate(this.dataBuffer, false);
        }
    }
}

export default Simulator; 