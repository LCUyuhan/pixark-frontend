<template>
  <div class="home-page">
    <!-- 顶部锚点：靠它判断要不要显示"回到顶部"，不用监听 scroll -->
    <div ref="topAnchorRef" class="top-anchor"></div>

    <!-- 搜索框 -->
    <div class="search-bar">
      <a-input-search
        v-model:value="searchParams.searchText"
        placeholder="从海量图片中搜索"
        enter-button="搜索"
        size="large"
        @search="doSearch"
      />
    </div>

    <!-- 分类筛选：单选胶囊。折叠时只显示一行，右侧留位给"展开全部" -->
    <div class="filter-bar" :class="{ 'is-expanded': categoryExpanded }">
      <div ref="categoryChipsRef" class="filter-chips">
        <button
          type="button"
          class="chip"
          :class="{ active: activeCategory === 'all' }"
          @click="pickCategory('all')"
        >
          全部
        </button>
        <button
          v-for="category in categoryList"
          :key="category"
          type="button"
          class="chip"
          :class="{ active: activeCategory === category }"
          @click="pickCategory(category)"
        >
          {{ category }}
        </button>
        <button
          v-if="categoryExpanded && categoryOverflow"
          type="button"
          class="chip ghost"
          @click="categoryExpanded = false"
        >
          收起
        </button>
      </div>
      <button
        v-if="!categoryExpanded && categoryOverflow"
        type="button"
        class="expand-toggle"
        @click="categoryExpanded = true"
      >
        展开全部
        <DownOutlined />
      </button>
    </div>

    <!-- 标签筛选：多选胶囊，比分类小一档、淡一档，避免两行看起来是同一层筛选 -->
    <div class="tag-row">
      <span class="row-label">标签</span>
      <div class="filter-chips">
        <button
          v-for="(tag, index) in tagList"
          :key="tag"
          type="button"
          class="chip small"
          :class="{ selected: selectedTagMap[index] }"
          :aria-pressed="!!selectedTagMap[index]"
          @click="toggleTag(index)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- 图片列表：无限滚动，滚到底自动取下一页 -->
    <PictureListView
      :pictures="dataList"
      :loading="loading"
      :loading-more="loadingMore"
      :has-more="hasMore"
      infinite
      @click="doClickPicture"
      @load-more="onLoadMore"
    />

    <a-float-button v-if="showBackTop" tooltip="回到顶部" @click="scrollToTop">
      <template #icon>
        <VerticalAlignTopOutlined />
      </template>
    </a-float-button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { DownOutlined, VerticalAlignTopOutlined } from '@ant-design/icons-vue'
import { listPictureTagCategory, listPictureVOByPage } from '@/api/pictureController'
import PictureListView from '@/components/PictureListView.vue'

const router = useRouter()

// 查询参数（对应后端 PictureQueryRequest）。页码不放这里，单独用 page 管，
// 避免出现"两个地方都记着当前第几页"——回退时很容易只改一个
const searchParams = reactive<Omit<API.PictureQueryRequest, 'current'>>({
  pageSize: 20,
  sortField: 'createTime',
  sortOrder: 'descend',
})

/** 当前页码，无限滚动的唯一真源 */
const page = ref(1)

const dataList = ref<API.PictureVO[]>([])
const total = ref(0)
/** 首屏或换筛选条件的整表加载 */
const loading = ref(false)
/** 追加下一页，和 loading 分开：两者对失败的处理完全不同 */
const loadingMore = ref(false)

const hasMore = computed(() => dataList.value.length < total.value)

// 分类与标签
const categoryList = ref<string[]>([])
const tagList = ref<string[]>([])
const activeCategory = ref<string>('all')
const selectedTagMap = ref<boolean[]>([])

/** 与 .chip 的 height 一致，用来判断分类是否溢出一行 */
const CHIP_ROW_HEIGHT = 32
const categoryChipsRef = ref<HTMLDivElement>()
const categoryExpanded = ref(false)
const categoryOverflow = ref(false)
let chipsObserver: ResizeObserver | undefined

/**
 * 用实测高度而不是"分类数 > N"来判断要不要出"展开全部"：
 * 分类是后端动态返回的，名字长短不一，按个数猜会误判。
 */
const measureOverflow = () => {
  const el = categoryChipsRef.value
  if (el) {
    categoryOverflow.value = el.scrollHeight > CHIP_ROW_HEIGHT + 1
  }
}

const pickCategory = (category: string) => {
  if (activeCategory.value === category) {
    return
  }
  activeCategory.value = category
  doSearch()
}

const toggleTag = (index: number) => {
  selectedTagMap.value[index] = !selectedTagMap.value[index]
  doSearch()
}

/** 加载标签分类 */
const loadTagCategory = async () => {
  try {
    const res = await listPictureTagCategory()
    if (res.data.code === 0 && res.data.data) {
      categoryList.value = res.data.data.categoryList ?? []
      tagList.value = res.data.data.tagList ?? []
      selectedTagMap.value = tagList.value.map(() => false)
    }
  } catch {
    // 标签分类加载失败不影响主流程
  }
}

/**
 * 拉一页。append=false 整表替换，true 追加到末尾。
 *
 * 两种失败的处理刻意不同：
 * - 整表加载失败，页面上留着的是上一个条件结果，是错的，必须清空；
 * - 追加失败，已有内容仍然有效，只是不完整，留着 + 回退页码即可，清空反而更糟。
 */
const fetchPage = async (append: boolean) => {
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
  }
  try {
    const params: API.PictureQueryRequest = {
      ...searchParams,
      current: page.value,
      category: activeCategory.value === 'all' ? undefined : activeCategory.value,
      tags: tagList.value.filter((_, index) => selectedTagMap.value[index]),
    }
    const res = await listPictureVOByPage(params)
    if (res.data.code !== 0 || !res.data.data) {
      throw new Error(res.data.message || '服务端返回异常')
    }
    const records = res.data.data.records ?? []
    dataList.value = append ? [...dataList.value, ...records] : records
    total.value = Number(res.data.data.total ?? 0)
  } catch (e: any) {
    if (append) {
      // 不回退页码的话 current 会一路涨，中间留下永远取不到的空洞
      page.value = Math.max(1, page.value - 1)
      message.error('加载下一页失败：' + (e?.message ?? '网络错误'))
    } else {
      dataList.value = []
      total.value = 0
      message.error('获取图片列表失败：' + (e?.message ?? '网络错误'))
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

/** 搜索或换筛选条件：回到第一页并整表重来 */
const doSearch = () => {
  page.value = 1
  dataList.value = []
  total.value = 0
  scrollToTop()
  fetchPage(false)
}

const onLoadMore = () => {
  if (loading.value || loadingMore.value || !hasMore.value) {
    return
  }
  page.value += 1
  fetchPage(true)
}

/** 点击图片进入详情页 */
const doClickPicture = (picture: API.PictureVO) => {
  router.push(`/picture/${picture.id}`)
}

// ---- 回到顶部 ----
const topAnchorRef = ref<HTMLDivElement>()
const showBackTop = ref(false)
let topObserver: IntersectionObserver | undefined

const scrollToTop = () => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}

onMounted(() => {
  loadTagCategory()
  fetchPage(false)
  if (topAnchorRef.value) {
    topObserver = new IntersectionObserver(([entry]) => {
      showBackTop.value = !entry.isIntersecting
    })
    topObserver.observe(topAnchorRef.value)
  }
  if (categoryChipsRef.value) {
    // 分类是异步到达的，元素尺寸变化时重新量一次溢出
    chipsObserver = new ResizeObserver(measureOverflow)
    chipsObserver.observe(categoryChipsRef.value)
    measureOverflow()
  }
})

onBeforeUnmount(() => {
  topObserver?.disconnect()
  chipsObserver?.disconnect()
})
</script>

<style scoped>
.home-page {
  max-width: var(--page-max-width);
  margin: 0 auto;
}

.top-anchor {
  height: 1px;
}

.search-bar {
  max-width: 480px;
  margin: 0 auto 20px;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* ---- 分类：单选胶囊 ---- */
.filter-bar {
  position: relative;
  /* 折叠时只放得下一行，右侧空出来给"展开全部" */
  max-height: 32px;
  padding-right: 92px;
  overflow: hidden;
  margin-bottom: 12px;
  transition:
    max-height 0.3s ease,
    padding-right 0.3s ease;
}

.filter-bar.is-expanded {
  max-height: 480px;
  padding-right: 0;
  margin-bottom: 16px;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  height: 32px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid var(--color-border-secondary);
  background: var(--color-bg-container);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.chip:hover {
  background: var(--color-border-secondary);
  color: var(--color-text);
}

.chip:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* 选中态用反色：文字色当底、容器色当字，两套主题下自动都是"深色药丸 + 浅色字" */
.chip.active {
  background: var(--color-text);
  border-color: var(--color-text);
  color: var(--color-bg-container);
}

.chip.ghost {
  background: transparent;
  border-style: dashed;
}

.expand-toggle {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 4px;
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.expand-toggle:hover {
  color: var(--color-text);
}

.expand-toggle:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* ---- 标签：多选胶囊，小一档，选中用主色而不是反色（多选全反白会很吵） ---- */
.tag-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 20px;
}

.row-label {
  flex: none;
  padding-top: 5px;
  font-size: 12px;
  color: var(--color-text-disabled);
}

.chip.small {
  height: 26px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 12px;
}

.chip.small.selected {
  background: var(--color-primary-bg);
  border-color: var(--color-primary-border);
  color: var(--color-primary);
}

@media (prefers-reduced-motion: reduce) {
  .filter-bar,
  .chip {
    transition: none;
  }
}
</style>
