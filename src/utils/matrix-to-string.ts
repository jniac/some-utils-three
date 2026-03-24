import { Matrix4 } from 'three'

export function matrixToString(matrix: Matrix4): string {
  const [
    m00, m01, m02, m03,
    m10, m11, m12, m13,
    m20, m21, m22, m23,
    m30, m31, m32, m33,
  ] = matrix.elements
  return (
    `${m00.toFixed(2)} ${m01.toFixed(2)} ${m02.toFixed(2)} ${m03.toFixed(2)}\n` +
    `${m10.toFixed(2)} ${m11.toFixed(2)} ${m12.toFixed(2)} ${m13.toFixed(2)}\n` +
    `${m20.toFixed(2)} ${m21.toFixed(2)} ${m22.toFixed(2)} ${m23.toFixed(2)}\n` +
    `${m30.toFixed(2)} ${m31.toFixed(2)} ${m32.toFixed(2)} ${m33.toFixed(2)}`
  )
}