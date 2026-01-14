import axios from 'axios'
import { useUserStore } from '@/stores/user'
import router from '@/router'
import { ERROR_CODE } from '@/define/define'

// 创建 axios 实例
const request = axios.create({
  baseURL: process.env.VUE_APP_API_URL || '/api',
  timeout: 50000
})

// 请求重试配置
const retryDelay = 1000 // 重试间隔时间
const maxRetries = 3    // 最大重试次数

// 请求拦截器
request.interceptors.request.use(
  config => {
    const userStore = useUserStore()
    const token = userStore.getToken()
    if (token) {
      // 添加到请求头
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    return response
  },
  async error => {
    const userStore = useUserStore()
    
    // 处理 401 未授权错误
    if (error.response?.status === ERROR_CODE.TOKEN_ERROR) {
      userStore.logout()
      router.push('/')
    }
    
    return Promise.reject(error)
  }
)

export default request 