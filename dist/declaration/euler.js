import { Euler } from 'three';
import { angleScalars, fromAngleDeclaration, isAngleUnit } from 'some-utils-ts/declaration';
import { isEuler } from '../is.js';
function isEulerOrder(arg) {
    return typeof arg === 'string' && /^(XYZ|XZY|YXZ|YZX|ZXY|ZYX)$/.test(arg);
}
const defaultFromEulerDeclarationOptions = { defaultOrder: 'XYZ' };
function formatNumber(x, fractionDigits) {
    return x
        .toFixed(fractionDigits)
        .replace(/\.([0-9]+[1-9])?0+$/, (_, m0) => m0?.length > 0 ? `.${m0}` : '');
}
function fromEulerDeclarationString(str, options, out = new Euler()) {
    const [xAngle, yAngle = '', zAngle = '', orderOption] = str.split(',').map(x => x.trim());
    const x = fromAngleDeclaration(xAngle) || 0;
    const y = fromAngleDeclaration(yAngle) || 0;
    const z = fromAngleDeclaration(zAngle) || 0;
    const order = isEulerOrder(orderOption) ? orderOption : options.defaultOrder;
    return out.set(x, y, z, order);
}
function fromEulerDeclaration(...args) {
    const parseArgs = () => {
        if (args.length === 1)
            return [args[0], defaultFromEulerDeclarationOptions, new Euler()];
        if (args.length === 2) {
            return isEuler(args[1])
                ? [args[0], defaultFromEulerDeclarationOptions, args[1]]
                : [args[0], args[1], new Euler()];
        }
        if (args.length === 3)
            return args;
        throw new Error('Invalid number of arguments');
    };
    const [arg, options, out] = parseArgs();
    if (typeof arg === 'string') {
        return fromEulerDeclarationString(arg, options, out);
    }
    if (isEuler(arg)) {
        return out.copy(arg);
    }
    const { defaultOrder } = options;
    if (Array.isArray(arg)) {
        const [x, y, z, arg0, arg1] = arg;
        const unit = isAngleUnit(arg0) ? arg0 : isAngleUnit(arg1) ? arg1 : 'rad';
        const order = isEulerOrder(arg0) ? arg0 : isEulerOrder(arg1) ? arg1 : defaultOrder;
        return out.set(fromAngleDeclaration(x, unit), fromAngleDeclaration(y, unit), fromAngleDeclaration(z, unit), order);
    }
    const { x, y, z, order = defaultOrder, unit = 'rad' } = arg;
    return out.set(fromAngleDeclaration(x, unit), fromAngleDeclaration(y, unit), fromAngleDeclaration(z, unit), order);
}
export function toEulerDeclarationString(arg, unit = 'deg') {
    const { x, y, z, order } = fromEulerDeclaration(arg);
    const scalar = angleScalars[unit];
    const fd = {
        rad: 3,
        deg: 1,
        turn: 4,
    }[unit];
    const xStr = formatNumber(x / scalar, fd);
    const yStr = formatNumber(y / scalar, fd);
    const zStr = formatNumber(z / scalar, fd);
    return `[${xStr}, ${yStr}, ${zStr}, '${unit}', '${order}']`;
}
export { fromEulerDeclaration, isEulerOrder };
//# sourceMappingURL=euler.js.map