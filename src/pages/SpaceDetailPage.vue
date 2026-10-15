<template>
  <div class="space-detail-page">
    <!-- 空间信息 + 搜索区 -->
    <a-card v-if="space" style="margin-bottom: 16px">
      <a-space style="width: 100%; justify-content: space-between" wrap>
        <a-space>
          <FolderOutlined style="color: #1677ff; font-size: 20px" />
          <span style="font-size: 18px; font-weight: 600">{{ space.spaceName }}</span>
          <a-tag :color="levelColor(space.spaceLevel)">{{ levelText(space.spaceLevel) }}</a-tag>
        </a-space>
        <a-space wrap>
          <a-button type="primary" @click="goUploadPage">+ 上传图片</a-button>
          <a-button @click="toggleBatchMode">{{ batchMode ? '退出批量' : '批量管理' }}</a-button>
          <a-button @click="showSearch = !showSearch">{{ showSearch ? '收起搜索' : '搜索' }}</a-button>
          <a-button @click="doEdit">改名</a-button>
          <a-button @click="goAnalyze">
            <BarChartOutlined />
            空间分析
          </a-button>
          <a-popconfirm title="确定要删除该空间吗？空间内图片将一并删除" @confirm="doDelete">
            <a-button danger>删除空间</a-button>
          </a-popconfirm>
        </a-space>
      </a-space>
      <a-descriptions :column="2" size="small" style="margin-top: 12px">
        <a-descriptions-item label="已用大小">
          {{ formatSize(space.totalSize) }} / {{ formatSize(space.maxSize) }}
        </a-descriptions-item>
        <a-descriptions-item label="图片数量">
          {{ space.totalCount ?? 0 }} / {{ space.maxCount ?? 0 }}
        </a-descriptions-item>
      </a-descriptions>

      <!-- 高级搜索 + 颜色搜索 -->
      <div v-if="showSearch" class="search-area">
        <a-form layout="inline" :model="searchForm" @finish="doSearch">
          <a-form-item label="关键词">
            <a-input v-model:value="searchForm.searchText" placeholder="名称 / 简介" allow-clear style="width: 140px" />
          </a-form-item>
          <a-form-item label="标签">
            <a-select
              v-model:value="searchForm.tags"
              mode="multiple"
              placeholder="选择标签"
              allow-clear
              style="min-width: 140px"
              :options="tagOptions"
            />
          </a-form-item>
          <a-form-item label="分类">
            <a-select
              v-model:value="searchForm.category"
              placeholder="选择分类"
              allow-clear
              style="width: 120px"
              :options="categoryOptions"
            />
          </a-form-item>
          <a-form-item label="编辑时间">
            <a-range-picker v-model:value="searchForm.editRange" :presets="datePresets" />
          </a-form-item>
          <a-form-item label="名称">
            <a-input v-model:value="searchForm.name" placeholder="图片名称" allow-clear style="width: 120px" />
          </a-form-item>
          <a-form-item label="简介">
            <a-input v-model:value="searchForm.introduction" placeholder="图片简介" allow-clear style="width: 120px" />
          </a-form-item>
          <a-form-item label="宽度">
            <a-input-number v-model:value="searchForm.picWidth" :min="0" placeholder="px" style="width: 90px" />
          </a-form-item>
          <a-form-item label="高度">
            <a-input-number v-model:value="searchForm.picHeight" :min="0" placeholder="px" style="width: 90px" />
          </a-form-item>
          <a-form-item label="格式">
            <a-input v-model:value="searchForm.picFormat" placeholder="如 png" allow-clear style="width: 90px" />
          </a-form-item>
          <a-form-item>
            <a-space>
              <a-button type="primary" html-type="submit">搜索</a-button>
              <a-button @click="doResetSearch">重置</a-button>
            </a-space>
          </a-form-item>
        </a-form>

        <!-- 颜色搜索 -->
        <div class="color-row">
          <span style="color: rgba(0, 0, 0, 0.65)">按颜色搜：</span>
          <span
            v-for="c in presetColors"
            :key="c"
            class="color-swatch"
            :style="{ background: c }"
            @click="doColorSearch(c)"
          />
          <input v-model="customColor" type="color" class="color-input" title="自定义颜色" />
          <a-button size="small" @click="doColorSearch(customColor)">搜索</a-button>
        </div>
      </div>
    </a-card>

    <!-- 批量操作工具栏 -->
    <a-card v-if="batchMode" style="margin-bottom: 16px">
      <a-space wrap>
        <span>已选 {{ selectedIds.length }} 项</span>
        <a-button type="primary" :disabled="!selectedIds.length" @click="openBatchEdit">批量改信息</a-button>
        <a-button :disabled="!selectedIds.length" @click="openBatchRename">批量重命名</a-button>
        <a-button :disabled="!dataList.length" @click="toggleSelectPage">
          {{ allPageSelected ? '取消本页' : '全选本页' }}
        </a-button>
      </a-space>
    </a-card>

    <!-- 颜色搜索结果 -->
    <template v-if="colorMode">
      <a-space style="margin-bottom: 12px">
        <a-tag color="purple">颜色搜索结果（按相似度前 12）</a-tag>
        <a-button size="small" @click="colorMode = false">返回图片列表</a-button>
      </a-space>
      <a-list
        :grid="{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 5 }"
        :data-source="colorResults"
        :loading="colorLoading"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <a-card hoverable @click="router.push(`/picture/${item.id}`)">
              <template #cover>
                <div class="picture-cover">
                  <img :alt="item.name" :src="item.thumbnailUrl || item.url" loading="lazy" />
                </div>
              </template>
              <a-card-meta :title="item.name" />
            </a-card>
          </a-list-item>
        </template>
      </a-list>
    </template>

    <!-- 普通图片列表 -->
    <template v-else>
      <a-list
        :grid="{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 5 }"
        :data-source="dataList"
        :loading="loading"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <div class="picture-item" :class="{ selected: isSelected(item.id) }" @click="doClickPicture(item)">
              <a-checkbox
                v-if="batchMode"
                class="select-box"
                :checked="isSelected(item.id)"
                @click.stop
                @change="toggleSelect(item.id)"
              />
              <a-card hoverable>
                <template #cover>
                  <div class="picture-cover">
                    <img :alt="item.name" :src="item.thumbnailUrl || item.url" loading="lazy" />
                  </div>
                </template>
                <a-card-meta :title="item.name" />
                <template v-if="!batchMode && canAiEdit(item)" #actions>
                  <span class="card-action" title="AI 编辑" @click.stop="openAiEdit(item)">
                    <RobotOutlined />
                  </span>
                </template>
              </a-card>
            </div>
          </a-list-item>
        </template>
      </a-list>

      <a-pagination
        v-model:current="searchParams.current"
        v-model:page-size="searchParams.pageSize"
        :total="total"
        show-less-items
        style="margin-top: 24px; text-align: right"
        @change="fetchPictures"
      />
    </template>

    <!-- 改名弹窗 -->
    <a-modal v-model:open="showEditModal" title="修改空间名称" @ok="handleEdit">
      <a-form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="空间名称">
          <a-input v-model:value="editForm.spaceName" placeholder="请输入空间名称" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批量改信息弹窗 -->
    <a-modal v-model:open="showBatchEditModal" title="批量修改分类 / 标签" @ok="handleBatchEdit">
      <a-form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="分类">
          <a-auto-complete
            v-model:value="batchEditForm.category"
            placeholder="留空则不修改"
            allow-clear
            :options="categoryOptions"
          />
        </a-form-item>
        <a-form-item label="标签">
          <a-select
            v-model:value="batchEditForm.tags"
            mode="multiple"
            placeholder="留空则不修改"
            allow-clear
            :options="tagOptions"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批量重命名弹窗 -->
    <a-modal v-model:open="showBatchRenameModal" title="批量重命名" @ok="handleBatchRename">
      <a-form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="命名规则">
          <a-input v-model:value="batchRenameForm.nameRule" placeholder="如：图片_{序号}" />
        </a-form-item>
        <a-form-item :wrapper-col="{ offset: 5, span: 18 }">
          <span style="color: rgba(0, 0, 0, 0.45); font-size: 12px">
            支持 {序号} 占位符，从 1 开始递增，如"图片_{序号}"→ 图片_1、图片_2
          </span>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- AI 编辑弹窗（卡片操作栏点击后针对该图） -->
    <AiImageEditModal v-model:open="aiEditOpen" :picture="aiEditPicture" @saved="onAiEditSaved" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { FolderOutlined, RobotOutlined, BarChartOutlined } from '@ant-design/icons-vue'
import dayjs, { type Dayjs } from 'dayjs'
import AiImageEditModal from '@/components/AiImageEditModal.vue'
import { formatSize } from '@/utils'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import {
  editPictureByBatch,
  listPictureTagCategory,
  listPictureVOByPage,
  searchPictureByColor,
} from '@/api/pictureController'
import { deleteSpace, editSpace, listSpaceByPage, listSpaceLevels } from '@/api/spaceController'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const spaceId = computed(() => route.params.id as string)
const space = ref<API.SpaceVO>()
const spaceLevels = ref<API.SpaceLevel[]>([])

const levelText = (level?: number) => spaceLevels.value.find((l) => l.value === level)?.text ?? '未知'
const levelColor = (level?: number) => (level === 0 ? 'blue' : level === 1 ? 'orange' : level === 2 ? 'purple' : 'default')

// ===== 列表与搜索 =====
const searchParams = reactive<API.PictureQueryRequest>({
  current: 1,
  pageSize: 15,
  sortField: 'createTime',
  sortOrder: 'descend',
})

const dataList = ref<API.PictureVO[]>([])
const total = ref(0)
const loading = ref(false)

const showSearch = ref(false)
const searchForm = reactive<{
  searchText?: string
  tags?: string[]
  category?: string
  editRange?: [Dayjs, Dayjs] | null
  name?: string
  introduction?: string
  picWidth?: number
  picHeight?: number
  picFormat?: string
}>({})

const categoryOptions = ref<{ value: string; label: string }[]>([])
const tagOptions = ref<{ value: string; label: string }[]>([])

const datePresets = [
  { label: '近 7 天', value: [dayjs().subtract(7, 'day'), dayjs()] },
  { label: '近 30 天', value: [dayjs().subtract(30, 'day'), dayjs()] },
  { label: '近 90 天', value: [dayjs().subtract(90, 'day'), dayjs()] },
]

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

const fetchPictures = async () => {
  loading.value = true
  try {
    const res = await listPictureVOByPage({ ...searchParams, spaceId: spaceId.value })
    if (res.data.code === 0 && res.data.data) {
      dataList.value = res.data.data.records ?? []
      total.value = Number(res.data.data.total ?? 0)
    } else {
      message.error('获取图片失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('获取图片失败：' + (e?.message ?? '网络错误'))
  } finally {
    loading.value = false
  }
}

const doSearch = () => {
  searchParams.current = 1
  searchParams.searchText = searchForm.searchText || undefined
  searchParams.tags = searchForm.tags?.length ? searchForm.tags : undefined
  searchParams.category = searchForm.category || undefined
  searchParams.name = searchForm.name || undefined
  searchParams.introduction = searchForm.introduction || undefined
  searchParams.picWidth = searchForm.picWidth ?? undefined
  searchParams.picHeight = searchForm.picHeight ?? undefined
  searchParams.picFormat = searchForm.picFormat || undefined
  searchParams.startEditTime = searchForm.editRange?.[0]?.format('YYYY-MM-DD HH:mm:ss')
  searchParams.endEditTime = searchForm.editRange?.[1]?.format('YYYY-MM-DD HH:mm:ss')
  colorMode.value = false
  fetchPictures()
}

const doResetSearch = () => {
  Object.assign(searchForm, {
    searchText: undefined,
    tags: undefined,
    category: undefined,
    editRange: null,
    name: undefined,
    introduction: undefined,
    picWidth: undefined,
    picHeight: undefined,
    picFormat: undefined,
  })
  doSearch()
}

// ===== 颜色搜索 =====
const presetColors = ['#FF0000', '#FFA500', '#FFFF00', '#008000', '#0000FF', '#4B0082', '#7E3BF0', '#000000', '#FFFFFF']
const customColor = ref('#1677ff')
const colorMode = ref(false)
const colorResults = ref<API.PictureVO[]>([])
const colorLoading = ref(false)

const doColorSearch = async (color: string) => {
  if (!color) return
  colorLoading.value = true
  colorMode.value = true
  try {
    const res = await searchPictureByColor({ picColor: color, spaceId: spaceId.value })
    if (res.data.code === 0) {
      colorResults.value = res.data.data ?? []
    } else {
      message.error('颜色搜索失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('颜色搜索失败：' + (e?.message ?? '网络错误'))
  } finally {
    colorLoading.value = false
  }
}

// ===== 批量管理 =====
const batchMode = ref(false)
const selectedIds = ref<(number | string)[]>([])

const toggleBatchMode = () => {
  batchMode.value = !batchMode.value
  selectedIds.value = []
}

const isSelected = (id: number | string) => selectedIds.value.includes(id)

const toggleSelect = (id: number | string) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

const pageIds = computed(() => dataList.value.map((item) => item.id))
const allPageSelected = computed(
  () => pageIds.value.length > 0 && pageIds.value.every((id) => selectedIds.value.includes(id)),
)

/** 翻页不会清空已选（支持跨页批量），所以这里只增删本页的 id，其他页的选择保留 */
const toggleSelectPage = () => {
  if (allPageSelected.value) {
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.value.includes(id))
    return
  }
  pageIds.value.forEach((id) => {
    if (!selectedIds.value.includes(id)) {
      selectedIds.value.push(id)
    }
  })
}

const doClickPicture = (item: API.PictureVO) => {
  if (batchMode.value) {
    toggleSelect(item.id)
  } else {
    router.push(`/picture/${item.id}`)
  }
}

// 批量改信息
const showBatchEditModal = ref(false)
const batchEditForm = reactive<{ category?: string; tags?: string[] }>({})

const openBatchEdit = () => {
  batchEditForm.category = undefined
  batchEditForm.tags = undefined
  showBatchEditModal.value = true
}

const handleBatchEdit = async () => {
  try {
    const res = await editPictureByBatch({
      pictureIdList: selectedIds.value,
      spaceId: spaceId.value,
      category: batchEditForm.category || undefined,
      tags: batchEditForm.tags?.length ? batchEditForm.tags : undefined,
    })
    if (res.data.code === 0) {
      message.success('批量修改成功')
      showBatchEditModal.value = false
      selectedIds.value = []
      fetchPictures()
    } else {
      message.error('批量修改失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('批量修改失败：' + (e?.message ?? '网络错误'))
  }
}

// 批量重命名
const showBatchRenameModal = ref(false)
const batchRenameForm = reactive<{ nameRule?: string }>({})

const openBatchRename = () => {
  batchRenameForm.nameRule = undefined
  showBatchRenameModal.value = true
}

const handleBatchRename = async () => {
  if (!batchRenameForm.nameRule) {
    message.warning('请输入命名规则')
    return
  }
  try {
    const res = await editPictureByBatch({
      pictureIdList: selectedIds.value,
      spaceId: spaceId.value,
      nameRule: batchRenameForm.nameRule,
    })
    if (res.data.code === 0) {
      message.success('批量重命名成功')
      showBatchRenameModal.value = false
      selectedIds.value = []
      fetchPictures()
    } else {
      message.error('批量重命名失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('批量重命名失败：' + (e?.message ?? '网络错误'))
  }
}

// ===== AI 编辑 =====
const aiEditOpen = ref(false)
const aiEditPicture = ref<API.PictureVO>({ id: '' })

/** 后端 checkPictureAuth 对空间图只认图片归属人，管理员也不放行，这里按同一口径显示入口 */
const canAiEdit = (item: API.PictureVO) =>
  !!loginUserStore.loginUser.id && String(item.userId) === String(loginUserStore.loginUser.id)

const openAiEdit = (item: API.PictureVO) => {
  aiEditPicture.value = item
  aiEditOpen.value = true
}

const onAiEditSaved = (payload: { picture?: API.PictureVO; replaced: boolean }) => {
  if (payload.replaced || !payload.picture?.id) {
    fetchSpace()
    fetchPictures()
    return
  }
  router.push(`/picture/${payload.picture.id}`)
}

// ===== 空间信息 / 上传 / 改名 / 删除 =====
const fetchSpace = async () => {
  try {
    const res = await listSpaceByPage({ id: spaceId.value, current: 1, pageSize: 1 })
    if (res.data.code === 0 && res.data.data) {
      space.value = res.data.data.records?.[0]
      if (!space.value) {
        message.error('空间不存在')
      }
    } else {
      message.error('获取空间失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('获取空间失败：' + (e?.message ?? '网络错误'))
  }
}

const fetchLevels = async () => {
  try {
    const res = await listSpaceLevels()
    if (res.data.code === 0 && res.data.data) {
      spaceLevels.value = res.data.data
    }
  } catch {
    // 忽略
  }
}

/** 上传复用创建页那套两段式流程，spaceId 用查询参数带过去 */
const goUploadPage = () => {
  router.push(`/add_picture?spaceId=${spaceId.value}`)
}

/** 分析页同标签页打开，并把空间名带过去，省掉分析页再去查一次名字（后端没有按 id 查空间的端点） */
const goAnalyze = () => {
  router.push({
    path: '/space_analyze',
    query: { spaceId: String(spaceId.value), name: space.value?.spaceName ?? '' },
  })
}

const showEditModal = ref(false)
const editForm = reactive<API.SpaceEditRequest>({ id: '', spaceName: '' })

const doEdit = () => {
  if (!space.value) return
  editForm.id = space.value.id
  editForm.spaceName = space.value.spaceName
  showEditModal.value = true
}

const handleEdit = async () => {
  try {
    const res = await editSpace({ ...editForm })
    if (res.data.code === 0) {
      message.success('修改成功')
      showEditModal.value = false
      fetchSpace()
    } else {
      message.error('修改失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('修改失败：' + (e?.message ?? '网络错误'))
  }
}

const doDelete = async () => {
  try {
    const res = await deleteSpace({ id: spaceId.value })
    if (res.data.code === 0) {
      message.success('删除成功')
      router.push('/my_spaces')
    } else {
      message.error('删除失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('删除失败：' + (e?.message ?? '网络错误'))
  }
}

onMounted(() => {
  fetchLevels()
  fetchSpace()
  fetchPictures()
  loadTagCategory()
})
</script>

<style scoped>
.space-detail-page {
  max-width: 1280px;
  margin: 0 auto;
}

.search-area {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #f0f0f0;
}

.search-area :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.color-swatch {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.color-swatch:hover {
  transform: scale(1.15);
}

.color-input {
  width: 32px;
  height: 24px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  cursor: pointer;
  background: none;
}

.picture-item {
  position: relative;
}

.picture-item.selected :deep(.ant-card) {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.2);
}

.select-box {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  background: #fff;
  border-radius: 4px;
  padding: 2px;
}

.picture-cover {
  height: 180px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.picture-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-action {
  color: rgba(0, 0, 0, 0.45);
}

.card-action:hover {
  color: #1677ff;
}
</style>
