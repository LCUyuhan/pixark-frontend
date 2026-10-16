<template>
  <div ref="containerRef" class="picture-list-view" :aria-busy="loading" :style="{ '--pl-gap': GAP + 'px' }">
    <a-spin :spinning="loading && pictures.length > 0">
      <!-- 首次加载：骨架。追加下一页时保留已有行，只在底部转圈 -->
      <!--
        三个分支一律按 pictures（数据）判断，不按 rows（布局结果）。
        rows 依赖容器宽度，而宽度在隐藏标签页、display:none 祖先、首次测量前都会是 0，
        用 rows 判断会让一个有数据的列表显示成"暂无图片"。
      -->
      <div v-if="!pictures.length && loading" class="skeleton" aria-hidden="true">
        <div v-for="(row, rowIndex) in skeletonRows" :key="rowIndex" class="picture-row" :style="rowStyle(row)">
          <span
            v-for="(placed, i) in row.items"
            :key="i"
            class="skeleton-tile"
            :style="{ width: placed.width + 'px', height: row.height + 'px' }"
          />
        </div>
      </div>

      <div v-else-if="pictures.length" class="picture-rows">
        <div
          v-for="(row, rowIndex) in rows"
          :key="rowIndex"
          :ref="(el) => setRowRef(rowIndex, el)"
          :data-row="rowIndex"
          class="picture-row"
          :style="rowStyle(row)"
        >
          <!--
            按行门控：进出视口 ±800px 才挂载 / 卸载卡片。
            无限滚动下行数会一直堆，真正的开销是 Vue 组件实例而不是 <img>
            （图片有 loading="lazy" + decoding="async" 兜着）。
            行高由 rowStyle 显式占位，所以未挂载的行不会让滚动条跳动。
          -->
          <template v-if="isRowVisible(rowIndex)">
            <PictureCard
              v-for="placed in row.items"
              :key="placed.item.id"
              :picture="placed.item"
              :width="placed.width"
              :height="row.height"
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
          </template>
        </div>
      </div>

      <a-empty v-else-if="!loading" description="暂无图片" />

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
import { justifiedLayout, pictureScale, type JustifiedRow } from '@/utils/justifiedLayout'

interface Props {
  pictures: API.PictureVO[]
  loading?: boolean
  /** 批量模式：显示勾选框并隐藏卡片操作 */
  selectable?: boolean
  selectedIds?: (number | string)[]
  /** 期望行高。不传则按容器宽度自动分档 */
  targetHeight?: number
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
  /** 关掉按行门控（分页场景 DOM 规模本来就小） */
  lazyRows?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  selectable: false,
  selectedIds: () => [],
  targetHeight: undefined,
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

const GAP = 16
/**
 * 标题区高度，必须和 PictureCard 的 .caption 严格对应：padding-top 8 + 标题行高 18。
 * 行高预留靠它算，差几 px 滚动条就会在行挂载/卸载时跳一下。改那边记得改这里。
 */
const CAPTION_HEIGHT = 8 + 18

const slots = useSlots()
const showActionsFor = (picture: API.PictureVO) =>
  !!slots.actions && !props.selectable && !!props.canAction?.(picture)

const containerRef = ref<HTMLDivElement>()
const sentinelRef = ref<HTMLDivElement>()
const containerWidth = ref(0)
let resizeObserver: ResizeObserver | undefined
let rowObserver: IntersectionObserver | undefined
let sentinelObserver: IntersectionObserver | undefined

/**
 * 宽屏给更大的图。一行放几张、单图多大，几乎直接决定图库首页的观感，
 * 所以不再由调用方逐个传，按容器宽度分档。显式传 targetHeight 仍可覆盖。
 */
const effectiveTarget = computed(() => {
  if (props.targetHeight) {
    return props.targetHeight
  }
  const w = containerWidth.value
  return w >= 1400 ? 280 : w >= 1000 ? 260 : w >= 640 ? 220 : 180
})

const rows = computed<JustifiedRow<API.PictureVO>[]>(() =>
  justifiedLayout(props.pictures, { containerWidth: containerWidth.value, targetHeight: effectiveTarget.value, gap: GAP }, pictureScale),
)

/** 骨架行直接跑真实布局算法、只喂假比例，所以占位几何和真实数据一致，不跳版 */
const SKELETON_SCALES = [1.6, 0.75, 1.33, 2, 0.9, 1.5, 1.78, 0.56, 1.2, 1.4, 0.8, 1.9]
const skeletonRows = computed(() =>
  justifiedLayout(SKELETON_SCALES, { containerWidth: containerWidth.value, targetHeight: effectiveTarget.value, gap: GAP }, (s) => s).slice(0, 3),
)

const isSelected = (id?: number | string) => (id === undefined ? false : props.selectedIds.includes(id))

/**
 * 行盒子高度 = 图片高 + 标题区。门控卸载时靠它占住位置，滚动条才不跳。
 * 只在真的开门控时才设这个高度：万一 CAPTION_HEIGHT 算得不准，没门控的行还能靠内容自己撑开，
 * 不至于把卡片裁掉一截。
 */
const rowStyle = <T>(row: JustifiedRow<T>) =>
  props.lazyRows ? { height: row.height + CAPTION_HEIGHT + 'px' } : {}

const visibleRows = reactive(new Set<number>())
const isRowVisible = (index: number) => !props.lazyRows || visibleRows.has(index)

const rowEls = new Map<number, HTMLElement>()
const setRowRef = (index: number, el: unknown) => {
  const node = el as HTMLElement | null
  if (node) {
    rowEls.set(index, node)
    rowObserver?.observe(node)
  } else {
    rowEls.delete(index)
  }
}

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

onMounted(() => {
  if (!containerRef.value) {
    return
  }
  // ResizeObserver 首次回调晚于第一帧，先同步量一次避免空白闪烁
  containerWidth.value = containerRef.value.clientWidth
  resizeObserver = new ResizeObserver((entries) => {
    const next = Math.floor(entries[0]?.contentRect.width ?? 0)
    // 只变 1~2px 不重排，否则滚动条出现/消失会引发一轮无谓的重新布局
    if (Math.abs(next - containerWidth.value) > 2) {
      containerWidth.value = next
    }
  })
  resizeObserver.observe(containerRef.value)

  if (props.lazyRows) {
    rowObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.row)
          if (Number.isNaN(index)) {
            return
          }
          if (entry.isIntersecting) {
            visibleRows.add(index)
          } else {
            visibleRows.delete(index)
          }
        })
      },
      { rootMargin: '800px 0px' },
    )
    nextTick(() => rowEls.forEach((el) => rowObserver?.observe(el)))
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
  rowObserver?.disconnect()
  sentinelObserver?.disconnect()
})
</script>

<style scoped>
/* 间距只认 --pl-gap 一个来源，由根节点从 JS 的 GAP 注入。
   布局算法用的是 JS 的 GAP，CSS 写死的话两边会飘，整行就贴不满边 */
.picture-rows,
.skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--pl-gap);
}

.picture-row {
  display: flex;
  align-items: flex-start;
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
  border-radius: 8px;
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
