import axios from 'axios'
import { useUserStore } from '@/stores/user'

function getApiBaseUrl(): string {
  return window.__APP_CONFIG__?.apiUrl || process.env.VUE_APP_API_URL || '/api'
}

// 创建 axios 实例（apiUrl 来自 public/config.js，修改后刷新即可，无需重新编译）
const request = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 50000
})

// 请求拦截器（可选附带 token，当前后端不强制鉴权）
request.interceptors.request.use(
  config => {
    const userStore = useUserStore()
    const token = userStore.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  response => {
    return response
  },
  error => {
    return Promise.reject(error)
  }
)

export default request
