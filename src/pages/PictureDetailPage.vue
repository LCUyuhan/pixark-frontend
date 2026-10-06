<template>
  <div class="picture-detail-page">
    <a-card :loading="loading">
      <a-row :gutter="[24, 24]">
        <!-- 图片展示 -->
        <a-col :xs="24" :md="14">
          <a-image :src="picture.url" :alt="picture.name" style="max-width: 100%" />
        </a-col>
        <!-- 图片信息 -->
        <a-col :xs="24" :md="10">
          <a-descriptions :title="picture.name" :column="1" bordered>
            <a-descriptions-item label="简介">
              {{ picture.introduction || '暂无简介' }}
            </a-descriptions-item>
            <a-descriptions-item label="分类">
              <a-tag v-if="picture.category" color="blue">{{ picture.category }}</a-tag>
              <template v-else>-</template>
            </a-descriptions-item>
            <a-descriptions-item label="标签">
              <a-space :size="4" wrap>
                <a-tag v-for="tag in picture.tags ?? []" :key="tag">{{ tag }}</a-tag>
                <span v-if="!picture.tags?.length">-</span>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="格式">{{ picture.picFormat ?? '-' }}</a-descriptions-item>
            <a-descriptions-item label="尺寸">
              {{ picture.picWidth ?? '-' }} x {{ picture.picHeight ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="大小">{{ formatSize(picture.picSize) }}</a-descriptions-item>
            <a-descriptions-item label="上传者">
              {{ picture.user?.userName ?? picture.user?.userAccount ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="创建时间">
              {{ picture.createTime ? dayjs(picture.createTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
            </a-descriptions-item>
          </a-descriptions>

          <!-- 操作按钮 -->
          <a-space style="margin-top: 16px" wrap>
            <!-- 下载：所有用户可用，直接从对象存储 URL 下载 -->
            <a-button type="primary" @click="doDownload">
              <DownloadOutlined />
              免费下载
            </a-button>
            <!-- 仅本人或管理员可编辑/删除 -->
            <template v-if="canEdit">
              <a-button @click="doEdit">
                <EditOutlined />
                编辑
              </a-button>
              <a-popconfirm title="确定要删除这张图片吗？" @confirm="doDelete">
                <a-button danger>
                  <DeleteOutlined />
                  删除
                </a-button>
              </a-popconfirm>
            </template>
          </a-space>
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { EditOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { deletePicture, getPictureVOById } from '@/api/pictureController'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { downloadImage, formatSize } from '@/utils'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const picture = ref<API.PictureVO>({ id: '' })
const loading = ref(true)

/** 当前登录用户是否有编辑/删除权限（本人或管理员，对应后端校验逻辑） */
const canEdit = computed(() => {
  const loginUser = loginUserStore.loginUser
  if (!loginUser.id || loginUser.userRole === 'notLogin') {
    return false
  }
  return loginUser.userRole === 'admin' || String(picture.value.userId) === String(loginUser.id)
})

/** 下载图片 */
const doDownload = () => {
  downloadImage(picture.value.url, picture.value.name)
}

/** 获取图片详情 */
const fetchPicture = async () => {
  const id = route.params.id as string
  if (!id) {
    message.error('图片 id 不存在')
    return
  }
  loading.value = true
  try {
    const res = await getPictureVOById({ id })
    if (res.data.code === 0 && res.data.data) {
      picture.value = res.data.data
    } else {
      message.error('获取图片详情失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('获取图片详情失败：' + (e?.message ?? '网络错误'))
  } finally {
    loading.value = false
  }
}

/** 跳转编辑页 */
const doEdit = () => {
  router.push(`/add_picture?id=${picture.value.id}`)
}

/** 删除图片 */
const doDelete = async () => {
  try {
    const res = await deletePicture({ id: picture.value.id })
    if (res.data.code === 0) {
      message.success('删除成功')
      router.push('/')
    } else {
      message.error('删除失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('删除失败：' + (e?.message ?? '网络错误'))
  }
}

onMounted(() => {
  fetchPicture()
})
</script>

<style scoped>
.picture-detail-page {
  max-width: 1080px;
  margin: 0 auto;
}
</style>
