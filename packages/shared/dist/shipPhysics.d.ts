export interface ShipState {
    x: number;
    z: number;
    heading: number;
    speed: number;
    yawRate: number;
    waterLevel: number;
}
export interface ShipInput {
    sail: number;
    rudder: number;
}
export declare function stepShip(state: ShipState, input: ShipInput, dt: number): void;
