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
