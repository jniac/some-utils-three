# Transform With Shear

A Three.js utility to represent and interpolate 3D transforms with shear.

Features:
- Direct to indirect transform interpolation is supported.
- Shear is represented as XY, XZ, YZ shear factors.

Different usage are possible, for example:

- Interpolate between two matrices:
```ts
TransformLike.lerpMatrixes(objA.matrix, objB.matrix, t, objC.matrix)
```

- Interpolate between two transforms (see `TransformLike.lerp()`).
```ts
TransformLike.lerp({
  position: [1, 2, 3],
  rotation: [0, Math.PI / 2, 0],
  scale: [1, 2, 1],
  shear: [0, 1, 0],
}, {
  position: [3, 2, 1],
  rotation: [0, Math.PI, 0],
  scale: [-1, 0.5, -1],
  shear: [1, 0, 0],
}, t)
  .toMatrix(myObject.matrix)
```

- Or via instances:
```ts
const twsA = new TransformLike().setTransform({
  position: [1, 2, 3],
  rotation: [0, Math.PI / 2, 0],
  scale: [1, 2, 1],
  shear: [0, 1, 0],
})
const twsB = new TransformLike().setTransform({
  position: [3, 2, 1],
  rotation: [0, Math.PI, 0],
  scale: [-1, 0.5, -1],
  shear: [1, 0, 0],
})
const twsC = new TransformLike()
  .lerpTransforms(twsA, twsB, t)
  .toMatrix(myObject.matrix)
```

