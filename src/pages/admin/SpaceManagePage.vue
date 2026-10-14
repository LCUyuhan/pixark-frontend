<template>
  <div class="space-manage-page">
    <a-card>
      <a-space style="margin-bottom: 16px; width: 100%; justify-content: space-between">
        <span style="font-size: 16px; font-weight: 600">用户空间管理</span>
      </a-space>

      <!-- 搜索表单 -->
      <a-form layout="inline" :model="searchParams" @finish="doSearch">
        <a-form-item label="空间名称">
          <a-input v-model:value="searchParams.spaceName" placeholder="空间名称" allow-clear />
        </a-form-item>
        <a-form-item label="空间级别">
          <a-select
            v-model:value="searchParams.spaceLevel"
            placeholder="选择级别"
            allow-clear
            style="width: 120px"
            :options="levelOptions"
          />
        </a-form-item>
        <a-form-item label="用户ID">
          <a-input v-model:value="searchParams.userId" placeholder="用户 ID" allow-clear />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit">搜索</a-button>
        </a-form-item>
      </a-form>

      <a-table
        style="margin-top: 16px"
        :columns="columns"
        :data-source="dataList"
        :pagination="pagination"
        :loading="loading"
        :scroll="{ x: 1400 }"
        row-key="id"
        @change="doTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'spaceLevel'">
            <a-tag :color="levelColor(record.spaceLevel)">{{ levelText(record.spaceLevel) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'usage'">
            <div>大小：{{ formatSize(record.totalSize) }} / {{ formatSize(record.maxSize) }}</div>
            <div>数量：{{ record.totalCount ?? 0 }} / {{ record.maxCount ?? 0 }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'user'">
            {{ record.user?.userName ?? record.user?.userAccount ?? record.userId ?? '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ record.createTime ? dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="goSpacePictures(record)">
                查看该空间图片
              </a-button>
              <a-button type="link" size="small" @click="doEdit(record)">改名</a-button>
              <a-button type="link" size="small" @click="doUpdate(record)">改级别</a-button>
              <a-popconfirm title="确定要删除该空间吗？空间内图片将一并删除" @confirm="doDelete(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 改名弹窗 -->
    <a-modal v-model:open="showEditModal" title="修改空间名称" @ok="handleEdit">
      <a-form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="空间名称">
          <a-input v-model:value="editForm.spaceName" placeholder="请输入空间名称" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 改级别/限额弹窗 -->
    <a-modal v-model:open="showUpdateModal" title="修改空间级别与限额" @ok="handleUpdate">
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 17 }">
        <a-form-item label="空间级别">
          <a-select v-model:value="updateForm.spaceLevel" placeholder="选择空间级别">
            <a-select-option v-for="level in spaceLevels" :key="level.value" :value="level.value">
              {{ level.text }}（{{ level.maxCount }} 张 / {{ formatSize(level.maxSize) }}）
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="最大总大小(MB)">
          <a-input-number v-model:value="maxSizeMb" :min="0" style="width: 100%" placeholder="MB" />
        </a-form-item>
        <a-form-item label="最大数量">
          <a-input-number v-model:value="updateForm.maxCount" :min="0" style="width: 100%" placeholder="张" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { formatSize } from '@/utils'
import {
  deleteSpace,
  editSpace,
  listSpaceByPage,
  listSpaceLevels,
  updateSpace,
} from '@/api/spaceController'

const router = useRouter()

const columns = [
  { title: 'ID', dataIndex: 'id', width: 190 },
  { title: '空间名称', dataIndex: 'spaceName', width: 140 },
  { title: '级别', dataIndex: 'spaceLevel', width: 100 },
  { title: '使用情况', dataIndex: 'usage', width: 200 },
  { title: '所属用户', dataIndex: 'user', width: 140 },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  { title: '操作', key: 'action', width: 300, fixed: 'right' as const },
]

/**
 * 跳图片管理页并按该空间筛选。
 * 不走 /space/:id —— 那是用户端页面，管理员看别人的空间会被 checkPictureAuth 的空间归属校验拦掉
 */
const goSpacePictures = (record: API.SpaceVO) => {
  router.push(`/admin/pictureManage?spaceId=${record.id}`)
}

const searchParams = reactive<API.SpaceQueryRequest>({
  current: 1,
  pageSize: 10,
  sortField: 'createTime',
  sortOrder: 'descend',
})

const dataList = ref<API.SpaceVO[]>([])
const total = ref(0)
const loading = ref(false)
const spaceLevels = ref<API.SpaceLevel[]>([])

const levelOptions = computed(() =>
  spaceLevels.value.map((l) => ({ value: l.value, label: l.text })),
)

const pagination = computed(() => ({
  current: searchParams.current,
  pageSize: searchParams.pageSize,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}))

const levelText = (level?: number) => spaceLevels.value.find((l) => l.value === level)?.text ?? '未知'
const levelColor = (level?: number) => (level === 0 ? 'blue' : level === 1 ? 'orange' : level === 2 ? 'purple' : 'default')

const fetchData = async () => {
  loading.value = true
  try {
    const res = await listSpaceByPage({ ...searchParams })
    if (res.data.code === 0 && res.data.data) {
      dataList.value = res.data.data.records ?? []
      total.value = Number(res.data.data.total ?? 0)
    } else {
      message.error('获取空间列表失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('获取空间列表失败：' + (e?.message ?? '网络错误'))
  } finally {
    loading.value = false
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

const doTableChange = (page: { current?: number; pageSize?: number }) => {
  searchParams.current = page.current ?? 1
  searchParams.pageSize = page.pageSize ?? 10
  fetchData()
}

const doSearch = () => {
  searchParams.current = 1
  fetchData()
}

// 改名
const showEditModal = ref(false)
const editForm = reactive<API.SpaceEditRequest>({ id: '', spaceName: '' })

const doEdit = (record: API.SpaceVO) => {
  editForm.id = record.id
  editForm.spaceName = record.spaceName
  showEditModal.value = true
}

const handleEdit = async () => {
  try {
    const res = await editSpace({ ...editForm })
    if (res.data.code === 0) {
      message.success('修改成功')
      showEditModal.value = false
      fetchData()
    } else {
      message.error('修改失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('修改失败：' + (e?.message ?? '网络错误'))
  }
}

// 改级别/限额
const showUpdateModal = ref(false)
const updateForm = reactive<API.SpaceUpdateRequest>({
  id: '',
  spaceName: '',
  spaceLevel: 0,
  maxSize: 0,
  maxCount: 0,
})
// 最大总大小以 MB 显示/编辑（后端存字节，提交时换算）
const maxSizeMb = ref(0)

const doUpdate = (record: API.SpaceVO) => {
  updateForm.id = record.id
  updateForm.spaceName = record.spaceName
  updateForm.spaceLevel = record.spaceLevel
  maxSizeMb.value = Math.round((record.maxSize ?? 0) / 1024 / 1024)
  updateForm.maxCount = record.maxCount
  showUpdateModal.value = true
}

// 切换级别时自动填充该级别的默认限额（仍可手动覆盖）
watch(
  () => updateForm.spaceLevel,
  (level) => {
    const found = spaceLevels.value.find((l) => l.value === level)
    if (found) {
      maxSizeMb.value = Math.round(found.maxSize / 1024 / 1024)
      updateForm.maxCount = found.maxCount
    }
  },
)

const handleUpdate = async () => {
  try {
    const res = await updateSpace({
      ...updateForm,
      maxSize: Math.round(maxSizeMb.value * 1024 * 1024),
    })
    if (res.data.code === 0) {
      message.success('更新成功')
      showUpdateModal.value = false
      fetchData()
    } else {
      message.error('更新失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('更新失败：' + (e?.message ?? '网络错误'))
  }
}

// 删除
const doDelete = async (id: number | string) => {
  try {
    const res = await deleteSpace({ id })
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

onMounted(() => {
  fetchLevels()
  fetchData()
})
</script>

<style scoped>
.space-manage-page {
  max-width: 1450px;
  margin: 0 auto;
}
</style>
