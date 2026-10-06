<template>
  <div class="add-picture-batch-page">
    <a-card title="批量创建图片">
      <a-form layout="vertical" :model="formData" @finish="handleSubmit">
        <a-form-item name="searchText" label="关键词">
          <a-input v-model:value="formData.searchText" placeholder="请输入搜索关键词" allow-clear />
        </a-form-item>
        <a-form-item name="count" label="抓取数量">
          <a-input-number
            v-model:value="formData.count"
            :min="1"
            :max="30"
            placeholder="请输入抓取数量（1-30）"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item name="namePrefix" label="名称前缀">
          <a-input
            v-model:value="formData.namePrefix"
            placeholder="请输入名称前缀，图片名称会自动补充序号"
            allow-clear
          />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="loading">开始抓取</a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { uploadPictureByBatch } from '@/api/pictureController'

const router = useRouter()
const loading = ref(false)

// 表单数据（对应后端 PictureUploadByBatchRequest）
const formData = reactive<API.PictureUploadByBatchRequest>({
  count: 10,
})

/** 提交批量抓取任务 */
const handleSubmit = async (values: API.PictureUploadByBatchRequest) => {
  loading.value = true
  try {
    const res = await uploadPictureByBatch(values)
    if (res.data.code === 0) {
      message.success(`创建成功，共 ${res.data.data} 条`)
      router.push('/admin/pictureManage')
    } else {
      message.error('创建失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('创建失败：' + (e?.message ?? '网络错误'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.add-picture-batch-page {
  max-width: 720px;
  margin: 0 auto;
}
</style>
