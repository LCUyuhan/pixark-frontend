<template>
  <a-modal
    :open="open"
    title="分享图片"
    :footer="null"
    :width="modalWidth"
    @cancel="close"
  >
    <div class="share-body">
      <div class="card-shell">
        <img
          v-if="cardUrl"
          :src="cardUrl"
          alt="PixArk 云图库分享卡片"
          class="share-card"
        />
        <div v-else class="card-loading">
          {{ generating ? '正在生成分享图…' : '分享图生成失败，可直接复制下方链接' }}
        </div>
      </div>

      <div class="link-box" :title="url">
        <input
          class="link-text"
          :value="url"
          readonly
          aria-label="分享链接"
          @focus="selectLink"
        />
        <button type="button" class="copy-btn" @click="doCopy">复制链接</button>
      </div>

      <a-button block :loading="saving" :disabled="!cardBlob" @click="saveCard">
        保存分享图
      </a-button>

      <p class="share-hint">扫码可打开图片详情；保存后可作为一张图片直接分享。</p>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { saveAs } from 'file-saver'
import QRCode from 'qrcode'
import { onBeforeUnmount, ref, watch } from 'vue'

interface Props {
  open: boolean
  /** 分享链接 */
  url: string
}

const props = defineProps<Props>()
const emit = defineEmits(['update:open'])

const modalWidth = 'min(600px, 92vw)'
const brandImage = `${import.meta.env.BASE_URL}brand/og-card.jpg`

const generating = ref(false)
const saving = ref(false)
const cardUrl = ref('')
const cardBlob = ref<Blob | null>(null)

let cardObjectUrl: string | null = null
let generation = 0

const close = () => {
  emit('update:open', false)
}

const selectLink = (event: Event) => {
  ;(event.target as HTMLInputElement).select()
}

const copyText = async (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // 浏览器拒绝 Clipboard API 时继续走 execCommand 兜底
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, text.length)

  const copied = typeof document.execCommand === 'function' && document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) {
    throw new Error('copy failed')
  }
}

const doCopy = async () => {
  try {
    await copyText(props.url)
    message.success('链接已复制')
  } catch {
    message.error('复制失败，请选中链接手动复制')
  }
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`图片加载失败：${src}`))
    image.src = src
  })

const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (ctx.measureText(text).width <= maxWidth) {
    return text
  }
  let result = text
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1)
  }
  return `${result}…`
}

const drawUrl = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
) => {
  let fontSize = 22
  const fontFamily = '"PingFang SC", "Microsoft YaHei", sans-serif'
  while (fontSize > 15) {
    ctx.font = `400 ${fontSize}px ${fontFamily}`
    if (ctx.measureText(text).width <= maxWidth) {
      break
    }
    fontSize -= 1
  }
  ctx.fillText(fitText(ctx, text, maxWidth), x, y)
}

const buildShareCard = async () => {
  const current = ++generation
  if (!props.url) {
    return
  }

  generating.value = true
  cardBlob.value = null
  if (cardObjectUrl) {
    URL.revokeObjectURL(cardObjectUrl)
    cardObjectUrl = null
  }
  cardUrl.value = ''

  try {
    const [brand, qrDataUrl] = await Promise.all([
      loadImage(brandImage),
      QRCode.toDataURL(props.url, {
        width: 420,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#17191d', light: '#ffffff' },
      }),
    ])
    if (current !== generation) {
      return
    }

    const qr = await loadImage(qrDataUrl)
    if (current !== generation) {
      return
    }

    const cardWidth = 1200
    const bannerHeight = 630
    const footerHeight = 250
    const cardHeight = bannerHeight + footerHeight
    const padding = 48
    const qrSize = 210
    const qrX = padding
    const qrY = bannerHeight + (footerHeight - qrSize) / 2
    const textX = qrX + qrSize + 36
    const textMaxWidth = cardWidth - textX - padding
    const fontFamily = '"PingFang SC", "Microsoft YaHei", sans-serif'

    const canvas = document.createElement('canvas')
    canvas.width = cardWidth
    canvas.height = cardHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法创建画布')
    }

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, cardWidth, cardHeight)
    ctx.drawImage(brand, 0, 0, cardWidth, bannerHeight)

    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize)
    ctx.strokeStyle = '#e6e7e9'
    ctx.lineWidth = 2
    ctx.strokeRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2)

    ctx.fillStyle = '#17191d'
    ctx.font = `600 36px ${fontFamily}`
    ctx.fillText('PixArk 云图库', textX, bannerHeight + 76)

    ctx.fillStyle = '#737780'
    ctx.font = `400 24px ${fontFamily}`
    ctx.fillText('扫码查看这张图片', textX, bannerHeight + 124)

    ctx.fillStyle = '#17191d'
    drawUrl(
      ctx,
      props.url.replace(/^https?:\/\//, ''),
      textX,
      bannerHeight + 176,
      textMaxWidth,
    )

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })
    if (!blob) {
      throw new Error('分享图生成失败')
    }
    if (current !== generation) {
      return
    }

    cardObjectUrl = URL.createObjectURL(blob)
    cardUrl.value = cardObjectUrl
    cardBlob.value = blob
  } catch {
    if (current === generation) {
      message.error('分享图生成失败，可直接复制下方链接')
    }
  } finally {
    if (current === generation) {
      generating.value = false
    }
  }
}

const saveCard = () => {
  if (!cardBlob.value) {
    return
  }
  saving.value = true
  try {
    saveAs(cardBlob.value, `pixark-share-${Date.now()}.png`)
    message.success('分享图已保存')
  } catch {
    message.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

watch(
  () => [props.open, props.url] as const,
  ([open]) => {
    if (open) {
      void buildShareCard()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  generation += 1
  if (cardObjectUrl) {
    URL.revokeObjectURL(cardObjectUrl)
  }
})
</script>

<style scoped>
.share-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 4px 0 0;
}

.card-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 220px;
  overflow: hidden;
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  background: #ffffff;
  line-height: 0;
}

.share-card {
  display: block;
  width: 100%;
  height: auto;
}

.card-loading {
  padding: 70px 16px;
  color: var(--color-text-tertiary);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
}

.link-box {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 42px;
  padding: 0 4px 0 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}

.link-text {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  overflow: hidden;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-btn {
  flex: none;
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-bg-container);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.copy-btn:hover {
  opacity: 0.82;
}

.copy-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.share-hint {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .copy-btn {
    transition: none;
  }
}
</style>
