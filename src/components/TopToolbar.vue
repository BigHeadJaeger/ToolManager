<template>
    <div class="top-toolbar">
        <div class="left">
            <button class="toolbar-btn" @click="handleBack">返回</button>
            <button class="toolbar-btn" @click="goHome">返回首页</button>
        </div>
        <div class="right">
            <button class="toolbar-btn" @click="logout">退出登录</button>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, toRefs } from 'vue';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';

export default defineComponent({
  props: {
    specialBackAction: {
      type: Function,
      required: false,
    },
  },
  setup(props) {
    const userStore = useUserStore();
    const { specialBackAction } = toRefs(props);
    const router = useRouter();

    const handleBack = () => {
      if (specialBackAction.value) {
        specialBackAction.value();
      } else {
        router.go(-1);
      }
    };

    const goHome = () => {
      router.push('/HomePage');
    };

    const logout = () => {
      userStore.logout();
      router.push('/');
    };

    return {
      handleBack,
      goHome,
      logout,
    };
  },
});
</script>

<style scoped>
.top-toolbar {
    height: 50px;
    background-color: #f5f7fa;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #dcdfe6;
}

.toolbar-btn {
    padding: 8px 15px;
    background-color: #409eff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 10px;
}

.toolbar-btn:hover {
    background-color: #66b1ff;
}
</style>