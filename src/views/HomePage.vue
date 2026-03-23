<template>
  <div class="home-container">
    <header class="header">
      <h1>主页</h1>
      <button @click="handleLogout" class="logout-btn">退出登录</button>
    </header>
    <div class="content">
      <h2>功能</h2>
      <div class="feature-buttons">
        <button 
          v-for="feature in features" 
          :key="feature.path"
          @click="navigateTo(feature.path)"
          class="feature-btn"
        >
          {{ feature.name }}
        </button>
        <!-- <button @click="test()">测试</button>
        <button @click="test2()">测试2</button> -->
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue } from 'vue-class-component';
import { useUserStore } from '@/stores/user';


export default class HomePage extends Vue {
    private userStore = useUserStore();

    private features = [
        { name: 'creator多开工具', path: '/CreatorMulti' },
        { name: '暗炸复盘', path: '/FkazPlayer' },
        { name: '炸鸡复盘', path: '/JawbPlayer' },
        { name: '五星牌复盘', path: '/JawwPlayer' },
        { name: '比鸡复盘', path: '/LybjPlayer' },
        { name: '罗松复盘', path: '/GsssPlayer' },
        { name: '银两工具', path: '/DepositTool' },
        { name: 'CP服工具', path: '/CPTool' },
        { name: 'JSON转Excel', path: '/JsonToExcelTool' },
        // { name: '数据统计', path: '/statistics' },
        // { name: '系统设置', path: '/settings' }
    ];

    get username() {
        return this.userStore.username;
    }

    handleLogout() {
        this.userStore.logout();
        this.$router.push('/');
    }

    navigateTo(path: string) {
        this.$router.push(path);
    }

    test() {
        console.log();
    }

    test2() {

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

.logout-btn {
  padding: 8px 16px;
  background-color: #f56c6c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.content {
  margin-top: 20px;
}

.feature-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
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
</style> 