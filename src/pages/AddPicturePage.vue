<template>
  <div class="add-picture-page">
    <a-card :title="pictureId ? '编辑图片' : '创建图片'">
      <a-row :gutter="[24, 24]">
        <!-- 图片上传（后端 /picture/upload 与 /picture/upload/url 登录即可使用） -->
        <!-- 左栏：编辑模式只读预览；创建模式上传 -->
        <a-col :xs="24" :md="10">
          <div v-if="pictureId" class="edit-preview">
            <a-image :src="picture?.url" alt="图片预览" style="max-width: 100%" />
            <div class="preview-tip">编辑模式仅修改图片信息，如需换图请删除后重新上传</div>
          </div>
          <a-tabs v-else v-model:active-key="uploadType">
            <a-tab-pane key="file" tab="文件上传">
              <PictureUpload :picture="picture" :on-success="onUploadSuccess" />
            </a-tab-pane>
            <a-tab-pane key="url" tab="URL 上传" force-render>
              <UrlPictureUpload :picture="picture" :on-success="onUploadSuccess" />
            </a-tab-pane>
          </a-tabs>
        </a-col>
        <!-- 图片信息表单（上传图片后才展示） -->
        <a-col v-if="picture" :xs="24" :md="14">
          <a-form :model="pictureForm" layout="vertical" @finish="handleSubmit">
            <a-form-item label="图片 id" v-if="pictureId">
              <a-input :value="pictureId" disabled />
            </a-form-item>
            <a-form-item name="name" label="图片名称">
              <a-input v-model:value="pictureForm.name" placeholder="请输入图片名称" />
            </a-form-item>
            <a-form-item name="introduction" label="图片简介">
              <a-textarea
                v-model:value="pictureForm.introduction"
                placeholder="请输入图片简介"
                :auto-size="{ minRows: 2, maxRows: 5 }"
              />
            </a-form-item>
            <!-- 分类：AutoComplete 支持自由输入，同时给出候选提示 -->
            <a-form-item name="category" label="图片分类">
              <a-auto-complete
                v-model:value="pictureForm.category"
                placeholder="请输入图片分类"
                allow-clear
                :options="categoryOptions"
              />
            </a-form-item>
            <!-- 标签：mode="tags" 支持自由输入和多选 -->
            <a-form-item name="tags" label="图片标签">
              <a-select
                v-model:value="pictureForm.tags"
                mode="tags"
                placeholder="请输入图片标签"
                allow-clear
                :options="tagOptions"
              />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" html-type="submit" :loading="submitLoading" :disabled="!picture?.id">
                {{ pictureId ? '保存修改' : '创建图片' }}
              </a-button>
            </a-form-item>
          </a-form>
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import PictureUpload from '@/components/PictureUpload.vue'
import UrlPictureUpload from '@/components/UrlPictureUpload.vue'
import {
  editPicture,
  getPictureVOById,
  listPictureTagCategory,
} from '@/api/pictureController'

const route = useRoute()
const router = useRouter()

// 编辑场景：路由 /picture/edit/:id 携带 id
const pictureId = computed(() => route.params.id as string | undefined)

// 上传方式：文件上传 / URL 上传
const uploadType = ref<'file' | 'url'>('file')

const picture = ref<API.PictureVO>()
const submitLoading = ref(false)

// 表单数据（对应后端 PictureEditRequest）
const pictureForm = reactive<API.PictureEditRequest>({
  id: '',
})

// 分类与标签选项
const categoryOptions = ref<{ value: string; label: string }[]>([])
const tagOptions = ref<{ value: string; label: string }[]>([])

/** 加载标签分类选项 */
const loadTagCategory = async () => {
  try {
    const res = await listPictureTagCategory()
    if (res.data.code === 0 && res.data.data) {
      categoryOptions.value = (res.data.data.categoryList ?? []).map((v) => ({ value: v, label: v }))
      tagOptions.value = (res.data.data.tagList ?? []).map((v) => ({ value: v, label: v }))
    }
  } catch {
    // 忽略，不阻塞主流程
  }
}

/** 编辑场景：加载已有图片数据 */
const loadPicture = async () => {
  if (!pictureId.value) return
  try {
    const res = await getPictureVOById({ id: pictureId.value })
    if (res.data.code === 0 && res.data.data) {
      const data = res.data.data
      picture.value = data
      pictureForm.id = data.id
      pictureForm.name = data.name
      pictureForm.introduction = data.introduction
      pictureForm.category = data.category
      pictureForm.tags = data.tags
    } else {
      message.error('获取图片信息失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('获取图片信息失败：' + (e?.message ?? '网络错误'))
  }
}

/** 上传成功：回填图片信息 */
const onUploadSuccess = (newPicture: API.PictureVO) => {
  picture.value = newPicture
  pictureForm.id = newPicture.id
  if (!pictureForm.name) {
    pictureForm.name = newPicture.name
  }
}

/** 提交表单（编辑图片信息） */
const handleSubmit = async (values: API.PictureEditRequest) => {
  const id = picture.value?.id ?? pictureId.value
  if (!id) {
    message.warning('请先上传图片')
    return
  }
  submitLoading.value = true
  try {
    const res = await editPicture({ ...values, id })
    if (res.data.code === 0) {
      message.success(pictureId.value ? '图片信息已保存' : '图片创建成功')
      router.push(`/picture/${id}`)
    } else {
      message.error('操作失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('操作失败：' + (e?.message ?? '网络错误'))
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  loadTagCategory()
  loadPicture()
})
</script>

<style scoped>
.add-picture-page {
  max-width: 960px;
  margin: 0 auto;
}

.edit-preview {
  text-align: center;
}

.preview-tip {
  margin-top: 8px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
