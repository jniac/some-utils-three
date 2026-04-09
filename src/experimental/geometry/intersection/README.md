# Geometry Intersection

Provides function for intersecting rays with geometries.

3 main contexts for ray-geometry intersection:
- `Triangle`: Intersecting a ray with a single triangle.
- `Geometry`: Intersecting a ray with a `BufferGeometry`, which may contain multiple triangles. Supports indexed and non-indexed geometries.
- `Mesh`: Intersecting a ray with a `Mesh`, which includes the geometry and the world transform of the mesh.

Intersections can be performed in different modes:
- `Line`: Intersecting the ray as an infinite line, returning the intersection point and normal.
- `Ray`: Intersecting the ray with the geometry, returning the intersection point and normal.
- `Segment`: Intersecting the ray as a line segment (from origin to origin + direction), returning the intersection point and normal.
- `SymmetricSegment`: Intersecting the ray as a line segment in both directions (from origin - direction to origin + direction), returning the intersection