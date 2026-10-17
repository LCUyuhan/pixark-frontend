<template>
  <a-modal :open="open" title="分享图片" :footer="null" width="400px" @cancel="close">
    <div class="share-body">
      <div class="qr-wrapper">
        <div class="qr-frame">
          <a-qrcode :value="url" :size="160" />
        </div>
        <div class="qr-tip">移动端扫码查看</div>
      </div>
      <!-- 链接与复制按钮收进同一个描边容器，高度统一，长链接省略号处理 -->
      <div class="link-box" :title="url">
        <span class="link-text">{{ url }}</span>
        <button type="button" class="copy-btn" @click="doCopy">复制链接</button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'

interface Props {
  open: boolean
  /** 分享链接 */
  url: string
}

const props = defineProps<Props>()
const emit = defineEmits(['update:open'])

const close = () => {
  emit('update:open', false)
}

const doCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.url)
    message.success('链接已复制')
  } catch {
    message.error('复制失败，请手动选择链接复制')
  }
}
</script>

<style scoped>
.share-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 8px 0 4px;
}

.qr-wrapper {
  text-align: center;
}

.qr-frame {
  display: inline-block;
  padding: 10px;
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  background: #ffffff;
  line-height: 0;
}

.qr-tip {
  margin-top: 8px;
  color: var(--color-text-tertiary);
  font-size: 12px;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.copy-btn {
  flex: none;
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-bg-container);
  font-size: 13px;
  font-family: inherit;
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

@media (prefers-reduced-motion: reduce) {
  .copy-btn {
    transition: none;
  }
}
</style>
