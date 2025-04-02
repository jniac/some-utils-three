import { Vector2 } from 'three';
export const orientations = {
    'oriented': 0,
    'billboard': 1,
};
export function solveOrientation(orientation) {
    if (typeof orientation === 'string') {
        if (orientation in orientations) {
            return orientations[orientation];
        }
        throw new Error(`Invalid orientation: ${orientation}`);
    }
    if (Object.values(orientations).includes(orientation)) {
        return orientation;
    }
    throw new Error(`Invalid orientation: ${orientation}`);
}
export const optionsDefaults = {
    textCount: 1000,
    lineLength: 24,
    lineCount: 2,
    charSize: new Vector2(.2, .3),
    textSize: 1,
    textOffset: 0,
    orientation: 'billboard',
    textDefaults: {
        color: '#ff00ff',
        size: 1,
    },
};
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
export const DATA_STRIDE_HEADER_BYTE_SIZE = 4 * 4;
