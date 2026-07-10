import request from '@/utils/request'

export type ServiceStatus = 'stopped' | 'running' | 'starting' | 'stopping' | 'error'

export interface ServiceRuntimeState {
  projectId: string
  serviceId: string
  name: string
  exe: string
  cwd: string
  status: ServiceStatus
  pid: number | null
  lastError: string | null
  startedAt: number | null
}

export interface ProjectRuntimeState {
  projectId: string
  projectName: string
  services: ServiceRuntimeState[]
}

export async function fetchServiceList(): Promise<ProjectRuntimeState[]> {
  const res = await request.get('/services/list')
  return res.data?.data || []
}

export async function fetchServiceStatus(): Promise<ProjectRuntimeState[]> {
  const res = await request.get('/services/status')
  return res.data?.data || []
}

export async function startService(projectId: string, serviceId: string): Promise<ServiceRuntimeState> {
  const res = await request.post('/services/start', { projectId, serviceId })
  return res.data?.data
}

export async function stopService(projectId: string, serviceId: string): Promise<ServiceRuntimeState> {
  const res = await request.post('/services/stop', { projectId, serviceId })
  return res.data?.data
}

export async function startProject(projectId: string): Promise<ServiceRuntimeState[]> {
  const res = await request.post('/services/start-project', { projectId })
  return res.data?.data || []
}

export async function stopProject(projectId: string): Promise<ServiceRuntimeState[]> {
  const res = await request.post('/services/stop-project', { projectId })
  return res.data?.data || []
}

export async function reloadServiceConfig(): Promise<ProjectRuntimeState[]> {
  const res = await request.post('/services/reload-config')
  return res.data?.data || []
}

export async function uploadServiceFiles(
  projectId: string,
  serviceId: string,
  files: File[]
): Promise<{ deployDir: string; files: string[] }> {
  const form = new FormData()
  form.append('projectId', projectId)
  form.append('serviceId', serviceId)
  for (const file of files) {
    form.append('files', file)
  }
  const res = await request.post('/services/upload', form, {
    timeout: 600000,
  })
  return res.data?.data
}
