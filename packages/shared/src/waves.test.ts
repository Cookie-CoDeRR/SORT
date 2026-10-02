import { expect, test, describe } from 'vitest';
import { heightAt, normalAt, gerstnerDisplacement } from './waves.js';

describe('Gerstner Waves', () => {
    test('displacement returns expected shape', () => {
        const disp = gerstnerDisplacement(0, 0, 0);
        expect(disp.dy).toBeTypeOf('number');
    });

    test('heightAt is stable', () => {
        const y = heightAt(10, 20, 1.5);
        expect(y).toBeTypeOf('number');
        expect(heightAt(10, 20, 1.5)).toBeCloseTo(y, 4);
    });

    test('normalAt returns normalized vector', () => {
        const n = normalAt(5, -5, 2.0);
        const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
        expect(len).toBeCloseTo(1.0, 4);
    });
});
