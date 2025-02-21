import { Vector3 } from 'three';
export var Axis;
(function (Axis) {
    Axis[Axis["X"] = 0] = "X";
    Axis[Axis["Y"] = 2] = "Y";
    Axis[Axis["Z"] = 4] = "Z";
})(Axis || (Axis = {}));
// Direction is a based on Axis, but the values are from 0 to 5 without holes.
export var Direction;
(function (Direction) {
    /**
     * Right (X+)
     */
    Direction[Direction["R"] = 0] = "R";
    /**
     * Left (X-)
     */
    Direction[Direction["L"] = 1] = "L";
    /**
     * Up (Y+)
     */
    Direction[Direction["U"] = 2] = "U";
    /**
     * Down (Y-)
     */
    Direction[Direction["D"] = 3] = "D";
    /**
     * Forward (Z+)
     */
    Direction[Direction["F"] = 4] = "F";
    /**
     * Backward (Z-)
     */
    Direction[Direction["B"] = 5] = "B";
})(Direction || (Direction = {}));
export var DirectionFlags;
(function (DirectionFlags) {
    DirectionFlags[DirectionFlags["None"] = 0] = "None";
    DirectionFlags[DirectionFlags["All"] = 63] = "All";
    DirectionFlags[DirectionFlags["R"] = 1] = "R";
    DirectionFlags[DirectionFlags["L"] = 2] = "L";
    DirectionFlags[DirectionFlags["U"] = 4] = "U";
    DirectionFlags[DirectionFlags["D"] = 8] = "D";
    DirectionFlags[DirectionFlags["F"] = 16] = "F";
    DirectionFlags[DirectionFlags["B"] = 32] = "B";
})(DirectionFlags || (DirectionFlags = {}));
export const defaultDirectionTangent = [
    Direction.B,
    Direction.F,
    Direction.R,
    Direction.L,
    Direction.R,
    Direction.L,
];
export const defaultDirectionBitangent = [
    Direction.U,
    Direction.U,
    Direction.B,
    Direction.F,
    Direction.U,
    Direction.U,
];
export const directionVectors = [
    new Vector3(+1, 0, 0), // R
    new Vector3(-1, 0, 0), // L
    new Vector3(0, +1, 0), // U
    new Vector3(0, -1, 0), // D
    new Vector3(0, 0, +1), // F
    new Vector3(0, 0, -1), // B
];
export function oppositeDirection(dir) {
    // Flip the least significant bit, brilliant!
    return dir ^ 1;
}
export function directionToVector(dir) {
    return directionVectors[dir];
}
export const CHUNK_COORDS_SIZE = 1624; // even-floor((2 ** 32) ** (1/3))
const HALF_CHUNK_COORDS_SIZE = CHUNK_COORDS_SIZE / 2;
export function toChunkCoordsKey(x, y, z) {
    if (x < -HALF_CHUNK_COORDS_SIZE || x >= HALF_CHUNK_COORDS_SIZE) {
        throw new Error(`x is out of bounds: ${x}`);
    }
    if (y < -HALF_CHUNK_COORDS_SIZE || y >= HALF_CHUNK_COORDS_SIZE) {
        throw new Error(`y is out of bounds: ${y}`);
    }
    if (z < -HALF_CHUNK_COORDS_SIZE || z >= HALF_CHUNK_COORDS_SIZE) {
        throw new Error(`z is out of bounds: ${z}`);
    }
    return (z + HALF_CHUNK_COORDS_SIZE) * CHUNK_COORDS_SIZE * CHUNK_COORDS_SIZE + (y + HALF_CHUNK_COORDS_SIZE) * CHUNK_COORDS_SIZE + (x + HALF_CHUNK_COORDS_SIZE);
}
export function fromChunkCoordsKey(key, out = new Vector3()) {
    let n = key;
    const z = Math.floor(n / (CHUNK_COORDS_SIZE * CHUNK_COORDS_SIZE));
    n -= z * (CHUNK_COORDS_SIZE * CHUNK_COORDS_SIZE);
    const y = Math.floor(n / CHUNK_COORDS_SIZE);
    n -= y * CHUNK_COORDS_SIZE;
    const x = n;
    return out.set(x - HALF_CHUNK_COORDS_SIZE, y - HALF_CHUNK_COORDS_SIZE, z - HALF_CHUNK_COORDS_SIZE);
}
