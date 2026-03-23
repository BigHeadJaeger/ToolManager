<template>
  <div>
    <top-toolbar />
    <div class="json-to-excel">
      <h2>JSON 转 Excel 工具</h2>

      <div class="form-group">
        <label class="form-label">文件名</label>
        <input
          type="text"
          v-model="filename"
          placeholder="output.xlsx"
          class="filename-input"
        />
      </div>

      <div class="form-group">
        <label class="form-label">JSON 配置</label>
        <textarea
          v-model="jsonInput"
          placeholder="请在此输入 JSON 配置内容..."
          class="json-textarea"
          spellcheck="false"
        ></textarea>
      </div>

      <div v-if="errorMsg" class="msg error-msg">{{ errorMsg }}</div>
      <div v-if="successMsg" class="msg success-msg">{{ successMsg }}</div>

      <button @click="handleConvert" :disabled="converting" class="convert-btn">
        {{ converting ? '转换中...' : '转换并保存' }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import TopToolbar from '@/components/TopToolbar.vue';
import { JSONToExcelConverter } from '@/modules/jsontoexcel';
import * as XLSX from 'xlsx';

export default {
  components: { TopToolbar },
  setup() {
    const jsonInput = ref('');
    const filename = ref('output.xlsx');
    const errorMsg = ref('');
    const successMsg = ref('');
    const converting = ref(false);

    watch(jsonInput, (val) => {
      const trimmed = val.trim();
      if (!trimmed) return;
      try {
        const parsed = JSON.parse(trimmed);
        const embeddedName = parsed?.__sheet_schemas__?.['_fileName'];
        if (embeddedName) {
          filename.value = embeddedName.endsWith('.xlsx') ? embeddedName : embeddedName + '.xlsx';
        }
      } catch {
        // JSON 未完整输入时忽略解析错误
      }
    });

    async function handleConvert() {
      errorMsg.value = '';
      successMsg.value = '';

      const trimmed = jsonInput.value.trim();
      if (!trimmed) {
        errorMsg.value = '请输入 JSON 配置内容';
        return;
      }

      let jsonData;
      try {
        jsonData = JSON.parse(trimmed);
      } catch (e) {
        errorMsg.value = 'JSON 格式错误：' + e.message;
        return;
      }

      converting.value = true;
      try {
        const converter = new JSONToExcelConverter({
          arraySeparator: '|',
          array2DSeparator: ';'
        });
        const workbook = converter.convert(jsonData);

        let outputFilename = filename.value.trim() || 'output.xlsx';
        if (!outputFilename.toLowerCase().endsWith('.xlsx')) {
          outputFilename += '.xlsx';
        }

        const saved = await saveExcelFile(workbook, outputFilename);
        if (saved) {
          successMsg.value = '文件保存成功！';
        }
      } catch (e) {
        errorMsg.value = '转换失败：' + e.message;
      } finally {
        converting.value = false;
      }
    }

    async function saveExcelFile(workbook, outputFilename) {
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      if (window.showSaveFilePicker) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: outputFilename,
            types: [
              {
                description: 'Excel 文件',
                accept: {
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
                }
              }
            ]
          });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          return true;
        } catch (err) {
          if (err.name === 'AbortError') {
            return false;
          }
          throw err;
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      }
    }

    return { jsonInput, filename, errorMsg, successMsg, converting, handleConvert };
  }
};
</script>

<style scoped>
.json-to-excel {
  max-width: 900px;
  margin: 30px auto;
  padding: 0 20px;
}

.json-to-excel h2 {
  font-size: 22px;
  color: #303133;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
  font-weight: 500;
}

.filename-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  color: #303133;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;
}

.filename-input:focus {
  border-color: #409eff;
}

.json-textarea {
  width: 100%;
  height: 420px;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: #303133;
  box-sizing: border-box;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
  line-height: 1.6;
}

.json-textarea:focus {
  border-color: #409eff;
}

.msg {
  padding: 10px 14px;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 16px;
}

.error-msg {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
}

.success-msg {
  background-color: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}

.convert-btn {
  padding: 10px 32px;
  font-size: 15px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.convert-btn:hover:not(:disabled) {
  background-color: #66b1ff;
}

.convert-btn:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}
</style>
