const MAX_SPEED = 9.0;
const ACCEL = 9.0 / 12.0; // 12 seconds to full speed
const DECEL = 0.5; // drag when sail is lower than speed
const MAX_YAW_RATE = 12 * (Math.PI / 180); // 12 deg/s
const YAW_DAMPING = 2.0;
export function stepShip(state, input, dt) {
    // 1. Sail and Speed
    const targetSpeed = input.sail * MAX_SPEED;
    if (state.speed < targetSpeed) {
        state.speed += ACCEL * dt;
        if (state.speed > targetSpeed)
            state.speed = targetSpeed;
    }
    else if (state.speed > targetSpeed) {
        state.speed -= DECEL * dt;
        if (state.speed < targetSpeed)
            state.speed = targetSpeed;
    }
    // 2. Rudder and Yaw
    // Turn effectiveness depends on speed
    const speedFactor = Math.min(state.speed / (MAX_SPEED * 0.5), 1.0); // max turning at half speed
    const targetYawRate = input.rudder * MAX_YAW_RATE * speedFactor;
    // Apply damping and acceleration
    state.yawRate += (targetYawRate - state.yawRate) * YAW_DAMPING * dt;
    // 3. Update Heading and Position
    state.heading += state.yawRate * dt;
    // Normalize heading to 0-2PI
    while (state.heading < 0)
        state.heading += 2 * Math.PI;
    while (state.heading >= 2 * Math.PI)
        state.heading -= 2 * Math.PI;
    state.x += Math.sin(state.heading) * state.speed * dt;
    state.z += Math.cos(state.heading) * state.speed * dt;
}
