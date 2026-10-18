<template>
  <div class="home-page">
    <!-- 顶部锚点：靠它判断要不要显示"回到顶部"，不用监听 scroll -->
    <div ref="topAnchorRef" class="top-anchor"></div>

    <!-- Hero：品牌山景背景 + 真实组件（标题/搜索框/热门标签），不是把设计图贴成背景 -->
    <section class="hero" :style="{ backgroundImage: `linear-gradient(rgba(17, 19, 24, 0.42), rgba(17, 19, 24, 0.58)), url(${heroBg})` }">
      <div class="hero-content">
        <h1 class="hero-title">你的视觉宇宙</h1>
        <p class="hero-title-en">Your Visual Universe.</p>
        <p class="hero-desc">海量高清图片，探索无限可能。</p>
        <!-- 一体式胶囊搜索框：输入区和按钮在同一个白色容器里，不是两个拼接的组件 -->
        <div class="search-pill">
          <SearchOutlined class="search-pill-icon" />
          <input
            ref="searchInputRef"
            v-model="searchParams.searchText"
            class="search-pill-input"
            type="text"
            placeholder="搜索图片、标签、用户…"
            @keyup.enter="doSearch"
          />
          <button type="button" class="search-pill-btn" aria-label="搜索" @click="doSearch">
            <ArrowRightOutlined />
          </button>
        </div>
      </div>
    </section>

    <div class="page-body">
      <!-- 分类：主筛选轴，单选大胶囊，选中实心反色 -->
      <nav class="cat-nav" aria-label="图片分类">
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
      </nav>

      <!-- 标签：次级筛选，多选小胶囊，选中只加一档浅底。
           右侧「清空」只在已选时出现，同时充当"这里可以多选"的提示 -->
      <div class="tag-row">
        <span class="row-label">标签</span>
        <div class="filter-chips">
          <button
            v-for="(tag, index) in tagList"
            :key="tag"
            type="button"
            class="chip small"
            :class="{ active: selectedTagMap[index] }"
            :aria-pressed="!!selectedTagMap[index]"
            @click="toggleTag(index)"
          >
            {{ tag }}
          </button>
        </div>
        <button v-if="selectedTagCount" type="button" class="clear-tags" @click="clearTags">
          清空 {{ selectedTagCount }}
        </button>
      </div>

      <!-- 区块标题：默认按创建时间倒序即"最新上传"；有筛选条件时是搜索结果 -->
      <h2 class="section-title">{{ isFiltering ? '搜索结果' : '最新上传' }}</h2>

      <!-- 图片列表：无限滚动，滚到底自动取下一页 -->
      <PictureListView
        :pictures="dataList"
        :loading="loading"
        :loading-more="loadingMore"
        :has-more="hasMore"
        infinite
        @click="doClickPicture"
        @load-more="onLoadMore"
      >
        <template #end>
          <!-- 30 对应后端 guest-picture.view-limit，改阈值时同步这行 -->
          <p v-if="showLoginGate" class="login-gate">
            游客每次浏览最多展示 30 张，<a @click="goRegister">注册</a> 或 <a @click="goLogin">登录</a>后可浏览完整图库
          </p>
          <span v-else class="list-end-hint">没有更多了</span>
        </template>
      </PictureListView>
    </div>

    <a-float-button v-if="showBackTop" tooltip="回到顶部" class="back-top" @click="scrollToTop">
      <template #icon>
        <VerticalAlignTopOutlined />
      </template>
    </a-float-button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowRightOutlined, SearchOutlined, VerticalAlignTopOutlined } from '@ant-design/icons-vue'
import { listPictureTagCategory, listPictureVOByPage } from '@/api/pictureController'
import PictureListView from '@/components/PictureListView.vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import heroBg from '@/assets/hero-mountain.jpg'

const router = useRouter()
const route = useRoute()
const loginUserStore = useLoginUserStore()

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

/** 上一页返回不足一页：要么被游客上限截断，要么本来就是最后一页 */
const shortPage = ref(false)

const isGuest = computed(() => !loginUserStore.loginUser.id)
const hasMore = computed(() => dataList.value.length < total.value && !shortPage.value)
/** 库里还有图、但服务端不给更多了 —— 这才是登录引导，不是真的到底 */
const showLoginGate = computed(() => isGuest.value && shortPage.value && dataList.value.length < total.value)

const goLogin = () => router.push('/user/login?redirect=/')
const goRegister = () => router.push('/user/register')

// 分类与标签
const categoryList = ref<string[]>([])
const tagList = ref<string[]>([])
const activeCategory = ref<string>('all')
const selectedTagMap = ref<boolean[]>([])

/** 是否带了搜索/筛选条件（决定区块标题是"最新上传"还是"搜索结果"） */
const isFiltering = computed(
  () =>
    !!searchParams.searchText ||
    activeCategory.value !== 'all' ||
    selectedTagMap.value.some(Boolean),
)

/** 分类：单行文字导航，随后端数据横向滚动展示 */
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

const selectedTagCount = computed(() => selectedTagMap.value.filter(Boolean).length)

const clearTags = () => {
  selectedTagMap.value = selectedTagMap.value.map(() => false)
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
    shortPage.value = records.length < (params.pageSize ?? 20)
    dataList.value = append ? [...dataList.value, ...records] : records
    total.value = Number(res.data.data.total ?? 0)
  } catch (e: any) {
    // 请求失败不等于到顶，别让上一次的状态冒充"游客被截断"
    shortPage.value = false
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

// ---- 地址栏 query 同步（移动端搜索 Tab 的入口）----
const searchInputRef = ref()

// 移动端底部"搜索"Tab 带 ?focus=search 进来：回顶、聚焦 Hero 搜索框，并同步清掉 query
// （先 replace 再聚焦，避免地址栏残留；直接带 query 打开页面时 onMounted 里也补一次）
const focusSearchInput = () => {
  scrollToTop()
  if (route.query.focus !== undefined) {
    router.replace({ query: { ...route.query, focus: undefined } })
  }
  nextTick(() => searchInputRef.value?.focus())
}

watch(
  () => route.query.focus,
  (val) => {
    if (val === 'search') {
      focusSearchInput()
    }
  },
)

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
  // 直接带 ?focus=search 打开首页（移动端搜索 Tab 从别的页面跳入）时也聚焦搜索框
  if (route.query.focus === 'search') {
    focusSearchInput()
  }
  if (topAnchorRef.value) {
    topObserver = new IntersectionObserver(([entry]) => {
      showBackTop.value = !entry.isIntersecting
    })
    topObserver.observe(topAnchorRef.value)
  }
})

onBeforeUnmount(() => {
  topObserver?.disconnect()
})
</script>

<style scoped>
.home-page {
  max-width: var(--page-max-width);
  margin: 0 auto;
}

/*
 * 脱离流：它只是"回到顶部"的 IntersectionObserver 锚点，不需要占布局。
 * 若在流内占 1px，hero 的 -24px 负 margin 会先吃掉这 1px，
 * 导航栏与 Hero 之间会漏出 1px content 底色（亮色下就是一条白线）。
 */
.top-anchor {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
}

/* ---- Hero：顶部负 margin 顶掉 content 内边距，紧贴导航栏。
   水平方向收进 1280 栅格，与导航菜单、分类、图墙左缘严格对齐（不再 bleed）。
   高度刻意收紧，不抢占图库内容的首屏空间 ---- */
.hero {
  /* 原来 -24px 把 hero 顶到和深色导航无缝相接，两块深色连成一整片，
     首屏上半部分全是黑。改成留出一条页面底色 + 圆角，让它成为一个明确的面板，
     「深色顶栏」才是唯一那条深色带 */
  margin: 0 0 28px;
  padding: 40px 24px 36px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  /* 构图对准山峰与湖面，避开顶部大面积暗色天空 */
  background-position: center 40%;
  background-size: cover;
  background-repeat: no-repeat;
}

.hero-content {
  max-width: 640px;
  margin: 0 auto;
  text-align: center;
}

.hero-title {
  margin: 0;
  font-size: 32px;
  line-height: 40px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #ffffff;
}

.hero-title-en {
  margin: 6px 0 0;
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.85);
}

.hero-desc {
  margin: 8px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

/* ---- 一体式胶囊搜索框：白容器里嵌输入和圆形黑按钮 ---- */
.search-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 560px;
  height: 48px;
  margin: 22px auto 0;
  padding: 0 6px 0 18px;
  border-radius: 999px;
  background: #ffffff;
}

.search-pill-icon {
  flex: none;
  font-size: 15px;
  color: var(--color-text-tertiary);
}

.search-pill-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text);
}

.search-pill-input::placeholder {
  color: var(--color-text-placeholder);
}

.search-pill-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: #17191d;
  color: #ffffff;
  font-size: 15px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.search-pill-btn:hover {
  background: #4a4f58;
}

.search-pill-btn:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}

/* ---- 分类行：单行胶囊，窄屏横向滚动 ---- */
.cat-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.cat-nav::-webkit-scrollbar {
  display: none;
}

/* ---- 筛选胶囊：分类和标签共用一套语言，只靠尺寸和填充深浅分层级 ----
   原来分类是「裸文字 + 下划线」、标签是描边胶囊，同层级的功能两套长相，
   而且更重要的分类行反而最不像控件。 */
.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
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
  border-color: var(--color-text-placeholder);
  color: var(--color-text);
}

.chip:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* 单选轴选中用实心反色：文字色当底、容器色当字。
   两套主题下自动都是「深底浅字」，所以不再需要 #4a4f58 加一条 .dark-theme 覆写 */
.chip.active {
  background: var(--color-text);
  border-color: var(--color-text);
  color: var(--color-bg-container);
}

.section-title {
  margin: 4px 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

/* ---- 标签：多选小胶囊，次级筛选，淡一档 ---- */
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
  color: var(--color-text-tertiary);
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 多选轴：小一档，且未选中时不填底，让它明显轻于分类行 */
.chip.small {
  height: 26px;
  padding: 0 10px;
  background: transparent;
  font-size: 12px;
}

/* 选中只加一档浅底，不做实心反色 —— 同时选中好几个时满排黑药丸会盖过图片墙 */
.chip.small.active {
  background: var(--color-border-secondary);
  border-color: transparent;
  color: var(--color-text);
}

/* 已选标签数 + 一键清空。它同时也是「这一行可以多选」的提示 */
.clear-tags {
  flex: none;
  margin-left: 2px;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.clear-tags:hover {
  color: var(--color-text);
  background: var(--color-border-secondary);
}

.clear-tags:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .chip,
  .clear-tags,
  .search-pill-btn {
    transition: none;
  }
}

/* ---- 移动端 ---- */
@media (max-width: 768px) {
  .hero {
    /* 左右恢复出血顶到屏幕边缘（抵消 content 的 16px padding），消除两侧灰条；
       分类/标签/图墙仍留在 16px 内容边距内，不受影响 */
    margin: -16px -16px 20px;
    /* 总高零增长的再分配：上下各收 4px，让给副标题与搜索框间距 */
    padding: 28px 16px 24px;
  }

  .hero-title {
    font-size: 24px;
    line-height: 32px;
    letter-spacing: 1px;
  }

  .hero-title-en {
    margin-top: 8px;
    font-size: 14px;
    line-height: 20px;
  }

  .search-pill {
    height: 44px;
    /* 18→26：文字区与搜索框之间更舒展，增量由上下 padding 各收 4px 承担 */
    margin-top: 26px;
  }

  .search-pill-btn {
    width: 34px;
    height: 34px;
  }

  .section-title {
    font-size: 16px;
  }

  /* 回到顶部按钮给底部 Tab Bar 让位 */
  .back-top {
    bottom: calc(72px + env(safe-area-inset-bottom));
  }
}

/* 游客触限：图墙末尾一行登录引导 */
.login-gate {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.login-gate a {
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
}

.login-gate a:hover {
  text-decoration: underline;
}

.list-end-hint {
  font-size: 12px;
  color: var(--color-text-disabled);
}
</style>
