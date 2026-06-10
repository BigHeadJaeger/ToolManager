<template>
    <div>
        <top-toolbar />
        <div v-if="showConfigForm" class="config-container">
            <h1>CP服工具配置</h1>
            <div class="config-form">
                <div class="form-item">
                    <label>环境</label>
                    <select v-model="configMode" @change="loadConfigForMode">
                        <option value="test">测试</option>
                        <option value="production">正式</option>
                    </select>
                </div>
                <div class="form-item">
                    <label>appcode</label>
                    <input type="text" v-model="configForm.appcode" placeholder="请输入 appcode" />
                </div>
                <div class="form-item">
                    <label>gameid</label>
                    <input type="text" v-model="configForm.gameid" placeholder="请输入 gameid" />
                </div>
                <div class="form-item">
                    <label>userid</label>
                    <input type="text" v-model="configForm.userid" placeholder="请输入 userid" />
                </div>
                <div class="form-item">
                    <label>用户名</label>
                    <input type="text" v-model="configForm.username" placeholder="请输入用户名" />
                </div>
                <div class="form-item">
                    <label>密码</label>
                    <input type="password" v-model="configForm.password" placeholder="请输入密码" />
                </div>
                <button class="submit-btn" :disabled="connecting" @click="handleConfigSubmit">
                    {{ connecting ? '连接中...' : '确认并进入' }}
                </button>
            </div>
        </div>
        <div v-else>
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
                <button @click="handleReconfig">重新配置</button>
            </div>
            <textarea v-if="showContent" v-model="content" class="content-textarea"></textarea>
        </div>
    </div>
</template>

<script>
import cpmodule from '@/modules/cp/cpmodule';
import { onBeforeMount, ref } from 'vue';
import TopToolbar from '@/components/TopToolbar.vue';
import { Config, applyClientConfig, loadClientConfig, saveClientConfig } from '@/config/config';
import { ServerMode } from '@/define/define';
import hallmodule from '@/modules/hall/hallmodule';

const emptyConfigForm = () => ({
    appcode: '',
    gameid: '',
    userid: '',
    username: '',
    password: '',
});

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
        const showConfigForm = ref(true);
        const connecting = ref(false);
        const configMode = ref('production');
        const configForm = ref(emptyConfigForm());

        const loadConfigForMode = () => {
            const cached = loadClientConfig(configMode.value);
            if (cached) {
                configForm.value = {
                    appcode: cached.appcode,
                    gameid: String(cached.gameid),
                    userid: String(cached.userid ?? ''),
                    username: cached.username,
                    password: cached.password,
                };
            } else {
                configForm.value = emptyConfigForm();
            }
        };

        const validateConfigForm = () => {
            const { appcode, gameid, userid, username, password } = configForm.value;
            if (!appcode.trim()) {
                alert('请填写 appcode');
                return null;
            }
            if (!gameid.trim() || isNaN(Number(gameid))) {
                alert('请填写有效的 gameid');
                return null;
            }
            if (!userid.trim() || isNaN(Number(userid))) {
                alert('请填写有效的 userid');
                return null;
            }
            if (!username.trim()) {
                alert('请填写用户名');
                return null;
            }
            if (!password) {
                alert('请填写密码');
                return null;
            }
            return {
                appcode: appcode.trim(),
                gameid: Number(gameid),
                userid: Number(userid),
                username: username.trim(),
                password,
            };
        };

        const initializeWithMode = (mode) => {
            return new Promise((resolve) => {
                const cached = loadClientConfig(mode);
                if (cached) {
                    applyClientConfig(mode, cached);
                }

                if (mode === 'test') {
                    Config.serverMode = 2;
                    cpmodule.reset();
                    hallmodule.hallConnectTest.loginHall(ServerMode.Test, (success) => {
                        if (success) {
                            cpmodule.initialize((res) => {
                                resolve(!!res);
                            });
                        } else {
                            resolve(false);
                        }
                    });
                } else {
                    Config.serverMode = 0;
                    cpmodule.reset();
                    hallmodule.hallConnect.loginHall(ServerMode.Formal, (success) => {
                        if (success) {
                            cpmodule.initialize((res) => {
                                resolve(!!res);
                            });
                        } else {
                            resolve(false);
                        }
                    });
                }
            });
        };

        const handleConfigSubmit = async () => {
            const config = validateConfigForm();
            if (!config) return;

            connecting.value = true;
            saveClientConfig(configMode.value, config);
            applyClientConfig(configMode.value, config);
            selectedMode.value = configMode.value;

            const success = await initializeWithMode(configMode.value);
            connecting.value = false;

            if (success) {
                showConfigForm.value = false;
            } else {
                alert('连接失败，请检查配置信息后重试');
            }
        };

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
            const cached = loadClientConfig(selectedMode.value);
            if (!cached) {
                alert('当前环境尚未配置，请先填写配置信息');
                configMode.value = selectedMode.value;
                loadConfigForMode();
                showConfigForm.value = true;
                return;
            }

            const success = await initializeWithMode(selectedMode.value);
            if (success) {
                alert(selectedMode.value === 'test' ? '切换测试环境成功' : '切换正式环境成功');
            } else {
                alert(selectedMode.value === 'test' ? '切换测试环境失败' : '切换正式环境失败');
            }
        };

        const handleReconfig = () => {
            configMode.value = selectedMode.value;
            loadConfigForMode();
            showConfigForm.value = true;
        };

        onBeforeMount(() => {
            moduleName.value = localStorage.getItem('cptool_cache_moduleName') || '';
            gameAbbreviation.value = localStorage.getItem('cptool_cache_gameAbbreviation') || '';
            userId.value = localStorage.getItem('cptool_cache_userId') || '';
            selectedMode.value = localStorage.getItem('cptool_cache_selectedMode') || 'production';
            configMode.value = selectedMode.value;
            loadConfigForMode();
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
            handleModeChange,
            showConfigForm,
            connecting,
            configMode,
            configForm,
            loadConfigForMode,
            handleConfigSubmit,
            handleReconfig,
        };
    }
};
</script>

<style scoped>
.config-container {
    padding: 20px 50px;
}

.config-form {
    max-width: 480px;
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.form-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.form-item label {
    font-size: 14px;
    color: #606266;
}

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

button:disabled {
    background-color: #a0cfff;
    cursor: not-allowed;
}

.submit-btn {
    margin-top: 8px;
    align-self: flex-start;
}

input,
select {
    padding: 8px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    outline: none;
}

input:focus,
select:focus {
    border-color: #409eff;
}

.content-textarea {
    width: 100%;
    height: 350px;
    margin-top: 10px;
}
</style>
