<template>
  <a-modal
    :open="open"
    title="AI 图片编辑"
    width="900px"
    :mask-closable="false"
    @update:open="(value: boolean) => emit('update:open', value)"
  >
    <a-row :gutter="16">
      <a-col :xs="24" :md="12">
        <div class="pane-title">原图</div>
        <div class="pane">
          <img :src="picture.url" :alt="picture.name" class="pane-img" />
        </div>
      </a-col>
      <a-col :xs="24" :md="12">
        <div class="pane-title">编辑结果</div>
        <div class="pane">
          <img v-if="resultImageUrl" :src="resultImageUrl" alt="AI 编辑结果" class="pane-img" />
          <div v-else class="pane-empty">{{ resultPlaceholder }}</div>
        </div>
      </a-col>
    </a-row>

    <a-alert v-if="errorText" type="error" show-icon class="status-alert" :message="errorText" />
    <a-alert v-else-if="phase === 'polling'" type="info" show-icon class="status-alert">
      <template #message>
        {{ statusText }}，已等待 {{ waitedSeconds }} 秒（通常 5~15 秒出图，排队时更久）
      </template>
    </a-alert>

    <a-form layout="vertical" class="edit-form">
      <a-form-item label="编辑功能">
        <a-select
          v-model:value="formData.function"
          :options="AI_EDIT_FUNCTION_OPTIONS"
          :disabled="formDisabled"
        />
        <div class="func-desc">{{ currentFunction.desc }}</div>
      </a-form-item>

      <template v-if="currentFunction.hasStyles">
        <a-form-item label="预设风格">
          <a-select
            v-model:value="formData.styleTemplate"
            :options="styleOptions"
            :loading="styleLoading"
            :disabled="formDisabled"
            allow-clear
            placeholder="选择一种风格"
          />
        </a-form-item>
        <a-form-item v-if="currentFunction.needObject" label="作用对象">
          <a-input
            v-model:value="formData.promptObject"
            :disabled="formDisabled"
            placeholder="画面里要变换的物体，如：房子、桌上的杯子"
          />
        </a-form-item>
        <a-form-item v-if="finalPrompt" label="提示词预览">
          <span class="prompt-preview">{{ finalPrompt }}</span>
        </a-form-item>
      </template>

      <a-form-item v-if="currentFunction.param === 'expand'" label="扩展比例">
        <div v-for="direction in AI_EDIT_SCALE_DIRECTIONS" :key="direction.key" class="scale-row">
          <span class="scale-label">{{ direction.label }}</span>
          <a-slider
            v-model:value="formData[direction.key]"
            :min="AI_EDIT_SCALE_MIN"
            :max="AI_EDIT_SCALE_MAX"
            :step="AI_EDIT_SCALE_STEP"
            :disabled="formDisabled"
            class="scale-slider"
          />
          <span class="scale-value">{{ formData[direction.key].toFixed(1) }} 倍</span>
        </div>
        <div class="scale-tip">1.0 倍表示该方向不扩展，至少需要一个方向大于 1.0 倍</div>
      </a-form-item>

      <a-form-item v-if="currentFunction.param === 'strength'" label="修改幅度">
        <div class="scale-row">
          <a-slider
            v-model:value="formData.strength"
            :min="AI_EDIT_STRENGTH_MIN"
            :max="AI_EDIT_STRENGTH_MAX"
            :step="AI_EDIT_STRENGTH_STEP"
            :disabled="formDisabled"
            class="scale-slider"
          />
          <span class="scale-value">{{ formData.strength.toFixed(2) }}</span>
        </div>
        <div class="scale-tip">越接近 0 越像原图，越接近 1 对原图改动越大，默认 0.50</div>
      </a-form-item>

      <a-form-item v-if="currentFunction.param === 'upscale'" label="放大倍数">
        <a-input-number
          v-model:value="formData.upscaleFactor"
          :min="AI_EDIT_UPSCALE_MIN"
          :max="AI_EDIT_UPSCALE_MAX"
          :precision="0"
          :disabled="formDisabled"
          style="width: 120px"
        />
        <div class="scale-tip">1 表示只做高清处理不放大，2~4 倍会明显变清晰但更耗时</div>
      </a-form-item>

      <a-form-item v-if="currentFunction.param === 'sketch'" label="输入图是否为线稿">
        <a-switch v-model:checked="formData.isSketch" :disabled="formDisabled" />
        <div class="scale-tip">
          打开表示这张图本身就是线稿，直接按它生成；关闭则先提取线稿再生成
        </div>
      </a-form-item>

      <a-form-item v-if="currentFunction.needMask" label="涂抹区域">
        <AiMaskPainter
          v-model:mask="formData.maskImage"
          :picture-id="String(picture.id)"
          :disabled="formDisabled"
        />
      </a-form-item>

      <a-form-item v-if="!currentFunction.hasStyles" label="提示词">
        <a-textarea
          v-model:value="formData.prompt"
          :maxlength="AI_EDIT_PROMPT_MAX_LENGTH"
          :auto-size="{ minRows: 2, maxRows: 4 }"
          :disabled="formDisabled"
          show-count
          :placeholder="promptPlaceholder"
        />
      </a-form-item>

      <a-form-item label="图片名称">
        <a-input v-model:value="formData.picName" placeholder="留空自动生成" />
      </a-form-item>
    </a-form>

    <template #footer>
      <div class="footer">
        <div class="footer-tips">
          <span class="quota-tip">{{ quotaTip }}</span>
          <span v-if="phase === 'success' && !allowReplace" class="quota-tip">
            公共图库的图片不支持覆盖，如需替换请另存为新图后删除原图
          </span>
        </div>
        <a-space wrap>
          <a-button :disabled="savingMode !== ''" @click="emit('update:open', false)">关闭</a-button>
          <a-button v-if="phase === 'success'" :disabled="savingMode !== ''" @click="backToForm">
            重新调整
          </a-button>
          <a-popconfirm
            v-if="phase === 'success' && allowReplace"
            title="覆盖后原图文件会被删除且不可恢复，确定吗？"
            ok-text="确定覆盖"
            cancel-text="取消"
            @confirm="doSave(true)"
          >
            <a-button :loading="savingMode === 'replace'" :disabled="savingMode === 'new'">覆盖原图</a-button>
          </a-popconfirm>
          <a-button
            v-if="phase === 'success'"
            type="primary"
            :loading="savingMode === 'new'"
            :disabled="savingMode === 'replace'"
            @click="doSave(false)"
          >
            保存为新图片
          </a-button>
          <a-button v-if="phase === 'polling'" type="primary" loading disabled>{{ statusText }}</a-button>
          <a-button
            v-else-if="phase === 'failed' && taskId"
            type="primary"
            :loading="querying"
            @click="requeryTask"
          >
            查询进度
          </a-button>
          <a-button
            v-else-if="phase !== 'success'"
            type="primary"
            :loading="creating"
            :disabled="createDisabled"
            @click="doCreateTask"
          >
            {{ phase === 'failed' ? '重新生成' : '生成' }}
          </a-button>
          <a-button v-if="phase === 'failed' && taskId" @click="backToForm">重新提交</a-button>
        </a-space>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  createAiImageEditTask,
  getAiImageEditQuota,
  getAiImageEditTask,
  listAiImageEditStyles,
  saveAiImageEditResult,
} from '@/api/pictureController'
import AiMaskPainter from '@/components/AiMaskPainter.vue'
import {
  AI_EDIT_DEFAULT_FUNCTION,
  AI_EDIT_DEFAULT_SCALES,
  AI_EDIT_DEFAULT_STRENGTH,
  AI_EDIT_FUNCTION_OPTIONS,
  AI_EDIT_POLL_INTERVAL_MS,
  AI_EDIT_POLL_MAX_TIMES,
  AI_EDIT_PROMPT_MAX_LENGTH,
  AI_EDIT_PROMPT_PLACEHOLDER,
  AI_EDIT_SCALE_DIRECTIONS,
  AI_EDIT_SCALE_MAX,
  AI_EDIT_SCALE_MIN,
  AI_EDIT_SCALE_STEP,
  AI_EDIT_STRENGTH_MAX,
  AI_EDIT_STRENGTH_MIN,
  AI_EDIT_STRENGTH_STEP,
  AI_EDIT_TASK_STATUS,
  AI_EDIT_UPSCALE_MAX,
  AI_EDIT_UPSCALE_MIN,
  getAiEditFunctionMeta,
} from '@/constants/aiImageEdit'

type EditPhase = 'idle' | 'polling' | 'success' | 'failed'

const props = withDefaults(
  defineProps<{
    open: boolean
    picture: API.PictureVO
    /**
     * 是否允许覆盖原图。公共图库传 false：覆盖会把一张已过审的公开内容原地换掉并打回待审核，
     * 而首页列表有 5~10 分钟缓存，期间会出现"列表还是旧图、点进详情是新图"的错位
     */
    allowReplace?: boolean
  }>(),
  { allowReplace: true },
)

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void
  (e: 'saved', payload: { picture?: API.PictureVO; replaced: boolean }): void
}>()

const phase = ref<EditPhase>('idle')
const formData = reactive({
  function: AI_EDIT_DEFAULT_FUNCTION as string,
  prompt: '',
  styleTemplate: '',
  promptObject: '',
  maskImage: '',
  picName: '',
  strength: AI_EDIT_DEFAULT_STRENGTH,
  upscaleFactor: AI_EDIT_UPSCALE_MIN,
  isSketch: false,
  ...AI_EDIT_DEFAULT_SCALES,
})

const taskId = ref('')
const statusText = ref('排队中')
const errorText = ref('')
const resultImageUrl = ref('')
const pollTimes = ref(0)
const creating = ref(false)
const querying = ref(false)
const savingMode = ref<'' | 'new' | 'replace'>('')
const quota = ref<API.AiImageEditQuotaVO>()
const styleOptions = ref<{ label: string; value: string }[]>([])
const styleLoading = ref(false)

let timerId: number | undefined
/** 风格清单是后端硬编码的固定内容，切回来不必重复请求 */
const styleCache: Record<string, { label: string; value: string }[]> = {}

const currentFunction = computed(() => getAiEditFunctionMeta(formData.function))
const formDisabled = computed(() => phase.value === 'polling')
const waitedSeconds = computed(() => Math.round(pollTimes.value * (AI_EDIT_POLL_INTERVAL_MS / 1000)))
const quotaUsedUp = computed(() => (quota.value?.remaining ?? -1) === 0)
const createDisabled = computed(() => quotaUsedUp.value || !props.picture.id)
const quotaTip = computed(() => {
  if (!quota.value) return '剩余额度：未知'
  const remaining = quota.value.remaining ?? 0
  if (remaining === 0) return '额度已用完，请联系管理员发放'
  const base = `剩余额度 ${remaining} 次`
  return phase.value === 'idle' || phase.value === 'failed' ? `${base}，每次生成消耗 1 次` : base
})
const promptPlaceholder = computed(() =>
  currentFunction.value.promptRequired
    ? '描述期望的画面，该功能必须由你填写'
    : '描述期望的画面，留空则由系统使用默认指令',
)
/** 风格化功能把模板（+作用对象）拼成提示词，其余功能直接用输入框内容 */
const finalPrompt = computed(() => {
  if (!currentFunction.value.hasStyles) {
    return formData.prompt.trim()
  }
  if (!formData.styleTemplate) return ''
  if (!currentFunction.value.needObject) return formData.styleTemplate
  const target = formData.promptObject.trim()
  return target ? formData.styleTemplate.replace(AI_EDIT_PROMPT_PLACEHOLDER, target) : ''
})
const resultPlaceholder = computed(() => {
  if (phase.value === 'polling') return '生成中…'
  if (phase.value === 'failed') return '本次未生成结果'
  return '点击「生成」开始 AI 编辑'
})

const stopPolling = () => {
  if (timerId !== undefined) {
    clearTimeout(timerId)
    timerId = undefined
  }
}

const fetchQuota = async () => {
  try {
    const res = await getAiImageEditQuota()
    quota.value = res.data.data
  } catch {
    // 额度仅用于展示，取不到时不拦截用户操作，提交任务时后端仍会校验
    quota.value = undefined
  }
}

const loadStyles = async (value: string) => {
  const cached = styleCache[value]
  if (cached) {
    styleOptions.value = cached
    return
  }
  styleLoading.value = true
  try {
    const res = await listAiImageEditStyles({ function: value })
    const options = (res.data.data ?? []).map((item) => ({
      label: item.styleName ?? '',
      value: item.promptTemplate ?? '',
    }))
    styleCache[value] = options
    styleOptions.value = options
    if (!options.length) {
      message.warning('该功能暂无可用风格')
    }
  } catch (e: any) {
    styleOptions.value = []
    message.error('风格清单加载失败：' + (e?.message ?? '网络异常'))
  } finally {
    styleLoading.value = false
  }
}

const resetFunctionChoice = (value: string) => {
  formData.styleTemplate = ''
  formData.promptObject = ''
  formData.prompt = ''
  formData.maskImage = ''
  if (getAiEditFunctionMeta(value).hasStyles) {
    loadStyles(value)
  } else {
    styleOptions.value = []
  }
}

/**
 * 处理一次查询结果
 * @returns 任务是否已结束（成功或失败），结束则停止轮询
 */
const applyTask = (task?: API.AiImageEditTaskVO): boolean => {
  if (!task) return false
  const status = task.taskStatus
  if (status === AI_EDIT_TASK_STATUS.SUCCEEDED && task.imageUrl) {
    stopPolling()
    resultImageUrl.value = task.imageUrl
    errorText.value = ''
    phase.value = 'success'
    if (!props.open) {
      message.success('AI 编辑完成，打开弹窗即可查看结果')
    }
    return true
  }
  if (status === AI_EDIT_TASK_STATUS.FAILED || status === AI_EDIT_TASK_STATUS.CANCELED) {
    stopPolling()
    errorText.value = (task.failReason || '任务失败，请调整参数后重试') + '（本次消耗的额度已退还）'
    phase.value = 'failed'
    // 后端在返回失败状态时已退还额度，刷新一次让上面的余量对上
    fetchQuota()
    return true
  }
  statusText.value = task.statusText || '处理中'
  return false
}

const schedulePoll = () => {
  stopPolling()
  timerId = window.setTimeout(runPoll, AI_EDIT_POLL_INTERVAL_MS)
}

const runPoll = async () => {
  timerId = undefined
  if (phase.value !== 'polling' || !taskId.value) return
  pollTimes.value += 1
  try {
    const res = await getAiImageEditTask({ taskId: taskId.value })
    if (applyTask(res.data.data)) return
  } catch (e: any) {
    stopPolling()
    errorText.value = '查询进度失败：' + (e?.message ?? '网络异常')
    phase.value = 'failed'
    return
  }
  if (pollTimes.value >= AI_EDIT_POLL_MAX_TIMES) {
    errorText.value = `已等待 ${waitedSeconds.value} 秒仍未出结果，任务可能仍在排队，可点「查询进度」继续确认`
    phase.value = 'failed'
    return
  }
  schedulePoll()
}

const startPolling = (id: string) => {
  taskId.value = id
  statusText.value = '排队中'
  pollTimes.value = 0
  errorText.value = ''
  resultImageUrl.value = ''
  phase.value = 'polling'
  schedulePoll()
}

/** 只提交当前功能用得上的参数：蒙版传给非蒙版功能会被后端直接拒绝，多余参数也会被静默忽略 */
const buildCreatePayload = (): API.AiImageEditCreateRequest => {
  const meta = currentFunction.value
  const payload: API.AiImageEditCreateRequest = {
    pictureId: props.picture.id,
    function: meta.value,
    prompt: finalPrompt.value || undefined,
  }
  if (meta.param === 'expand') {
    payload.topScale = formData.topScale
    payload.bottomScale = formData.bottomScale
    payload.leftScale = formData.leftScale
    payload.rightScale = formData.rightScale
  } else if (meta.param === 'strength') {
    payload.strength = formData.strength
  } else if (meta.param === 'upscale') {
    payload.upscaleFactor = formData.upscaleFactor
  } else if (meta.param === 'sketch') {
    payload.isSketch = formData.isSketch
  }
  if (meta.needMask) {
    payload.maskImage = formData.maskImage
  }
  return payload
}

/** 返回错误文案表示本地拦下，空串表示可以继续提交 */
const validateForm = (): string => {
  const meta = currentFunction.value
  if (meta.param === 'expand') {
    const expanded = AI_EDIT_SCALE_DIRECTIONS.some((direction) => formData[direction.key] > AI_EDIT_SCALE_MIN)
    if (!expanded) return '请至少设置一个方向的扩展比例'
  }
  if (meta.hasStyles && !formData.styleTemplate) return '请选择一种风格'
  if (meta.hasStyles && meta.needObject && !formData.promptObject.trim()) return '请填写作用对象'
  if (meta.promptRequired && !finalPrompt.value) return '该功能需要填写提示词'
  if (meta.needMask && !formData.maskImage) return '请先涂抹需要编辑的区域'
  return ''
}

const doCreateTask = async () => {
  if (!props.picture.id) {
    message.error('图片 id 不存在')
    return
  }
  const invalidMessage = validateForm()
  if (invalidMessage) {
    message.warning(invalidMessage)
    return
  }
  creating.value = true
  try {
    const res = await createAiImageEditTask(buildCreatePayload())
    await fetchQuota()
    const created = res.data.data
    if (!created?.taskId) {
      errorText.value = '任务创建失败：未返回任务 id'
      phase.value = 'failed'
      return
    }
    startPolling(created.taskId)
  } catch (e: any) {
    // 拦截器已把业务错误码转成 reject，这里统一展示后端返回的中文提示
    errorText.value = '提交失败：' + (e?.message ?? '网络异常')
    phase.value = 'failed'
  } finally {
    creating.value = false
  }
}

/** 轮询超时后手动续查，避免用户误以为要重新提交而再消耗一次额度 */
const requeryTask = async () => {
  if (!taskId.value) return
  querying.value = true
  try {
    const res = await getAiImageEditTask({ taskId: taskId.value })
    if (applyTask(res.data.data)) return
    startPolling(taskId.value)
  } catch (e: any) {
    message.error('查询进度失败：' + (e?.message ?? '网络异常'))
  } finally {
    querying.value = false
  }
}

const doSave = async (replace: boolean) => {
  if (!taskId.value || savingMode.value) return
  savingMode.value = replace ? 'replace' : 'new'
  try {
    const res = await saveAiImageEditResult({
      taskId: taskId.value,
      picName: formData.picName.trim() || undefined,
      replace,
    })
    message.success(replace ? '已覆盖原图' : '已保存为新图片')
    emit('saved', { picture: res.data.data, replaced: replace })
    backToForm()
    emit('update:open', false)
  } catch (e: any) {
    message.error('保存失败：' + (e?.message ?? '网络异常'))
  } finally {
    savingMode.value = ''
  }
}

const backToForm = () => {
  stopPolling()
  taskId.value = ''
  resultImageUrl.value = ''
  errorText.value = ''
  pollTimes.value = 0
  phase.value = 'idle'
}

watch(
  () => props.open,
  (open) => {
    if (open) fetchQuota()
  },
  { immediate: true },
)

// 换功能等于换一套参数与提示词，沿用上一功能的输入只会得到答非所问的结果
watch(() => formData.function, (value) => resetFunctionChoice(value))

// 弹窗实例会被复用（空间页切换图片），换图后旧任务结果已不属于这张图
watch(
  () => props.picture.id,
  () => {
    formData.maskImage = ''
    backToForm()
  },
)

onBeforeUnmount(stopPolling)
</script>

<style scoped>
.pane-title {
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}

.pane {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 260px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #fafafa;
  overflow: hidden;
}

.pane-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.pane-empty {
  padding: 0 16px;
  color: rgba(0, 0, 0, 0.35);
  font-size: 13px;
  text-align: center;
}

.status-alert {
  margin-top: 16px;
}

.edit-form {
  margin-top: 16px;
}

.func-desc,
.scale-tip {
  margin-top: 4px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.scale-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.scale-label {
  width: 40px;
  color: rgba(0, 0, 0, 0.65);
}

.scale-slider {
  flex: 1;
}

.scale-value {
  width: 56px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.prompt-preview {
  color: rgba(0, 0, 0, 0.65);
  word-break: break-all;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.footer-tips {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.quota-tip {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
