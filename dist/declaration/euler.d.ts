import { Euler, EulerOrder } from 'three';
import { AngleDeclaration, AngleUnit } from 'some-utils-ts/declaration';
type ReadonlyOrNot<T> = T | Readonly<T>;
type EulerDeclarationArray = [x: AngleDeclaration, y: AngleDeclaration, z: AngleDeclaration, order?: Euler['order']] | [x: AngleDeclaration, y: AngleDeclaration, z: AngleDeclaration, order: Euler['order'], unit: AngleUnit] | [x: AngleDeclaration, y: AngleDeclaration, z: AngleDeclaration, unit: AngleUnit];
type EulerDeclarationObject = {
    x: AngleDeclaration;
    y: AngleDeclaration;
    z: AngleDeclaration;
    unit?: AngleUnit;
    order?: Euler['order'];
};
type EulerDeclarationBase = EulerDeclarationArray | EulerDeclarationObject | string;
type EulerDeclaration = ReadonlyOrNot<EulerDeclarationBase>;
declare function isEulerOrder(arg: any): arg is Euler['order'];
declare const defaultFromEulerDeclarationOptions: {
    defaultOrder: EulerOrder;
};
type FromEulerDeclarationOptions = typeof defaultFromEulerDeclarationOptions;
declare function fromEulerDeclaration(arg: EulerDeclaration, out?: Euler): Euler;
declare function fromEulerDeclaration(arg: EulerDeclaration, options: FromEulerDeclarationOptions, out?: Euler): Euler;
export declare function toEulerDeclarationString(arg: EulerDeclaration, unit?: AngleUnit): string;
export { EulerDeclaration, fromEulerDeclaration, isEulerOrder };
//# sourceMappingURL=euler.d.ts.map