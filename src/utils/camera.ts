/**
 * Converts horizontal field of view to vertical field of view.
 * @param hfov - Horizontal field of view in degrees.
 * @param aspectRatio - Aspect ratio of the camera.
 * @returns Vertical field of view in degrees.
 */
export function calculateVFOV(hfov: number, aspectRatio: number): number {
  const hfovRadians = (hfov * Math.PI) / 180
  const vfovRadians = 2 * Math.atan(Math.tan(hfovRadians / 2) / aspectRatio)
  return (vfovRadians * 180) / Math.PI
}

/**
 * Converts vertical field of view to horizontal field of view.
 * @param vfov - Vertical field of view in degrees.
 * @param aspectRatio - Aspect ratio of the camera.
 * @returns Horizontal field of view in degrees.
 */
export function calculateHFOV(vfov: number, aspectRatio: number): number {
  const vfovRadians = (vfov * Math.PI) / 180
  const hfovRadians = 2 * Math.atan(Math.tan(vfovRadians / 2) * aspectRatio)
  return (hfovRadians * 180) / Math.PI
}
