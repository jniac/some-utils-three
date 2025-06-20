
export type WithUniforms<Material, Uniforms> = Material & {
  userData: {
    uniforms: Uniforms
  }
}
