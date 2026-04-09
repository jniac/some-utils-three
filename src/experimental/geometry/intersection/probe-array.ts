const a = 0
const b = 0.20177410543
const c = 0.309017002583
const d = 0.326477348804
const e = 0.356822103262
const f = 0.403548210859
const g = 0.5
const h = 0.525731086731
const i = 0.577350258827
const j = 0.652954697609
const k = 0.730025589466
const l = 0.809017002583
const m = 0.850650787354
const n = 0.85472881794
const o = 0.934172332287
const p = 0.979432106018
const q = 1

/**
 * Probe directions for sphere sampling. Only the first half 
 */
const probe12 = [
  -m, a, h,
  m, a, h,
  a, h, m,
  a, -h, m,
  -h, m, a,
  h, m, a,
]

const probe42 = [
  -l, g, c,
  l, -g, c,
  l, g, c,
  -l, -g, c,
  -c, l, g,
  c, l, g,
  c, -l, g,
  -c, -l, g,
  -h, m, a,
  h, m, a,
  -g, c, l,
  g, -c, l,
  g, c, l,
  -g, -c, l,
  -m, a, h,
  m, a, h,
  a, h, m,
  a, -h, m,
  a, q, a,
  -q, a, a,
  a, a, q,
]

const probe92 = [
  -k, j, b,
  k, -j, b,
  k, j, b,
  -k, -j, b,
  -f, n, d,
  f, n, d,
  f, -n, d,
  -f, -n, d,
  -h, m, a,
  h, m, a,
  -i, i, i,
  i, -i, i,
  i, i, i,
  -i, -i, i,
  -n, d, f,
  n, -d, f,
  n, d, f,
  -n, -d, f,
  -j, b, k,
  j, -b, k,
  j, b, k,
  -j, -b, k,
  -m, a, h,
  m, a, h,
  -b, k, j,
  b, k, j,
  b, -k, j,
  -b, -k, j,
  -d, f, n,
  d, -f, n,
  d, f, n,
  -d, -f, n,
  a, h, m,
  a, -h, m,
  -b, p, a,
  b, p, a,
  a, o, e,
  a, -o, e,
  o, -e, a,
  -o, -e, a,
  p, a, b,
  -p, a, b,
  a, b, p,
  a, -b, p,
  -e, a, o,
  e, -a, o,
]

export {
  probe12,
  probe42,
  probe92
}
