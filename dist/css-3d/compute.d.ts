import { Camera, Matrix4, Object3D, Vector3 } from 'three';
/**
 * NOTE:
 * - Camera "height" (`1 / Math.atan(fov / 2)`) can be retrieved from the projection matrix!
 * - "isPerspective" can be deducted from the last matrix element.
 *
 * References:
 * - [scratchapixel perspective projection](https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix/building-basic-perspective-projection-matrix)
 * - [scratchapixel orthographic projection](https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix/orthographic-projection-matrix)
 *
 * @param camera The camera to compute the perspective from.
 * @param container The container element where the renderer is attached. Its height will be used to compute the perspective.
 */
export declare function computePerspective(camera: Camera, container: HTMLElement): string;
export declare function computeFrontFacing(camera: Camera, target: Object3D | Matrix4 | Vector3): boolean;
export declare function computeZIndex(camera: Camera, target: Object3D | Matrix4 | Vector3): string;
/**
 * Compute the matrix3d CSS property for an object in 3D space.
 *
 * Usage:
 * ```
 * wrapper.style.perspective = computePerspective(camera, three.renderer.domElement)
 *
 * div.style.position = 'absolute'
 * div.style.left = '50%'
 * div.style.top = '50%'
 *
 * div.style.transform = computeMatrix3d(camera, plane, three.renderer.domElement)
 * div.style.zIndex = computeZIndex(camera, plane)
 * ```
 *
 * @param camera The camera to compute the matrix from.
 * @param object The object to compute the matrix from.
 * @param container The container element where the renderer is attached. Its height will be used to scale the matrix.
 * @param pixelPerUnit The number of pixels (DOM) per unit (3D space). Defaults to 100.
 * @param resetRotation The scalar to reset the rotation of the object. Defaults to 0.
 * @param resetScale The scalar to reset the scale of the object. Defaults to 0.
 * @param leftHanded Whether the matrix should be computed for a left-handed coordinate system. Defaults to false.
 */
export declare function computeMatrix3d(camera: Camera, target: Object3D | Matrix4 | Vector3, container: HTMLElement, pixelPerUnit?: number, resetRotation?: number, resetScale?: number, leftHanded?: boolean): string;
export declare function updatePosition3d(container: HTMLDivElement, div: HTMLDivElement, camera: Camera, target: Object3D | Matrix4 | Vector3, { pixelPerUnit, resetRotation, resetScale, leftHanded, }?: {
    pixelPerUnit?: number | undefined;
    resetRotation?: number | undefined;
    resetScale?: number | undefined;
    leftHanded?: boolean | undefined;
}): void;
//# sourceMappingURL=compute.d.ts.map