<template>
  <a-modal
    :open="open"
    title="调整头像显示区域"
    width="560px"
    ok-text="应用裁剪"
    cancel-text="取消"
    destroy-on-close
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="cropper-wrapper">
      <img ref="imgRef" :src="src" alt="头像裁剪" />
    </div>
    <div class="cropper-tip">拖动移动图片，滚轮缩放；选框固定正方形，裁剪输出 256×256</div>
  </a-modal>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

interface Props {
  open: boolean
  /** 待裁剪图片地址（本地 objectURL） */
  src: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'crop', blob: Blob): void
}>()

const imgRef = ref<HTMLImageElement>()
let cropper: Cropper | null = null

// 弹窗打开时初始化裁剪器（destroy-on-close 保证每次都是新 img 节点）
watch(
  () => props.open,
  (open) => {
    if (open) {
      setTimeout(() => {
        if (!imgRef.value) return
        cropper?.destroy()
        cropper = new Cropper(imgRef.value, {
          aspectRatio: 1,
          viewMode: 1,
          dragMode: 'move',
          autoCropArea: 0.9,
          rotatable: false,
          background: false,
        })
      }, 100)
    } else {
      cropper?.destroy()
      cropper = null
    }
  },
)

const handleOk = () => {
  if (!cropper) {
    emit('update:open', false)
    return
  }
  cropper.getCroppedCanvas({ width: 256, height: 256 }).toBlob(
    (blob) => {
      if (blob) {
        emit('crop', blob)
        emit('update:open', false)
      } else {
        message.error('裁剪失败，请重试')
      }
    },
    'image/jpeg',
    0.92,
  )
}

const handleCancel = () => {
  emit('update:open', false)
}

onBeforeUnmount(() => {
  cropper?.destroy()
  cropper = null
})
</script>

<style scoped>
.cropper-wrapper {
  height: 400px;
}

.cropper-wrapper img {
  max-width: 100%;
  display: block;
}

.cropper-tip {
  margin-top: 8px;
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
