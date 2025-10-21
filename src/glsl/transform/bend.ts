import { glsl_bend } from 'some-utils-ts/glsl/transform/bend'

import { Color, Matrix4, WebGLProgramParametersWithUniforms } from 'three'
import { ShaderForge } from '../../shader-forge'

// Re-export for easier access
export { glsl_bend }

/**
 * GLSL snippet to replace the standard project_vertex chunk to include bending (Three.js).
 * 
 * Works in combination with the `glsl_bend` snippet and requires the following uniforms:
 * - `uBendFactor` (float): The bend factor.
 * - `uBendMatrix` (mat4): The bend matrix.
 * - `uBendMatrixInverse` (mat4): The inverse of the bend matrix.
 */
export const glsl_bend_project_vertex = /* glsl */`
  vec4 mvPosition = vec4( transformed, 1.0 );
  #ifdef USE_BATCHING
    mvPosition = batchingMatrix * mvPosition;
  #endif
  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
  #endif
  mvPosition = modelMatrix * mvPosition;
  mvPosition = applyBend(mvPosition, uBendFactor, uBendMatrix, uBendMatrixInverse);
  mvPosition = viewMatrix * mvPosition;
  gl_Position = projectionMatrix * mvPosition;
`

export function createBendUniforms(bendMatrix: Matrix4, myColor = 'white') {
  const uniforms = {
    uBendFactor: { value: 0 },
    uBendMatrix: { value: bendMatrix.clone() },
    uBendMatrixInverse: { value: bendMatrix.clone().invert() },
    uMyColor: { value: new Color(myColor) },
  }
  return uniforms
}

export function setupShaderForge(shader: WebGLProgramParametersWithUniforms, uniforms: Record<string, { value: any }>) {
  ShaderForge.with(shader)
    .uniforms(uniforms)
    .vertex.top(glsl_bend)
    .vertex.replace('project_vertex', glsl_bend_project_vertex)
}
