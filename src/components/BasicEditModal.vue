<template>
  <a-modal
    :open="open"
    title="编辑图片"
    width="760px"
    ok-text="应用编辑"
    cancel-text="取消"
    :confirm-loading="exporting"
    destroy-on-close
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="toolbar">
      <a-radio-group v-model:value="ratioKey" button-style="solid" size="small" @change="applyRatio">
        <a-radio-button v-for="r in RATIOS" :key="r.key" :value="r.key">{{ r.label }}</a-radio-button>
      </a-radio-group>
      <a-space :size="8">
        <a-button size="small" @click="rotate(-90)">
          <template #icon><RotateLeftOutlined /></template>
          左转
        </a-button>
        <a-button size="small" @click="rotate(90)">
          <template #icon><RotateRightOutlined /></template>
          右转
        </a-button>
        <a-button size="small" @click="reset">重置</a-button>
      </a-space>
    </div>

    <div class="cropper-wrapper">
      <img v-if="imgSrc" ref="imgRef" :src="imgSrc" alt="待编辑图片" />
    </div>

    <div class="cropper-tip">
      拖动移动图片，滚轮缩放，拉选框四角调整裁剪范围；确认后重新上传，会替换当前图片并重新走一次审核
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { RotateLeftOutlined, RotateRightOutlined } from '@ant-design/icons-vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

interface Props {
  open: boolean
  /** 编辑源：用户本地选中的那份文件（同源，避开 COS 跨域导致 canvas 无法导出） */
  file?: File
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  /** 导出后的新文件，交给上传组件走既有的替换上传链路 */
  (e: 'confirm', file: File): void
}>()

// 与后端 FilePictureUpload.validPicture 的限制保持一致
const MAX_SIZE_MB = 5
// 证件照常用比例：一寸 295×413、二寸 413×579 都是 5:7
const RATIOS = [
  { key: 'free', label: '自由', value: NaN },
  { key: '1:1', label: '1:1', value: 1 },
  { key: '5:7', label: '5:7', value: 5 / 7 },
  { key: '3:4', label: '3:4', value: 3 / 4 },
  { key: '16:9', label: '16:9', value: 16 / 9 },
] as const

const imgRef = ref<HTMLImageElement>()
const imgSrc = ref('')
const ratioKey = ref<string>('free')
const exporting = ref(false)

let cropper: Cropper | null = null

const destroyCropper = () => {
  cropper?.destroy()
  cropper = null
  if (imgSrc.value) {
    URL.revokeObjectURL(imgSrc.value)
    imgSrc.value = ''
  }
}

// 弹窗打开时基于本地文件建 objectURL 并初始化裁剪器（destroy-on-close 保证每次都是新 img 节点）
watch(
  () => props.open,
  (open) => {
    if (open) {
      if (!props.file) {
        message.warning('请先选择本地图片')
        emit('update:open', false)
        return
      }
      imgSrc.value = URL.createObjectURL(props.file)
      ratioKey.value = 'free'
      setTimeout(() => {
        if (!imgRef.value) return
        cropper?.destroy()
        cropper = new Cropper(imgRef.value, {
          viewMode: 1,
          dragMode: 'move',
          autoCropArea: 0.9,
          background: false,
          checkCrossOrigin: false,
        })
      }, 100)
    } else {
      destroyCropper()
    }
  },
)

const applyRatio = () => {
  const target = RATIOS.find((r) => r.key === ratioKey.value)
  cropper?.setAspectRatio(target ? target.value : NaN)
}

const rotate = (deg: number) => {
  cropper?.rotate(deg)
}

const reset = () => {
  cropper?.reset()
  ratioKey.value = 'free'
  cropper?.setAspectRatio(NaN)
}

const handleOk = () => {
  const source = props.file
  if (!cropper || !source) {
    emit('update:open', false)
    return
  }
  exporting.value = true
  // 保留原格式：PNG 直接导 PNG（透明区域不变黑、线条图不被 JPEG 压糊），其余一律 JPEG
  const isPng = source.type === 'image/png'
  const mime = isPng ? 'image/png' : 'image/jpeg'
  const canvas = cropper.getCroppedCanvas({
    maxWidth: 4096,
    maxHeight: 4096,
    imageSmoothingQuality: 'high',
    // JPEG 不支持透明，先铺白底
    fillColor: isPng ? undefined : '#FFFFFF',
  })
  canvas.toBlob(
    (blob) => {
      exporting.value = false
      if (!blob) {
        message.error('图片导出失败，请重试')
        return
      }
      if (blob.size > MAX_SIZE_MB * 1024 * 1024) {
        message.error(
          `编辑后的图片 ${(blob.size / 1024 / 1024).toFixed(1)}MB 超过 ${MAX_SIZE_MB}MB 限制，请缩小裁剪范围或换一张原图`,
        )
        return
      }
      // 显式给文件名，否则后端从 multipart 里取不到 picName
      emit('confirm', new File([blob], source.name || 'edited.jpg', { type: mime }))
      emit('update:open', false)
    },
    mime,
    0.92,
  )
}

const handleCancel = () => {
  emit('update:open', false)
}

onBeforeUnmount(destroyCropper)
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.cropper-wrapper {
  height: 420px;
  background: var(--color-bg-layout);
}

.cropper-wrapper img {
  max-width: 100%;
  display: block;
}

.cropper-tip {
  margin-top: 8px;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 12px;
}
</style>
