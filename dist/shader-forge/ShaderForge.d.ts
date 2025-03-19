import { Material, WebGLProgramParametersWithUniforms } from 'three';
import { Uniforms } from './uniforms';
declare const wrap: <T extends Material>(material: T, callback: (shader: WebGLProgramParametersWithUniforms) => void) => T;
declare const withShader: (shader: WebGLProgramParametersWithUniforms) => ShaderForgeType;
declare class ShaderTool<GlslToken> {
    private type;
    constructor(type: 'vertexShader' | 'fragmentShader');
    private getPattern;
    replace(token: GlslToken | RegExp, code: string): ShaderForgeType;
    inject(position: 'before' | 'after', token: GlslToken, code: string): ShaderForgeType;
    injectTokenComments(): ShaderForgeType;
    header(str: string): ShaderForgeType;
    /** Shorthand for `.inject('before', token, code)` */
    before(token: GlslToken, code: string): ShaderForgeType;
    /** Shorthand for `.inject('after', token, code)` */
    after(token: GlslToken, code: string): ShaderForgeType;
    top(...codes: string[]): ShaderForgeType;
    mainBeforeAll(code: string): ShaderForgeType;
    mainAfterAll(code: string): ShaderForgeType;
    uniforms(uniforms: Uniforms | string): ShaderForgeType;
    clean(): ShaderForgeType;
    printFinalCode(): ShaderForgeType;
}
declare function shaderName(name: string): ShaderForgeType;
declare function defines(defines: Record<string, string | number>): ShaderForgeType;
declare function uniforms(uniforms: Uniforms | string): ShaderForgeType;
declare const varyingTypes: readonly ["float", "vec2", "vec3", "vec4"];
type VaryingType = (typeof varyingTypes)[number];
declare function varying(type: string): typeof ShaderForge;
declare function varying(type: Record<string, VaryingType>): typeof ShaderForge;
/**
 * Added code to the top of the vertex and fragment shaders
 */
declare function top(code: string): typeof ShaderForge;
/**
 * `header()` will prepend the shader program with an header (debug purpose
 * essentially).
 */
declare function header(str: string): ShaderForgeType;
/**
 * `clean()` will remove from the source code of each program any useless injected
 * comments (because injected chunks may be chained one after the other, so the
 * following patterns will be removed: [END][whitespaces][START])
 */
declare function clean(): ShaderForgeType;
declare const fragment: ShaderTool<"common" | "packing" | "dithering_pars_fragment" | "color_pars_fragment" | "uv_pars_fragment" | "map_pars_fragment" | "alphamap_pars_fragment" | "alphatest_pars_fragment" | "alphahash_pars_fragment" | "aomap_pars_fragment" | "lightmap_pars_fragment" | "emissivemap_pars_fragment" | "iridescence_fragment" | "cube_uv_reflection_fragment" | "envmap_common_pars_fragment" | "envmap_physical_pars_fragment" | "fog_pars_fragment" | "lights_pars_begin" | "normal_pars_fragment" | "lights_physical_pars_fragment" | "transmission_pars_fragment" | "shadowmap_pars_fragment" | "bumpmap_pars_fragment" | "normalmap_pars_fragment" | "clearcoat_pars_fragment" | "iridescence_pars_fragment" | "roughnessmap_pars_fragment" | "metalnessmap_pars_fragment" | "logdepthbuf_pars_fragment" | "clipping_planes_pars_fragment" | "clipping_planes_fragment" | "logdepthbuf_fragment" | "map_fragment" | "color_fragment" | "alphamap_fragment" | "alphatest_fragment" | "alphahash_fragment" | "roughnessmap_fragment" | "metalnessmap_fragment" | "normal_fragment_begin" | "normal_fragment_maps" | "clearcoat_normal_fragment_begin" | "clearcoat_normal_fragment_maps" | "emissivemap_fragment" | "lights_physical_fragment" | "lights_fragment_begin" | "lights_fragment_maps" | "lights_fragment_end" | "aomap_fragment" | "transmission_fragment" | "opaque_fragment" | "tonemapping_fragment" | "colorspace_fragment" | "fog_fragment" | "premultiplied_alpha_fragment" | "dithering_fragment">;
declare const vertex: ShaderTool<"common" | "uv_pars_vertex" | "displacementmap_pars_vertex" | "color_pars_vertex" | "fog_pars_vertex" | "normal_pars_vertex" | "morphtarget_pars_vertex" | "skinning_pars_vertex" | "shadowmap_pars_vertex" | "logdepthbuf_pars_vertex" | "clipping_planes_pars_vertex" | "uv_vertex" | "color_vertex" | "morphcolor_vertex" | "beginnormal_vertex" | "morphnormal_vertex" | "skinbase_vertex" | "skinnormal_vertex" | "defaultnormal_vertex" | "normal_vertex" | "begin_vertex" | "morphtarget_vertex" | "skinning_vertex" | "displacementmap_vertex" | "project_vertex" | "logdepthbuf_vertex" | "clipping_planes_vertex" | "worldpos_vertex" | "shadowmap_vertex" | "fog_vertex">;
type ShaderForgeType = {
    (shader?: WebGLProgramParametersWithUniforms): ShaderForgeType;
    shaderName: typeof shaderName;
    defines: typeof defines;
    uniforms: typeof uniforms;
    varying: typeof varying;
    top: typeof top;
    vertex: typeof vertex;
    fragment: typeof fragment;
    header: typeof header;
    clean: typeof clean;
    with: typeof withShader;
    wrap: typeof wrap;
};
/**
 * A toolkit to help modifying threejs existing shaders.
 *
 * [jniac.github.io / [Shader Xplr]](https://jniac.github.io/three-xp/t/shader-xplr)
 *
 * [Shader templates](https://github.com/mrdoob/three.js/tree/master/src/renderers/shaders/ShaderLib):
 * - [MeshPhysicalMaterial](https://github.com/mrdoob/three.js/blob/master/src/renderers/shaders/ShaderLib/meshphysical.glsl.js)
 * - [MeshBasicMaterial](https://github.com/mrdoob/three.js/blob/master/src/renderers/shaders/ShaderLib/meshbasic.glsl.js)
 * - [ShaderChunk lib](https://github.com/mrdoob/three.js/tree/master/src/renderers/shaders/ShaderChunk)
 *
 * Usage:
 * ```
 * material.onBeforeCompile = shader => ShaderForge(shader)
 *   .uniforms({
 *     uScalar: { value: 1 },
 *   })
 *   .vertex.before('project_vertex', `
 *     transformed.xyz *= uScalar;
 *   `)
 * ```
 */
export declare const ShaderForge: ShaderForgeType;
export type { Uniforms };
