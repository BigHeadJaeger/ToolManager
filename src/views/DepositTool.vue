<template>
  <div>
    <top-toolbar :specialBackAction="onToolBack" />
    <div class="deposittool-container">
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
import { ref, onMounted } from 'vue';
import TopToolbar from '@/components/TopToolbar.vue';
import router from '@/router';

export default {
  components: {
    TopToolbar,
  },
  name: 'DepositTool',
  setup() {
    const htmlFilePath = ref(process.env.BASE_URL + 'deposittool.html');

    onMounted(() => {
      console.log('DepositTool 页面已加载');
    });

    const onToolBack = () => {
      router.push("/HomePage")
    }

    return {
      htmlFilePath,
      onToolBack
    };
  }
}
</script>

<style scoped>
.deposittool-container {
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