<template>
  <div class="picture-detail-page">
    <a-card :loading="loading">
      <a-row :gutter="[24, 24]">
        <!-- 图片展示 -->
        <a-col :xs="24" :md="14" class="image-col">
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
            <!-- 以图搜图：需登录（后端校验登录态） -->
            <a-button v-if="isLoggedIn" @click="openImageSearch">
              <SearchOutlined />
              以图搜图
            </a-button>
            <!-- AI 编辑：后端用 checkPictureAuth 校验，口径与下面的编辑/删除一致 -->
            <a-button v-if="canEdit" @click="aiEditOpen = true">
              <RobotOutlined />
              AI 编辑
            </a-button>
            <!-- 分享：空间图受 checkPictureAuth 保护，别人打不开，只对公共图库开放 -->
            <a-button v-if="!picture.spaceId" @click="openShare">
              <ShareAltOutlined />
              分享
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

    <!-- 以图搜图弹窗 -->
    <a-modal v-model:open="showImageSearchModal" title="以图搜图（全网相似图片）" width="760px" :footer="null">
      <a-space style="margin-bottom: 12px" wrap>
        <a-button type="primary" :loading="imageSearchLoading" @click="doImageSearch">开始搜索</a-button>
        <span class="search-tip">走百度识图，单次可能需要数十秒</span>
      </a-space>
      <a-alert
        v-if="imageSearchLoading"
        type="info"
        show-icon
        message="全网搜索中，可能需要数十秒，请耐心等待"
        style="margin-bottom: 12px"
      />
      <a-list :grid="{ gutter: 12, column: 4 }" :data-source="imageSearchResults">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-card hoverable :body-style="{ padding: '8px' }">
              <template #cover>
                <!-- 点击图片区域：查看图片本身 -->
                <a :href="item.imageUrl" target="_blank" rel="noopener noreferrer">
                  <img :src="item.imageUrl" :alt="item.title ?? '相似图片'" class="search-thumb" />
                </a>
              </template>
              <a-card-meta>
                <template #description>{{ item.title ?? '-' }}</template>
              </a-card-meta>
              <template #actions>
                <!-- 仅百度结果有来源页；阿里结果无 sourceUrl，不展示该入口 -->
                <a v-if="item.sourceUrl" :href="item.sourceUrl" target="_blank" rel="noopener noreferrer">
                  查看来源
                </a>
                <span v-else class="no-source">无来源页</span>
              </template>
            </a-card>
          </a-list-item>
        </template>
      </a-list>
      <a-empty v-if="searched && !imageSearchLoading && !imageSearchResults.length" description="未找到相似图片" />
    </a-modal>

    <!-- 分享弹窗 -->
    <SharePictureModal v-model:open="shareOpen" :url="shareUrl" />

    <!-- AI 编辑弹窗 -->
    <AiImageEditModal
      v-model:open="aiEditOpen"
      :picture="picture"
      :allow-replace="!!picture.spaceId"
      @saved="onAiEditSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  RobotOutlined,
  SearchOutlined,
  ShareAltOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { deletePicture, getPictureVOById, searchPictureByPicture } from '@/api/pictureController'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { downloadImage, formatSize } from '@/utils'
import AiImageEditModal from '@/components/AiImageEditModal.vue'
import SharePictureModal from '@/components/SharePictureModal.vue'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const picture = ref<API.PictureVO>({ id: '' })
const loading = ref(true)

/** 是否已登录 */
const isLoggedIn = computed(() => {
  const loginUser = loginUserStore.loginUser
  return !!loginUser.id && loginUser.userRole !== 'notLogin'
})

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
  router.push(`/picture/edit/${picture.value.id}`)
}

/** 删除图片 */
const doDelete = async () => {
  try {
    const res = await deletePicture({ id: picture.value.id })
    if (res.data.code === 0) {
      message.success('删除成功')
      // 空间图删完回到它所属的空间列表，公共图库才回首页
      const spaceId = picture.value.spaceId
      router.push(spaceId ? `/space/${spaceId}` : '/')
    } else {
      message.error('删除失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('删除失败：' + (e?.message ?? '网络错误'))
  }
}

// ===== 以图搜图 =====
const showImageSearchModal = ref(false)
const imageSearchLoading = ref(false)
const imageSearchResults = ref<API.ImageSearchResult[]>([])
const searched = ref(false)

const openImageSearch = () => {
  imageSearchResults.value = []
  searched.value = false
  showImageSearchModal.value = true
}

const doImageSearch = async () => {
  imageSearchLoading.value = true
  searched.value = false
  try {
    const res = await searchPictureByPicture({ pictureId: picture.value.id })
    if (res.data.code === 0) {
      imageSearchResults.value = res.data.data ?? []
    } else {
      message.error('以图搜图失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('以图搜图失败：' + (e?.message ?? '网络错误'))
  } finally {
    imageSearchLoading.value = false
    searched.value = true
  }
}

// ===== 分享 =====
const shareOpen = ref(false)
const shareUrl = ref('')

const openShare = () => {
  shareUrl.value = `${window.location.origin}/picture/${picture.value.id}`
  shareOpen.value = true
}

// ===== AI 编辑 =====
const aiEditOpen = ref(false)

const onAiEditSaved = (payload: { picture?: API.PictureVO; replaced: boolean }) => {
  if (payload.replaced || !payload.picture?.id) {
    fetchPicture()
    return
  }
  router.push(`/picture/${payload.picture.id}`)
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

/* a-row 默认会把两列拉到同高，图片贴在列顶会空出一片；这里只让图片所在列内部居中，
   右列仍保持顶部对齐。竖图时左列被撑高，居中没有位移，等于无副作用 */
.image-col {
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-thumb {
  width: 100%;
  height: 140px;
  object-fit: contain;
  background: var(--color-bg-subtle);
}

.search-tip {
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.no-source {
  color: var(--color-text-disabled);
}
</style>
