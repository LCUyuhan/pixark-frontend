<template>
  <div class="my-spaces-page">
    <!-- 已有空间：正在跳转，不渲染内容 -->
    <a-spin v-if="loading || mySpace" style="display: block; margin: 80px auto" />

    <!-- 无空间：创建表单 -->
    <a-card v-else>
      <div style="text-align: center; margin-bottom: 24px">
        <FolderOutlined style="font-size: 40px; color: #1677ff" />
        <h3 style="margin: 12px 0 4px">你还没有私有空间</h3>
        <p style="color: rgba(0, 0, 0, 0.45)">创建后即可在空间内上传和管理自己的图片</p>
      </div>
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 12 }" @finish="doCreate">
        <a-form-item label="空间名称">
          <a-input v-model:value="createForm.spaceName" placeholder="请输入空间名称" />
        </a-form-item>
        <a-form-item label="空间级别">
          <a-select v-model:value="createForm.spaceLevel" placeholder="选择空间级别">
            <a-select-option v-for="level in spaceLevels" :key="level.value" :value="level.value">
              {{ level.text }}（{{ level.maxCount }} 张 / {{ formatSize(level.maxSize) }}）
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :wrapper-col="{ offset: 6, span: 12 }">
          <a-button type="primary" html-type="submit" block :loading="creating">创建空间</a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { FolderOutlined } from '@ant-design/icons-vue'
import { formatSize } from '@/utils'
import { addSpace, listSpaceByPage, listSpaceLevels } from '@/api/spaceController'

const router = useRouter()

const mySpace = ref<API.SpaceVO>()
const loading = ref(true)
const creating = ref(false)
const spaceLevels = ref<API.SpaceLevel[]>([])

/** 加载我的空间：已有则直接进入空间详情 */
const fetchMySpace = async () => {
  loading.value = true
  try {
    const res = await listSpaceByPage({ current: 1, pageSize: 1 })
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
</style>
