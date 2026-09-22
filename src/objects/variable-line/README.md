# VariableLine

Implémentation WebGL d’une polyligne à épaisseur variable, avec un quad (deux triangles) instancié par segment.

```ts
const geometry = new VariableLineGeometry().setPositions(
  [0, 0, 0, 3, 0, 0, 3, 3, 0],
  [8, 60, 20],
)
const material = new VariableLineMaterial({ color: '#f9c', linewidth: 1 })
const line = new VariableLine2(geometry, material)
scene.add(line)

material.linewidth = 2 // Multiplicateur global
```

- Les positions sont des triplets xyz. Les épaisseurs sont des diamètres en pixels CSS par défaut, un par point. Avec `worldUnits: true`, ce sont des unités monde. Dans une render target, elles sont en pixels de la cible.
- Chaque instance contient huit floats : start.xyz, end.xyz, widthStart, widthEnd. Les deux derniers sont exposés via `instanceWidthStart` et `instanceWidthEnd`.
- `setPositions` réutilise désormais le buffer et sa capacité. Pour modifier directement les attributs, marquer leur buffer interleaved `data.needsUpdate = true`.
- Le rectangle est étendu du rayon maximal, plus une marge d’anticrénelage. Le fragment shader utilise la distance signée de la capsule asymétrique d’Inigo Quilez : https://iquilezles.org/articles/distfunctions2d/.
- Si la distance entre les centres est inférieure ou égale à la différence des rayons, le plus grand disque est dessiné. Cela couvre aussi les points confondus. Un chemin de moins de deux points ne dessine aucun segment.
- Les joints résultent du recouvrement des capsules. Avec une opacité inférieure à 1, ces recouvrements peuvent être visibles. La transparence est activée pour l’anticrénelage et l’écriture en profondeur est désactivée.

Cette version ne gère pas les pointillés, de couleurs par sommet, de joints miter/bevel ou de picking. Le frustum culling est désactivé car les limites du quad de base ne représentent pas la polyligne. La projection perspective utilise un depth buffer conventionnel ; le reversed depth buffer n’est pas pris en charge. Ce n’est pas un remplacement complet de toutes les fonctions de Line2.

## Mise à jour à chaque frame

```ts
const pointCount = 1000
const geometry = new VariableLineGeometry(pointCount - 1)
const material = new VariableLineMaterial({ worldUnits: true })
let time = 0

time = elapsedTime
geometry.updatePoints(pointCount, (index, target) => {
  const t = index / (pointCount - 1)
  target.set(t * 10, Math.sin(t * 10 + time), 0, 0.1 + t * 0.4)
})
```

Le callback est appelé une seule fois par point, dans l’ordre, et doit écrire les quatre composantes. Chaque point est immédiatement écrit aux emplacements start/end des segments adjacents. Aucun tableau de points uniques n’est construit. Les attributs, le tableau typé et le Vector4 temporaire sont réutilisés tant que la capacité suffit. `DynamicDrawUsage` et une plage de mise à jour limitent le transfert GPU aux segments actifs.

Le constructeur et `reserve(segmentCapacity)` permettent de préallouer. Une croissance double la capacité au minimum et libère les anciennes ressources GPU ; prévoir la capacité maximale avant l’animation pour éviter ce coût. Réduire le nombre de points conserve la capacité. La duplication de données nécessaire au rendu instancié demeure dans le buffer final.

## Unités monde

`material.worldUnits = true` peut être changé sans recompilation. Chaque rayon est converti en pixels à la profondeur de son extrémité, avec la matrice de projection : zoom orthographique et perspective sont pris en compte. La densité de pixels ne multiplie pas les valeurs monde ; l’échelle de l’objet déplace les points mais ne multiplie pas l’épaisseur.

Le rendu reste une capsule 2D face caméra entre les disques projetés. Ce n’est pas la projection exacte d’une capsule volumique 3D, notamment pour les lignes très épaisses, proches de la caméra ou orientées en profondeur. Le découpage au plan proche s’applique à l’axe du segment. Les autres limites ci-dessus restent applicables.
