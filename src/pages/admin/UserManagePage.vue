<template>
  <div class="user-manage-page">
    <a-card>
      <!-- 搜索表单 -->
      <a-form layout="inline" :model="searchParams" @finish="doSearch">
        <a-form-item label="账号">
          <a-input v-model:value="searchParams.userAccount" placeholder="输入账号" allow-clear />
        </a-form-item>
        <a-form-item label="昵称">
          <a-input v-model:value="searchParams.userName" placeholder="输入昵称" allow-clear />
        </a-form-item>
        <a-form-item label="角色">
          <a-select
            v-model:value="searchParams.userRole"
            placeholder="选择角色"
            allow-clear
            style="width: 120px"
            :options="roleOptions"
          />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit">搜索</a-button>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" ghost @click="openAddModal">新增用户</a-button>
        </a-form-item>
      </a-form>

      <!-- 用户表格 -->
      <a-table
        style="margin-top: 16px"
        :columns="columns"
        :data-source="dataList"
        :pagination="pagination"
        :loading="loading"
        row-key="id"
        @change="doTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'userAvatar'">
            <a-avatar :src="record.userAvatar">
              {{ record.userName?.[0] ?? record.userAccount?.[0] }}
            </a-avatar>
          </template>
          <template v-else-if="column.dataIndex === 'userRole'">
            <a-tag :color="record.userRole === 'admin' ? 'gold' : 'default'">
              {{ record.userRole }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ record.createTime ? dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openEditModal(record)">编辑</a-button>
              <a-popconfirm title="确定要删除该用户吗？" @confirm="doDelete(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 新增用户弹窗（字段对应后端 UserAddRequest，默认密码 12345678） -->
    <a-modal
      v-model:open="addModalOpen"
      title="新增用户"
      :confirm-loading="submitLoading"
      @ok="doAdd"
    >
      <a-form :model="addForm" layout="vertical">
        <a-form-item label="账号" required>
          <a-input v-model:value="addForm.userAccount" placeholder="请输入账号" />
        </a-form-item>
        <a-form-item label="昵称">
          <a-input v-model:value="addForm.userName" placeholder="请输入昵称" />
        </a-form-item>
        <a-form-item label="头像地址">
          <a-input v-model:value="addForm.userAvatar" placeholder="请输入头像 URL" />
        </a-form-item>
        <a-form-item label="简介">
          <a-textarea v-model:value="addForm.userProfile" placeholder="请输入简介" />
        </a-form-item>
        <a-form-item label="角色">
          <a-select v-model:value="addForm.userRole" :options="roleOptions" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 编辑用户弹窗（字段对应后端 UserUpdateRequest） -->
    <a-modal
      v-model:open="editModalOpen"
      title="编辑用户"
      :confirm-loading="submitLoading"
      @ok="doEdit"
    >
      <a-form :model="editForm" layout="vertical">
        <a-form-item label="昵称">
          <a-input v-model:value="editForm.userName" placeholder="请输入昵称" />
        </a-form-item>
        <a-form-item label="头像地址">
          <a-input v-model:value="editForm.userAvatar" placeholder="请输入头像 URL" />
        </a-form-item>
        <a-form-item label="简介">
          <a-textarea v-model:value="editForm.userProfile" placeholder="请输入简介" />
        </a-form-item>
        <a-form-item label="角色">
          <a-select v-model:value="editForm.userRole" :options="roleOptions" />
        </a-form-item>
        <a-form-item label="AI 编辑额度（剩余次数）">
          <a-input-number
            v-model:value="editForm.aiQuota"
            :min="0"
            :precision="0"
            style="width: 100%"
            placeholder="留空表示不修改"
          />
          <div class="field-tip">用户额度用完会看到「请联系管理员发放」，在这里填新的剩余次数即可，不会按天自动重置</div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  addUser,
  deleteUser,
  listUserVOByPage,
  updateUser,
} from '@/api/userController'

// 角色选项（对应后端 UserConstant：user/admin）
const roleOptions = [
  { value: 'user', label: '普通用户' },
  { value: 'admin', label: '管理员' },
]

const columns = [
  { title: 'ID', dataIndex: 'id', width: 180 },
  { title: '头像', dataIndex: 'userAvatar', width: 80 },
  { title: '账号', dataIndex: 'userAccount' },
  { title: '昵称', dataIndex: 'userName' },
  { title: '简介', dataIndex: 'userProfile', ellipsis: true },
  { title: '角色', dataIndex: 'userRole', width: 100 },
  { title: 'AI 额度', dataIndex: 'aiQuota', width: 90 },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  { title: '操作', key: 'action', width: 150 },
]

// 搜索参数（对应后端 UserQueryRequest）
const searchParams = reactive<API.UserQueryRequest>({
  current: 1,
  pageSize: 10,
})

const dataList = ref<API.UserVO[]>([])
const total = ref(0)
const loading = ref(false)

// 分页配置
const pagination = computed(() => ({
  current: searchParams.current,
  pageSize: searchParams.pageSize,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}))

/** 获取用户分页列表 */
const fetchData = async () => {
  loading.value = true
  try {
    const res = await listUserVOByPage({ ...searchParams })
    if (res.data.code !== 0 || !res.data.data) {
      throw new Error(res.data.message || '服务端返回异常')
    }
    dataList.value = res.data.data.records ?? []
    total.value = Number(res.data.data.total ?? 0)
  } catch (e: any) {
    // 失败要清掉旧数据，否则上一次筛选的结果会留着像请求成功一样
    dataList.value = []
    total.value = 0
    message.error('获取用户列表失败：' + (e?.message ?? '网络错误'))
  } finally {
    loading.value = false
  }
}

/** 表格分页变化 */
const doTableChange = (page: { current?: number; pageSize?: number }) => {
  searchParams.current = page.current ?? 1
  searchParams.pageSize = page.pageSize ?? 10
  fetchData()
}

/** 搜索：重置到第一页 */
const doSearch = () => {
  searchParams.current = 1
  fetchData()
}

// -------------------- 新增用户 --------------------
const addModalOpen = ref(false)
const submitLoading = ref(false)
const addForm = reactive<API.UserAddRequest>({
  userRole: 'user',
})

const openAddModal = () => {
  addForm.userAccount = undefined
  addForm.userName = undefined
  addForm.userAvatar = undefined
  addForm.userProfile = undefined
  addForm.userRole = 'user'
  addModalOpen.value = true
}

const doAdd = async () => {
  if (!addForm.userAccount) {
    message.warning('请输入账号')
    return
  }
  submitLoading.value = true
  try {
    const res = await addUser(addForm)
    if (res.data.code === 0) {
      message.success('创建成功（默认密码 12345678）')
      addModalOpen.value = false
      fetchData()
    } else {
      message.error('创建失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('创建失败：' + (e?.message ?? '网络错误'))
  } finally {
    submitLoading.value = false
  }
}

// -------------------- 编辑用户 --------------------
const editModalOpen = ref(false)
const editForm = reactive<API.UserUpdateRequest>({
  id: '',
})

const openEditModal = (record: API.UserVO) => {
  editForm.id = record.id
  editForm.userName = record.userName
  editForm.userAvatar = record.userAvatar
  editForm.userProfile = record.userProfile
  editForm.userRole = record.userRole
  // 必须回填真实额度：留空后端才会跳过该字段，填 0 等于把用户额度清零
  editForm.aiQuota = record.aiQuota
  editModalOpen.value = true
}

const doEdit = async () => {
  submitLoading.value = true
  try {
    const res = await updateUser(editForm)
    if (res.data.code === 0) {
      message.success('更新成功')
      editModalOpen.value = false
      fetchData()
    } else {
      message.error('更新失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('更新失败：' + (e?.message ?? '网络错误'))
  } finally {
    submitLoading.value = false
  }
}

// -------------------- 删除用户 --------------------
const doDelete = async (id: number | string) => {
  if (!id) return
  try {
    const res = await deleteUser({ id })
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

// 页面加载时获取数据
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.user-manage-page {
  max-width: 1200px;
  margin: 0 auto;
}

.field-tip {
  color: var(--color-text-tertiary);
  font-size: 12px;
  line-height: 1.6;
}
</style>
