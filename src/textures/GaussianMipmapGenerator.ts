import { ClampToEdgeWrapping, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry, RGBAFormat, Scene, ShaderMaterial, Texture, Vector2, Vector4, WebGLRenderTarget } from 'three'

/**
 * Generates custom mipmaps using separable Gaussian blur (WebGL)
 * 
 * What for? 
 * - Way better quality than standard mipmaps (which are just box-filtered)
 * - Can help to achieve glass/blur effects without needing to sample the texture in the shader (just sample the right mip level)
 * - Can improve reflection when applied to cube maps (not implemented yet).
 */
export class GaussianMipmapGenerator {
  #private: {
    scene: Scene
    camera: OrthographicCamera
    quadMesh: Mesh
    material: ShaderMaterial
    tempTarget: WebGLRenderTarget
  }

  constructor() {
    // Setup scene and camera for fullscreen quad rendering
    this.#private = {
      scene: new Scene(),
      camera: new OrthographicCamera(-1, 1, 1, -1, 0, 1),
      quadMesh: null!,
      material: this.#createBlurMaterial(false),
      tempTarget: null!,
    }

    // Create fullscreen quad
    const geometry = new PlaneGeometry(2, 2)
    this.#private.quadMesh = new Mesh(geometry, this.#private.material)
    this.#private.scene.add(this.#private.quadMesh)

    // Temporary render target (will be resized as needed)
    this.#private.tempTarget = new WebGLRenderTarget(1, 1, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      format: RGBAFormat,
      // type: FloatType,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
    })
  }

  #createBlurMaterial(horizontal: boolean): ShaderMaterial {
    return new ShaderMaterial({
      uniforms: {
        tSource: { value: null },
        uResolution: { value: new Vector2() },
        uScissor: { value: new Vector4(0, 0, 1, 1) }, // x, y, width, height (normalized)
        uKernelSize: { value: 5 },
        uDirection: { value: horizontal ? new Vector2(1, 0) : new Vector2(0, 1) },
        uKernelScale: { value: 1 },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D tSource;
        uniform vec2 uResolution;
        uniform vec4 uScissor; // x, y, width, height (normalized 0-1)
        uniform int uKernelSize;
        uniform vec2 uDirection;
        uniform float uKernelScale;
        varying vec2 vUv;

        // Generate Gaussian weight
        float gaussian(float x, float sigma) {
          return exp(-(x * x) / (2.0 * sigma * sigma));
        }

        void main() {
          // Check if we're inside the scissor rectangle
          vec2 scissorMin = uScissor.xy;
          vec2 scissorMax = uScissor.xy + uScissor.zw;
          
          if (vUv.x < scissorMin.x || vUv.x > scissorMax.x || 
              vUv.y < scissorMin.y || vUv.y > scissorMax.y) {
            // Outside scissor, pass through original
            gl_FragColor = texture2D(tSource, vUv);
            return;
          }

          vec2 texelSize = 1.0 / uResolution;
          float sigma = float(uKernelSize) * 0.3; // Standard deviation
          int radius = uKernelSize / 2;
          
          vec4 sum = vec4(0.0);
          float weightSum = 0.0;
          
          for (int i = -20; i <= 20; i++) {
            if (abs(i) > radius) continue;
            
            float weight = gaussian(float(i), sigma);
            vec2 offset = uDirection * float(i) * texelSize * uKernelScale;
            vec2 sampleUv = vUv + offset;
            
            // Clamp to edge (repeat border pixels)
            sampleUv = clamp(sampleUv, vec2(0.0), vec2(1.0));
            
            sum += texture2D(tSource, sampleUv) * weight;
            weightSum += weight;
          }
          
          gl_FragColor = sum / weightSum;
        }
      `,
    })
  }

  /**
   * Generate mipmaps with Gaussian downsampling
   * 
   * Notes:
   * - `kernelScaleProgression` controls how much "faster" the blur kernel grows for smaller mip levels.
   *   - `1.25` is the default value
   *   - `1.0`: blur grows "linearly" (almost the same effect than a linear mipmap (no gaussian blur)).
   *   - `2.0`: blur grows very fast.
   * @param renderer WebGL renderer
   * @param sourceTexture Source texture to generate mipmaps from
   * @param kernelSize Blur kernel size (5, 7, 9, etc. - should be odd)
   * @param baseWidth Base texture width
   * @param baseHeight Base texture height
   * @param kernelScaleProgression Optional multiplier to increase kernel scale for smaller mip levels (default 1.25)
   * @param scissor Optional scissor rectangle [x, y, width, height] in normalized coordinates (0-1)
   * @returns Array of render targets containing mip levels
   */
  generateMipmaps(
    renderer: any,
    sourceTexture: Texture,
    kernelSize: number = 5,
    baseWidth: number,
    baseHeight: number,
    kernelScaleProgression: number = 1.25,
    scissor?: [number, number, number, number]
  ): WebGLRenderTarget[] {
    const { scene, camera, tempTarget } = this.#private

    const mipLevels: WebGLRenderTarget[] = []

    // Ensure kernel size is odd
    if (kernelSize % 2 === 0) {
      console.warn('Kernel size should be odd, incrementing by 1')
      kernelSize += 1
    }

    // Setup scissor rectangle
    const scissorRect = scissor
      ? new Vector4(scissor[0], scissor[1], scissor[2], scissor[3])
      : new Vector4(0, 0, 1, 1)

    let currentWidth = baseWidth
    let currentHeight = baseHeight
    let currentSource = sourceTexture

    // Generate mip levels until we reach 1x1
    let level = 0
    let kernelScale = 1
    while (currentWidth >= 1 && currentHeight >= 1) {
      const mipWidth = Math.max(1, Math.floor(currentWidth))
      const mipHeight = Math.max(1, Math.floor(currentHeight))

      // Create render target for this mip level
      const mipTarget = new WebGLRenderTarget(mipWidth, mipHeight, {
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        format: RGBAFormat,
        wrapS: ClampToEdgeWrapping,
        wrapT: ClampToEdgeWrapping,
      })

      if (level === 0) {
        // Level 0: just copy the source (or apply scissor)
        this.#renderPass(
          renderer,
          currentSource,
          mipTarget,
          currentWidth,
          currentHeight,
          kernelSize,
          scissorRect,
          true,
          kernelScale,
        )
      } else {
        // Downsample with two-pass Gaussian blur
        this.#resizeTarget(tempTarget, mipWidth, mipHeight)

        // Horizontal pass
        this.#renderPass(
          renderer,
          currentSource,
          tempTarget,
          currentWidth,
          currentHeight,
          kernelSize,
          scissorRect,
          true,
          kernelScale,
        )

        // Vertical pass
        this.#renderPass(
          renderer,
          tempTarget.texture,
          mipTarget,
          mipWidth,
          mipHeight,
          kernelSize,
          scissorRect,
          false,
          kernelScale,
        )
      }

      mipLevels.push(mipTarget)

      // Prepare for next level
      currentSource = mipTarget.texture
      currentWidth /= 2
      currentHeight /= 2
      kernelScale *= kernelScaleProgression // Emprically increase kernel scale for smaller mip levels to maintain blur radius
      level++
    }

    return mipLevels
  }

  #renderPass(
    renderer: any,
    source: Texture,
    target: WebGLRenderTarget,
    width: number,
    height: number,
    kernelSize: number,
    scissor: Vector4,
    horizontal: boolean,
    kernelScale: number = 1
  ): void {
    const { material, quadMesh, scene, camera } = this.#private

    if (horizontal) {
      material.uniforms.uDirection.value.set(1, 0)
    } else {
      material.uniforms.uDirection.value.set(0, 1)
    }

    material.uniforms.tSource.value = source
    material.uniforms.uResolution.value.set(width, height)
    material.uniforms.uScissor.value.copy(scissor)
    material.uniforms.uKernelSize.value = kernelSize
    material.uniforms.uKernelScale.value = kernelScale

    quadMesh.material = material

    const oldTarget = renderer.getRenderTarget()
    renderer.setRenderTarget(target)
    renderer.render(scene, camera)
    renderer.setRenderTarget(oldTarget)
  }

  #resizeTarget(target: WebGLRenderTarget, width: number, height: number): void {
    if (target.width !== width || target.height !== height) {
      target.setSize(width, height)
    }
  }

  /**
   * Combine mip render targets into a single texture with mipmaps
   */
  combineMipmaps(
    renderer: any,
    mipLevels: WebGLRenderTarget[],
  ): Texture {
    const gl = renderer.getContext()

    // Create a new WebGL texture
    const glTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, glTexture)

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Upload each mip level
    for (let level = 0; level < mipLevels.length; level++) {
      const mipTarget = mipLevels[level]
      const width = mipTarget.width
      const height = mipTarget.height

      // Read pixels from render target
      const pixels = new Uint8Array(width * height * 4)
      renderer.readRenderTargetPixels(mipTarget, 0, 0, width, height, pixels)

      const flippedPixels = new Uint8Array(width * height * 4)
      for (let y = 0; y < height; y++) {
        const srcRow = y * width * 4
        const dstRow = (height - 1 - y) * width * 4
        flippedPixels.set(pixels.subarray(srcRow, srcRow + width * 4), dstRow)
      }

      // Upload to texture at this mip level
      gl.texImage2D(
        gl.TEXTURE_2D,
        level,           // Mip level
        gl.RGBA,         // Internal format
        width,
        height,
        0,               // Border (must be 0)
        gl.RGBA,         // Format
        gl.UNSIGNED_BYTE,
        flippedPixels
      )
    }

    gl.bindTexture(gl.TEXTURE_2D, null)

    // Wrap in Three.js Texture
    const texture = new Texture()
    const properties = renderer.properties.get(texture)
    properties.__webglTexture = glTexture
    properties.__webglInit = true

    texture.needsUpdate = false

    return texture
  }

  generateMipmapsToTexture(
    renderer: any,
    sourceTexture: Texture,
    kernelSize: number = 5,
    baseWidth: number,
    baseHeight: number,
    kernelScaleProgression?: number,
    scissor?: [number, number, number, number]
  ): Texture {
    const mipLevels = this.generateMipmaps(renderer, sourceTexture, kernelSize, baseWidth, baseHeight, kernelScaleProgression, scissor)
    const combinedTexture = this.combineMipmaps(renderer, mipLevels)

    // Clean up render targets
    mipLevels.forEach(mip => mip.dispose())

    return combinedTexture
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    const { material, quadMesh, tempTarget } = this.#private
    material.dispose()
    quadMesh.geometry.dispose()
    tempTarget.dispose()
  }
}