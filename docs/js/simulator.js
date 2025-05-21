import HHModel from './hh-model.js';

class Simulator {
    constructor() {
        this.model = new HHModel();
        this.running = false;
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
            }
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
            duration: 1,     // ms
            active: false,
            startTime: 0     // ms
        };
    }

    // Calculate total stimulus current at a given time
    calculateStimulusCurrent(t) {
        let iStim = 0;
        
        if (this.stim1.active && 
            t >= this.stim1.startTime && 
            t < this.stim1.startTime + this.stim1.duration) {
            iStim += this.stim1.amplitude;
        }
        
        if (this.stim2.active && 
            t >= this.stim2.startTime && 
            t < this.stim2.startTime + this.stim2.duration) {
            iStim += this.stim2.amplitude;
        }
        
        return iStim / 1000; // Convert μA/cm² to mA/cm²
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
        if (this.running) return;
        this.running = true;
        
        const endTime = this.model.time + duration;
        
        const simulate = () => {
            // Run multiple steps per frame for efficiency
            for (let i = 0; i < 10; i++) {
                const iStim = this.calculateStimulusCurrent(this.model.time);
                const data = this.model.step(iStim);
                this.storeData(this.model.time, data);
                
                if (this.model.time >= endTime) {
                    this.running = false;
                    this.stim1.active = false;
                    this.stim2.active = false;
                    if (this.onUpdate) this.onUpdate(this.dataBuffer);
                    return;
                }
            }
            
            if (this.onUpdate) this.onUpdate(this.dataBuffer);
            
            if (this.model.time < endTime) {
                requestAnimationFrame(simulate);
            } else {
                this.running = false;
                this.stim1.active = false;
                this.stim2.active = false;
            }
        };
        
        simulate();
    }

    // Apply stimulus 1
    applyStim1() {
        this.stim1.active = true;
        this.stim1.startTime = this.model.time;
        this.runFor(50); // Run for 50ms after stimulus
    }

    // Apply stimulus 2
    applyStim2() {
        this.stim2.active = true;
        this.stim2.startTime = this.model.time;
        this.runFor(50); // Run for 50ms after stimulus
    }

    // Reset simulation
    reset() {
        this.model.reset();
        this.running = false;
        this.stim1.active = false;
        this.stim2.active = false;
        this.dataBuffer.time = [];
        this.dataBuffer.voltage = [];
        this.dataBuffer.iNa = [];
        this.dataBuffer.iK = [];
        this.dataBuffer.iL = [];
        this.dataBuffer.gating.m = [];
        this.dataBuffer.gating.h = [];
        this.dataBuffer.gating.n = [];
        if (this.onUpdate) this.onUpdate(this.dataBuffer);
    }

    // Clear history but keep current state
    clearHistory() {
        const currentTime = this.model.time;
        const currentV = this.model.V;
        
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
    }
}

export default Simulator; 