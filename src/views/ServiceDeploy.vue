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
      <p v-else-if="!loading && projects.length === 0" class="empty-tip">
        暂无服务配置，请编辑 ToolManagerSvr/res/services.json
      </p>

      <div v-for="project in projects" :key="project.projectId" class="project-card">
        <div class="project-header">
          <div class="project-title">
            <h2>{{ project.projectName }}</h2>
            <span class="project-meta">{{ runningCount(project) }}/{{ project.services.length }} 运行中</span>
          </div>
          <div class="project-actions">
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

        <table class="service-table">
          <thead>
            <tr>
              <th>服务</th>
              <th>状态</th>
              <th>PID</th>
              <th>路径</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="svc in project.services" :key="svc.serviceId">
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
              <td class="path-cell" :title="svc.exe">{{ svc.exe }}</td>
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
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import TopToolbar from '@/components/TopToolbar.vue'
import {
  fetchServiceList,
  startService,
  stopService,
  startProject,
  stopProject,
  reloadServiceConfig,
  ProjectRuntimeState,
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
    const autoRefresh = ref(true)
    let timer: ReturnType<typeof setInterval> | null = null

    const statusText = (status: ServiceStatus) => STATUS_MAP[status] || status

    const runningCount = (project: ProjectRuntimeState) =>
      project.services.filter(s => s.status === 'running').length

    const isBusy = (project: ProjectRuntimeState) =>
      project.services.some(s => s.status === 'starting' || s.status === 'stopping')

    const refresh = async () => {
      try {
        loading.value = true
        errorMsg.value = ''
        projects.value = await fetchServiceList()
      } catch (err: any) {
        errorMsg.value = err?.response?.data?.message || err?.message || '刷新失败'
      } finally {
        loading.value = false
      }
    }

    const softRefresh = async () => {
      try {
        projects.value = await fetchServiceList()
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
        projects.value = await reloadServiceConfig()
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
      autoRefresh,
      statusText,
      runningCount,
      isBusy,
      refresh,
      reloadConfig,
      onAutoRefreshChange,
      onStart,
      onStop,
      onStartProject,
      onStopProject,
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

.empty-tip {
  color: #909399;
  padding: 24px 0;
}

.project-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px 18px 8px;
  margin-bottom: 18px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.project-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.project-title h2 {
  margin: 0;
  font-size: 18px;
}

.project-meta {
  color: #909399;
  font-size: 13px;
}

.project-actions {
  display: flex;
  gap: 8px;
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
