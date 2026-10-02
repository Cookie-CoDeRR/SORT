import { expect, test, describe } from 'vitest';
import { stepShip, ShipState } from './shipPhysics.js';

describe('Ship Physics', () => {
    test('ship accelerates to target speed', () => {
        const state: ShipState = { x: 0, z: 0, heading: 0, speed: 0, yawRate: 0, waterLevel: 0 };
        stepShip(state, { sail: 1, rudder: 0 }, 1.0);
        expect(state.speed).toBeGreaterThan(0);
        
        // Step for a long time
        for(let i=0; i<15; i++) stepShip(state, { sail: 1, rudder: 0 }, 1.0);
        expect(state.speed).toBeCloseTo(9.0, 1);
    });
    
    test('rudder turns ship', () => {
        const state: ShipState = { x: 0, z: 0, heading: 0, speed: 9.0, yawRate: 0, waterLevel: 0 };
        stepShip(state, { sail: 1, rudder: 1 }, 1.0);
        expect(state.yawRate).toBeGreaterThan(0);
        expect(state.heading).toBeGreaterThan(0);
    });
});
