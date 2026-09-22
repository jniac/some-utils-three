# VariableLine

Implémentation WebGL d’une polyligne à épaisseur variable, avec un quad (deux triangles) instancié par segment.

```ts
const geometry = new VariableLineGeometry().setPositions(
  [0, 0, 0, 3, 0, 0, 3, 3, 0],
  [8, 60, 20],
)
const material = new VariableLineMaterial({ color: '#f9c', linewidth: 1 })
const line = new VariableLine(geometry, material)
scene.add(line)

material.linewidth = 2 // Multiplicateur global
```

- Les positions sont des triplets xyz. Les épaisseurs sont des diamètres en pixels CSS par défaut, un par point. Avec `worldUnits: true`, ce sont des unités monde. Dans une render target, elles sont en pixels de la cible.
- Chaque instance contient huit floats : start.xyz, end.xyz, widthStart, widthEnd. Les deux derniers sont exposés via `instanceWidthStart` et `instanceWidthEnd`.
- `setPositions` réutilise désormais le buffer et sa capacité. Pour modifier directement les attributs, marquer leur buffer interleaved `data.needsUpdate = true`.
- Le rectangle est étendu du rayon maximal, plus une marge d’anticrénelage. Le fragment shader utilise la distance signée de la capsule asymétrique d’Inigo Quilez : https://iquilezles.org/articles/distfunctions2d/.
- Si la distance entre les centres est inférieure ou égale à la différence des rayons, le plus grand disque est dessiné. Cela couvre aussi les points confondus. Un chemin de moins de deux points ne dessine aucun segment.
- Les joints résultent du recouvrement des capsules. Avec une opacité inférieure à 1, ces recouvrements peuvent être visibles. La transparence est activée pour l’anticrénelage et l’écriture en profondeur est désactivée.

Cette version ne gère pas les pointillés, les joints miter/bevel ou le picking. Le frustum culling est désactivé car les limites du quad de base ne représentent pas la polyligne. La projection perspective utilise un depth buffer conventionnel ; le reversed depth buffer n’est pas pris en charge. Ce n’est pas un remplacement complet de toutes les fonctions de Line2.

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

`material.worldUnits = true` sélectionne maintenant la variante `WORLD_UNITS` du shader (recompilation ou programme en cache). Chaque rayon est converti en pixels à la profondeur de son extrémité, avec la matrice de projection : zoom orthographique et perspective sont pris en compte. La densité de pixels ne multiplie pas les valeurs monde ; l’échelle de l’objet déplace les points mais ne multiplie pas l’épaisseur.

Le rendu reste une capsule 2D face caméra entre les disques projetés. Ce n’est pas la projection exacte d’une capsule volumique 3D, notamment pour les lignes très épaisses, proches de la caméra ou orientées en profondeur. Le découpage au plan proche s’applique à l’axe du segment. Les autres limites ci-dessus restent applicables.

## Couleurs, position monde et ombres

```ts
const geometry = new VariableLineGeometry(pointCount - 1, true)
const material = new VariableLineMaterial({
  worldUnits: true,
  vertexColors: true,
  worldPosition: true,
  shadows: true,
})
const line = new VariableLine(geometry, material)
line.castShadow = true
line.receiveShadow = true

const updatePoint: VariableLinePointDelegate = (i, point, color) => {
  point.set(i * 0.1, Math.sin(i * 0.1), 0, 0.3)
  color.setHSL(i / pointCount, 1, 0.5)
}
geometry.updatePoints(pointCount, updatePoint)
```

Le troisième argument du callback est un `Color` réutilisé, réinitialisé au blanc avant chaque point. Les couleurs sont stockées en espace linéaire et multipliées par `uDiffuse`. Le buffer de couleurs est optionnel : passer `true` au constructeur de la géométrie ou appeler `enableVertexColors()` une fois. Il contient deux RGB par segment et est réutilisé lors des mises à jour. Les anciens callbacks à deux arguments restent valides. Sans attributs de couleurs, le matériau utilise le blanc.

| Option          | Chemin shader                                                                          |
| --------------- | -------------------------------------------------------------------------------------- |
| `vertexColors`  | `USE_COLOR`, généré par Three.js                                                       |
| `worldPosition` | `USE_WORLD_POSITION`, convention locale à ce matériau                                  |
| `worldUnits`    | `WORLD_UNITS`                                                                          |
| `shadows`       | `LINE_RECEIVE_SHADOWS`, puis `USE_SHADOWMAP` et le type de filtrage gérés par Three.js |

`worldPosition`, `worldUnits` et `shadows` invalident automatiquement le programme uniquement quand leur valeur change. Utiliser `setVertexColors(boolean)` pour la même gestion, ou `material.vertexColors = value` suivi de `material.needsUpdate = true`. Ces options sont destinées aux changements de fonctionnalités ; les données animées restent des attributs et uniforms.

`vWorldPosition` représente la surface élargie du billboard, pas son axe. Il est également disponible lorsque les ombres actives l’exigent. Pour un effet personnalisé, activer explicitement `worldPosition: true` afin de ne pas dépendre de la présence d’une lumière projetant des ombres. `onBeforeCompile` peut modifier la couleur avec ce varying, comme dans la démo. Les changements personnalisés de silhouette ou de position doivent aussi être appliqués aux matériaux d’ombre ; ils ne sont pas propagés automatiquement.

Le matériau reste non éclairé : `shadows: true` multiplie sa couleur par le masque d’ombre, sans modèle Lambert/PBR. Activer également `renderer.shadowMap.enabled`, `light.castShadow` et `line.receiveShadow`. La projection d’ombres utilise automatiquement les matériaux de profondeur et de distance du matériau (`customDepthMaterial` / `customDistanceMaterial`), avec le même découpage de capsule. Les lumières directionnelles, spots et ponctuelles sont prises en charge avec les filtres Basic/PCF. Les ombres traitent la silhouette comme opaque, sauf si `uOpacity` vaut zéro.

Les passes d’ombre conservent le billboard orienté vers la caméra principale, puis le projettent depuis la lumière. L’ombre correspond donc à la surface visible, mais cette surface reste plate et dépend de la caméra. Pour cette première version, la projection d’ombres vise le rendu sur le canvas avec une caméra classique : les render targets de taille différente, ArrayCamera/XR et le reversed depth buffer ne sont pas pris en charge. La réception seule fonctionne avec le viewport du rendu courant. Pour remplacer le matériau d’une ligne, mettre également à jour ses `customDepthMaterial` et `customDistanceMaterial` avant la première passe d’ombre.

`material.dispose()` libère aussi ses deux matériaux d’ombre. Ne pas disposer le matériau tant qu’une autre ligne le partage. La démo `/wip/variable-line` permet de tester les trois types de lumière et les variantes avec et sans fonctionnalités optionnelles.
