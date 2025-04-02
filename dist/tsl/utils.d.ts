import { NodeRepresentation, ShaderNodeObject } from 'three/tsl';
import { ColorRepresentation, Object3D, StorageBufferNode, StorageInstancedBufferAttribute } from 'three/webgpu';
export declare const autoLitOptionsDefaults: {
    emissive: number;
    shadowColor: string;
    power: number;
};
export type AutoLitOptions = Partial<typeof autoLitOptionsDefaults>;
export declare const autoLit: (mainColor?: ColorRepresentation, options?: AutoLitOptions) => ShaderNodeObject<import("three/src/nodes/TSL.js").ShaderCallNodeInternal>;
/**
 * Clamps a vector to a maximum length.
 */
export declare const clampVector: import("three/src/nodes/TSL.js").ShaderNodeFn<[any, any?]>;
export declare const spow: import("three/src/nodes/TSL.js").ShaderNodeFn<[number | boolean | import("three").Vector3 | import("three/webgpu").Node | ShaderNodeObject<import("three/webgpu").Node> | ShaderNodeObject<ShaderNodeObject<import("three/webgpu").Node>>, number | boolean | import("three").Vector3 | import("three/webgpu").Node | ShaderNodeObject<import("three/webgpu").Node> | ShaderNodeObject<ShaderNodeObject<import("three/webgpu").Node>>]>;
export declare const powerBump: import("three/src/nodes/TSL.js").ShaderNodeFn<[number | boolean | import("three").Vector3 | import("three/webgpu").Node | ShaderNodeObject<import("three/webgpu").Node> | ShaderNodeObject<ShaderNodeObject<import("three/webgpu").Node>>, number | boolean | import("three").Vector3 | import("three/webgpu").Node | ShaderNodeObject<import("three/webgpu").Node> | ShaderNodeObject<ShaderNodeObject<import("three/webgpu").Node>>]>;
export declare const toDirectionAndMagnitude: import("three/src/nodes/TSL.js").ShaderNodeFn<[number | boolean | import("three").Vector3 | import("three/webgpu").Node | ShaderNodeObject<import("three/webgpu").Node> | ShaderNodeObject<ShaderNodeObject<import("three/webgpu").Node>>]>;
export declare const rotate2D: import("three/src/nodes/TSL.js").ShaderNodeFn<[number | boolean | import("three").Vector3 | import("three/webgpu").Node | ShaderNodeObject<import("three/webgpu").Node> | ShaderNodeObject<ShaderNodeObject<import("three/webgpu").Node>>, number | boolean | import("three").Vector3 | import("three/webgpu").Node | ShaderNodeObject<import("three/webgpu").Node> | ShaderNodeObject<ShaderNodeObject<import("three/webgpu").Node>>]>;
export declare const scale2D: import("three/src/nodes/TSL.js").ShaderNodeFn<(number | boolean | import("three").Vector3 | import("three/webgpu").Node | ShaderNodeObject<import("three/webgpu").Node> | ShaderNodeObject<ShaderNodeObject<import("three/webgpu").Node>>)[]>;
/**
 * InstancedStorage is a little wrapper around a StorageInstancedBufferAttribute
 * that provides a way to create a storage buffer and a read-only storage buffer
 * (TSL / Three Shading Language).
 */
export declare class InstancedStorage {
    count: number;
    type: string;
    typeSize: number;
    attribute: StorageInstancedBufferAttribute;
    storage: ShaderNodeObject<StorageBufferNode>;
    get readonlyStorage(): ShaderNodeObject<StorageBufferNode>;
    constructor(countOrArray: number | Float32Array, type?: string, typeSize?: number, defaultValue?: number[]);
    private _readonlyStorage;
    /**
     * This is an important feature: it allows to create a read-only storage buffer
     * that can be used in a vertex / fragment shader (positionNode, normalNode, etc.).
     * Indeed, unlike compute shaders, vertex / fragment shaders can only read from
     * storage buffers that are marked as read-only.
     */
    getReadonlyStorage(): ShaderNodeObject<StorageBufferNode>;
}
/**
 * The definitive z-fighting solution.
 *
 * Extreeeemely powerful function that allows to create a shader node that will
 * offset the vertex position of an object in the direction of the camera and
 * scale the position to make the object appear at the same place, but closer or
 * further away from the camera.
 *
 * Needless to say, I'm quite proud of this one.
 */
export declare function zOffset(object: Object3D, zOffset?: number): ShaderNodeObject<import("three/src/nodes/TSL.js").ShaderCallNodeInternal>;
export declare const rotationMatrix: import("three/src/nodes/TSL.js").ShaderNodeFn<[any, any]>;
export declare const hash3: import("three/src/nodes/TSL.js").ShaderNodeFn<[any, (number | undefined)?, (number | undefined)?]>;
export declare const hash4: import("three/src/nodes/TSL.js").ShaderNodeFn<[any, (number | undefined)?, (number | undefined)?]>;
/**
 * Returns a random unit vector uniformly distributed on the unit sphere.
 */
export declare const randomUnitVector: import("three/src/nodes/TSL.js").ShaderNodeFn<[any]>;
export declare const sdf2D: {
    /**
     * @param p The point to test
     * @param radius The radius of the circle
     */
    circle: (p: NodeRepresentation, radius?: NodeRepresentation) => ShaderNodeObject<import("three/src/nodes/math/OperatorNode.js").default>;
    /**
     * @param p The point to test
     * @param size the extents of the box
     */
    box: (p: NodeRepresentation, size?: NodeRepresentation) => ShaderNodeObject<import("three/src/nodes/math/OperatorNode.js").default>;
};
