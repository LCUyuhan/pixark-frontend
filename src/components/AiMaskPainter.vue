<template>
  <div class="mask-painter">
    <a-alert v-if="errorText" type="error" show-icon :message="errorText" class="paint-error">
      <template #action>
        <a-button size="small" @click="loadBaseImage">重试</a-button>
      </template>
    </a-alert>

    <a-spin :spinning="loading" tip="底图加载中…">
      <div v-if="baseImage?.dataUrl" class="paint-body" :class="{ 'is-disabled': disabled }">
        <div class="paint-stage">
          <img :src="baseImage.dataUrl" alt="待涂抹的底图" class="stage-base" />
          <canvas
            ref="canvasRef"
            :width="baseImage.picWidth"
            :height="baseImage.picHeight"
            class="stage-canvas"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          />
        </div>
        <div class="paint-tools">
          <a-radio-group
            v-model:value="brushRatio"
            size="small"
            option-type="button"
            button-style="solid"
            :options="AI_EDIT_BRUSH_OPTIONS"
          />
          <a-button size="small" :disabled="!strokes.length" @click="undo">撤销</a-button>
          <a-button size="small" :disabled="!strokes.length" @click="clearAll">清空</a-button>
          <span class="paint-size">
            已涂抹 {{ strokes.length }} 笔，蒙版 {{ baseImage.picWidth }} × {{ baseImage.picHeight }}
          </span>
        </div>
        <div class="paint-tip">
          按住拖动即可涂抹，涂到的地方就是要改的区域。导出的蒙版是黑白图（白=待编辑、黑=保留），分辨率与原图一致，接口要求如此。
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { getAiImageEditBaseImage } from '@/api/pictureController'
import { AI_EDIT_BRUSH_OPTIONS, AI_EDIT_DEFAULT_BRUSH } from '@/constants/aiImageEdit'

type Point = { x: number; y: number }

const props = defineProps<{
  pictureId: number | string
  disabled?: boolean
}>()

/** 黑白蒙版的 data URL，未涂抹时为空串。具名 model，父组件用 v-model:mask 绑定 */
const mask = defineModel<string>('mask', { default: '' })

const canvasRef = ref<HTMLCanvasElement>()
const baseImage = ref<API.AiImageEditBaseImageVO>()
const loading = ref(false)
const errorText = ref('')
const brushRatio = ref<number>(AI_EDIT_DEFAULT_BRUSH)
const strokes = ref<Point[][]>([])

let drawing = false
let currentStroke: Point[] = []

/** 笔刷直径按原图宽度换算，小图大图手感一致 */
const brushSize = () => {
  const width = baseImage.value?.picWidth ?? 512
  return Math.max(6, Math.round(width * brushRatio.value))
}

/**
 * 画布内部坐标始终是原图像素，指针事件是 CSS 像素，必须按矩形比例换算
 */
const toCanvasPoint = (event: PointerEvent): Point => {
  const canvas = canvasRef.value
  const rect = canvas?.getBoundingClientRect()
  if (!canvas || !rect || !rect.width || !rect.height) {
    return { x: 0, y: 0 }
  }
  return {
    x: (event.clientX - rect.left) / rect.width * canvas.width,
    y: (event.clientY - rect.top) / rect.height * canvas.height,
  }
}

const paintPath = (
  ctx: CanvasRenderingContext2D,
  points: Point[],
  style: string,
  alpha: number,
  size: number,
) => {
  if (!points.length) return
  ctx.save()
  ctx.strokeStyle = style
  ctx.fillStyle = style
  ctx.globalAlpha = alpha
  ctx.lineWidth = size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (points.length === 1) {
    ctx.beginPath()
    ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y))
    ctx.stroke()
  }
  ctx.restore()
}

const renderDisplay = () => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const size = brushSize()
  strokes.value.forEach((stroke) => paintPath(ctx, stroke, '#ff4d8d', 0.6, size))
  if (currentStroke.length) {
    paintPath(ctx, currentStroke, '#ff4d8d', 0.6, size)
  }
}

/** 导出接口要求的黑白蒙版：整幅涂黑后再用纯白画涂抹轨迹 */
const exportMask = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  if (!strokes.value.length) {
    mask.value = ''
    return
  }
  const offscreen = document.createElement('canvas')
  offscreen.width = canvas.width
  offscreen.height = canvas.height
  const ctx = offscreen.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, offscreen.width, offscreen.height)
  const size = brushSize()
  strokes.value.forEach((stroke) => paintPath(ctx, stroke, '#ffffff', 1, size))
  mask.value = offscreen.toDataURL('image/png')
}

const onPointerDown = (event: PointerEvent) => {
  if (props.disabled || !canvasRef.value) return
  drawing = true
  currentStroke = [toCanvasPoint(event)]
  canvasRef.value.setPointerCapture(event.pointerId)
  renderDisplay()
}

const onPointerMove = (event: PointerEvent) => {
  if (!drawing) return
  currentStroke.push(toCanvasPoint(event))
  renderDisplay()
}

const onPointerUp = () => {
  if (!drawing) return
  drawing = false
  strokes.value.push(currentStroke)
  currentStroke = []
  renderDisplay()
  exportMask()
}

const undo = () => {
  strokes.value.pop()
  renderDisplay()
  exportMask()
}

const clearAll = () => {
  strokes.value = []
  currentStroke = []
  renderDisplay()
  exportMask()
}

const loadBaseImage = async () => {
  if (!props.pictureId) return
  loading.value = true
  errorText.value = ''
  try {
    const res = await getAiImageEditBaseImage({ pictureId: props.pictureId })
    baseImage.value = res.data.data
    clearAll()
  } catch (e: any) {
    baseImage.value = undefined
    errorText.value = '底图加载失败：' + (e?.message ?? '网络异常')
  } finally {
    loading.value = false
  }
}

// 底图是 data URI（同源数据），轨迹只画在独立画布上，导出时不读像素，不会触发跨域污染
watch(
  () => props.pictureId,
  () => loadBaseImage(),
)

onMounted(() => {
  loadBaseImage()
})
</script>

<style scoped>
.mask-painter {
  margin-bottom: 8px;
}

.paint-error {
  margin-bottom: 12px;
}

.paint-body.is-disabled {
  pointer-events: none;
  opacity: 0.6;
}

.paint-stage {
  position: relative;
  display: inline-block;
  max-width: 100%;
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  background: var(--color-bg-subtle);
}

.stage-base {
  display: block;
  max-width: 100%;
  max-height: 360px;
}

.stage-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}

.paint-tools {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.paint-size {
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.paint-tip {
  margin-top: 8px;
  color: var(--color-text-tertiary);
  font-size: 12px;
  line-height: 1.6;
}
</style>
