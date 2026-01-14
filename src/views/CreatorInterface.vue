<template>
    <div>
        <top-toolbar :specialBackAction="onToolBack" />
        <div class="iframe-container">
            <div v-for="(frame, index) in frames" :key="index" class="iframe-wrapper">
                <iframe :name="frame.name" :src="frame.src" frameborder="0"></iframe>
                <div class="menu">
                    <input v-model="frames[index].username" placeholder="用户名" />
                    <input v-model="frames[index].password" placeholder="密码" />
                    <button @click="handleBtnReload(index)">reload</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import TopToolbar from '@/components/TopToolbar.vue';

@Options({
    components: {
        TopToolbar,
    },
})
export default class CreatorInterface extends Vue {
    frames: { name: string; src: string; username: string; password: string }[] = [
    ];

    simulateip = '';
    controls = [];

    mounted() {
        this.simulateip = (this.$route.query.simulateip as string) || '';
        this.controls = JSON.parse(this.$route.query.controls as string || '[]');

        for (let index = 0; index < this.controls.length; index++) {
            const element: any = this.controls[index];
            let username = element.username;
            let password = element.password;
            let str = `http://${this.simulateip}?userName=${username}&password=${password}`
            this.frames.push({
                name: `window${index}`,
                src: str,
                username: username,
                password: password
            });
        }

    }

    handleBtnReload(index: number) {
        let src = `http://${this.simulateip}?userName=${this.frames[index].username}&password=${this.frames[index].password}`
        this.frames[index].src = '';
        this.$nextTick(() => {
            this.frames[index].src = src;
        });
    }

    // 自定义工具栏上返回的功能
    onToolBack() {
        this.$router.replace("/CreatorMulti")
    }
}
</script>

<style scoped>
.iframe-container {
    display: flex;
    flex-wrap: wrap;
    /* 允许换行 */
    gap: 10px;
    /* iframe 之间的间距 */
}

.iframe-wrapper {
    position:relative;
    flex: 1 1 calc(49%);
    /* 每个 iframe 占据 49% 的宽度，减去间距 */
    min-height: 49vh;
}

.btnreload {
    position: absolute; /* 绝对定位 */
    bottom: 10px; /* 距离底部10px */
    left: 10px; /* 距离左侧10px */
}

.menu {
    display: flex;
    gap: 10px;
}

iframe {
    /* flex: 1 1 calc(100% - 10px); */
    /* 每个 iframe 占据 100% 的宽度，减去间距 */
    min-height: 49vh;
    min-width: 98vh;
    /* 设置最小高度为视口高度的 100% */
}

button {
  padding: 5px 10px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #66b1ff;
}

</style>