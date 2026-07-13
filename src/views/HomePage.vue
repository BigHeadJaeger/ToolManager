<template>
  <div class="home-container">
    <header class="header">
      <h1>主页</h1>
    </header>
    <div class="content">
      <section class="feature-section">
        <h2>常用工具</h2>
        <div class="feature-buttons">
          <button
            v-for="feature in commonTools"
            :key="feature.path"
            @click="navigateTo(feature.path)"
            class="feature-btn"
          >
            {{ feature.name }}
          </button>
        </div>
      </section>

      <section class="feature-section">
        <h2>内网服务</h2>
        <div class="feature-buttons">
          <button
            v-for="feature in intranetServices"
            :key="feature.path"
            @click="navigateTo(feature.path)"
            class="feature-btn intranet-btn"
          >
            {{ feature.name }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue } from 'vue-class-component';

export default class HomePage extends Vue {
    private commonTools = [
        { name: 'creator多开工具', path: '/CreatorMulti' },
        { name: '暗炸复盘', path: '/FkazPlayer' },
        { name: '炸鸡复盘', path: '/JawbPlayer' },
        { name: '五星牌复盘', path: '/JawwPlayer' },
        { name: '比鸡复盘', path: '/LybjPlayer' },
        { name: '罗松复盘', path: '/GsssPlayer' },
        { name: '银两工具', path: '/DepositTool' },
        { name: 'CP服工具', path: '/CPTool' },
        { name: 'JSON转Excel', path: '/JsonToExcelTool' },
    ];

    private intranetServices = [
        { name: '服务部署', path: '/ServiceDeploy' },
        { name: '文件浏览器', path: 'http://192.168.42.118:8080/files/' },
        { name: '内网日志', path: 'http://192.168.42.118:4000/' },
    ];

    navigateTo(path: string) {
        if (/^https?:\/\//i.test(path)) {
            window.open(path, '_blank');
            return;
        }
        this.$router.push(path);
    }
}
</script>

<style scoped>
.home-container {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.content {
  margin-top: 20px;
}

.feature-section {
  margin-bottom: 32px;
}

.feature-section h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.feature-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.feature-btn {
  padding: 20px;
  font-size: 16px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.feature-btn:hover {
  background-color: #66b1ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.intranet-btn {
  background-color: #67c23a;
}

.intranet-btn:hover {
  background-color: #85ce61;
}
</style>
