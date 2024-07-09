import { createApp } from 'vue'
import { createPinia, defineStore } from 'pinia'

// 自动导入模块
const modulesFiles = import.meta.glob('./modules/*.js')
const modules = {}

for (const path in modulesFiles) {
  modulesFiles[path]().then((mod) => {
    const moduleName = path.replace(/^\.\/modules\/(.*)\.\w+$/, '$1')
    modules[moduleName] = mod.default
  })
}

const store = createPinia()

// 注册 Pinia
export const setupStore = (app) => {
  app.use(store)
  return app
}

export default store
export { modules }
