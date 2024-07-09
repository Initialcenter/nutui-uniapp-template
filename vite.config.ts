import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

import Components from "@uni-helper/vite-plugin-uni-components";
import { NutResolver } from "nutui-uniapp";

export default defineConfig({
	plugins: [
		Components({
			resolvers: [NutResolver()],
		}),
		uni()
	],
	build: {
		minify: 'terser',
		terserOptions: {
			compress: {
				//生产环境时移除console
				drop_console: true,
				drop_debugger: true,
			}
		},
	},
});