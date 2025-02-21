/**
 * Converts horizontal field of view to vertical field of view.
 * @param hfov - Horizontal field of view in degrees.
 * @param aspectRatio - Aspect ratio of the camera.
 * @returns Vertical field of view in degrees.
 */
export declare function calculateVFOV(hfov: number, aspectRatio: number): number;
/**
 * Converts vertical field of view to horizontal field of view.
 * @param vfov - Vertical field of view in degrees.
 * @param aspectRatio - Aspect ratio of the camera.
 * @returns Horizontal field of view in degrees.
 */
export declare function calculateHFOV(vfov: number, aspectRatio: number): number;
