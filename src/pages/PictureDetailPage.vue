<template>
  <div class="picture-detail-page">
    <a-spin :spinning="loading">
      <div class="detail-layout">
        <!-- 图片展示：浅灰底衬，竖图横图都居中完整显示 -->
        <div class="image-panel">
          <a-image :src="picture.url" :alt="picture.name" class="detail-image" />
        </div>

        <!-- 图片信息 -->
        <div class="info-panel">
          <h1 class="pic-name">{{ picture.name || '未命名' }}</h1>
          <p class="pic-intro">{{ picture.introduction || '暂无简介' }}</p>

          <div class="uploader">
            <a-avatar :size="28" :src="picture.user?.userAvatar">
              {{ picture.user?.userName?.[0] ?? picture.user?.userAccount?.[0] }}
            </a-avatar>
            <span class="uploader-name">{{ picture.user?.userName ?? picture.user?.userAccount ?? '-' }}</span>
            <span class="uploader-dot">·</span>
            <span class="uploader-time">
              {{ picture.createTime ? dayjs(picture.createTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
            </span>
          </div>

          <div v-if="picture.category || picture.tags?.length" class="tags">
            <a-tag v-if="picture.category">{{ picture.category }}</a-tag>
            <a-tag v-for="tag in picture.tags ?? []" :key="tag">{{ tag }}</a-tag>
          </div>

          <dl class="meta-grid">
            <div class="meta-item">
              <dt>格式</dt>
              <dd>{{ picture.picFormat ?? '-' }}</dd>
            </div>
            <div class="meta-item">
              <dt>尺寸</dt>
              <dd>{{ picture.picWidth ?? '-' }} × {{ picture.picHeight ?? '-' }}</dd>
            </div>
            <div class="meta-item">
              <dt>大小</dt>
              <dd>{{ formatSize(picture.picSize) }}</dd>
            </div>
          </dl>

          <!-- 操作按钮 -->
          <a-space class="actions" wrap>
            <!-- 下载：所有用户可用，直接从对象存储 URL 下载 -->
            <a-button type="primary" size="large" @click="doDownload">
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
        </div>
      </div>
    </a-spin>

    <!-- 以图搜图弹窗 -->
    <a-modal v-model:open="showImageSearchModal" title="以图搜图（全网相似图片）" width="760px" :footer="null">
      <a-space style="margin-bottom: 12px" wrap>
        <a-button type="primary" :loading="imageSearchPhase === 'polling'" @click="doImageSearch">开始搜索</a-button>
        <a-button v-if="imageSearchTaskId && imageSearchPhase === 'failed'" @click="startImageSearchPolling">
          继续查询
        </a-button>
        <span class="search-tip">走百度识图，任务在服务端排队串行执行，可能需要数十秒</span>
      </a-space>
      <a-alert
        v-if="imageSearchPhase === 'polling'"
        type="info"
        show-icon
        :message="`${imageSearchStatusText}，已等待 ${waitedSeconds} 秒`"
        style="margin-bottom: 12px"
      />
      <a-alert
        v-else-if="imageSearchPhase === 'failed'"
        type="error"
        show-icon
        :message="imageSearchError"
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
      <a-empty v-if="imageSearchPhase === 'done' && !imageSearchResults.length" description="未找到相似图片" />
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
import { createImageSearchTask, deletePicture, getImageSearchTask, getPictureVOById } from '@/api/pictureController'
import { IMAGE_SEARCH_POLL_INTERVAL_MS, IMAGE_SEARCH_POLL_MAX_TIMES, IMAGE_SEARCH_TASK_STATUS } from '@/constants/imageSearch'
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

// ===== 以图搜图：提交任务 + 轮询（消费者串行爬取，排队是常态）=====
const showImageSearchModal = ref(false)
/** idle 未开始 / polling 等结果 / done 已出结果 / failed 失败或等待超时 */
const imageSearchPhase = ref<'idle' | 'polling' | 'done' | 'failed'>('idle')
const imageSearchTaskId = ref('')
const imageSearchStatusText = ref('')
const imageSearchError = ref('')
const imageSearchResults = ref<API.ImageSearchResult[]>([])
let imageSearchPollTimes = 0
let imageSearchTimer: number | undefined

const waitedSeconds = computed(() => Math.round((imageSearchPollTimes * IMAGE_SEARCH_POLL_INTERVAL_MS) / 1000))

const stopImageSearchPolling = () => {
  if (imageSearchTimer !== undefined) {
    window.clearTimeout(imageSearchTimer)
    imageSearchTimer = undefined
  }
}

const openImageSearch = () => {
  stopImageSearchPolling()
  imageSearchResults.value = []
  imageSearchPhase.value = 'idle'
  imageSearchTaskId.value = ''
  imageSearchError.value = ''
  imageSearchStatusText.value = ''
  showImageSearchModal.value = true
}

/** @returns 任务是否已结束（成功或失败），结束就停止轮询 */
const applyImageSearchTask = (task?: API.ImageSearchTaskVO) => {
  if (!task) return false
  if (task.taskStatus === IMAGE_SEARCH_TASK_STATUS.SUCCEEDED) {
    stopImageSearchPolling()
    imageSearchResults.value = task.results ?? []
    imageSearchPhase.value = 'done'
    return true
  }
  if (task.taskStatus === IMAGE_SEARCH_TASK_STATUS.FAILED) {
    stopImageSearchPolling()
    imageSearchError.value = task.failReason ?? '搜索失败，请稍后重试'
    imageSearchPhase.value = 'failed'
    return true
  }
  imageSearchStatusText.value = task.statusText ?? '排队中'
  return false
}

const runImageSearchPoll = async () => {
  imageSearchTimer = undefined
  if (imageSearchPhase.value !== 'polling' || !imageSearchTaskId.value) return
  imageSearchPollTimes += 1
  try {
    const res = await getImageSearchTask({ taskId: imageSearchTaskId.value })
    if (res.data.code !== 0) throw new Error(res.data.message)
    if (applyImageSearchTask(res.data.data)) return
  } catch (e: any) {
    stopImageSearchPolling()
    imageSearchError.value = '查询进度失败：' + (e?.message ?? '网络异常')
    imageSearchPhase.value = 'failed'
    return
  }
  if (imageSearchPollTimes >= IMAGE_SEARCH_POLL_MAX_TIMES) {
    stopImageSearchPolling()
    imageSearchError.value = `已等待 ${waitedSeconds.value} 秒仍未出结果，任务可能还在排队，点「继续查询」可接着看`
    imageSearchPhase.value = 'failed'
    return
  }
  imageSearchTimer = window.setTimeout(runImageSearchPoll, IMAGE_SEARCH_POLL_INTERVAL_MS)
}

const startImageSearchPolling = () => {
  imageSearchPollTimes = 0
  imageSearchError.value = ''
  imageSearchStatusText.value = '排队中'
  imageSearchPhase.value = 'polling'
  imageSearchTimer = window.setTimeout(runImageSearchPoll, IMAGE_SEARCH_POLL_INTERVAL_MS)
}

const doImageSearch = async () => {
  try {
    const res = await createImageSearchTask({ pictureId: picture.value.id })
    if (res.data.code !== 0 || !res.data.data) throw new Error(res.data.message || '任务创建失败')
    imageSearchTaskId.value = res.data.data.taskId
    // 命中结果缓存时后端直接返回已完成任务，不用轮询
    if (applyImageSearchTask(res.data.data)) return
    startImageSearchPolling()
  } catch (e: any) {
    message.error('以图搜图失败：' + (e?.message ?? '网络错误'))
  }
}

// 关掉弹窗只是停止轮询，任务还在队列里跑；重新打开点「继续查询」能接着看
watch(showImageSearchModal, opened => {
  if (!opened) stopImageSearchPolling()
})

onBeforeUnmount(stopImageSearchPolling)

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

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  gap: 32px;
  align-items: start;
}

/* 图片落在浅灰底衬上：不加白卡片外壳，图本身就是视觉中心 */
.image-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  padding: 24px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-subtle);
}

.detail-image {
  max-width: 100%;
  max-height: 72vh;
}

.detail-image :deep(img) {
  border-radius: var(--radius-md);
}

/* ---- 信息列 ---- */
.pic-name {
  margin: 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  color: var(--color-text);
  word-break: break-all;
}

.pic-intro {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.8;
  color: var(--color-text-secondary);
  word-break: break-all;
}

.uploader {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.uploader-name {
  font-weight: 500;
  color: var(--color-text);
}

.uploader-dot,
.uploader-time {
  color: var(--color-text-tertiary);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 16px;
}

/* 三格元数据：标签小字 + 值，不用带边框的描述列表 */
.meta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 20px 0 0;
  padding: 16px 0;
  border-top: 1px solid var(--color-border-secondary);
  border-bottom: 1px solid var(--color-border-secondary);
}

.meta-item dt {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.meta-item dd {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--color-text);
}

.actions {
  margin-top: 20px;
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

/* 移动端：单列，图片在上 */
@media (max-width: 768px) {
  .detail-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .image-panel {
    min-height: 0;
    padding: 12px;
  }

  .detail-image {
    max-height: 56vh;
  }

  .pic-name {
    font-size: 20px;
    line-height: 28px;
  }
}
</style>
