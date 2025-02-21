import { ColorRepresentation } from 'three';
import { LineHelper } from '../../helpers/line';
import { Vertigo } from '../vertigo';
export declare class VertigoHelper extends LineHelper {
    constructor(vertigo: Vertigo, { color }?: {
        color?: ColorRepresentation | undefined;
    });
}
