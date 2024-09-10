To get all the "include" from a shader, copy that code in the console of https://raw.githubusercontent.com/mrdoob/three.js/dev/src/renderers/shaders/ShaderLib/meshphysical.glsl.js

```js
const extract = str => str
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.includes('#include'))
  .map(line => line.match(/<(.*)>/)[1])
  .map(token => `  '${token}',`)
  .join('\n')

const [vertex, fragment] = document.body.innerText.split(/export const .*/).filter(str => !!str)

const js = /* js */`
const meshPhysicalMaterialVertexTokens = [
${extract(vertex)}
] as const

const meshPhysicalMaterialFragmentTokens = [
${extract(fragment)}
] as const

const glTokens = [...meshPhysicalMaterialVertexTokens, ...meshPhysicalMaterialFragmentTokens] as const

type MeshPhysicalMaterialVertexTokens = (typeof meshPhysicalMaterialVertexTokens)[number]
type MeshPhysicalMaterialFragmentTokens = (typeof meshPhysicalMaterialFragmentTokens)[number]
type GlTokens = (typeof glTokens)[number]

export type {
  MeshPhysicalMaterialVertexTokens,
  MeshPhysicalMaterialFragmentTokens,
  GlTokens,
}

export {
  meshPhysicalMaterialVertexTokens,
  meshPhysicalMaterialFragmentTokens,
  glTokens,
}
`

copy(js)
console.log(js)
```