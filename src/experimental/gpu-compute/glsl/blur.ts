import { dedent } from 'some-utils-ts/string/dedent'

/**
 * Generate a normalized 2D Gaussian kernel (flattened 1D array)
 * @param {number} size - Must be odd (e.g. 3, 5, 7, 9, 11, ...)
 * @param {number} [sigma] - Standard deviation (auto-calculated if omitted)
 * @returns {number[]} Flattened kernel (row-major)
 */
export function makeGaussianKernel2D(size: number, sigma?: number): number[] {
  if (size % 2 === 0)
    throw new Error('Kernel size must be odd')

  const half = Math.floor(size / 2)
  sigma ??= size / 3 // auto sigma heuristic

  const sigma2 = 2 * sigma * sigma

  const kernel = []
  let sum = 0

  // compute kernel values
  for (let y = -half; y <= half; y++) {
    for (let x = -half; x <= half; x++) {
      const value = Math.exp(-(x * x + y * y) / sigma2)
      kernel.push(value)
      sum += value
    }
  }

  // normalize
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= sum
  }

  return kernel
}

export function makeGaussianKernel2DAsGlsl(size: number, sigma?: number): string {
  const kernel = makeGaussianKernel2D(size, sigma)
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = kernel.slice(y * size, (y + 1) * size)
      .map(v => `  ${v.toFixed(5)}`)
      .join(', ')
    rows.push(row)
  }
  const kernelName = `kernel${size}x${size}`
  const kernelGlsl = `const float[${size * size}] ${kernelName} = float[${size * size}](\n${rows.join(',\n')});`

  const half = Math.floor(size / 2)
  const filterGlsl = dedent(/* glsl */`
    vec4 gaussianBlur${size}x${size}(vec2 uv, float scale) {
      vec2 texelSize = scale / uTextureSize;
      vec4 color = vec4(0.0);
      for (int x = -${half}; x <= ${half}; x++) {
        for (int y = -${half}; y <= ${half}; y++) {
          vec2 offset = vec2(float(x), float(y)) * texelSize;
          color += texture2D(uTexture, uv + offset) * ${kernelName}[x + ${half} + (y + ${half}) * ${size}];
        }
      }
      return color;
    }

    vec4 gaussianBlur${size}x${size}(vec2 uv) {
      return gaussianBlur${size}x${size}(uv, 1.0);
    }
  `)

  return kernelGlsl + '\n\n' + filterGlsl
}

export const glsl_blur_3_11 = [3, 5, 7, 9, 11]
  .map(size => makeGaussianKernel2DAsGlsl(size))
  .join('\n\n')
