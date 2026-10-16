<template>
  <div
    class="picture-card"
    :class="{ selected, selectable }"
    :style="{ width: width + 'px' }"
    @click="onClick"
  >
    <div class="cover" :style="{ height: height + 'px' }">
      <!-- 列表一律加载缩略图，无缩略图时回退原图。
           不要加 ?${Date.now()} 之类的缓存串，那会让每次重渲染都重新下一遍图 -->
      <img :src="picture.thumbnailUrl || picture.url" :alt="picture.name" loading="lazy" decoding="async" />

      <a-checkbox
        v-if="selectable"
        class="select-box"
        :checked="selected"
        @click.stop
        @change="onToggle"
      />

      <div v-if="showActions" class="actions" @click.stop>
        <slot name="actions" :picture="picture" />
      </div>
    </div>

    <div class="caption">
      <div class="name" :title="picture.name">{{ picture.name || '未命名' }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  picture: API.PictureVO
  /** 由 justifiedLayout 算出的实际宽度 */
  width: number
  /** 图片区高度，标题区在它下方且高度固定，所以整行仍然对齐 */
  height: number
  selectable?: boolean
  selected?: boolean
  /** 批量模式下隐藏操作按钮，与改造前的行为一致 */
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectable: false,
  selected: false,
  showActions: false,
})

const emit = defineEmits<{ click: [picture: API.PictureVO]; toggleSelect: [id: number | string] }>()

const onClick = () => emit('click', props.picture)

// PictureVO.id 在生成的类型里是可选的，这里挡一下再往外抛，
// 免得 undefined 流进 selectedIds 变成"能勾上一个没有 id 的项"
const onToggle = () => {
  if (props.picture.id !== undefined) {
    emit('toggleSelect', props.picture.id)
  }
}
</script>

<style scoped>
/*
 * 刻意不做卡片外壳（无边框、无填充底）。
 * 一旦给每张图套一个白底描边的盒子，眼睛先看到盒子再看到图，整页就变成"面板阵列"；
 * 花瓣和悦木都是让图直接落在页面底色上，才连成一面图墙。
 */
.picture-card {
  flex: none;
  cursor: pointer;
}

.cover {
  position: relative;
  overflow: hidden;
  display: flex;
  border-radius: 8px;
  background: var(--color-bg-layout);
  transition: box-shadow 0.2s ease;
}

.cover img {
  width: 100%;
  height: 100%;
  /* 瓦片宽高来自图片自身比例，cover 在这里只是兜住取整误差，不会真的裁掉画面 */
  object-fit: cover;
  display: block;
  transition: transform 0.25s ease;
}

.picture-card:hover .cover {
  box-shadow: 0 4px 14px var(--color-shadow-header);
}

.picture-card:hover .cover img {
  /* 在框内轻微放大，替代原来"边框变蓝"的反馈 */
  transform: scale(1.025);
}

/* 选中态只圈图片，不圈下方标题 */
.picture-card.selected .cover {
  box-shadow: 0 0 0 2px var(--color-primary), 0 0 0 5px var(--color-primary-ring);
}

@media (prefers-reduced-motion: reduce) {
  .picture-card:hover .cover img {
    transform: none;
  }
}

.select-box {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  background: var(--color-bg-container);
  border-radius: 4px;
  padding: 2px;
  line-height: 1;
}

.actions {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  gap: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--color-bg-container);
}

/*
 * 标题区不再有卡片底，直接落在页面底色上，所以左内边距归零、和图片左边缘对齐。
 * 这里的数值和 PictureListView 的 CAPTION_HEIGHT 必须一致 —— 行高预留靠它，
 * 差 3px 滚动条就会在行挂载/卸载时跳一下。改这里记得改那边。
 */
.caption {
  padding: 8px 0 0;
}

.name {
  font-size: 13px;
  line-height: 18px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
