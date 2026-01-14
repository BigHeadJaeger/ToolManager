import { defineStore } from 'pinia';
import request from '@/utils/request';
import { encrypt, decrypt } from '@/utils/crypto';

export const useUserStore = defineStore('user', {
  state: () => ({
    isAuthenticated: false,
    username: '',
    testvalue:'testvalue'
  }),
  
  actions: {
    setToken(token: string) {
      const encryptedToken = encrypt(token);
      
      localStorage.setItem('token', encryptedToken);
    },
    
    getToken(): string | null {
      const encryptedToken = localStorage.getItem('token');
      if (!encryptedToken) return null;
      
      try {
        return decrypt(encryptedToken);
      } catch {
        return null;
      }
    },

    setTest(value){
      this.testvalue = value
    },

    clearToken() {
      localStorage.removeItem('token');
    },
    
    async login(username: string, password: string) {
      try {
        const response = await request.post('/login', {
          username,
          password
        });
        
        if (response.data.code === 0) {
          const { token } = response.data.data;
          this.setToken(token);
          this.isAuthenticated = true;
          this.username = username;
          return true;
        }
        return false;
      } catch (error) {
        console.error('登录失败：', error);
        throw error;
      }
    },
    
    async restoreSession() {
      const token = this.getToken();
      if (!token) return false;
      
      try {
        const response = await request.post('/verify-token');
        if (response.data.code === 0) {
          this.isAuthenticated = true;
          this.username = response.data.data.username;
          return true;
        }

        this.logout();
        return false;
      } catch (error) {
        this.logout();
        throw error;
      }
    },
    
    logout() {
      this.isAuthenticated = false;
      this.username = '';
      this.clearToken();
    }
  }
}); 