
export function getFibonacciSphereSamplesArray(n = 24, {
  out = new Float32Array(n * 3) as Float32Array,
} = {}) {
  const goldenRatio = (1 + Math.sqrt(5)) / 2 // Golden ratio

  // https://extremelearning.com.au/how-to-evenly-distribute-points-on-a-sphere-more-effectively-than-the-canonical-fibonacci-lattice/
  // Ok but pole holes?
  // let epsilon
  // if (n >= 600000)
  //   epsilon = 214
  // else if (n >= 400000)
  //   epsilon = 75
  // else if (n >= 11000)
  //   epsilon = 27
  // else if (n >= 890)
  //   epsilon = 10
  // else if (n >= 177)
  //   epsilon = 3.33
  // else if (n >= 24)
  //   epsilon = 1.33
  // else
  //   epsilon = 0.33

  // const pi = Math.PI
  // for (let i = 0; i < n; i++) {
  //   const theta = 2 * pi * i / goldenRatio
  //   const phi = Math.acos(1 - 2 * (i + epsilon) / (n - 1 + 2 * epsilon))
  //   const x = Math.cos(theta) * Math.sin(phi)
  //   const y = Math.sin(theta) * Math.sin(phi)
  //   const z = Math.cos(phi)
  //   out[i * 3] = x
  //   out[i * 3 + 1] = y
  //   out[i * 3 + 2] = z
  // }

  const max = Math.floor(n) // n can be a float (for smooth transitions), but we need an integer to avoid NaNs
  for (let i = 0; i < max; i++) {
    const theta = 2 * Math.PI * i / goldenRatio
    const z = 1 - (2 * i + 1) / n  // Evenly distribute z
    const radius = Math.sqrt(1 - z * z)
    const x = radius * Math.cos(theta)
    const y = radius * Math.sin(theta)
    out[i * 3] = x
    out[i * 3 + 1] = y
    out[i * 3 + 2] = z
  }

  return out
}
