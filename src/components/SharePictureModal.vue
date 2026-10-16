<template>
  <a-modal :open="open" title="分享图片" :footer="null" width="420px" @cancel="close">
    <div class="share-body">
      <div class="qr-wrapper">
        <a-qrcode :value="url" size="180" />
        <div class="qr-tip">移动端扫码查看</div>
      </div>
      <div class="link-row">
        <a-input :value="url" read-only />
        <a-button type="primary" @click="doCopy">复制链接</a-button>
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
  gap: 16px;
}

.qr-wrapper {
  text-align: center;
}

.qr-tip {
  margin-top: 4px;
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.link-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
</style>
