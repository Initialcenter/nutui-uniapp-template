// store/modules/app.ts
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    // 定义你的 state
  }),
  actions: {
    // 定义你的 actions
	test(){
		console.log('test')
	}
  },
  getters: {
    // 定义你的 getters
  }
})
