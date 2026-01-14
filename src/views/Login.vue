<template>
  <div class="login-container">
    <div class="login-box">
      <h2>系统登录</h2>
      <div class="input-group">
        <input type="text" v-model="username" placeholder="用户名">
      </div>
      <div class="input-group">
        <input type="password" v-model="password" placeholder="密码">
      </div>
      <div class="remember-me">
        <input type="checkbox" v-model="rememberMe">
        <span>记住我</span>
      </div>
      <button @click="handleLogin" class="login-button">登录</button>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue } from 'vue-class-component';
import { useUserStore } from '@/stores/user';

export default class Login extends Vue {
  private username = 'admin';
  private password = '123456';
  private rememberMe = false;
  private userStore = useUserStore();

  async handleLogin() {
    try {
      const success = await this.userStore.login(this.username, this.password)
      
      if (success) {
        if (this.rememberMe) {
          // 记住登录状态的其他操作
        }
        this.$router.push('/HomePage')
      }
    } catch (error) {
      console.error('登录失败：', error)
      alert('登录失败，请稍后重试')
    }
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
}

.login-box {
  width: 350px;
  padding: 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
}

.input-group {
  margin-bottom: 20px;
}

input[type="text"],
input[type="password"] {
  width: 100%;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

input[type="text"]:focus,
input[type="password"]:focus {
  border-color: #409eff;
  outline: none;
}

.remember-me {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-button {
  width: 100%;
  padding: 12px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.login-button:hover {
  background-color: #66b1ff;
}
</style>