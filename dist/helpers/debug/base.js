import { Matrix4 } from 'three';
export class BaseManager {
    keyMap = new Map();
    ensureKeyEntry(key, index, count) {
        const entry = this.keyMap.get(key);
        if (entry) {
            if (entry.count !== count)
                throw new Error('A key entry already exists with a different count. This is not allowed. Once a key is set, it cannot be changed.');
            return entry;
        }
        else {
            const newEntry = { index, count };
            this.keyMap.set(key, newEntry);
            return newEntry;
        }
    }
    transformMatrix = new Matrix4();
    applyTransform(...transforms) {
        throw new Error('Not implemented!');
    }
    clear() {
        this.keyMap.clear();
        return this;
    }
}
//# sourceMappingURL=base.js.map