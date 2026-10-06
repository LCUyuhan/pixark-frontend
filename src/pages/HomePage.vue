<template>
  <div class="home-page">
    <!-- 搜索框 -->
    <div class="search-bar">
      <a-input-search
        v-model:value="searchParams.searchText"
        placeholder="从海量图片中搜索"
        enter-button="搜索"
        size="large"
        @search="doSearch"
      />
    </div>

    <!-- 分类筛选 -->
    <a-tabs v-model:active-key="activeCategory" @change="doSearch">
      <a-tab-pane key="all" tab="全部" />
      <a-tab-pane v-for="category in categoryList" :key="category" :tab="category" />
    </a-tabs>

    <!-- 标签筛选 -->
    <a-space :size="[0, 8]" wrap style="margin-bottom: 16px">
      <span style="color: rgba(0, 0, 0, 0.65)">标签：</span>
      <a-checkable-tag
        v-for="(tag, index) in tagList"
        :key="tag"
        v-model:checked="selectedTagMap[index]"
        @change="doSearch"
      >
        {{ tag }}
      </a-checkable-tag>
    </a-space>

    <!-- 图片列表 -->
    <a-list
      :grid="{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 5 }"
      :data-source="dataList"
      :loading="loading"
    >
      <template #renderItem="{ item }">
        <a-list-item>
          <a-card hoverable @click="doClickPicture(item)">
            <template #cover>
              <div class="picture-cover">
                <!-- 列表优先加载缩略图（后端上传时已生成 thumbnailUrl），无缩略图时回退原图 -->
                <img :alt="item.name" :src="item.thumbnailUrl || item.url" loading="lazy" />
              </div>
            </template>
            <a-card-meta :title="item.name">
              <template #description>
                <a-space :size="4" wrap>
                  <a-tag v-if="item.category" color="blue">{{ item.category }}</a-tag>
                  <a-tag v-for="tag in item.tags ?? []" :key="tag">{{ tag }}</a-tag>
                </a-space>
              </template>
            </a-card-meta>
          </a-card>
        </a-list-item>
      </template>
    </a-list>

    <!-- 分页 -->
    <a-pagination
      v-model:current="searchParams.current"
      v-model:page-size="searchParams.pageSize"
      :total="total"
      show-less-items
      style="margin-top: 24px; text-align: right"
      @change="fetchData"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { listPictureTagCategory, listPictureVOByPageWithCache } from '@/api/pictureController'

const router = useRouter()

// 查询参数（对应后端 PictureQueryRequest）
const searchParams = reactive<API.PictureQueryRequest>({
  current: 1,
  pageSize: 15,
  sortField: 'createTime',
  sortOrder: 'descend',
})

const dataList = ref<API.PictureVO[]>([])
const total = ref(0)
const loading = ref(false)

// 分类与标签
const categoryList = ref<string[]>([])
const tagList = ref<string[]>([])
const activeCategory = ref<string>('all')
const selectedTagMap = ref<boolean[]>([])

/** 加载标签分类 */
const loadTagCategory = async () => {
  try {
    const res = await listPictureTagCategory()
    if (res.data.code === 0 && res.data.data) {
      categoryList.value = res.data.data.categoryList ?? []
      tagList.value = res.data.data.tagList ?? []
      selectedTagMap.value = tagList.value.map(() => false)
    }
  } catch {
    // 标签分类加载失败不影响主流程
  }
}

/** 获取图片列表 */
const fetchData = async () => {
  loading.value = true
  try {
    // 组装查询参数
    const params: API.PictureQueryRequest = {
      ...searchParams,
      category: activeCategory.value === 'all' ? undefined : activeCategory.value,
      tags: tagList.value.filter((_, index) => selectedTagMap.value[index]),
    }
    const res = await listPictureVOByPageWithCache(params)
    if (res.data.code === 0 && res.data.data) {
      dataList.value = res.data.data.records ?? []
      total.value = Number(res.data.data.total ?? 0)
    } else {
      message.error('获取图片列表失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('获取图片列表失败：' + (e?.message ?? '网络错误'))
  } finally {
    loading.value = false
  }
}

/** 搜索：重置到第一页 */
const doSearch = () => {
  searchParams.current = 1
  fetchData()
}

/** 点击图片进入详情页 */
const doClickPicture = (picture: API.PictureVO) => {
  router.push(`/picture/${picture.id}`)
}

onMounted(() => {
  loadTagCategory()
  fetchData()
})
</script>

<style scoped>
.home-page {
  max-width: 1280px;
  margin: 0 auto;
}

.search-bar {
  max-width: 480px;
  margin: 0 auto 16px;
}

.picture-cover {
  height: 180px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.picture-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
