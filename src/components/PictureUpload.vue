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
        <p class="ant-upload-hint">仅支持图片格式，大小不超过 10MB</p>
      </template>
    </a-upload-dragger>
    <div v-if="picture?.url" class="tips">点击或拖拽可重新上传替换图片</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { InboxOutlined } from '@ant-design/icons-vue'
import { uploadPicture } from '@/api/pictureController'

interface Props {
  /** 已有图片（编辑/重新上传场景） */
  picture?: API.PictureVO
  /** 上传成功回调 */
  onSuccess?: (newPicture: API.PictureVO) => void
}

const props = withDefaults(defineProps<Props>(), {})

const loading = ref(false)

/** 上传前校验 */
const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    message.error('仅支持上传图片文件')
    return false
  }
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    message.error('图片大小不能超过 10MB')
    return false
  }
  return true
}

/** 自定义上传：调用后端 /picture/upload */
const doUpload = async (options: { file: File; onError?: (e: unknown) => void }) => {
  loading.value = true
  try {
    // 重新上传时携带已有图片 id
    const res = await uploadPicture({ id: props.picture?.id }, options.file)
    if (res.data.code === 0 && res.data.data) {
      message.success('图片上传成功')
      props.onSuccess?.(res.data.data)
    } else {
      message.error('图片上传失败：' + res.data.message)
      options.onError?.(res.data)
    }
  } catch (e: any) {
    message.error('图片上传失败：' + (e?.message ?? '网络错误'))
    options.onError?.(e)
  } finally {
    loading.value = false
  }
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
</style>
