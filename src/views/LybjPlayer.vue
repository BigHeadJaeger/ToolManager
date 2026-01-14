<template>
  <div>
    <top-toolbar />
    <div class="lybj-player-container">
      <iframe 
        ref="playerFrame" 
        :src="htmlFilePath" 
        width="100%" 
        height="800" 
        frameborder="0"
      >
      </iframe>
    </div>
  </div>
</template>

<script>
import TopToolbar from '@/components/TopToolbar.vue';

export default {
  components: {
    TopToolbar,
  },
  name: 'LybjPlayer',
  data() {
    return {
      // 使用相对路径或绝对路径
      htmlFilePath: process.env.BASE_URL + 'lybjplayer/lybjreplayer.html'
    }
  },
  mounted() {
    // 可以在这里添加一些额外的初始化逻辑
    console.log('LybjPlayer 页面已加载');
  }
}
</script>

<style scoped>
.lybj-player-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}

iframe {
  border: none;
  width: 100%;
  height: 100vh; /* 全屏高度 */
}
</style> 