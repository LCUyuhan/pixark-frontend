<template>
  <div class="picture-upload">
    <a-upload-dragger
      :show-upload-list="false"
      :custom-request="doUpload"
      :before-upload="beforeUpload"
      accept="image/*"
    >
      <template v-if="picture?.url">
        <img :src="picture.url" alt="picture" class="preview-image" />
      </template>
      <template v-else>
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">点击或拖拽图片到此处上传</p>
        <p class="ant-upload-hint">仅支持图片格式，大小不超过 {{ MAX_SIZE_MB }}MB</p>
      </template>
    </a-upload-dragger>
    <div v-if="picture?.url" class="tips">点击或拖拽可重新上传替换图片</div>
    <!-- 编辑源是用户本地那份文件，走 URL 上传时父组件会把它清掉，所以这里没有 file 就不显示入口 -->
    <div v-if="file" class="actions">
      <a-button size="small" :disabled="loading" @click="showEditModal = true">
        <template #icon><EditOutlined /></template>
        编辑图片
      </a-button>
      <span class="actions-tip">支持裁剪、旋转</span>
    </div>

    <BasicEditModal v-model:open="showEditModal" :file="file" @confirm="onEditConfirm" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { EditOutlined, InboxOutlined } from '@ant-design/icons-vue'
import BasicEditModal from '@/components/BasicEditModal.vue'
import { uploadPicture } from '@/api/pictureController'

// 与后端 FilePictureUpload.validPicture 的限制保持一致
const MAX_SIZE_MB = 5

interface Props {
  /** 已有图片（编辑/重新上传场景） */
  picture?: API.PictureVO
  /** 上传成功回调 */
  onSuccess?: (newPicture: API.PictureVO) => void
  /** 目标空间 id（上传到私有空间时传入） */
  spaceId?: number | string
  /** 本地待编辑文件，由父组件持有（便于在切到 URL 上传时清空） */
  file?: File
  /** 选中本地文件后回传，让父组件存下来当编辑源 */
  onFileSelect?: (file: File) => void
}

const props = withDefaults(defineProps<Props>(), {})

const loading = ref(false)
const showEditModal = ref(false)

/** 上传前校验 */
const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    message.error('仅支持上传图片文件')
    return false
  }
  if (file.size / 1024 / 1024 > MAX_SIZE_MB) {
    message.error(`图片大小不能超过 ${MAX_SIZE_MB}MB`)
    return false
  }
  return true
}

/** 调后端 /picture/upload；带 id 即替换，带 spaceId 即上传到空间 */
const uploadFile = async (file: File, onError?: (e: unknown) => void) => {
  loading.value = true
  try {
    const res = await uploadPicture({ id: props.picture?.id, spaceId: props.spaceId }, file)
    if (res.data.code === 0 && res.data.data) {
      message.success('图片上传成功')
      props.onSuccess?.(res.data.data)
    } else {
      message.error('图片上传失败：' + res.data.message)
      onError?.(res.data)
    }
  } catch (e: any) {
    message.error('图片上传失败：' + (e?.message ?? '网络错误'))
    onError?.(e)
  } finally {
    loading.value = false
  }
}

/** 自定义上传入口 */
const doUpload = async (options: { file: File; onError?: (e: unknown) => void }) => {
  props.onFileSelect?.(options.file)
  await uploadFile(options.file, options.onError)
}

/** 裁剪/旋转后导出的是新文件：走同一条替换上传链路，并把它变成新的编辑源 */
const onEditConfirm = async (edited: File) => {
  props.onFileSelect?.(edited)
  await uploadFile(edited)
}
</script>

<style scoped>
.picture-upload :deep(.ant-upload-wrapper .ant-upload-drag) {
  padding: 8px;
}

.preview-image {
  max-width: 100%;
  max-height: 320px;
  margin: 0 auto;
  display: block;
}

.tips {
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  margin-top: 8px;
}

.actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.actions-tip {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
