<template>
  <div class="my-spaces-page">
    <!-- 已有空间：正在跳转，不渲染内容 -->
    <a-spin v-if="loading || mySpace" style="display: block; margin: 80px auto" />

    <!-- 无空间：创建表单 -->
    <a-card v-else>
      <div style="text-align: center; margin-bottom: 24px">
        <FolderOutlined style="font-size: 40px; color: var(--color-primary)" />
        <h3 style="margin: 12px 0 4px">你还没有私有空间</h3>
        <p style="color: var(--color-text-tertiary)">创建后即可在空间内上传和管理自己的图片</p>
      </div>
      <a-form :model="createForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 12 }" @finish="doCreate">
        <a-form-item label="空间名称">
          <a-input v-model:value="createForm.spaceName" placeholder="请输入空间名称" />
        </a-form-item>
        <a-form-item label="空间级别">
          <a-select v-model:value="createForm.spaceLevel" :disabled="!isAdmin">
            <a-select-option v-for="level in selectableLevels" :key="level.value" :value="level.value">
              {{ level.text }}（{{ level.maxCount }} 张 / {{ formatSize(level.maxSize) }}）
            </a-select-option>
          </a-select>
          <div v-if="!isAdmin" class="level-tip">
            普通用户只能创建普通版空间，更高规格（专业版 / 旗舰版）需管理员开通
          </div>
        </a-form-item>
        <a-form-item :wrapper-col="{ offset: 6, span: 12 }">
          <a-button type="primary" html-type="submit" block :loading="creating">创建空间</a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { FolderOutlined } from '@ant-design/icons-vue'
import { formatSize } from '@/utils'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { addSpace, listSpaceByPage, listSpaceLevels } from '@/api/spaceController'

const router = useRouter()
const loginUserStore = useLoginUserStore()

const mySpace = ref<API.SpaceVO>()
const loading = ref(true)
const creating = ref(false)
const spaceLevels = ref<API.SpaceLevel[]>([])

const isAdmin = computed(() => loginUserStore.loginUser.userRole === 'admin')
// 与后端 SpaceServiceImpl.addSpace 的级别权限一致：非管理员只放开普通版（0），
// 否则选了高级别只会在提交时收到 40300「无权限创建指定级别的空间」
const selectableLevels = computed(() =>
  isAdmin.value ? spaceLevels.value : spaceLevels.value.filter((level) => level.value === 0),
)

/**
 * 加载我的空间：已有则直接进入空间详情。
 * userId 必须显式传自己的：后端只对非管理员把条件强制覆盖成本人，管理员传什么就用什么，
 * 少这一行管理员会拿到全站第一条空间，然后被下面的 replace 送进陌生人的空间里。
 */
const fetchMySpace = async () => {
  loading.value = true
  try {
    const res = await listSpaceByPage({ current: 1, pageSize: 1, userId: loginUserStore.loginUser.id })
    if (res.data.code === 0 && res.data.data) {
      mySpace.value = res.data.data.records?.[0]
      if (mySpace.value) {
        router.replace(`/space/${mySpace.value.id}`)
        return
      }
    } else {
      message.error('获取空间失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('获取空间失败：' + (e?.message ?? '网络错误'))
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

const createForm = reactive<API.SpaceAddRequest>({ spaceName: '', spaceLevel: 0 })

const doCreate = async () => {
  creating.value = true
  try {
    const res = await addSpace({ ...createForm })
    if (res.data.code === 0) {
      message.success('创建成功')
      // 创建后直接进入空间
      router.replace(`/space/${res.data.data}`)
    } else {
      message.error('创建失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('创建失败：' + (e?.message ?? '网络错误'))
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  fetchLevels()
  fetchMySpace()
})
</script>

<style scoped>
.my-spaces-page {
  max-width: 560px;
  margin: 40px auto;
}

.level-tip {
  margin-top: 6px;
  color: var(--color-text-tertiary);
  font-size: 12px;
  line-height: 1.6;
}
</style>
