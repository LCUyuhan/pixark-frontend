<template>
  <div class="picture-manage-page">
    <a-card>
      <a-space style="margin-bottom: 16px; width: 100%; justify-content: space-between">
        <span style="font-size: 16px; font-weight: 600">图片管理</span>
        <a-button type="primary" @click="router.push('/add_picture')">+ 创建图片</a-button>
      </a-space>

      <!-- 搜索表单 -->
      <a-form layout="inline" :model="searchParams" @finish="doSearch">
        <a-form-item label="关键词">
          <a-input v-model:value="searchParams.searchText" placeholder="名称 / 简介" allow-clear />
        </a-form-item>
        <a-form-item label="分类">
          <a-select
            v-model:value="searchParams.category"
            placeholder="选择分类"
            allow-clear
            style="width: 140px"
            :options="categoryOptions"
          />
        </a-form-item>
        <a-form-item label="标签">
          <a-select
            v-model:value="searchParams.tags"
            mode="multiple"
            placeholder="选择标签"
            allow-clear
            style="min-width: 180px"
            :options="tagOptions"
          />
        </a-form-item>
        <a-form-item label="审核状态">
          <a-select
            v-model:value="searchParams.reviewStatus"
            placeholder="选择审核状态"
            allow-clear
            style="width: 120px"
            :options="PIC_REVIEW_STATUS_OPTIONS"
          />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit">搜索</a-button>
        </a-form-item>
      </a-form>

      <!-- 图片表格（列宽充足、内容完整展示，超出容器时横向滚动，操作列固定右侧） -->
      <a-table
        style="margin-top: 16px"
        :columns="columns"
        :data-source="dataList"
        :pagination="pagination"
        :loading="loading"
        :scroll="{ x: 1900 }"
        row-key="id"
        @change="doTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'url'">
            <!-- 管理端返回 Picture 实体，含 thumbnailUrl 字段，列表优先加载缩略图 -->
            <a-image
              :src="record.thumbnailUrl || record.url"
              :width="80"
              :height="60"
              style="object-fit: cover"
            />
          </template>
          <template v-else-if="column.dataIndex === 'tags'">
            <a-space :size="4" wrap>
              <a-tag v-for="tag in normalizeTags(record.tags)" :key="tag">{{ tag }}</a-tag>
            </a-space>
          </template>
          <template v-else-if="column.dataIndex === 'picInfo'">
            <div>格式：{{ record.picFormat ?? '-' }}</div>
            <div>尺寸：{{ record.picWidth ?? '-' }} x {{ record.picHeight ?? '-' }}</div>
            <div>大小：{{ formatSize(record.picSize) }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'reviewInfo'">
            <div>
              状态：
              <a-tag :color="reviewStatusColor(record.reviewStatus)">
                {{ PIC_REVIEW_STATUS_MAP[record.reviewStatus] ?? '-' }}
              </a-tag>
            </div>
            <div>审核信息：{{ record.reviewMessage ?? '-' }}</div>
            <div>审核人：{{ record.reviewerId ?? '-' }}</div>
            <div v-if="record.reviewTime">
              审核时间：{{ dayjs(record.reviewTime).format('YYYY-MM-DD HH:mm:ss') }}
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ record.createTime ? dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space wrap>
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
                @click="doReview(record, PIC_REVIEW_STATUS_ENUM.REJECT)"
              >
                拒绝
              </a-button>
              <a-button type="link" size="small" @click="doEdit(record.id)">编辑</a-button>
              <a-popconfirm title="确定要删除该图片吗？" @confirm="doDelete(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  deletePicture,
  doPictureReview,
  listPictureByPage,
  listPictureTagCategory,
} from '@/api/pictureController'
import { formatSize } from '@/utils'
import {
  PIC_REVIEW_STATUS_ENUM,
  PIC_REVIEW_STATUS_MAP,
  PIC_REVIEW_STATUS_OPTIONS,
} from '@/constants/picture'

const router = useRouter()

const columns = [
  { title: 'ID', dataIndex: 'id', width: 190 },
  { title: '图片', dataIndex: 'url', width: 110 },
  { title: '名称', dataIndex: 'name', width: 160 },
  { title: '简介', dataIndex: 'introduction', width: 220 },
  { title: '分类', dataIndex: 'category', width: 100 },
  { title: '标签', dataIndex: 'tags', width: 180 },
  { title: '图片信息', dataIndex: 'picInfo', width: 160 },
  { title: '审核信息', dataIndex: 'reviewInfo', width: 220 },
  { title: '用户ID', dataIndex: 'userId', width: 190 },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' as const },
]

// 查询参数（对应后端 PictureQueryRequest）
const searchParams = reactive<API.PictureQueryRequest>({
  current: 1,
  pageSize: 10,
  sortField: 'createTime',
  sortOrder: 'descend',
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
    if (res.data.code === 0 && res.data.data) {
      dataList.value = res.data.data.records ?? []
      total.value = Number(res.data.data.total ?? 0)
    } else {
      message.error('获取图片列表失败：' + res.data.message)
    }
  } catch (e: any) {
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
  searchParams.current = 1
  fetchData()
}

/** 审核状态对应标签颜色 */
const reviewStatusColor = (status?: number) => {
  if (status === PIC_REVIEW_STATUS_ENUM.PASS) return 'green'
  if (status === PIC_REVIEW_STATUS_ENUM.REJECT) return 'red'
  return 'orange'
}

/** 审核图片（通过 / 拒绝） */
const doReview = async (record: API.Picture, reviewStatus: number) => {
  const reviewMessage =
    reviewStatus === PIC_REVIEW_STATUS_ENUM.PASS ? '管理员操作通过' : '管理员操作拒绝'
  try {
    const res = await doPictureReview({ id: record.id, reviewStatus, reviewMessage })
    if (res.data.code === 0) {
      message.success('审核操作成功')
      fetchData()
    } else {
      message.error('审核操作失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('审核操作失败：' + (e?.message ?? '网络错误'))
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
  loadTagCategory()
  fetchData()
})
</script>

<style scoped>
.picture-manage-page {
  /* 表格列总宽 1900px + 卡片内边距 48px，表格可完整展示无需横向滚动 */
  max-width: 1950px;
  margin: 0 auto;
}
</style>
