/* eslint-disable */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface AppRuntimeConfig {
  apiUrl?: string
}

interface Window {
  __APP_CONFIG__?: AppRuntimeConfig
}
