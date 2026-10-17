<template>
  <div ref="containerRef" class="picture-list-view" :aria-busy="loading" :style="{ '--pl-gap': gap + 'px' }">
    <a-spin :spinning="loading && pictures.length > 0">
      <!--
        三个分支一律按 pictures（数据）判断，不按布局结果。
        布局依赖容器宽度，而宽度在隐藏标签页、display:none 祖先、首次测量前都会是 0，
        用布局结果判断会让一个有数据的列表显示成"暂无图片"。
      -->
      <!-- 首次加载：骨架。追加下一页时保留已有内容，只在底部转圈 -->
      <div v-if="!pictures.length && loading" class="masonry" aria-hidden="true">
        <div v-for="(col, colIndex) in skeletonColumns" :key="colIndex" class="masonry-col">
          <span v-for="(height, i) in col" :key="i" class="skeleton-tile" :style="{ height: height + 'px' }" />
        </div>
      </div>

      <!-- 定宽列瀑布流：列宽统一，高度随图片真实比例，间距统一 -->
      <div v-else-if="pictures.length" class="masonry">
        <div v-for="(col, colIndex) in columns" :key="colIndex" class="masonry-col">
          <!--
            按卡片门控：进出视口 ±800px 才挂载 / 卸载卡片内容。
            无限滚动下卡片会一直堆，真正的开销是 Vue 组件实例而不是 <img>
            （图片有 loading="lazy" + decoding="async" 兜着）。
            单元格高度显式占位，未挂载的卡片不会让滚动条跳动。
          -->
          <div
            v-for="placed in col"
            :key="placed.item.id"
            :ref="(el) => setCellRef(placed.item.id, el)"
            :data-pic="placed.item.id"
            class="masonry-cell"
            :style="cellStyle(placed)"
          >
            <PictureCard
              v-if="isCellVisible(placed.item.id)"
              :picture="placed.item"
              :width="columnWidth"
              :height="placed.height"
              :selectable="selectable"
              :selected="isSelected(placed.item.id)"
              :show-actions="showActionsFor(placed.item)"
              @click="emit('click', placed.item)"
              @toggle-select="(id) => emit('toggleSelect', id)"
            >
              <template v-if="$slots.actions" #actions="{ picture }">
                <slot name="actions" :picture="picture" />
              </template>
            </PictureCard>
          </div>
        </div>
      </div>

      <a-empty v-else-if="!loading" :image="emptyImg" description="暂无图片" />

      <!-- 触底哨兵与状态行 -->
      <div v-if="infinite" ref="sentinelRef" class="list-sentinel">
        <a-spin v-if="loadingMore" size="small" />
        <span v-else-if="!hasMore && pictures.length" class="no-more">没有更多了</span>
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useSlots, watch } from 'vue'
import PictureCard from '@/components/PictureCard.vue'
import emptyImg from '@/assets/states/state-empty.svg'

interface PlacedPicture {
  item: API.PictureVO
  /** 图片区高度（列宽 / 宽高比），不含标题区 */
  height: number
}

interface Props {
  pictures: API.PictureVO[]
  loading?: boolean
  /** 批量模式：显示勾选框并隐藏卡片操作 */
  selectable?: boolean
  selectedIds?: (number | string)[]
  /**
   * 这张卡片能不能出操作按钮。批量模式下统一隐藏。
   * 由父级判定而不是把 v-if 写在插槽里：插槽内容不渲染时外层那个带底色的按钮容器仍会留下来，
   * 变成图片右上角一个空白色块。
   */
  canAction?: (picture: API.PictureVO) => boolean
  /** 还有下一页 */
  hasMore?: boolean
  /** 正在追加下一页 */
  loadingMore?: boolean
  /** 开启无限滚动（渲染底部哨兵并派发 loadMore）。关掉就是普通分页，父级自己管翻页 */
  infinite?: boolean
  /** 关掉按卡片门控（分页场景 DOM 规模本来就小） */
  lazyRows?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  selectable: false,
  selectedIds: () => [],
  canAction: undefined,
  hasMore: true,
  loadingMore: false,
  infinite: false,
  lazyRows: true,
})

const emit = defineEmits<{
  click: [picture: API.PictureVO]
  toggleSelect: [id: number | string]
  loadMore: []
}>()

/** 标题区高度（padding-top 8 + 标题行高 18），与 PictureCard 的 .caption 严格对应 */
const CAPTION_HEIGHT = 8 + 18

/** 极端比例兜底：宽到 3.3:1、窄到 1:3.3 之外不再保证零裁切 */
const MIN_SCALE = 0.3
const MAX_SCALE = 3.3

/**
 * 图片宽高比。优先用后端上传时算好的 picScale，退回按宽高算，再兜底 1:1。
 * 兜底成 1 而不是 0：0 会让单元格高度塌陷成一条缝。
 */
const pictureScale = (picture: API.PictureVO): number => {
  const raw =
    picture.picScale && picture.picScale > 0
      ? picture.picScale
      : picture.picWidth && picture.picHeight && picture.picHeight > 0
        ? picture.picWidth / picture.picHeight
        : 1
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw))
}

const slots = useSlots()
const showActionsFor = (picture: API.PictureVO) =>
  !!slots.actions && !props.selectable && !!props.canAction?.(picture)

const containerRef = ref<HTMLDivElement>()
const sentinelRef = ref<HTMLDivElement>()

/**
 * 容器宽度兜底：布局帧还没跑（后台标签页、样式注册窗口期）时 clientWidth 会是 0，
 * ResizeObserver 在被遮挡的标签页里也可能暂停回调。先用视口宽度估一个近似值，
 * 让瀑布流立刻能排；真实宽度随后由 ResizeObserver / visibilitychange 校正。
 */
const estimateWidth = () => Math.max(320, Math.min(1280, window.innerWidth - 48))

const containerWidth = ref(0)
let resizeObserver: ResizeObserver | undefined
let cellObserver: IntersectionObserver | undefined
let sentinelObserver: IntersectionObserver | undefined

/** 移动端间距收窄，桌面端保持舒展 */
const gap = computed(() => (containerWidth.value && containerWidth.value < 768 ? 10 : 16))

/**
 * 列数只随容器宽度变：同一断点下列宽稳定一致，这是瀑布流秩序感的来源。
 * 行高不再统一（高度跟图片比例走），换来的是没有"宽窄不一的瓦片"和"末行大片留白"。
 */
const columnCount = computed(() => {
  const w = containerWidth.value
  return w >= 1400 ? 5 : w >= 1100 ? 4 : w >= 768 ? 3 : 2
})

const columnWidth = computed(() => {
  if (!containerWidth.value) {
    return 0
  }
  return Math.floor((containerWidth.value - gap.value * (columnCount.value - 1)) / columnCount.value)
})

/**
 * 最矮列优先分配。高度只增不减，所以追加下一页不会重排已有卡片；
 * 阅读顺序在每"轮"内保持从左到右（列高相近时逐列轮转）。
 */
const columns = computed<PlacedPicture[][]>(() => {
  const w = columnWidth.value
  const cols: PlacedPicture[][] = Array.from({ length: columnCount.value }, () => [])
  if (!w) {
    return cols
  }
  const heights = new Array<number>(columnCount.value).fill(0)
  for (const item of props.pictures) {
    const height = Math.round(w / pictureScale(item))
    let target = 0
    for (let i = 1; i < heights.length; i++) {
      if (heights[i] < heights[target]) {
        target = i
      }
    }
    cols[target].push({ item, height })
    heights[target] += height + CAPTION_HEIGHT + gap.value
  }
  return cols
})

/** 骨架直接跑同一套分配逻辑、只喂假比例，所以占位几何和真实数据一致，不跳版 */
const SKELETON_SCALES = [1.6, 0.75, 1.33, 2, 0.9, 1.5, 1.78, 0.56, 1.2, 1.4, 0.8, 1.9]
const skeletonColumns = computed<number[][]>(() => {
  const w = columnWidth.value
  const cols: number[][] = Array.from({ length: columnCount.value }, () => [])
  if (!w) {
    return cols
  }
  const heights = new Array<number>(columnCount.value).fill(0)
  for (const scale of SKELETON_SCALES) {
    const height = Math.round(w / scale) + CAPTION_HEIGHT
    let target = 0
    for (let i = 1; i < heights.length; i++) {
      if (heights[i] < heights[target]) {
        target = i
      }
    }
    cols[target].push(height)
    heights[target] += height + gap.value
  }
  return cols
})

const isSelected = (id?: number | string) => (id === undefined ? false : props.selectedIds.includes(id))

/**
 * 单元格高度 = 图片高 + 标题区。门控卸载时靠它占住位置，滚动条才不跳。
 * 只在真的开门控时才设这个高度：万一 CAPTION_HEIGHT 算得不准，没门控的格子还能靠内容自己撑开。
 */
const cellStyle = (placed: PlacedPicture) =>
  props.lazyRows ? { height: placed.height + CAPTION_HEIGHT + 'px' } : {}

// ---- 按卡片门控（一个 observer 管所有单元格）----
const visibleCells = reactive(new Set<number | string>())
const isCellVisible = (id?: number | string) =>
  !props.lazyRows || id === undefined || visibleCells.has(id)

const cellEls = new Map<number | string, HTMLElement>()
const setCellRef = (id: number | string | undefined, el: unknown) => {
  if (id === undefined) {
    return
  }
  const node = el as HTMLElement | null
  if (node) {
    cellEls.set(id, node)
    cellObserver?.observe(node)
  } else {
    cellEls.delete(id)
  }
}

// 整表替换（搜索/筛选）后清掉已不在列表里的可见标记，避免旧 id 占位
watch(
  () => props.pictures,
  (list) => {
    const ids = new Set(list.map((p) => p.id))
    for (const id of [...visibleCells]) {
      if (!ids.has(id)) {
        visibleCells.delete(id)
      }
    }
  },
)

/**
 * 哨兵可见状态要单独存：IntersectionObserver 只在"穿越阈值"时回调，
 * 如果加载完一页后哨兵仍在视口里（图少、屏幕高），不会有新回调，就会停止加载。
 * 所以这里用状态 + watch 兜住"还得继续加载"这一情况。
 */
const sentinelVisible = ref(false)
const maybeLoadMore = () => {
  if (props.infinite && sentinelVisible.value && props.hasMore && !props.loading && !props.loadingMore) {
    emit('loadMore')
  }
}
watch(
  [sentinelVisible, () => props.hasMore, () => props.loading, () => props.loadingMore, () => props.pictures.length],
  maybeLoadMore,
)

/** 实测容器宽度并校正（ResizeObserver 首次回调、标签页回前台时都会走这里） */
const remeasure = () => {
  const el = containerRef.value
  if (!el) {
    return
  }
  const next = Math.floor(el.clientWidth)
  // 只变 1~2px 不重排，否则滚动条出现/消失会引发一轮无谓的重新布局
  if (next > 0 && Math.abs(next - containerWidth.value) > 2) {
    containerWidth.value = next
  }
}

/**
 * 用几何计算手动校正可见卡片：±800px 内标记挂载，±1600px 外卸载（滞回避免抖动）。
 * IntersectionObserver 在某些浏览器状态（后台标签页、渲染被节流、GPU 异常）下回调会彻底罢工，
 * 这里作为兜底：挂载后、每次布局变化后、滚动时、回前台时都会跑，IO 健康时两者幂等共存。
 */
const ADD_MARGIN = 800
const REMOVE_MARGIN = 1600
const recheckVisibleCells = () => {
  if (!props.lazyRows) {
    return
  }
  const addLimit = window.innerHeight + ADD_MARGIN
  const removeLimit = window.innerHeight + REMOVE_MARGIN
  cellEls.forEach((el, id) => {
    const rect = el.getBoundingClientRect()
    if (rect.bottom > -ADD_MARGIN && rect.top < addLimit) {
      visibleCells.add(id)
    } else if (rect.bottom < -REMOVE_MARGIN || rect.top > removeLimit) {
      visibleCells.delete(id)
    }
  })
}

/** 哨兵的几何判定：与 IO 写同一个 sentinelVisible，IO 罢工时无限滚动仍能用 */
const checkSentinelGeometry = () => {
  if (!props.infinite || !sentinelRef.value) {
    return
  }
  const rect = sentinelRef.value.getBoundingClientRect()
  sentinelVisible.value = rect.top < window.innerHeight + 600 && rect.bottom > -600
}

/** 布局重算（新数据到达 / 列数变化）后，下一帧用几何兜底校正一次 */
watch(columns, () => {
  nextTick(() => {
    recheckVisibleCells()
    checkSentinelGeometry()
  })
})

// 滚动兜底：rAF 节流，IO 正常时只是重复确认同一批状态（幂等），开销极小
let scrollRaf = 0
const onScrollFallback = () => {
  if (scrollRaf) {
    return
  }
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    recheckVisibleCells()
    checkSentinelGeometry()
  })
}

const onVisibilityChange = () => {
  if (!document.hidden) {
    remeasure()
    recheckVisibleCells()
    checkSentinelGeometry()
  }
}

onMounted(() => {
  if (!containerRef.value) {
    return
  }
  // ResizeObserver 首次回调晚于第一帧，先同步量一次避免空白闪烁；量到 0 用视口估算兜底
  containerWidth.value = Math.floor(containerRef.value.clientWidth) || estimateWidth()
  resizeObserver = new ResizeObserver(remeasure)
  resizeObserver.observe(containerRef.value)
  // 后台/被遮挡标签页里 RO 可能暂停，回前台时主动校正一次
  document.addEventListener('visibilitychange', onVisibilityChange)
  // IO 可能彻底罢工的浏览器状态（节流/GPU 异常），滚动兜底保证图墙与无限滚动可用
  window.addEventListener('scroll', onScrollFallback, { passive: true })

  if (props.lazyRows) {
    cellObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.pic
          if (id === undefined) {
            return
          }
          if (entry.isIntersecting) {
            visibleCells.add(id)
          } else {
            visibleCells.delete(id)
          }
        })
      },
      { rootMargin: '800px 0px' },
    )
    nextTick(() => {
      cellEls.forEach((el) => cellObserver?.observe(el))
      // IO 初始回调在异常时序下可能迟迟不来，先用几何计算兜底标一批
      recheckVisibleCells()
    })
  }

  if (sentinelRef.value) {
    sentinelObserver = new IntersectionObserver(
      (entries) => {
        sentinelVisible.value = entries.some((e) => e.isIntersecting)
        maybeLoadMore()
      },
      { rootMargin: '600px 0px' },
    )
    sentinelObserver.observe(sentinelRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  cellObserver?.disconnect()
  sentinelObserver?.disconnect()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('scroll', onScrollFallback)
  if (scrollRaf) {
    cancelAnimationFrame(scrollRaf)
  }
})
</script>

<style scoped>
/* 间距只认 --pl-gap 一个来源，由根节点从 JS 的 gap 注入。
   布局算法用的是 JS 的 gap，CSS 写死的话两边会飘 */
.masonry {
  display: flex;
  align-items: flex-start;
  gap: var(--pl-gap);
}

.masonry-col {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--pl-gap);
}

.list-sentinel {
  display: flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
}

.no-more {
  font-size: 12px;
  color: var(--color-text-disabled);
}

.skeleton-tile {
  flex: none;
  display: block;
  border-radius: var(--radius-md);
  background: linear-gradient(
    100deg,
    var(--color-bg-layout) 30%,
    var(--color-bg-container) 50%,
    var(--color-bg-layout) 70%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

/* 系统要求减少动效时只留静态占位，不关掉占位本身 —— 关掉就又跳版了 */
@media (prefers-reduced-motion: reduce) {
  .skeleton-tile {
    animation: none;
  }
}
</style>
