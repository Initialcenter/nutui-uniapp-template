// main.ts
import { createSSRApp } from 'vue'
import App from './App.vue'
import { setupStore } from './store'

export function createApp() {
  const app = createSSRApp(App)
  // 调用 setupStore 函数，传入 app 实例
  setupStore(app)
  return {
    app
  }
}
