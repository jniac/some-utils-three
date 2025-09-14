import { ColorRepresentation, Vector2 } from 'three'

import { TransformDeclaration, Vector3Declaration } from '../../declaration'

export const orientations = {
  'oriented': 0,
  'billboard': 1,
} as const

export type Orientation = (typeof orientations)[keyof typeof orientations]

export function solveOrientation(orientation: string | number): Orientation {
  if (typeof orientation === 'string') {
    if (orientation in orientations) {
      return orientations[orientation as keyof typeof orientations]
    }
    throw new Error(`Invalid orientation: ${orientation}`)
  }
  if ((Object.values(orientations) as number[]).includes(orientation)) {
    return orientation as Orientation
  }
  throw new Error(`Invalid orientation: ${orientation}`)
}

export const optionsDefaults = {
  /**
   * Should we use a node material (compatible with webgpu)?
   * @default false
   */
  nodeMaterial: false,
  textCount: 1000,
  lineLength: 24,
  lineCount: 2,
  charSize: new Vector2(.2, .3),
  textSize: 1,
  /**
   * The offset of the text in the local 3D space. 
   * 
   * Note:
   * - When using 'billboard' orientation, z offset make the text closer/farther 
   *   to the camera (useful for layering).
   */
  textOffset: 0 as Vector3Declaration,
  orientation: 'billboard' as (keyof typeof orientations) | Orientation,
  textDefaults: <SetTextOption>{
    color: '#ff00ff',
    size: 1,
  },
}

export type Options = Partial<typeof optionsDefaults>

/**
 * Byte size of the info:
 * #0:
 * - Lines count (1 byte)
 * - empty (3 bytes)
 * #1:
 * - Text Color (3 bytes)
 * - Text Opacity (1 byte)
 * #2:
 * - Background Color (3 bytes)
 * - Background Opacity (1 byte)
 * #3:
 * - size (4 bytes)
 *
 * Should be a multiple of 4.
 */

export const DATA_STRIDE_HEADER_BYTE_SIZE = 4 * 4

export type SetColorOptions = Partial<{
  /**
   * Defines the color of the text and background. Usefull when using the same
   * color for both with different opacity.
   */
  color: ColorRepresentation
  /**
   * Defines the opacity of the text and background. Usefull when using the same
   * opacity for both with different color.
   */
  opacity: number
  /**
   * The color of the text.
   */
  textColor: ColorRepresentation
  /**
   * The opacity of the text.
   * @default 1
   */
  textOpacity: number
  /**
   * The color of the background.
   */
  backgroundColor: ColorRepresentation
  /**
   * The opacity of the background.
   * @default 0
   */
  backgroundOpacity: number
}>

export type SetTextOption = TransformDeclaration & SetColorOptions & Partial<{
  /**
   * Whether to trim the text before setting it.
   * @default false
   */
  trim: boolean
  /**
   * The size of the text.
   * @default 1
   */
  size: number
  /**
   * The size of the text.
   * @default 1
   */
  scale: number
}>

