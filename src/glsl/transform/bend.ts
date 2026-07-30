import { Color, Matrix4, WebGLProgramParametersWithUniforms } from 'three'

import { glsl_bend } from 'some-utils-ts/glsl/transform/bend'

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
  vec4 bendPosition = vec4(position, 1.0);
  vec3 bendNormal = normal;

  #ifdef USE_BATCHING
    bendPosition = batchingMatrix * bendPosition;
    bendNormal = (batchingMatrix * vec4(bendNormal, 0.0)).xyz;
  #endif
  #ifdef USE_INSTANCING
    bendPosition = instanceMatrix * bendPosition;
    bendNormal = (instanceMatrix * vec4(bendNormal, 0.0)).xyz;
  #endif

  bendPosition = modelMatrix * bendPosition;
  bendNormal = (modelMatrix * vec4(bendNormal, 0.0)).xyz;

  applyBend(bendPosition, bendNormal, uBendFactor, uBendMatrix, uBendMatrixInverse);

  gl_Position = projectionMatrix * viewMatrix * bendPosition;
`

export function createBendUniforms(bendMatrix: Matrix4, bendColor = 'white') {
  const uniforms = {
    uBendFactor: { value: 0 },
    uBendMatrix: { value: bendMatrix.clone() },
    uBendMatrixInverse: { value: bendMatrix.clone().invert() },
    uBendColor: { value: new Color(bendColor) },
  }
  return uniforms
}

export function setupShaderForge(
  shader: WebGLProgramParametersWithUniforms,
  uniforms: Record<string, { value: any }>,
): typeof ShaderForge {
  return ShaderForge.with(shader)
    .uniforms(uniforms)
    .vertex.top(glsl_bend)
    .vertex.replace('project_vertex', glsl_bend_project_vertex)
}
