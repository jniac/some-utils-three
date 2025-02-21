const meshPhysicalMaterialVertexTokens = [
    'common',
    'uv_pars_vertex',
    'displacementmap_pars_vertex',
    'color_pars_vertex',
    'fog_pars_vertex',
    'normal_pars_vertex',
    'morphtarget_pars_vertex',
    'skinning_pars_vertex',
    'shadowmap_pars_vertex',
    'logdepthbuf_pars_vertex',
    'clipping_planes_pars_vertex',
    'uv_vertex',
    'color_vertex',
    'morphcolor_vertex',
    'beginnormal_vertex',
    'morphnormal_vertex',
    'skinbase_vertex',
    'skinnormal_vertex',
    'defaultnormal_vertex',
    'normal_vertex',
    'begin_vertex',
    'morphtarget_vertex',
    'skinning_vertex',
    'displacementmap_vertex',
    'project_vertex',
    'logdepthbuf_vertex',
    'clipping_planes_vertex',
    'worldpos_vertex',
    'shadowmap_vertex',
    'fog_vertex',
];
const meshPhysicalMaterialFragmentTokens = [
    'common',
    'packing',
    'dithering_pars_fragment',
    'color_pars_fragment',
    'uv_pars_fragment',
    'map_pars_fragment',
    'alphamap_pars_fragment',
    'alphatest_pars_fragment',
    'alphahash_pars_fragment',
    'aomap_pars_fragment',
    'lightmap_pars_fragment',
    'emissivemap_pars_fragment',
    'iridescence_fragment',
    'cube_uv_reflection_fragment',
    'envmap_common_pars_fragment',
    'envmap_physical_pars_fragment',
    'fog_pars_fragment',
    'lights_pars_begin',
    'normal_pars_fragment',
    'lights_physical_pars_fragment',
    'transmission_pars_fragment',
    'shadowmap_pars_fragment',
    'bumpmap_pars_fragment',
    'normalmap_pars_fragment',
    'clearcoat_pars_fragment',
    'iridescence_pars_fragment',
    'roughnessmap_pars_fragment',
    'metalnessmap_pars_fragment',
    'logdepthbuf_pars_fragment',
    'clipping_planes_pars_fragment',
    'clipping_planes_fragment',
    'logdepthbuf_fragment',
    'map_fragment',
    'color_fragment',
    'alphamap_fragment',
    'alphatest_fragment',
    'alphahash_fragment',
    'roughnessmap_fragment',
    'metalnessmap_fragment',
    'normal_fragment_begin',
    'normal_fragment_maps',
    'clearcoat_normal_fragment_begin',
    'clearcoat_normal_fragment_maps',
    'emissivemap_fragment',
    'lights_physical_fragment',
    'lights_fragment_begin',
    'lights_fragment_maps',
    'lights_fragment_end',
    'aomap_fragment',
    'transmission_fragment',
    'opaque_fragment',
    'tonemapping_fragment',
    'colorspace_fragment',
    'fog_fragment',
    'premultiplied_alpha_fragment',
    'dithering_fragment',
];
const glTokens = [...meshPhysicalMaterialVertexTokens, ...meshPhysicalMaterialFragmentTokens];
export { meshPhysicalMaterialVertexTokens, meshPhysicalMaterialFragmentTokens, glTokens, };
