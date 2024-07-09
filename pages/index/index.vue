<template>
	<view class="content">
		<image class="logo" src="/static/logo.png"></image>
		<view class="text-area">
			<text class="title">{{title}}</text>
		</view>
	</view>
	<nut-button type="primary" @click="submit()">主要按钮</nut-button>

</template>

<script setup lang="ts">
	import { useAppStore } from '@/store/modules/app'
	import { ref } from "vue";
	import request from '@/api/request'
	
	const appStore = useAppStore()

	const title = ref('vue')

	const submit = () => {
		// appStore.test()
		request.default.get('/character/urlPrefix').then(res=>{
			console.log(res,'123')
		}).catch(err=>{
			console.log(err, '---')
		})
	}
</script>

<style>
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.logo {
		height: 200rpx;
		width: 200rpx;
		margin-top: 200rpx;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 50rpx;
	}

	.text-area {
		display: flex;
		justify-content: center;
	}

	.title {
		font-size: 36rpx;
		color: #8f8f94;
	}
</style>