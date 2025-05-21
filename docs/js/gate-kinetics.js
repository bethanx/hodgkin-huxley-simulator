// Gate kinetics functions for the Hodgkin-Huxley model
class GateKinetics {
    // Na+ activation (m) rate functions
    static alphaM(v) {
        const vMilli = v * 1000; // Convert V to mV for calculation
        if (Math.abs(vMilli + 40) < 1e-6) {
            return 1; // Avoid division by zero
        }
        return 0.1 * (vMilli + 40) / (1 - Math.exp(-(vMilli + 40) / 10));
    }
    
    static betaM(v) {
        const vMilli = v * 1000;
        return 4 * Math.exp(-(vMilli + 65) / 18);
    }
    
    // Na+ inactivation (h) rate functions
    static alphaH(v) {
        const vMilli = v * 1000;
        return 0.07 * Math.exp(-(vMilli + 65) / 20);
    }
    
    static betaH(v) {
        const vMilli = v * 1000;
        return 1 / (1 + Math.exp(-(vMilli + 35) / 10));
    }
    
    // K+ activation (n) rate functions
    static alphaN(v) {
        const vMilli = v * 1000;
        if (Math.abs(vMilli + 55) < 1e-6) {
            return 0.1; // Avoid division by zero
        }
        return 0.01 * (vMilli + 55) / (1 - Math.exp(-(vMilli + 55) / 10));
    }
    
    static betaN(v) {
        const vMilli = v * 1000;
        return 0.125 * Math.exp(-(vMilli + 65) / 80);
    }

    // Steady state values
    static mInf(v) {
        const am = this.alphaM(v);
        const bm = this.betaM(v);
        return am / (am + bm);
    }

    static hInf(v) {
        const ah = this.alphaH(v);
        const bh = this.betaH(v);
        return ah / (ah + bh);
    }

    static nInf(v) {
        const an = this.alphaN(v);
        const bn = this.betaN(v);
        return an / (an + bn);
    }

    // Time constants
    static tauM(v) {
        const am = this.alphaM(v);
        const bm = this.betaM(v);
        return 1 / (am + bm);
    }

    static tauH(v) {
        const ah = this.alphaH(v);
        const bh = this.betaH(v);
        return 1 / (ah + bh);
    }

    static tauN(v) {
        const an = this.alphaN(v);
        const bn = this.betaN(v);
        return 1 / (an + bn);
    }
}

// Add the gate kinetics functions to the HHModel prototype
Object.getOwnPropertyNames(GateKinetics).forEach(method => {
    if (method !== 'length' && method !== 'prototype' && method !== 'name') {
        HHModel.prototype[method] = function(...args) {
            return GateKinetics[method](...args);
        };
    }
});

export default GateKinetics; 