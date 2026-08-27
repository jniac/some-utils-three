import { Color, MeshBasicMaterial, Vector3 } from 'three'

import { ShaderForge } from '../shader-forge'

/**
 * A material that visualizes the normals of a mesh, with different colors for 
 * front and back faces, and a simple lighting effect based on a sun direction.
 */
export class DebugNormalMaterial extends MeshBasicMaterial {
  uniforms = {
    uFrontColor: { value: new Color('#5af') },
    uBackColor: { value: new Color('#f57') },
    uSunDirection: { value: new Vector3(4, 10, 2) },
  }

  constructor() {
    super({
      side: 2,
    })

    this.onBeforeCompile = shader => ShaderForge.with(shader)
      .uniforms(this.uniforms)
      .createVarying('sf_vWorldNormal')
      .fragment.after('color_fragment', /* glsl */`
        diffuseColor.rgb = gl_FrontFacing ? uFrontColor : uBackColor;
        vec3 sunDir = normalize(uSunDirection);
        float sunDot = dot(sunDir, sf_vWorldNormal);
        diffuseColor.rgb *= 0.5 + 0.5 * sunDot;
      `)
  }
}
