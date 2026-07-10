<template>
  <div>
    <top-toolbar :special-back-action="onBack" />
    <div class="deploy-container">
      <div class="page-header">
        <h1>服务部署</h1>
        <div class="header-actions">
          <label class="auto-refresh">
            <input type="checkbox" v-model="autoRefresh" @change="onAutoRefreshChange" />
            自动刷新
          </label>
          <button class="action-btn" :disabled="loading" @click="refresh">刷新状态</button>
          <button class="action-btn secondary" :disabled="loading" @click="reloadConfig">重载配置</button>
        </div>
      </div>

      <p v-if="errorMsg" class="error-banner">{{ errorMsg }}</p>
      <p v-if="infoMsg" class="info-banner">{{ infoMsg }}</p>
      <p v-if="!errorMsg && !infoMsg && !loading && projects.length === 0" class="empty-tip">
        暂无服务配置，请编辑 ToolManagerSvr/res/services.json
      </p>

      <div v-for="project in projects" :key="project.projectId" class="project-card">
        <div class="project-header" @click="toggleProject(project.projectId)">
          <div class="project-title">
            <span class="collapse-icon">{{ isExpanded(project.projectId) ? '▼' : '▶' }}</span>
            <h2>{{ project.projectName }}</h2>
            <span class="project-meta">{{ runningCount(project) }}/{{ project.services.length }} 运行中</span>
          </div>
          <div class="project-actions" @click.stop>
            <button
              class="action-btn success"
              :disabled="loading || isBusy(project)"
              @click="onStartProject(project.projectId)"
            >
              全部启动
            </button>
            <button
              class="action-btn danger"
              :disabled="loading || isBusy(project)"
              @click="onStopProject(project.projectId)"
            >
              全部停止
            </button>
          </div>
        </div>

        <div v-show="isExpanded(project.projectId)" class="project-body">
          <p class="drop-hint">可将本地文件拖到下方某个服务行，上传到该服务目录（运行中需先停止）</p>
          <table class="service-table">
            <thead>
              <tr>
                <th>服务</th>
                <th>状态</th>
                <th>PID</th>
                <th>目录</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="svc in project.services"
                :key="svc.serviceId"
                class="service-row"
                :class="{ 'drag-over': dropTargetKey === serviceKey(svc), uploading: uploadingKey === serviceKey(svc) }"
                @dragover.prevent="onDragOver($event, svc)"
                @dragleave="onDragLeave(svc)"
                @drop.prevent="onDrop($event, svc)"
              >
                <td>
                  <div class="svc-name">{{ svc.name }}</div>
                  <div v-if="svc.lastError" class="svc-error">{{ svc.lastError }}</div>
                </td>
                <td>
                  <span class="status-badge" :class="'status-' + svc.status">
                    {{ statusText(svc.status) }}
                  </span>
                </td>
                <td>{{ svc.pid || '-' }}</td>
                <td class="path-cell" :title="svc.cwd || svc.exe">{{ svc.cwd || svc.exe }}</td>
                <td class="ops-cell">
                  <button
                    class="mini-btn success"
                    :disabled="loading || svc.status === 'running' || svc.status === 'starting' || svc.status === 'stopping'"
                    @click="onStart(svc.projectId, svc.serviceId)"
                  >
                    启动
                  </button>
                  <button
                    class="mini-btn danger"
                    :disabled="loading || svc.status === 'stopped' || svc.status === 'stopping'"
                    @click="onStop(svc.projectId, svc.serviceId)"
                  >
                    停止
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import TopToolbar from '@/components/TopToolbar.vue'
import {
  fetchServiceList,
  startService,
  stopService,
  startProject,
  stopProject,
  reloadServiceConfig,
  uploadServiceFiles,
  ProjectRuntimeState,
  ServiceRuntimeState,
  ServiceStatus,
} from '@/modules/services/serviceApi'

const STATUS_MAP: Record<ServiceStatus, string> = {
  stopped: '已停止',
  running: '运行中',
  starting: '启动中',
  stopping: '停止中',
  error: '异常',
}

export default defineComponent({
  name: 'ServiceDeploy',
  components: { TopToolbar },
  setup() {
    const router = useRouter()
    const projects = ref<ProjectRuntimeState[]>([])
    const loading = ref(false)
    const errorMsg = ref('')
    const infoMsg = ref('')
    const autoRefresh = ref(true)
    const expanded = reactive<Record<string, boolean>>({})
    const dropTargetKey = ref('')
    const uploadingKey = ref('')
    let timer: ReturnType<typeof setInterval> | null = null

    const statusText = (status: ServiceStatus) => STATUS_MAP[status] || status

    const serviceKey = (svc: ServiceRuntimeState) => `${svc.projectId}::${svc.serviceId}`

    const runningCount = (project: ProjectRuntimeState) =>
      project.services.filter(s => s.status === 'running').length

    const isBusy = (project: ProjectRuntimeState) =>
      project.services.some(s => s.status === 'starting' || s.status === 'stopping')

    const isExpanded = (projectId: string) => !!expanded[projectId]

    const toggleProject = (projectId: string) => {
      expanded[projectId] = !expanded[projectId]
    }

    const ensureExpandedDefaults = (list: ProjectRuntimeState[]) => {
      for (const project of list) {
        if (expanded[project.projectId] === undefined) {
          expanded[project.projectId] = false
        }
      }
    }

    const refresh = async () => {
      try {
        loading.value = true
        errorMsg.value = ''
        projects.value = await fetchServiceList()
        ensureExpandedDefaults(projects.value)
      } catch (err: any) {
        errorMsg.value = err?.response?.data?.message || err?.message || '刷新失败'
      } finally {
        loading.value = false
      }
    }

    const softRefresh = async () => {
      try {
        projects.value = await fetchServiceList()
        ensureExpandedDefaults(projects.value)
        errorMsg.value = ''
      } catch (err: any) {
        errorMsg.value = err?.response?.data?.message || err?.message || '刷新失败'
      }
    }

    const clearTimer = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }

    const startTimer = () => {
      clearTimer()
      if (autoRefresh.value) {
        timer = setInterval(() => {
          softRefresh()
        }, 3000)
      }
    }

    const onAutoRefreshChange = () => {
      startTimer()
    }

    const reloadConfig = async () => {
      try {
        loading.value = true
        errorMsg.value = ''
        infoMsg.value = ''
        projects.value = await reloadServiceConfig()
        ensureExpandedDefaults(projects.value)
      } catch (err: any) {
        errorMsg.value = err?.response?.data?.message || err?.message || '重载配置失败'
      } finally {
        loading.value = false
      }
    }

    const onStart = async (projectId: string, serviceId: string) => {
      try {
        loading.value = true
        errorMsg.value = ''
        await startService(projectId, serviceId)
        await softRefresh()
      } catch (err: any) {
        errorMsg.value = err?.response?.data?.message || err?.message || '启动失败'
        await softRefresh()
      } finally {
        loading.value = false
      }
    }

    const onStop = async (projectId: string, serviceId: string) => {
      try {
        loading.value = true
        errorMsg.value = ''
        await stopService(projectId, serviceId)
        await softRefresh()
      } catch (err: any) {
        errorMsg.value = err?.response?.data?.message || err?.message || '停止失败'
        await softRefresh()
      } finally {
        loading.value = false
      }
    }

    const onStartProject = async (projectId: string) => {
      try {
        loading.value = true
        errorMsg.value = ''
        await startProject(projectId)
        await softRefresh()
      } catch (err: any) {
        errorMsg.value = err?.response?.data?.message || err?.message || '项目启动失败'
        await softRefresh()
      } finally {
        loading.value = false
      }
    }

    const onStopProject = async (projectId: string) => {
      try {
        loading.value = true
        errorMsg.value = ''
        await stopProject(projectId)
        await softRefresh()
      } catch (err: any) {
        errorMsg.value = err?.response?.data?.message || err?.message || '项目停止失败'
        await softRefresh()
      } finally {
        loading.value = false
      }
    }

    const onDragOver = (event: DragEvent, svc: ServiceRuntimeState) => {
      dropTargetKey.value = serviceKey(svc)
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'
      }
    }

    const onDragLeave = (svc: ServiceRuntimeState) => {
      if (dropTargetKey.value === serviceKey(svc)) {
        dropTargetKey.value = ''
      }
    }

    const onDrop = async (event: DragEvent, svc: ServiceRuntimeState) => {
      dropTargetKey.value = ''
      const fileList = event.dataTransfer?.files
      if (!fileList || fileList.length === 0) {
        return
      }

      if (svc.status === 'running' || svc.status === 'starting' || svc.status === 'stopping') {
        errorMsg.value = ''
        infoMsg.value = ''
        alert(`服务「${svc.name}」正在运行中，请先停止服务再上传部署文件`)
        return
      }

      const files = Array.from(fileList).filter(f => f.size >= 0 && f.name)
      if (!files.length) {
        return
      }

      const key = serviceKey(svc)
      try {
        loading.value = true
        uploadingKey.value = key
        errorMsg.value = ''
        infoMsg.value = ''
        const result = await uploadServiceFiles(svc.projectId, svc.serviceId, files)
        infoMsg.value = `已上传 ${result.files.length} 个文件到 ${result.deployDir}：${result.files.join(', ')}`
      } catch (err: any) {
        errorMsg.value = err?.response?.data?.message || err?.message || '上传失败'
      } finally {
        uploadingKey.value = ''
        loading.value = false
      }
    }

    const onBack = () => {
      router.push('/')
    }

    onMounted(() => {
      refresh()
      startTimer()
    })

    onBeforeUnmount(() => {
      clearTimer()
    })

    return {
      projects,
      loading,
      errorMsg,
      infoMsg,
      autoRefresh,
      dropTargetKey,
      uploadingKey,
      statusText,
      serviceKey,
      runningCount,
      isBusy,
      isExpanded,
      toggleProject,
      refresh,
      reloadConfig,
      onAutoRefreshChange,
      onStart,
      onStop,
      onStartProject,
      onStopProject,
      onDragOver,
      onDragLeave,
      onDrop,
      onBack,
    }
  },
})
</script>

<style scoped>
.deploy-container {
  padding: 20px 24px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 22px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.auto-refresh {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #606266;
}

.action-btn {
  padding: 8px 14px;
  background-color: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-btn.secondary {
  background-color: #909399;
}

.action-btn.success {
  background-color: #67c23a;
}

.action-btn.danger {
  background-color: #f56c6c;
}

.action-btn:hover:not(:disabled) {
  filter: brightness(1.05);
}

.error-banner {
  background: #fef0f0;
  color: #f56c6c;
  padding: 10px 14px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.info-banner {
  background: #f0f9eb;
  color: #67c23a;
  padding: 10px 14px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.empty-tip {
  color: #909399;
  padding: 24px 0;
}

.project-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 0;
  margin-bottom: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  cursor: pointer;
  user-select: none;
  background: #fafafa;
}

.project-header:hover {
  background: #f5f7fa;
}

.project-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.collapse-icon {
  color: #909399;
  font-size: 12px;
  width: 14px;
}

.project-title h2 {
  margin: 0;
  font-size: 17px;
}

.project-meta {
  color: #909399;
  font-size: 13px;
}

.project-actions {
  display: flex;
  gap: 8px;
}

.project-body {
  padding: 0 18px 12px;
  border-top: 1px solid #ebeef5;
}

.drop-hint {
  margin: 10px 0 6px;
  color: #909399;
  font-size: 12px;
}

.service-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.service-table th,
.service-table td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid #ebeef5;
  vertical-align: top;
}

.service-table th {
  color: #909399;
  font-weight: 500;
}

.service-row {
  transition: background-color 0.15s ease;
}

.service-row.drag-over {
  background: #ecf5ff;
  outline: 2px dashed #409eff;
  outline-offset: -2px;
}

.service-row.uploading {
  background: #fdf6ec;
}

.svc-name {
  font-weight: 500;
  color: #303133;
}

.svc-error {
  margin-top: 4px;
  color: #f56c6c;
  font-size: 12px;
  max-width: 280px;
  word-break: break-all;
}

.path-cell {
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #606266;
  font-size: 12px;
}

.ops-cell {
  white-space: nowrap;
}

.mini-btn {
  padding: 5px 10px;
  margin-right: 6px;
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}

.mini-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mini-btn.success {
  background-color: #67c23a;
}

.mini-btn.danger {
  background-color: #f56c6c;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.6;
}

.status-stopped {
  background: #f4f4f5;
  color: #909399;
}

.status-running {
  background: #f0f9eb;
  color: #67c23a;
}

.status-starting,
.status-stopping {
  background: #fdf6ec;
  color: #e6a23c;
}

.status-error {
  background: #fef0f0;
  color: #f56c6c;
}
</style>
