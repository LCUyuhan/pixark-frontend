<template>
  <div class="url-picture-upload">
    <a-input-group compact>
      <a-input
        v-model:value="fileUrl"
        style="width: calc(100% - 120px)"
        placeholder="请输入图片 URL"
        allow-clear
      />
      <a-button type="primary" :loading="loading" style="width: 120px" @click="handleUpload">
        提交
      </a-button>
    </a-input-group>
    <div class="img-wrapper">
      <img v-if="picture?.url" :src="picture.url" alt="picture" class="preview-image" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { uploadPictureByUrl } from '@/api/pictureController'

interface Props {
  /** 已有图片（编辑/重新上传场景） */
  picture?: API.PictureVO
  /** 上传成功回调 */
  onSuccess?: (newPicture: API.PictureVO) => void
  /** 目标空间 id（上传到私有空间时传入） */
  spaceId?: number | string
}

const props = withDefaults(defineProps<Props>(), {})

const fileUrl = ref<string>()
const loading = ref(false)

/** 通过 URL 上传：调用后端 /picture/upload/url */
const handleUpload = async () => {
  if (!fileUrl.value) {
    message.warning('请输入图片 URL')
    return
  }
  loading.value = true
  try {
    // 重新上传时携带已有图片 id，上传到空间时携带 spaceId
    const res = await uploadPictureByUrl({
      fileUrl: fileUrl.value,
      id: props.picture?.id,
      spaceId: props.spaceId,
    })
    if (res.data.code === 0 && res.data.data) {
      message.success('图片上传成功')
      props.onSuccess?.(res.data.data)
      fileUrl.value = ''
    } else {
      message.error('图片上传失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('图片上传失败：' + (e?.message ?? '网络错误'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.url-picture-upload {
  margin-bottom: 16px;
}

.img-wrapper {
  margin-top: 16px;
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 320px;
}
</style>
