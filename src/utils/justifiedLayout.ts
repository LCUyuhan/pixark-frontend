/**
 * 两端对齐（justified rows）图片布局。
 *
 * 思路：按行填充，凑满一行宽度就闭合，整行等高、左右都贴边。
 * 相比等高网格不裁图，相比瀑布流保持严格的行优先阅读顺序（列表按创建时间倒序时，
 * 排序语义必须成立，这是这里选它的决定性理由）。
 *
 * 纯函数，不依赖 Vue，也不认识 PictureVO —— 宽高比由调用方通过 getScale 给。
 *
 * 一条硬约束：一组图定了之后，"行高"和"铺满容器宽"是由 totalScale 同时决定的，
 * 只能二选一。所以这里不夹取行高，而是反过来挑成员 —— 加一张会让行高跌破下限时就提前闭合。
 * 先夹高度再按比例反算宽度（widthFactor 那类做法）会让整行每个瓦片都窄于图片本身，
 * object-fit: cover 于是把每张图都裁掉一截，等于退化成等高网格。
 */

/** 极端比例兜底：宽到 3.3:1、窄到 1:3.3 之外不再保证零裁切。手机竖屏 0.39、全景 2:1 都在区间内 */
const MIN_SCALE = 0.3
const MAX_SCALE = 3.3
/** 一行低于这个高度就提前闭合，宁可少放一张 */
const MIN_ROW_HEIGHT = 150
/** 末行自然宽度够不上容器这个比例就不拉伸，保持目标行高、右侧留白 */
const LAST_ROW_FILL_RATIO = 0.45

export interface JustifiedOptions {
  /** 容器可用宽度（含间距） */
  containerWidth: number
  /** 期望行高，实际行高会围绕它浮动 */
  targetHeight: number
  gap?: number
}

export interface PlacedItem<T> {
  item: T
  width: number
}

export interface JustifiedRow<T> {
  height: number
  items: PlacedItem<T>[]
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** 收进一批图片后这一行会有的高度（不含任何夹取） */
function heightFor(scaleSum: number, count: number, containerWidth: number, gap: number) {
  if (count === 0 || scaleSum <= 0) {
    return Infinity
  }
  return (containerWidth - gap * (count - 1)) / scaleSum
}

function buildRow<T>(
  items: readonly T[],
  isLast: boolean,
  containerWidth: number,
  targetHeight: number,
  gap: number,
  getScale: (item: T) => number,
): JustifiedRow<T> {
  const scales = items.map((item) => clamp(getScale(item), MIN_SCALE, MAX_SCALE))
  const totalScale = scales.reduce((sum, s) => sum + s, 0)
  const usable = containerWidth - gap * (items.length - 1)
  const fitsHeight = heightFor(totalScale, items.length, containerWidth, gap)

  // 末行只有"接近铺满"时才拉齐，否则几张图会被拉成变形的大块
  const stretch =
    !isLast || totalScale * targetHeight >= containerWidth * LAST_ROW_FILL_RATIO || fitsHeight <= targetHeight

  const height = Math.round(stretch ? fitsHeight : Math.min(targetHeight, fitsHeight))

  let widths: number[]
  if (stretch) {
    // 按占比分配可用宽，再用最大余数法补齐整数误差：
    // 每块最多偏 1px，且整行精确贴边。把余数全甩给最后一张会让它单独偏到 6%，
    // 那点差值由 object-fit: cover 吃掉，等于给那张图裁了一刀
    const exact = scales.map((s) => (s / totalScale) * usable)
    const floors = exact.map(Math.floor)
    let leftover = usable - floors.reduce((sum, v) => sum + v, 0)
    const order = exact
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac)
    widths = floors.slice()
    for (const { i } of order) {
      if (leftover <= 0) {
        break
      }
      widths[i] += 1
      leftover -= 1
    }
  } else {
    widths = scales.map((s) => Math.round(s * height))
  }

  return { height, items: items.map((item, i) => ({ item, width: widths[i] })) }
}

/**
 * 把一批数据排成两端对齐的行。
 *
 * @param items 顺序即阅读顺序，函数不会重排
 * @param getScale 取宽高比（宽 / 高）
 */
export function justifiedLayout<T>(
  items: readonly T[],
  options: JustifiedOptions,
  getScale: (item: T) => number,
): JustifiedRow<T>[] {
  const gap = options.gap ?? 12
  const { containerWidth, targetHeight } = options
  if (!items.length || containerWidth <= 0) {
    return []
  }

  const rows: JustifiedRow<T>[] = []
  let bucket: T[] = []
  let bucketScale = 0

  const flush = (isLast: boolean) => {
    if (!bucket.length) {
      return
    }
    rows.push(buildRow(bucket, isLast, containerWidth, targetHeight, gap, getScale))
    bucket = []
    bucketScale = 0
  }

  for (const item of items) {
    const scale = clamp(getScale(item), MIN_SCALE, MAX_SCALE)
    const nextCount = bucket.length + 1

    // 加上这张就太矮了：先把现有的闭合，这张留到下一行。
    // 但行里至少留一张，否则单张超宽图会永远挤不出行
    if (bucket.length && heightFor(bucketScale + scale, nextCount, containerWidth, gap) < MIN_ROW_HEIGHT) {
      flush(false)
    }

    bucket.push(item)
    bucketScale += scale

    // 自然宽度已铺满容器就闭合
    if (bucketScale * targetHeight >= containerWidth) {
      flush(false)
    }
  }
  flush(true)

  return rows
}

/**
 * 图片宽高比。优先用后端上传时算好的 picScale，退回按宽高算，再兜底 1:1。
 * 兜底成 1 而不是 0：0 会让整行的 totalScale 塌陷，把该行其它图一起拉宽。
 */
export function pictureScale(picture: API.PictureVO): number {
  if (picture.picScale && picture.picScale > 0) {
    return picture.picScale
  }
  if (picture.picWidth && picture.picHeight && picture.picHeight > 0) {
    return picture.picWidth / picture.picHeight
  }
  return 1
}
