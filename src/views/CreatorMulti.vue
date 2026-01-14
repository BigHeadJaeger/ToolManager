<template>
  <div>
    <top-toolbar />
    <div class="creator-multi">
      <div class="input-button-container">
          <input type="text" v-model="simulateip" placeholder="模拟器ip和端口">
          <button @click="handleConfirm">确定</button>
      </div>

      <div class="content-area">
        <div class="left-panel">
          <h3>多开用户列表</h3>
          
          <div class="controls-container">
            <div v-for="(control, index) in controls" :key="index" class="control-item">
              <input type="text" v-model="control.username" placeholder="用户名" class="control-input" readonly>
              <button @click="handleControlDelete(index)">移除</button>
            </div>
          </div>
        </div>

        <div class="right-panel">
          <h3>账号库</h3>

          <div class="add-button">
            <button @click="addControl">新增</button>
          </div>
          <div class="save-button">
            <button @click="saveuserinfo">保存</button>
          </div>

          <div class="controls-container">
            <div v-for="(control, index) in savedControls" :key="index" class="control-item">
              <input type="text" v-model="control.username" placeholder="用户名" class="control-input">
              <input type="text" v-model="control.password" placeholder="密码" class="control-input">
              <button @click="handleControlAdd(index)">添加</button>
              <button @click="handleControlRemove(index)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import TopToolbar from '@/components/TopToolbar.vue';
import { useRouter } from 'vue-router';

export default {
  components: {
    TopToolbar,
  },
  setup() {
    const simulateip = ref('192.168.42.118:7456');
    const controls = ref([]);
    const savedControls = ref([]);
    const router = useRouter();

    const handleConfirm = () => {
      console.log('搜索内容：', simulateip.value);
      localStorage.setItem('simulateip', simulateip.value);
      localStorage.setItem('controls', JSON.stringify(controls.value));
      localStorage.setItem('savecontrols', JSON.stringify(savedControls.value))

      // 使用 Vue Router 导航到 CreatorInterface.vue
      router.push({ 
        name: 'CreatorInterface',
        query: {
          simulateip: simulateip.value,
          controls: JSON.stringify(controls.value)
        }
      });
    };

    onMounted(() => {
      simulateip.value = localStorage.getItem('simulateip') || '192.168.42.118:7456';
      controls.value = JSON.parse(localStorage.getItem('controls')) || [];
      savedControls.value = JSON.parse(localStorage.getItem('savecontrols')) || [];
    });

    const addControl = () => {
      savedControls.value.push({
        username: '',
        password: ''
      });
    };

    const saveuserinfo = () => {
      localStorage.setItem('savecontrols', JSON.stringify(savedControls.value))
    };
    

    const handleControlSave = (index) => {
      const control = controls.value[index];
      console.log(`控件${index}的数据:`, control);
      savedControls.value.push(control);
    };

    const handleControlDelete = (index) => {
      controls.value.splice(index, 1);
    };

    const handleControlAdd = (index) => {
      controls.value.push({
        username: savedControls.value[index].username,
        password: savedControls.value[index].password
      });
    };

    const handleControlRemove = (index) => {
      savedControls.value.splice(index, 1);
    };

    return {
      simulateip,
      controls,
      savedControls,
      handleConfirm,
      addControl,
      handleControlSave,
      handleControlDelete,
      handleControlAdd,
      handleControlRemove,
      saveuserinfo
    };
  },
};
</script>

<style scoped>
.creator-multi {
  padding: 20px;
}

.content-area {
  display: flex; /* 使用 flexbox 布局 */
  margin-top: 20px;
  min-height: 400px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.left-panel {
  flex: 1; /* 左侧区域占据剩余空间 */
  padding: 20px;
  border-right: 1px solid #dcdfe6; /* 右边框 */
  position: relative; /* 使加号按钮相对定位 */
}

.right-panel {
  flex: 1; /* 右侧区域占据剩余空间 */
  padding: 20px;
  position: relative; /* 使加号按钮相对定位 */

}

.add-button {
  position: absolute; /* 绝对定位 */
  top: 10px; /* 距离顶部10px */
  right: 10px; /* 距离右侧10px */
}

.save-button {
  position: absolute; /* 绝对定位 */
  top: 10px; /* 距离顶部10px */
  right: 70px; /* 距离右侧10px */
}

.controls-container {
  margin-top: 30px;
}

.control-item {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  align-items: center;
}

.control-input {
  width: 200px;
}

.circle-button {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background-color: #409eff;
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.circle-button:hover {
  background-color: #66b1ff;
}

button {
  padding: 8px 15px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #66b1ff;
}

input {
  padding: 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  outline: none;
}

input:focus {
  border-color: #409eff;
}

.input-button-container {
  display: flex; /* 使用 flexbox 布局 */
  align-items: center; /* 垂直居中对齐 */
}

.input-button-container input {
  margin-right: 10px; /* 输入框和按钮之间的间距 */
}
</style>