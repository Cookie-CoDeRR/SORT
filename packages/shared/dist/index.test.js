import { expect, test } from 'vitest';
import { WAVE_PARAMS } from './index.js';
test('constants are exported', () => {
    expect(WAVE_PARAMS.length).toBe(4);
});
