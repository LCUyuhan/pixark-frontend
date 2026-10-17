<template>
  <div class="picture-manage-page">
    <a-card>
      <div class="page-title">图片管理</div>

      <!-- 搜索表单：固定两行栅格。第一行常用四项，第二行归属 + 右对齐的操作按钮 -->
      <a-form layout="vertical" class="search-form" :model="searchParams" @finish="doSearch">
        <a-row :gutter="16">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="关键词">
              <a-input v-model:value="searchParams.searchText" placeholder="名称 / 简介" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="分类">
              <a-select
                v-model:value="searchParams.category"
                placeholder="选择分类"
                allow-clear
                :options="categoryOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="标签">
              <a-select
                v-model:value="searchParams.tags"
                mode="multiple"
                placeholder="选择标签"
                allow-clear
                :options="tagOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="审核状态">
              <a-select
                v-model:value="searchParams.reviewStatus"
                placeholder="选择审核状态"
                allow-clear
                :options="PIC_REVIEW_STATUS_OPTIONS"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="归属">
              <a-select
                v-model:value="spaceScope"
                placeholder="全部"
                allow-clear
                :options="SPACE_SCOPE_OPTIONS"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="spaceScope === 'space'" :xs="24" :sm="12" :md="6">
            <a-form-item label="空间">
              <a-select
                v-model:value="spaceFilter"
                placeholder="可按空间名称或 id 搜索"
                show-search
                allow-clear
                :loading="!spaceOptionsLoaded"
                :options="spaceOptions"
                :filter-option="filterSpaceOption"
                @dropdownVisibleChange="loadSpaceOptions"
              />
            </a-form-item>
          </a-col>
          <!-- 不加 offset，让按钮顺着栅格回流：有「空间」时落在第 3 列（与标签对齐），
               没有时落在第 2 列（与分类对齐），不会在中间留一大块空白 -->
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label=" ">
              <a-space>
                <a-button type="primary" html-type="submit">搜索</a-button>
                <a-button @click="doReset">重置</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <!-- 按空间筛选只能从「空间管理 → 查看该空间图片」带进来；不显示出来的话，管理员会以为列表坏了 -->
      <a-alert
        v-if="spaceFilter"
        class="space-filter-tip"
        type="info"
        show-icon
        closable
        message="正在按空间筛选"
        :description="`空间 ID：${spaceFilter}`"
        @close="clearSpaceFilter"
      />

      <!-- 主表只留决策列，格式/大小/审核详情等次要信息收进展开行，避免整表宽到要横向滚动 -->
      <a-table
        style="margin-top: 16px"
        size="small"
        :columns="columns"
        :data-source="dataList"
        :pagination="pagination"
        :loading="loading"
        :scroll="{ x: 1220 }"
        :expand-column-width="40"
        row-key="id"
        @change="doTableChange"
      >
        <template #expandedRowRender="{ record }">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">图片 ID</span>
              <span class="detail-value">{{ record.id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">创建用户 ID</span>
              <span class="detail-value">{{ record.userId ?? '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">所属空间 ID</span>
              <span class="detail-value">{{ record.spaceId ?? '（公共图库，无空间）' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">格式</span>
              <span class="detail-value">{{ record.picFormat ?? '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">尺寸</span>
              <span class="detail-value">{{ record.picWidth ?? '-' }} x {{ record.picHeight ?? '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">大小</span>
              <span class="detail-value">{{ formatSize(record.picSize) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">审核信息</span>
              <span class="detail-value">{{ record.reviewMessage ?? '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">审核人</span>
              <span class="detail-value">{{ record.reviewerId ?? '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">审核时间</span>
              <span class="detail-value">
                {{ record.reviewTime ? dayjs(record.reviewTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
              </span>
            </div>
            <div class="detail-item detail-item-wide">
              <span class="detail-label">简介</span>
              <span class="detail-value">{{ record.introduction || '-' }}</span>
            </div>
          </div>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'url'">
            <!-- 管理端返回 Picture 实体，含 thumbnailUrl 字段，列表优先加载缩略图 -->
            <a-image
              :src="record.thumbnailUrl || record.url"
              :width="72"
              :height="54"
              style="object-fit: cover"
            />
          </template>
          <template v-else-if="column.dataIndex === 'tags'">
            <a-tooltip v-if="normalizeTags(record.tags).length" placement="topLeft">
              <template #title>{{ normalizeTags(record.tags).join('、') }}</template>
              <span class="tag-line">
                <a-tag v-for="tag in normalizeTags(record.tags).slice(0, 2)" :key="tag">{{ tag }}</a-tag>
                <a-tag v-if="normalizeTags(record.tags).length > 2">
                  +{{ normalizeTags(record.tags).length - 2 }}
                </a-tag>
              </span>
            </a-tooltip>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.dataIndex === 'spaceId'">
            <a-tooltip v-if="record.spaceId" :title="`空间 ID：${record.spaceId}`">
              <a-tag>私有空间</a-tag>
            </a-tooltip>
            <span v-else>公共图库</span>
          </template>
          <template v-else-if="column.key === 'reviewStatus'">
            <a-tag :color="reviewStatusColor(record.reviewStatus)">
              {{ PIC_REVIEW_STATUS_MAP[record.reviewStatus] ?? '-' }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ record.createTime ? dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <!-- 私有空间的图对管理员只读：它不进公共图库、别人也访问不到，审核结论对它没有任何作用；
                 编辑 / 删除则会被 checkPictureAuth 的空间分支（只认归属人）直接拦掉，给了就是必报错的按钮 -->
            <a-space v-if="!record.spaceId" wrap>
              <a-button
                v-if="record.reviewStatus !== PIC_REVIEW_STATUS_ENUM.PASS"
                type="link"
                size="small"
                @click="doReview(record, PIC_REVIEW_STATUS_ENUM.PASS)"
              >
                通过
              </a-button>
              <a-button
                v-if="record.reviewStatus !== PIC_REVIEW_STATUS_ENUM.REJECT"
                type="link"
                size="small"
                danger
                @click="openRejectModal(record)"
              >
                拒绝
              </a-button>
              <a-button type="link" size="small" @click="doEdit(record.id)">编辑</a-button>
              <a-popconfirm title="确定要删除该图片吗？" @confirm="doDelete(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
            <a-tooltip
              v-else
              title="私有空间的图片不对外展示、也不参与审核，管理员不介入其内容。展开行可查看空间 ID 与审核详情"
            >
              <span class="readonly-hint">只读</span>
            </a-tooltip>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 拒绝理由会原样下发到用户的「我的投稿」页，留空则退回默认文案 -->
    <a-modal
      v-model:open="rejectOpen"
      title="拒绝该图片"
      :confirm-loading="rejectLoading"
      ok-text="确认拒绝"
      cancel-text="取消"
      @ok="confirmReject"
    >
      <p class="reject-tip">
        拒绝理由会展示给上传者（「我的投稿」页的审核信息），写清楚哪里不合规、怎么改，能省一轮来回。
      </p>
      <a-textarea
        v-model:value="rejectReason"
        :rows="3"
        :maxlength="500"
        show-count
        placeholder="选填，留空则记为「管理员操作拒绝」"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  deletePicture,
  doPictureReview,
  listPictureByPage,
  listPictureTagCategory,
} from '@/api/pictureController'
import { listSpaceByPage } from '@/api/spaceController'
import { formatSize } from '@/utils'
import {
  PIC_REVIEW_STATUS_ENUM,
  PIC_REVIEW_STATUS_MAP,
  PIC_REVIEW_STATUS_OPTIONS,
} from '@/constants/picture'

const router = useRouter()
const route = useRoute()

// 次要信息（各类 ID、格式/尺寸/大小、审核详情、简介）收进展开行，主表宽度压到基本免横向滚动
const columns = [
  { title: '图片', dataIndex: 'url', width: 100, fixed: 'left' as const },
  { title: 'ID', dataIndex: 'id', width: 170 },
  { title: '名称', dataIndex: 'name', width: 150, ellipsis: true },
  { title: '分类', dataIndex: 'category', width: 90, ellipsis: true },
  { title: '标签', dataIndex: 'tags', width: 150 },
  // 私有空间的图在操作列是只读的，见下方 action 模板的注释
  { title: '归属', dataIndex: 'spaceId', width: 96 },
  { title: '状态', key: 'reviewStatus', width: 80 },
  { title: '创建时间', dataIndex: 'createTime', width: 160 },
  { title: '操作', key: 'action', width: 170, fixed: 'right' as const },
]

// 归属只用后端已有的两个条件：公共图库 -> nullSpaceId（spaceId IS NULL）；指定空间 -> spaceId 等值。
// "所有私有空间"这一档要后端补 isNotNull 条件，暂不做，所以私有空间只能逐个指定
const SPACE_SCOPE_OPTIONS = [
  { label: '公共图库', value: 'public' },
  { label: '指定空间', value: 'space' },
]

// 查询参数（对应后端 PictureQueryRequest）
const searchParams = reactive<API.PictureQueryRequest>({
  current: 1,
  pageSize: 10,
  sortField: 'createTime',
  sortOrder: 'descend',
})

const spaceScope = ref<string>()
// 雪花 id 有 19 位、超出 JS 安全整数范围，全程按字符串传递，不要 Number() 转换
const spaceFilter = ref<string>()
const spaceOptions = ref<{ label: string; value: string }[]>([])
const spaceOptionsLoaded = ref(false)

/** 选到「指定空间」才拉空间列表：管理员可查全部，不必每次进页面都请求 */
const loadSpaceOptions = async () => {
  if (spaceOptionsLoaded.value) {
    return
  }
  try {
    const res = await listSpaceByPage({ current: 1, pageSize: 200 })
    if (res.data.code === 0 && res.data.data) {
      spaceOptions.value = (res.data.data.records ?? []).map((space) => ({
        value: String(space.id),
        label: `${space.spaceName || '未命名空间'}（${space.totalCount ?? 0} 张）`,
      }))
      spaceOptionsLoaded.value = true
      // 从空间管理页带进来的 id 可能不在前 200 条里，补一项保证下拉不是空的
      if (spaceFilter.value && !spaceOptions.value.some((o) => o.value === spaceFilter.value)) {
        spaceOptions.value.unshift({ value: spaceFilter.value, label: `空间 #${spaceFilter.value}` })
      }
    }
  } catch (e: any) {
    message.error('获取空间列表失败：' + (e?.message ?? '网络错误'))
  }
}

/** 支持按空间名称或空间 id 搜索 */
const filterSpaceOption = (input: string, option: { label: string; value: string }) => {
  const keyword = input.trim().toLowerCase()
  return option.label.toLowerCase().includes(keyword) || option.value.includes(keyword)
}

watch(spaceScope, (scope) => {
  if (scope === 'space') {
    loadSpaceOptions()
  } else {
    spaceFilter.value = undefined
  }
})

// 管理端接口返回的是 Picture 原始实体（tags 为 JSON 字符串，展示时做兼容解析）
const dataList = ref<API.Picture[]>([])
const total = ref(0)
const loading = ref(false)

// 分类与标签选项
const categoryOptions = ref<{ value: string; label: string }[]>([])
const tagOptions = ref<{ value: string; label: string }[]>([])

const pagination = computed(() => ({
  current: searchParams.current,
  pageSize: searchParams.pageSize,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}))

/** 加载标签分类选项 */
const loadTagCategory = async () => {
  try {
    const res = await listPictureTagCategory()
    if (res.data.code === 0 && res.data.data) {
      categoryOptions.value = (res.data.data.categoryList ?? []).map((v) => ({ value: v, label: v }))
      tagOptions.value = (res.data.data.tagList ?? []).map((v) => ({ value: v, label: v }))
    }
  } catch {
    // 忽略
  }
}

/** 获取图片分页列表（管理员接口） */
const fetchData = async () => {
  loading.value = true
  try {
    const res = await listPictureByPage({ ...searchParams })
    if (res.data.code !== 0 || !res.data.data) {
      throw new Error(res.data.message || '服务端返回异常')
    }
    dataList.value = res.data.data.records ?? []
    total.value = Number(res.data.data.total ?? 0)
  } catch (e: any) {
    // 失败要清掉旧数据，否则上一次筛选的结果会留着像请求成功一样
    dataList.value = []
    total.value = 0
    message.error('获取图片列表失败：' + (e?.message ?? '网络错误'))
  } finally {
    loading.value = false
  }
}

const doTableChange = (page: { current?: number; pageSize?: number }) => {
  searchParams.current = page.current ?? 1
  searchParams.pageSize = page.pageSize ?? 10
  fetchData()
}

const doSearch = () => {
  const scope = spaceScope.value
  if (scope === 'space' && !spaceFilter.value) {
    message.warning('请选择要筛选的空间')
    return
  }
  // nullSpaceId 与 spaceId 互斥：同时生效会拼成 spaceId IS NULL AND spaceId = x，结果恒空
  searchParams.nullSpaceId = scope === 'public' ? true : undefined
  searchParams.spaceId = scope === 'space' ? spaceFilter.value : undefined
  searchParams.current = 1
  fetchData()
}

/** 清掉地址栏里的 spaceId，否则用户重置后刷新页面，筛选会被 query 又带回来 */
const dropSpaceQuery = () => {
  if (route.query.spaceId !== undefined) {
    router.replace({ path: route.path })
  }
}

/** 清空全部筛选条件，含从空间管理页带进来的空间筛选 */
const doReset = () => {
  searchParams.searchText = undefined
  searchParams.category = undefined
  searchParams.tags = undefined
  searchParams.reviewStatus = undefined
  spaceScope.value = undefined
  spaceFilter.value = undefined
  dropSpaceQuery()
  doSearch()
}

const clearSpaceFilter = () => {
  spaceScope.value = undefined
  spaceFilter.value = undefined
  dropSpaceQuery()
  doSearch()
}

/** 审核状态对应标签颜色 */
const reviewStatusColor = (status?: number) => {
  if (status === PIC_REVIEW_STATUS_ENUM.PASS) return 'green'
  if (status === PIC_REVIEW_STATUS_ENUM.REJECT) return 'red'
  return 'orange'
}

/** 审核图片（通过 / 拒绝）；拒绝理由留空则用默认文案。返回 true 表示后端已受理 */
const doReview = async (record: API.Picture, reviewStatus: number, reason?: string): Promise<boolean> => {
  const reviewMessage = reason?.trim()
    ? reason.trim()
    : reviewStatus === PIC_REVIEW_STATUS_ENUM.PASS
      ? '管理员操作通过'
      : '管理员操作拒绝'
  try {
    const res = await doPictureReview({ id: record.id, reviewStatus, reviewMessage })
    if (res.data.code === 0) {
      message.success('审核操作成功')
      fetchData()
      return true
    }
    message.error('审核操作失败：' + res.data.message)
    return false
  } catch (e: any) {
    message.error('审核操作失败：' + (e?.message ?? '网络错误'))
    return false
  }
}

const rejectOpen = ref(false)
const rejectLoading = ref(false)
const rejectReason = ref('')
const rejectTarget = ref<API.Picture>()

const openRejectModal = (record: API.Picture) => {
  rejectTarget.value = record
  rejectReason.value = ''
  rejectOpen.value = true
}

/** 失败时保持弹窗打开，管理员填的理由不至于跟着一起丢 */
const confirmReject = async () => {
  const record = rejectTarget.value
  if (!record) {
    return
  }
  rejectLoading.value = true
  try {
    const ok = await doReview(record, PIC_REVIEW_STATUS_ENUM.REJECT, rejectReason.value)
    if (ok) {
      rejectOpen.value = false
    }
  } finally {
    rejectLoading.value = false
  }
}

/** 跳转编辑页 */
const doEdit = (id: number | string) => {
  router.push(`/picture/edit/${id}`)
}

/** 删除图片 */
const doDelete = async (id: number | string) => {
  if (!id) return
  try {
    const res = await deletePicture({ id })
    if (res.data.code === 0) {
      message.success('删除成功')
      fetchData()
    } else {
      message.error('删除失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('删除失败：' + (e?.message ?? '网络错误'))
  }
}

/** 管理端返回的是 Picture 实体，tags 为 JSON 字符串，需兼容解析 */
const normalizeTags = (tags: unknown): string[] => {
  if (Array.isArray(tags)) return tags
  if (typeof tags === 'string' && tags) {
    try {
      const parsed = JSON.parse(tags)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

onMounted(() => {
  // 从「空间管理 → 查看该空间图片」跳过来时带 ?spaceId=xxx，直接按该空间筛
  const presetSpaceId = route.query.spaceId
  if (typeof presetSpaceId === 'string' && presetSpaceId) {
    spaceFilter.value = presetSpaceId
    searchParams.spaceId = presetSpaceId
    spaceScope.value = 'space'
  }
  loadTagCategory()
  fetchData()
})
</script>

<style scoped>
.picture-manage-page {
  /* 主表列总宽约 1206px，容器留到 1400px 即可，普通笔记本不再需要横向滚动 */
  max-width: 1400px;
  margin: 0 auto;
}

.page-title {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
}

.search-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

/* 栅格列内让控件撑满，避免 inline 布局下各控件宽度不一 */
.search-form :deep(.ant-input),
.search-form :deep(.ant-input-affix-wrapper),
.search-form :deep(.ant-select) {
  width: 100%;
}

.space-filter-tip {
  margin-bottom: 8px;
}

/* 只读占位：cursor: help + 虚线下划线，暗示这里 hover 有解释，不像按钮坏了 */
.readonly-hint {
  color: var(--color-text-tertiary);
  font-size: 13px;
  cursor: help;
  border-bottom: 1px dashed var(--color-text-disabled);
}

.tag-line {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 8px 24px;
  padding: 4px 8px;
}

.detail-item {
  display: flex;
  gap: 8px;
  min-width: 0;
}

.detail-item-wide {
  grid-column: 1 / -1;
}

.detail-label {
  flex: 0 0 auto;
  color: var(--color-text-tertiary);
}

.detail-label::after {
  content: '：';
}

.detail-value {
  min-width: 0;
  word-break: break-all;
}
</style>
