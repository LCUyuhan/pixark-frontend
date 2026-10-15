<template>
  <div class="my-pictures-page">
    <a-card>
      <div class="page-title">我的投稿</div>
      <div class="page-subtitle">
        这里能看到你上传到公共图库的全部图片，包括还在审核和被退回的。公共图库的图片需审核通过后才出现在首页。
      </div>

      <a-form layout="inline" class="search-form" :model="filters" @finish="doSearch">
        <a-form-item label="审核状态">
          <a-select
            v-model:value="filters.reviewStatus"
            placeholder="全部"
            :options="PIC_REVIEW_STATUS_OPTIONS"
            allow-clear
            style="width: 120px"
          />
        </a-form-item>
        <a-form-item label="名称">
          <a-input v-model:value="filters.name" placeholder="图片名称" allow-clear style="width: 180px" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit">搜索</a-button>
            <a-button @click="doReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-table
        :columns="columns"
        :data-source="pictureList"
        :pagination="pagination"
        :loading="loading"
        :scroll="{ x: 900 }"
        row-key="id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'url'">
            <a-image :src="record.thumbnailUrl || record.url" :height="48" />
          </template>
          <template v-else-if="column.dataIndex === 'tags'">
            <a-tag v-for="tag in record.tags" :key="tag" color="orange">{{ tag }}</a-tag>
          </template>
          <template v-else-if="column.key === 'reviewStatus'">
            <a-tag :color="reviewColor(record.reviewStatus)">
              {{ PIC_REVIEW_STATUS_MAP[record.reviewStatus as number] ?? '未知' }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ record.createTime ? dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space wrap>
              <a-button type="link" size="small" @click="goDetail(record.id)">查看</a-button>
              <!-- 被退回的图改完信息保存会自动回到待审核，见后端 fillReviewParams -->
              <a-button
                v-if="record.reviewStatus === PIC_REVIEW_STATUS_ENUM.REJECT"
                type="link"
                size="small"
                @click="goEdit(record.id)"
              >
                修改重审
              </a-button>
              <a-popconfirm title="确定要删除这张图片吗？" @confirm="doDelete(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>

        <template #expandedRowRender="{ record }">
          <a-descriptions :column="2" size="small" bordered>
            <a-descriptions-item label="图片 ID">{{ record.id }}</a-descriptions-item>
            <a-descriptions-item label="所属空间">公共图库</a-descriptions-item>
            <a-descriptions-item label="格式">{{ record.picFormat || '-' }}</a-descriptions-item>
            <a-descriptions-item label="尺寸">
              {{ record.picWidth && record.picHeight ? `${record.picWidth} x ${record.picHeight}` : '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="大小">{{ formatSize(record.picSize) }}</a-descriptions-item>
            <a-descriptions-item label="审核时间">
              {{ record.reviewTime ? dayjs(record.reviewTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="审核信息" :span="2">{{ record.reviewMessage || '-' }}</a-descriptions-item>
            <a-descriptions-item label="简介" :span="2">{{ record.introduction || '-' }}</a-descriptions-item>
          </a-descriptions>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { deletePicture, listMyPictureVOByPage } from '@/api/pictureController'
import { formatSize } from '@/utils'
import {
  PIC_REVIEW_STATUS_ENUM,
  PIC_REVIEW_STATUS_MAP,
  PIC_REVIEW_STATUS_OPTIONS,
} from '@/constants/picture'

const router = useRouter()

const columns = [
  { title: '图片', dataIndex: 'url', width: 90, fixed: 'left' as const },
  { title: '名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '分类', dataIndex: 'category', width: 100, ellipsis: true },
  { title: '标签', dataIndex: 'tags', width: 160 },
  { title: '状态', key: 'reviewStatus', width: 90 },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  { title: '操作', key: 'action', width: 190, fixed: 'right' as const },
]

const pictureList = ref<API.PictureVO[]>([])
const loading = ref(false)
// a-form 必须拿到 :model 才会触发 @finish（见 ant-design-vue Form.js 的 handleSubmit），
// 所以筛选值收进一个对象，不写 model 的话点搜索按钮会毫无反应
const filters = reactive<{ reviewStatus?: number; name?: string }>({})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: false,
})

const reviewColor = (status?: number) => {
  if (status === PIC_REVIEW_STATUS_ENUM.PASS) return 'green'
  if (status === PIC_REVIEW_STATUS_ENUM.REJECT) return 'red'
  return 'orange'
}

/** 拉取我的投稿：后端强制按登录用户过滤，前端不需要传 userId */
const fetchData = async () => {
  loading.value = true
  try {
    const res = await listMyPictureVOByPage({
      current: pagination.current,
      pageSize: pagination.pageSize,
      name: filters.name || undefined,
      reviewStatus: filters.reviewStatus,
      sortField: 'createTime',
      sortOrder: 'descend',
    })
    if (res.data.code === 0 && res.data.data) {
      pictureList.value = res.data.data.records ?? []
      pagination.total = res.data.data.total ?? 0
    } else {
      message.error('获取数据失败：' + (res.data.message ?? ''))
    }
  } catch (e: any) {
    message.error('获取数据失败：' + (e?.message ?? '网络异常'))
  } finally {
    loading.value = false
  }
}

const doSearch = () => {
  pagination.current = 1
  fetchData()
}

const doReset = () => {
  filters.reviewStatus = undefined
  filters.name = undefined
  pagination.current = 1
  fetchData()
}

const handleTableChange = (page: any) => {
  pagination.current = page.current
  pagination.pageSize = page.pageSize
  fetchData()
}

const goDetail = (id: number | string) => {
  router.push(`/picture/${id}`)
}

const goEdit = (id: number | string) => {
  router.push(`/picture/edit/${id}`)
}

const doDelete = async (id: number | string) => {
  try {
    const res = await deletePicture({ id })
    if (res.data.code === 0 && res.data.data) {
      message.success('删除成功')
      fetchData()
    } else {
      message.error('删除失败：' + (res.data.message ?? ''))
    }
  } catch (e: any) {
    message.error('删除失败：' + (e?.message ?? '网络异常'))
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.my-pictures-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.page-subtitle {
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 16px;
}

.search-form {
  margin-bottom: 16px;
}
</style>
