// Match three.js light ordering: shadow-casting lights occupy the first slots.
// Each light's visibility only modulates that light; ambient is never shadowed.
export const lightingLoops = /* glsl */ `
#if NUM_DIR_LIGHTS > 0
  #pragma unroll_loop_start
  for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
    getDirectionalLightInfo(directionalLights[i], directLight);
    float visibility = 1.0;
    #if defined(USE_SHADOWMAP) && UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS
      DirectionalLightShadow shadow = directionalLightShadows[i];
      if (receiveShadow) visibility = getShadow(directionalShadowMap[i], shadow.shadowMapSize,
        shadow.shadowIntensity, shadow.shadowBias - uShadowReceiveBias, shadow.shadowRadius, vDirectionalShadowCoord[i]);
    #endif
    irradiance += directLight.color * max(directLight.direction.z, 0.0) * visibility;
  }
  #pragma unroll_loop_end
#endif
#if NUM_SPOT_LIGHTS > 0
  #pragma unroll_loop_start
  for (int i = 0; i < NUM_SPOT_LIGHTS; i++) {
    getSpotLightInfo(spotLights[i], geometryPosition, directLight);
    float visibility = 1.0;
    #if defined(USE_SHADOWMAP) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS
      SpotLightShadow shadow = spotLightShadows[i];
      if (receiveShadow) visibility = getShadow(spotShadowMap[i], shadow.shadowMapSize,
        shadow.shadowIntensity, shadow.shadowBias - uShadowReceiveBias, shadow.shadowRadius, vSpotLightCoord[i]);
    #endif
    irradiance += directLight.color * max(directLight.direction.z, 0.0) * visibility;
  }
  #pragma unroll_loop_end
#endif
#if NUM_POINT_LIGHTS > 0
  #pragma unroll_loop_start
  for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
    getPointLightInfo(pointLights[i], geometryPosition, directLight);
    float visibility = 1.0;
    #if defined(USE_SHADOWMAP) && UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS && (defined(SHADOWMAP_TYPE_PCF) || defined(SHADOWMAP_TYPE_BASIC))
      PointLightShadow shadow = pointLightShadows[i];
      if (receiveShadow) visibility = getPointShadow(pointShadowMap[i], shadow.shadowMapSize,
        shadow.shadowIntensity, shadow.shadowBias - uShadowReceiveBias, shadow.shadowRadius,
        vPointShadowCoord[i], shadow.shadowCameraNear, shadow.shadowCameraFar);
    #endif
    irradiance += directLight.color * max(directLight.direction.z, 0.0) * visibility;
  }
  #pragma unroll_loop_end
#endif
#if NUM_HEMI_LIGHTS > 0
  #pragma unroll_loop_start
  for (int i = 0; i < NUM_HEMI_LIGHTS; i++) {
    irradiance += getHemisphereLightIrradiance(hemisphereLights[i], vec3(0.0, 0.0, 1.0));
  }
  #pragma unroll_loop_end
#endif
`
