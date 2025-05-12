import { BufferGeometry } from 'three';
import { Face } from '../face';
export declare function createNaiveVoxelGeometry(faces: Iterable<Face> | (() => Generator<Face>), { geometry, }?: {
    geometry?: BufferGeometry<import("three").NormalBufferAttributes> | undefined;
}): BufferGeometry<import("three").NormalBufferAttributes>;
//# sourceMappingURL=naive.d.ts.map