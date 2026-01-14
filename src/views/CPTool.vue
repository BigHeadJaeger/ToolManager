<template>
    <div>
        <top-toolbar />
        <h1>CP服数据查询</h1>
        <div class="input-group">
            <select v-model="selectedMode" @change="handleModeChange">
                <option value="test">测试</option>
                <option value="production">正式</option>
            </select>
            <input type="text" placeholder="模块名" v-model="moduleName" />
            <input type="text" placeholder="游戏缩写" v-model="gameAbbreviation" />
            <input type="text" placeholder="用户id" v-model="userId" />
            <button @click="handleSubmit">查询</button>
            <button @click="handleWrite">修改</button>
            <button @click="handleClear">清空</button>
        </div>
        <textarea v-if="showContent" v-model="content" class="content-textarea"></textarea>
    </div>
</template>

<script>
import cpmodule from '@/modules/cp/cpmodule';
import { onBeforeMount, ref } from 'vue';
import TopToolbar from '@/components/TopToolbar.vue';
import { Config } from '@/config/config';
import { ServerMode } from '@/define/define';
import hallmodule from '@/modules/hall/hallmodule';

export default {
    components: {
        TopToolbar,
    },
    setup() {
        const moduleName = ref('');
        const gameAbbreviation = ref('');
        const userId = ref('');
        const showContent = ref(false);
        const content = ref('');
        const selectedMode = ref('production');

        const handleSubmit = () => {
            localStorage.setItem('cptool_cache_moduleName', moduleName.value);
            localStorage.setItem('cptool_cache_gameAbbreviation', gameAbbreviation.value);
            localStorage.setItem('cptool_cache_userId', userId.value);
            localStorage.setItem('cptool_cache_selectedMode', selectedMode.value);

            cpmodule.reqCP("reqtest", {ope:"info", uid: Number(userId.value), modulename: moduleName.value, gamecode:gameAbbreviation.value }, (isOK, data) => {
                content.value = ""
                content.value += JSON.stringify(data.player, null, 2)
                showContent.value = true;
            }, "testtool")
        };

        const handleWrite = () => {
            if (Config.serverMode != 2) {
                alert("非测试环境禁止修改")
                return
            }

            let data = JSON.parse(content.value)

            cpmodule.reqCP("reqtestmodify", { uid: Number(userId.value), newdata: data, ope: "modify" }, (isOK, data) => {
                if (isOK) {
                    alert("修改成功")
                } else {
                    alert("修改失败")
                }
            }, moduleName.value)
        };

        const handleClear = () => { 
            if (Config.serverMode != 2) {
                alert("非测试环境禁止修改")
                return
            }

            cpmodule.reqCP("reqtestmodify", { uid: Number(userId.value), ope: "clear" }, (isOK, data) => {
                if (isOK) {
                    content.value = ""
                    alert("清空成功")
                } else {
                    alert("清空失败")
                }
            }, moduleName.value)
        }

        const handleModeChange = async () => {
            if (selectedMode.value === 'test') {
                Config.serverMode = 2
                cpmodule.reset()
                let res = await cpmodule.wait_initialize()
                if (res) {
                    alert("切换测试环境成功")
                } else {
                    alert("切换测试环境失败")
                }
            } else {
                Config.serverMode = 0
                cpmodule.reset()
                let res = await cpmodule.wait_initialize()
                if (res) {
                    alert("切换正式环境成功")
                } else {
                    alert("切换正式环境失败")
                }
            }
        };

        onBeforeMount(() => {
            moduleName.value = localStorage.getItem('cptool_cache_moduleName') || '';
            gameAbbreviation.value = localStorage.getItem('cptool_cache_gameAbbreviation') || '';
            userId.value = localStorage.getItem('cptool_cache_userId') || '';
            selectedMode.value = localStorage.getItem('cptool_cache_selectedMode') || 'production'

            hallmodule.hallConnectTest.loginHall(ServerMode.Test, () => {
                hallmodule.hallConnect.loginHall(ServerMode.Formal, () => {
                    // 初始化cp模块
                    if (selectedMode.value === 'test') {
                        Config.serverMode = 2
                    } else {
                        Config.serverMode = 0
                    }
                    cpmodule.reset()
                    cpmodule.initialize()
                })
            })

        });

        return {
            moduleName,
            gameAbbreviation,
            userId,
            showContent,
            content,
            handleSubmit,
            handleWrite,
            handleClear,
            selectedMode,
            handleModeChange
        };
    }
};
</script>

<style scoped>
.input-group {
    display: flex;
    gap: 10px;
    padding-left: 50px;
    padding-top: 10px;
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

.content-textarea {
    width: 100%;
    height: 350px;
    margin-top: 10px;
}
</style>
