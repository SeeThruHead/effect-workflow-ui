export const sortInPlace = (xs: Array<number>, target: { count: number }) => {
  xs.sort()
  target.count = 1
  Object.assign(target, { count: 2 })
  const shared = xs
  shared.fill(0)
  return xs
}
