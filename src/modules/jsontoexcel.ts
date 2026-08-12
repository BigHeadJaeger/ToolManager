import * as XLSX from 'xlsx';

const DEBUG = 0

interface ConvertOptions {
    /** 是否自动推断数据类型 */
    autoTypeInference?: boolean;
    /** 数组分隔符，默认为逗号 */
    arraySeparator?: string;
    /** 是否忽略空行 */
    skipEmptyRows?: boolean;
}

/**
 * 灵活的 Excel 到 JSON 转换器
 * 支持多工作表的复杂 JSON 结构生成
 */
export class FlexibleExcelToJSONConverter {
    private options: Required<ConvertOptions>;

    constructor(options: ConvertOptions = {}) {
        this.options = {
            autoTypeInference: options.autoTypeInference ?? true,
            arraySeparator: options.arraySeparator ?? ',',
            skipEmptyRows: options.skipEmptyRows ?? true
        };
    }

    /**
     * 转换 Excel 文件为 JSON
     */
    public convertFile(filePath: string): any {
        try {
            const workbook = (XLSX as any).readFile(filePath);
            const result: any = {};
            let configData: any[] | null = null;
            const sheetSchemas: any = {}; // 存储工作表的 schema 信息
            const allSheetData: any = {}; // 存储所有工作表的原始数据

            // 保存原始文件名（不含路径和扩展名）
            const fileName = filePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || '';
            sheetSchemas['_fileName'] = fileName;

            // 第一遍：处理所有非 config 工作表
            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const { data, schema } = this.convertWorksheetWithSchema(worksheet, sheetName);

                if (sheetName === 'config') {
                    // 保存 config 数据稍后处理
                    configData = data;
                    // 保存 config 的 schema
                    if (schema) {
                        sheetSchemas['config'] = schema;
                    }
                } else {
                    // 其他工作表作为数组数据
                    result[sheetName] = data;
                    allSheetData[sheetName] = data;
                    // 保存 schema 信息
                    if (schema) {
                        sheetSchemas[sheetName] = schema;
                    }
                }
            }

            // 第二遍：处理 config 数据，这时所有工作表数据都已加载
            let roottblkey: string[] = [];
            if (configData) {
                this.mergeConfigData(result, configData, roottblkey, allSheetData, sheetSchemas);
            }
            this.processInlineSheetReferences(result);

            let deletedSheets: string[] = [];
            for (const sheetName in result) {
                let find = roottblkey.find((key) => {
                    return sheetName == key
                })

                if (this.isRelationalTable(result[sheetName]) && !find) {
                    deletedSheets.push(sheetName);
                }
            }
            for (const sheetName of deletedSheets) {
                delete result[sheetName];
                // 注意：不删除 schema，保留所有原始工作表的 schema
            }

            this.clearkey(result)

            // 将 config 数据合并到 schema 元数据中
            if (configData && configData.length > 0) {
                sheetSchemas.configData = configData;
            }

            // 添加 schema 元数据到结果中
            result.__sheet_schemas__ = sheetSchemas;

            return result;
        } catch (error) {
            throw new Error(`转换失败：${error.message}`);
        }
    }

    private clearkey(result: any) {
        for (let key in result) {
            let type = {}.toString.call(result[key])
            if (type === "[object Object]" || type === "[object Array]") {
                this.clearkey(result[key])
            }
            else {
                if (/^<.*>$/.test(key)) {
                    delete result[key]
                }
            }
        }
    }


    /**
     * 转换单个工作表
     * 检测备注行：如果第一行第一个单元格以 '#' 或 '//' 或包含 '备注' 等标识开头，则跳过该行
     */
    private convertWorksheet(worksheet: any, sheetName: string): any[] {
        const { data } = this.convertWorksheetWithSchema(worksheet, sheetName);
        return data;
    }

    /**
     * 转换单个工作表并提取 schema 信息
     * 返回数据和 schema 对象
     */
    private convertWorksheetWithSchema(worksheet: any, sheetName: string): { data: any[]; schema: any | null } {
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: undefined,
            blankrows: true  // 包含空行，这样可以保持原始行号对应关系
        }) as any[][];

        if (rawData.length === 0) {
            return { data: [], schema: null };
        }

        let headerRowIndex = 0;
        let dataStartIndex = 1;

        // 检查第一行是否为明确标识的备注行
        if (rawData.length >= 2 && this.isExplicitCommentRow(rawData[0])) {
            // 第一行是备注行，使用第二行作为表头
            headerRowIndex = 1;
            dataStartIndex = 2;
        }

        // 确保有足够的数据行
        if (rawData.length <= headerRowIndex) {
            return { data: [], schema: null };
        }

        const headerRow = rawData[headerRowIndex];
        const dataRows = rawData.slice(dataStartIndex);

        // 提取 schema 信息
        const schema: any = {
            headerRowIndex,
            headerRow: [...headerRow],
            hasCommentRow: this.isExplicitCommentRow(rawData[0])
        };

        // 保存备注行内容
        if (schema.hasCommentRow && rawData.length > 0) {
            schema.commentRow = [...rawData[0]];
        }

        // 检测字段名冲突：外键字段 <xxx> 和数据字段 xxx 同时存在
        const foreignKeyFields: Set<string> = new Set();
        const dataFields: Set<string> = new Set();
        for (const h of headerRow) {
            if (!h) continue;
            if (h.startsWith('<') && h.endsWith('>')) {
                foreignKeyFields.add(h.slice(1, -1));
            } else {
                const cleanH = h.replace(/@\([^)]*\)$/, '').replace(/\[\]$/, '');
                dataFields.add(cleanH);
            }
        }
        // 找出冲突的字段名
        const conflictingFields: string[] = [];
        for (const fk of foreignKeyFields) {
            if (dataFields.has(fk)) {
                conflictingFields.push(fk);
            }
        }
        // 如果有冲突，保存冲突字段列表到 schema
        if (conflictingFields.length > 0) {
            schema.conflictingFields = conflictingFields;
        }

        const result: any[] = [];

        for (const row of dataRows) {
            if (this.options.skipEmptyRows && this.isEmptyRow(row)) {
                continue;
            }

            const record: any = {};

            for (let i = 0; i < headerRow.length; i++) {
                const header = headerRow[i];
                const cellValue = row[i];

                if (!header) {
                    continue;
                }

                // 对于@sheet 引用，即使值为空也要处理
                if (this.isEndWithSheetTag(header)) {
                    this.handleSheetReference(record, header, sheetName);
                    continue;
                }

                if (cellValue === undefined || cellValue === null || cellValue === '') {
                    continue;
                }

                // 对于外键字段 <xxx>，只保存带<>的标记值，用于内部关联查找
                // 不带<>的同名字段只有当表头中显式存在时才由正常流程写入
                if (header.startsWith('<') && header.endsWith('>')) {
                    const fkField = header.slice(1, -1);
                    record[`<${fkField}>`] = cellValue;
                } else {
                    this.setNestedValue(record, header, cellValue);
                }
            }

            if (Object.keys(record).length > 0) {
                result.push(record);
            }
        }

        return { data: result, schema };
    }

    /**
     * 合并 config 数据到根对象
     */
    private mergeConfigData(result: any, configData: any[], roottblkey: string[], allSheetData?: any, sheetSchemas?: any): void {
        for (const item of configData) {
            if (item.key) {
                // 检查是否是工作表引用 (@sheet 语法)
                if (this.isEndWithSheetTag(item.key)) {
                    const cleanKey = this.extractPrefixStrict(item.key);
                    const sheetName = this.extractSheetTagContent(item.key);

                    // 将指定工作表的数据设置到指定路径
                    if (cleanKey != sheetName && result[sheetName]) {
                        this.setNestedValue(result, cleanKey, result[sheetName]);
                        // 删除原始工作表数据，避免重复
                        delete result[sheetName];
                    } else {
                        roottblkey.push(sheetName)
                    }
                } else {
                    this.setNestedValue(result, item.key, item.value);
                }
            }
        }
    }

    /**
     * 解析字段路径，支持 test[]@(string) 等组合写法
     */
    private parseFieldPath(path: string): { fieldPath: string; isArray: boolean; type: string | null } {
        let remaining = path;
        let type: string | null = null;

        if (this.isEndWithTypeTag(remaining)) {
            type = this.extractTypeTagContent(remaining);
            remaining = this.extractTypePrefixStrict(remaining) || remaining;
        }

        const isArray = remaining.endsWith('[]');
        const fieldPath = isArray ? remaining.slice(0, -2) : remaining;

        return { fieldPath, isArray, type };
    }

    /**
     * 设置嵌套值
     */
    private setNestedValue(obj: any, path: string, value: any): void {
        const { fieldPath, isArray, type } = this.parseFieldPath(path);
        const pathParts = fieldPath.split('.');

        let current = obj;

        // 遍历路径到最后一级
        for (let i = 0; i < pathParts.length - 1; i++) {
            const key = pathParts[i];
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }

        const finalKey = pathParts[pathParts.length - 1];

        // 对于@sheet 引用，直接设置值，不进行数组处理
        if (Array.isArray(value)) {
            current[finalKey] = value;
            return;
        }

        const processedValue = this.processValue(value, isArray, type);

        if (isArray) {
            if (!current[finalKey]) {
                current[finalKey] = [];
            }
            if (Array.isArray(processedValue)) {
                current[finalKey].push(...processedValue);
            } else {
                current[finalKey].push(processedValue);
            }
        } else {
            current[finalKey] = processedValue;
        }
    }

    /**
     * 处理 @sheet 引用语法
     * 格式：somestruct.v3@sheet<>
     */
    private handleSheetReference(obj: any, path: string, sourcesheet: string): void {
        const targetPath = this.extractPrefixStrict(path);
        const sheetName = this.extractSheetTagContent(path);


        // 存储引用信息，延迟处理
        if (!obj._sheetReferences) {
            obj._sheetReferences = [];
        }

        obj._sheetReferences.push({
            targetPath: targetPath.trim(),
            sheetName: sheetName.trim(),
            sourceValue: sourcesheet // 保存原始值以备后用
        });
    }

    /**
     * 处理值
     */
    private processValue(value: any, isArray: boolean, type: string | null): any {
        if (value === undefined || value === null) {
            return value;
        }

        const stringValue = String(value).trim();
        const forceString = type === 'string';

        if (isArray) {
            return stringValue.split(this.options.arraySeparator)
                .map(v => v.trim())
                .filter(v => v !== '')
                .map(v => {
                    // 检查是否是嵌套数组（用;分隔的二级数组）
                    if (v.includes(';')) {
                        return v.split(';').map(subV => {
                            const trimmed = subV.trim();
                            return forceString ? trimmed : this.inferType(trimmed);
                        });
                    }
                    return forceString ? v : this.inferType(v);
                });
        }

        if (forceString) {
            return stringValue;
        }

        return this.inferType(stringValue);
    }

    /**
     * 类型推断
     */
    private inferType(value: string): any {
        if (!this.options.autoTypeInference) {
            return value;
        }

        // 检查布尔值
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'true') return true;
        if (lowerValue === 'false') return false;

        // 检查 null
        if (lowerValue === 'null' || lowerValue === '') return null;

        // 检查数字
        if (/^-?\d+$/.test(value)) {
            return parseInt(value, 10);
        }

        if (/^-?\d*\.\d+$/.test(value)) {
            return parseFloat(value);
        }

        return value;
    }

    /**
     * 处理行内@sheet 引用
     * 处理在主表中直接指定的@sheet@表名引用
     */
    private processInlineSheetReferences(result: any): void {

        // 递归查找和处理所有_sheetReferences
        this.processSheetReferencesRecursive(result, result);
    }

    /**
     * 递归处理@sheet 引用
     */
    private processSheetReferencesRecursive(obj: any, rootResult: any): void {
        if (!obj || typeof obj !== 'object') {
            return;
        }

        // 处理当前对象的@sheet 引用
        if (obj._sheetReferences && Array.isArray(obj._sheetReferences)) {
            for (const ref of obj._sheetReferences) {
                this.resolveSheetReference(obj, ref, rootResult);
            }

            // 清理引用信息
            delete obj._sheetReferences;
        }

        // 递归处理子对象和数组
        if (Array.isArray(obj)) {
            for (const item of obj) {
                this.processSheetReferencesRecursive(item, rootResult);
            }
        } else {
            for (const key in obj) {
                if (key !== '_sheetReferences') {
                    this.processSheetReferencesRecursive(obj[key], rootResult);
                }
            }
        }
    }

    /**
     * 解析单个@sheet 引用
     */
    private resolveSheetReference(parentObj: any, reference: any, rootResult: any): void {
        const { targetPath, sheetName, sourceValue } = reference;


        // 获取关联表数据
        const sheetData = rootResult[sheetName];
        if (!sheetData) {
            // console.warn(`找不到引用的工作表：${sheetName}`);
            return;
        }

        // 确定外键字段（从关联表推导）
        const foreignKeyField = this.findForeignKeyField(sheetData, parentObj);
        if (foreignKeyField.length == 0) {
            // console.warn(`无法确定关联表 ${sheetName} 的外键字段`);
            return;
        }

        let primaryKeyValues = []
        let primaryKeyFields = []
        for (let index = 0; index < foreignKeyField.length; index++) {
            const element = foreignKeyField[index];

            const primaryKeyField = this.derivePrimaryKeyField(element);
            let primaryKeyValue = parentObj[primaryKeyField];

            if (primaryKeyValue === undefined) {
                primaryKeyValue = parentObj[element]
                if (primaryKeyValue === undefined) {
                    continue;
                }
            }

            primaryKeyValues.push(primaryKeyValue)
            primaryKeyFields.push(element)
        }

        let test1 = sheetData.filter((item: any) => {
            let isok = false
            for (let index = 0; index < primaryKeyValues.length; index++) {
                isok = item[primaryKeyFields[index]] == primaryKeyValues[index]
                if (!isok) {
                    return false
                }
            }
            return isok
        })
        let test2 = test1

        if (test2.length > 0) {
            this.setNestedValue(parentObj, targetPath, test2);
        }
    }


    private isRelationalTable(sheetData: any[]): boolean {
        if (!sheetData || sheetData.length === 0) {
            return false;
        }

        // 如果 sheetData 不是数组，则返回 false
        if (!Array.isArray(sheetData)) {
            return false;
        }

        const firstRecord = sheetData[0];
        const foreignKeyFields = Object.keys(firstRecord).filter(key =>
            /^<.*>$/.test(key)
        );

        if (foreignKeyFields.length > 0) {
            return true;
        }

        return false;
    }

    /**
     * 查找关联表的外键字段
     */
    private findForeignKeyField(sheetData: any[], parentObj: any): string[] | null {
        if (!sheetData || sheetData.length === 0) {
            return null;
        }

        const firstRecord = sheetData[0];
        const foreignKeyFields = Object.keys(firstRecord).filter(key =>
            /^<.*>$/.test(key)
        );

        // 如果只有一个外键字段，直接返回
        if (foreignKeyFields.length === 1) {
            return foreignKeyFields;
        }

        return foreignKeyFields;
    }

    /**
     * 从外键字段推导主键字段
     */
    private derivePrimaryKeyField(foreignKeyField: string): string {
        return foreignKeyField.slice(1, -1)
    }

    /**
     * 获取嵌套值
     */
    private getNestedValue(obj: any, path: string): any {
        const pathParts = path.split('.');
        let current = obj;

        for (const part of pathParts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined;
            }
        }

        return current;
    }

    /**
     * 检查是否为空行
     */
    private isEmptyRow(row: any[]): boolean {
        return !row || row.every(cell =>
            cell === undefined ||
            cell === null ||
            String(cell).trim() === ''
        );
    }

    /**
     * 判断是否为明确标识的备注行
     * 只有当第一个单元格明确包含备注标识时才认为是备注行
     */
    private isExplicitCommentRow(row: any[]): boolean {
        if (!row || row.length === 0) {
            return false;
        }

        const firstCell = row[0];
        if (firstCell === undefined || firstCell === null) {
            return false;
        }

        const cellText = String(firstCell).trim();

        // 检查明确的备注标识
        const commentPrefixes = ['#'];

        for (const prefix of commentPrefixes) {
            if (cellText.toLowerCase().startsWith(prefix.toLowerCase())) {
                return true;
            }
        }

        return false;
    }


    private isEndWithSheetTag(str: string): boolean {
        return /@sheet<[^>]*>$/.test(str);
    }

    private isEndWithTypeTag(str: string): boolean {
        return /@\([^)]*\)$/.test(str);
    }

    private extractTypeTagContent(str: string): string | null {
        const match = str.match(/@\(([^)]*)\)/);
        return match ? match[1] : null;
    }

    private extractSheetTagContent(str: string): string | null {
        const match = str.match(/@sheet<([^>]*)>$/);
        return match ? match[1] : null;
    }

    private extractPrefixStrict(str: string): string | null {
        const match = str.match(/^([^@]+)@sheet<[^>]*>$/);
        return match ? match[1] : null;
    }

    private extractTypePrefixStrict(str: string): string | null {
        const match = str.match(/^([^@]*)@\(/);
        return match ? match[1] : null;
    }
}

// ==================== JSON 转 Excel 反向转换 ====================

interface ReverseConvertOptions {
    /** 数组分隔符，默认为 | */
    arraySeparator?: string;
    /** 二维数组分隔符，默认为 ; */
    array2DSeparator?: string;
}

interface SheetSchema {
    headerRowIndex: number;
    headerRow: (string | null)[];
    hasCommentRow: boolean;
    commentRow?: (string | null)[]; // 备注行内容
}

/**
 * JSON 转 Excel 转换器
 * 将 JSON 配置反向转换为 Excel 文件
 * 使用 __sheet_schemas__ 元数据来恢复原始表格结构
 */
export class JSONToExcelConverter {
    private options: Required<ReverseConvertOptions>;
    private schemas: Map<string, SheetSchema> = new Map();
    private jsonData: any = {};
    private visitedSheets: Set<string> = new Set(); // 防止循环引用

    constructor(options: ReverseConvertOptions = {}) {
        this.options = {
            arraySeparator: options.arraySeparator ?? '|',
            array2DSeparator: options.array2DSeparator ?? ';'
        };
    }

    /**
     * 将 JSON 转换为 Excel 工作簿
     */
    public convert(jsonData: any): XLSX.WorkBook {
        const workbook = XLSX.utils.book_new();
        this.jsonData = jsonData;
        this.visitedSheets.clear();

        // 提取 schema 元数据（排除 configData）
        const schemas = jsonData.__sheet_schemas__ || {};
        for (const sheetName of Object.keys(schemas)) {
            if (sheetName === 'configData') continue; // configData 不是工作表
            this.schemas.set(sheetName, schemas[sheetName]);
        }

        // 生成 config 工作表
        const configSheetData = this.buildConfigSheet(jsonData);
        const configSheet = XLSX.utils.aoa_to_sheet(configSheetData);
        XLSX.utils.book_append_sheet(workbook, configSheet, 'config');

        // 使用 schema 恢复其他工作表
        for (const [sheetName, schema] of this.schemas.entries()) {
            if (sheetName === 'config') continue; // config 已经处理过了

            // 从 JSON 中提取该工作表的数据
            this.visitedSheets.clear(); // 重置访问标记
            const data = this.extractSheetData(sheetName, jsonData);
            if (data && Array.isArray(data) && data.length > 0) {
                const rows = this.buildSheetFromSchema(sheetName, data, schema);
                const sheet = XLSX.utils.aoa_to_sheet(rows);
                XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
            }
        }

        return workbook;
    }

    /**
     * 从 JSON 中提取指定工作表的数据
     * 支持从嵌套路径中提取数据
     */
    private extractSheetData(sheetName: string, jsonData: any): any[] | null {
        // 防止循环引用
        if (this.visitedSheets.has(sheetName)) {
            return null;
        }
        this.visitedSheets.add(sheetName);

        // 首先尝试直接从顶层获取
        if (jsonData[sheetName] && Array.isArray(jsonData[sheetName])) {
            return jsonData[sheetName];
        }

        // 尝试从 config 中的 @sheet 引用路径获取
        const schemas = jsonData.__sheet_schemas__ || {};
        const configData = schemas.configData || [];
        for (const item of configData) {
            if (item && item.key) {
                // 处理 @sheet 引用
                if (this.isEndWithSheetTag(item.key)) {
                    const targetSheetName = this.extractSheetTagContent(item.key);
                    if (targetSheetName === sheetName) {
                        // 找到引用该工作表的配置
                        const path = this.extractPrefixStrict(item.key);
                        if (path) {
                            const data = this.getNestedValue(jsonData, path);
                            if (data && Array.isArray(data)) {
                                return data;
                            }
                        }
                    }
                }
            }
        }

        // 尝试直接从 extendparam 等嵌套对象中获取
        // 检查是否有工作表数据直接存储在顶层键下
        for (const key of Object.keys(jsonData)) {
            if (key === '__sheet_schemas__') continue;
            const value = jsonData[key];
            if (value && typeof value === 'object') {
                if (Array.isArray(value[sheetName])) {
                    return value[sheetName];
                }
                // 检查嵌套对象
                for (const nestedKey of Object.keys(value)) {
                    if (nestedKey === sheetName && Array.isArray(value[nestedKey])) {
                        return value[nestedKey];
                    }
                }
            }
        }

        // 尝试从其他工作表的嵌套字段中提取并展开数据
        // 这用于处理关联表（如 roominfos, robotsconfig 等）
        const expandedData = this.extractAndExpandNestedData(sheetName, jsonData, true, {});
        if (expandedData && expandedData.length > 0) {
            return expandedData;
        }

        return null;
    }

    /**
     * 从嵌套的 JSON 结构中提取并展开关联表数据
     * @param sheetName 目标工作表名称
     * @param jsonData JSON 数据
     * @param expandSource 是否展开源数据（用于获取外键值）
     * @param inheritedFkFields 从父级继承的外键字段值
     */
    private extractAndExpandNestedData(sheetName: string, jsonData: any, expandSource: boolean = true, inheritedFkFields?: Record<string, any>): any[] | null {
        const result: any[] = [];
        const schemas = jsonData.__sheet_schemas__ || {};
        const configData = schemas.configData || [];

        // 查找包含该 sheetName 的 @sheet 引用字段
        for (const [sourceSheetName, schema] of Object.entries(schemas)) {
            if (sourceSheetName === sheetName || sourceSheetName === 'config' || sourceSheetName === 'configData') continue;

            // 检查 schema 中是否有引用目标工作表的字段
            const headerRow = (schema as any).headerRow || [];
            let hasRefToTarget = false;
            for (const header of headerRow) {
                if (header && this.isEndWithSheetTag(header)) {
                    const refSheetName = this.extractSheetTagContent(header);
                    if (refSheetName === sheetName) {
                        hasRefToTarget = true;
                        break;
                    }
                }
            }

            if (!hasRefToTarget) continue;

            // 获取源工作表的数据
            let sourceData: any[] | null = null;
            if (jsonData[sourceSheetName] && Array.isArray(jsonData[sourceSheetName])) {
                sourceData = jsonData[sourceSheetName];
            }
            
            // 如果源数据不在顶层，尝试从 configData 中的路径获取
            if (!sourceData) {
                for (const item of configData) {
                    if (item && item.key && this.isEndWithSheetTag(item.key)) {
                        const refSheetName = this.extractSheetTagContent(item.key);
                        if (refSheetName === sourceSheetName) {
                            const path = this.extractPrefixStrict(item.key);
                            if (path) {
                                const data = this.getNestedValue(jsonData, path);
                                if (data && Array.isArray(data)) {
                                    sourceData = data;
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // 如果源数据不在顶层，尝试递归展开
            if (!sourceData && expandSource) {
                sourceData = this.extractAndExpandNestedData(sourceSheetName, jsonData, true, inheritedFkFields);
            }

            if (!sourceData) continue;

            // 收集外键字段名（<xxx> 格式的字段）
            const foreignKeyFields: string[] = [];
            for (const h of headerRow) {
                if (h && h.startsWith('<') && h.endsWith('>')) {
                    foreignKeyFields.push(h.slice(1, -1));
                }
            }

            // 从数据中提取并展开
            for (const header of headerRow) {
                if (header && this.isEndWithSheetTag(header)) {
                    const refSheetName = this.extractSheetTagContent(header);
                    if (refSheetName === sheetName) {
                        const cleanHeader = this.removeTypeTag(this.removeSheetTag(header));
                        for (const record of sourceData) {
                            const nestedData = this.getNestedValue(record, cleanHeader);
                            if (nestedData && Array.isArray(nestedData)) {
                                // 构建当前记录的外键值映射
                                // 首先继承父级的外键值
                                const currentFkValues: Record<string, any> = { ...(inheritedFkFields || {}) };
                                
                                // 从源记录中获取外键字段的值
                                // 优先使用带<>的外键字段值，避免被同名的自身数据字段覆盖
                                for (const fkField of foreignKeyFields) {
                                    const bracketedKey = `<${fkField}>`;
                                    if (record[bracketedKey] !== undefined) {
                                        currentFkValues[fkField] = record[bracketedKey];
                                    } else if (record[fkField] !== undefined) {
                                        currentFkValues[fkField] = record[fkField];
                                    }
                                }
                                
                                // 将源记录中的所有字段都作为潜在的外键值传递
                                // 这样即使字段没有用<>包裹，也能传递给子记录
                                // 但只传递目标工作表 schema 中定义的字段
                                const targetSchema = schemas[sheetName] as any;
                                const targetHeaders = targetSchema?.headerRow || [];
                                for (const key of Object.keys(record)) {
                                    if (!currentFkValues.hasOwnProperty(key) && record[key] !== undefined) {
                                        // 检查该字段是否是目标工作表的字段
                                        const isTargetField = targetHeaders.some((h: string) => {
                                            if (!h) return false;
                                            const cleanH = h.replace(/^<(.+)>$/, '$1').replace(/@\([^)]*\)$/, '').replace(/\[\]$/, '');
                                            return cleanH === key;
                                        });
                                        if (isTargetField) {
                                            currentFkValues[key] = record[key];
                                        }
                                    }
                                }
                                
                                // 同时检查带<>的外键字段值（从上一级展开传递下来的）
                                for (const key of Object.keys(record)) {
                                    if (key.startsWith('<') && key.endsWith('>')) {
                                        const cleanKey = key.slice(1, -1);
                                        if (!currentFkValues.hasOwnProperty(cleanKey) && record[key] !== undefined) {
                                            // 检查该字段是否是目标工作表的字段
                                            const isTargetField = targetHeaders.some((h: string) => {
                                                if (!h) return false;
                                                const cleanH = h.replace(/^<(.+)>$/, '$1').replace(/@\([^)]*\)$/, '').replace(/\[\]$/, '');
                                                return cleanH === cleanKey;
                                            });
                                            if (isTargetField) {
                                                currentFkValues[cleanKey] = record[key];
                                            }
                                        }
                                    }
                                }
                                
                                // 检查 schema 中定义的外键字段（<xxx>格式），从源记录中获取对应的值
                                // 这用于处理源记录中没有<>但是有外键字段值的情况
                                for (const h of headerRow) {
                                    if (h && h.startsWith('<') && h.endsWith('>')) {
                                        const fkField = h.slice(1, -1);
                                        // 优先使用带<>的外键字段值
                                        const bracketedKey = `<${fkField}>`;
                                        if (!currentFkValues.hasOwnProperty(fkField)) {
                                            if (record[bracketedKey] !== undefined) {
                                                currentFkValues[fkField] = record[bracketedKey];
                                            } else if (record[fkField] !== undefined) {
                                                currentFkValues[fkField] = record[fkField];
                                            }
                                        }
                                    }
                                }
                                
                                // 添加外键信息到展开的数据中
                                for (const item of nestedData) {
                                    // 复制外键字段
                                    const expandedRecord: any = { ...item };

                                    // 应用继承的外键值
                                    // 外键字段可能带有<>标记，需要分别处理
                                    for (const [fkField, fkValue] of Object.entries(currentFkValues)) {
                                        if (fkValue === undefined) continue;

                                        // 带<>的字段（外键字段）- 直接设置
                                        const bracketedField = `<${fkField}>`;
                                        expandedRecord[bracketedField] = fkValue;

                                        // 不带<>的字段（数据字段）- 只有当展开记录中没有该字段时才设置
                                        // 但如果该字段是冲突字段（既有外键又有数据字段），则不设置
                                        if (expandedRecord[fkField] === undefined) {
                                            // 检查是否是冲突字段
                                            const targetSchema = schemas[sheetName] as any;
                                            const conflictingFields = targetSchema?.conflictingFields || [];
                                            if (!conflictingFields.includes(fkField)) {
                                                expandedRecord[fkField] = fkValue;
                                            }
                                        }
                                    }

                                    result.push(expandedRecord);
                                }
                            }
                        }
                    }
                }
            }
        }

        return result.length > 0 ? result : null;
    }

    /**
     * 移除字段名中的 @sheet<> 标记
     */
    private removeSheetTag(header: string): string {
        return header.replace(/@sheet<[^>]*>$/, '');
    }

    /**
     * 检查字符串是否以 @sheet<> 结尾
     */
    private isEndWithSheetTag(str: string): boolean {
        return /@sheet<[^>]*>$/.test(str);
    }

    /**
     * 提取 @sheet<> 标签内容
     */
    private extractSheetTagContent(str: string): string | null {
        const match = str.match(/@sheet<([^>]*)>$/);
        return match ? match[1] : null;
    }

    /**
     * 提取 @sheet<> 标签前的路径
     */
    private extractPrefixStrict(str: string): string | null {
        const match = str.match(/^([^@]+)@sheet<[^>]*>$/);
        return match ? match[1] : null;
    }

    /**
     * 从嵌套对象中获取值
     */
    // private getNestedValue(obj: any, path: string): any {
    //     const cleanPath = path.replace(/^<(.+)>$/, '$1');
    //     const parts = cleanPath.split('.');
    //     let current = obj;

    //     for (const part of parts) {
    //         if (current && typeof current === 'object' && part in current) {
    //             current = current[part];
    //         } else {
    //             return undefined;
    //         }
    //     }

    //     return current;
    // }

    /**
     * 根据 schema 构建工作表数据
     */
    private buildSheetFromSchema(sheetName: string, data: any[], schema: SheetSchema): any[][] {
        const rows: any[][] = [];

        // 如果有备注行，添加备注内容
        if (schema.hasCommentRow && schema.commentRow) {
            rows.push([...schema.commentRow]);
        } else if (schema.hasCommentRow) {
            const commentRow: string[] = ['#'];
            // 填充空列
            for (let i = 1; i < schema.headerRow.length; i++) {
                commentRow.push(null);
            }
            rows.push(commentRow);
        }

        // 添加表头行
        const headerRow: string[] = [];
        for (const header of schema.headerRow) {
            headerRow.push(header || '');
        }
        rows.push(headerRow);

        // 添加数据行
        for (const record of data) {
            const row: any[] = [];
            for (let i = 0; i < schema.headerRow.length; i++) {
                const header = schema.headerRow[i];
                if (!header) {
                    row.push(null);
                    continue;
                }

                // 检查是否是外键字段 <xxx>
                if (header.startsWith('<') && header.endsWith('>')) {
                    const fkField = header.slice(1, -1);
                    const bracketedKey = `<${fkField}>`;
                    // 优先使用带<>的外键字段值，避免被同名的自身数据字段覆盖
                    if (record[bracketedKey] !== undefined) {
                        row.push(record[bracketedKey]);
                    } else {
                        row.push(record[fkField] !== undefined ? record[fkField] : null);
                    }
                    continue;
                }

                // 检查是否是 @sheet 引用字段
                if (this.isEndWithSheetTag(header)) {
                    // 对于@sheet 引用，输出 null（实际数据在独立的工作表中）
                    row.push(null);
                    continue;
                }

                // 检查是否有 @(string) 类型标记
                const hasStringTag = /@\(string\)$/.test(header);

                // 从嵌套的记录中获取值（去除类型标记和数组标记）
                const cleanHeader = this.removeTypeTag(header).replace(/\[\]$/g, '');
                const value = this.getNestedValue(record, cleanHeader);
                if (value === undefined || value === null) {
                    row.push(null);
                } else if (Array.isArray(value)) {
                    row.push(this.serializeArray(value, hasStringTag));
                } else if (hasStringTag) {
                    // 有 @(string) 标记，强制转为字符串
                    row.push(String(value));
                } else {
                    // 没有类型标记，保持原始类型（数字保持数字）
                    row.push(value);
                }
            }
            rows.push(row);
        }

        return rows;
    }

    /**
     * 移除字段名中的类型标记 @(type)
     */
    private removeTypeTag(header: string): string {
        return header.replace(/@\([^)]*\)$/, '');
    }

    /**
     * 从嵌套对象中获取值
     */
    private getNestedValue(record: any, path: string): any {
        // 处理外键字段 <xxx>
        let cleanPath = path.replace(/^<(.+)>$/, '$1');
        
        // 去除数组标记 []
        cleanPath = cleanPath.replace(/\[\]$/g, '');

        const parts = cleanPath.split('.');
        let current = record;

        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined;
            }
        }

        return current;
    }

    /**
     * 序列化数组为字符串
     * @param forceStringElements 为 true 时（@(string) 数组），每个元素强制转为字符串
     */
    private serializeArray(arr: any[], forceStringElements: boolean = false): string {
        if (arr.length === 0) {
            return '';
        }

        const formatElement = (item: any) => forceStringElements ? String(item) : String(item);

        // 检查是否是二维数组
        if (arr.every(item => Array.isArray(item))) {
            return arr.map(subArr =>
                subArr.map(item => formatElement(item)).join(this.options.array2DSeparator)
            ).join(this.options.arraySeparator);
        }

        return arr.map(item => formatElement(item)).join(this.options.arraySeparator);
    }

    /**
     * 从 config key 解析出 JSON 中的取值路径
     */
    private getConfigValuePath(configKey: string): string | null {
        if (this.isEndWithSheetTag(configKey)) {
            return this.extractPrefixStrict(configKey);
        }

        let path = configKey;
        if (this.isEndWithTypeTag(path)) {
            path = this.extractTypePrefixStrict(path) || path;
        }
        if (path.endsWith('[]')) {
            path = path.slice(0, -2);
        }
        return path;
    }

    /**
     * 将 JSON 值序列化为 config 单元格字符串
     */
    private serializeConfigValue(value: any, configKey?: string): any {
        if (value === undefined || value === null) {
            return undefined;
        }
        const hasStringTag = configKey ? /@\(string\)$/.test(configKey) : false;
        if (Array.isArray(value)) {
            return this.serializeArray(value, hasStringTag);
        }
        if (hasStringTag) {
            return String(value);
        }
        return String(value);
    }

    private isEndWithTypeTag(str: string): boolean {
        return /@\([^)]*\)$/.test(str);
    }

    private extractTypePrefixStrict(str: string): string | null {
        const match = str.match(/^([^@]*)@\(/);
        return match ? match[1] : null;
    }

    /**
     * 构建 config 工作表数据
     */
    private buildConfigSheet(jsonData: any): any[][] {
        const rows: any[][] = [['key', 'value']];

        // 使用 configData 保留 key 结构与顺序，值从 JSON 最外层读取
        const schemas = jsonData.__sheet_schemas__ || {};
        const configData = schemas.configData || [];
        
        // 获取所有顶层工作表名称（用于过滤嵌套工作表的引用）
        const topLevelSheets = new Set<string>();
        for (const item of configData) {
            if (item && item.key && this.isEndWithSheetTag(item.key)) {
                const refSheetName = this.extractSheetTagContent(item.key);
                topLevelSheets.add(refSheetName);
            }
        }
        
        for (const item of configData) {
            if (item && item.key) {
                // 过滤掉嵌套工作表的 @sheet 引用
                if (this.isEndWithSheetTag(item.key)) {
                    const refSheetName = this.extractSheetTagContent(item.key);
                    if (!topLevelSheets.has(refSheetName)) {
                        continue;
                    }
                    rows.push([item.key]);
                    continue;
                }

                const path = this.getConfigValuePath(item.key);
                const rawValue = path ? this.getNestedValue(jsonData, path) : undefined;
                const serialized = this.serializeConfigValue(rawValue, item.key);

                if (serialized !== undefined) {
                    rows.push([item.key, serialized]);
                } else {
                    rows.push([item.key]);
                }
            }
        }

        return rows;
    }

    /**
     * 保存 Excel 文件
     */
    public saveToFile(workbook: XLSX.WorkBook, filePath: string): void {
        XLSX.writeFile(workbook, filePath);
    }
}

// ==================== 命令行入口（仅直接运行本源文件时执行；勿在 bundle 中触发）====================

function __isJsonToExcelMainModule(): boolean {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        if (typeof require === 'undefined' || require.main !== module) return false
        const mainPath = String(require.main?.filename || '').replace(/\\/g, '/')
        // 只认直接跑 jsontoexcel.ts/.js；json-xlsx.cjs 等 bundle 不算
        return /jsontoexcel\.(ts|js|cjs|mjs)$/i.test(mainPath)
    } catch {
        return false
    }
}

if (__isJsonToExcelMainModule()) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeProcess: any = process;

    // 获取命令行参数
    // const args = process.argv.slice(2);
    let reverseMode = false;
    let outputFile: string | undefined;

// 解析命令行参数
// for (let i = 0; i < args.length; i++) {
//     if (args[i] === '--reverse' || args[i] === '-r') {
//         reverseMode = true;
//     } else if (args[i] === '--output' || args[i] === '-o') {
//         outputFile = args[++i];
//     } else if (!args[i].startsWith('-')) {
//         file = args[i];
//     }
// }

    let file = nodeProcess.argv[2];

    if(DEBUG){
        // file = 'src/excelToJSON/125今日运势@dailyluck_lybw@cp@tianqi_common.xlsx'
        file = 'src/excelToJSON/room.json'
        reverseMode = true;

    }


    if (!file) {
        // console.log('用法:');
        // console.log('  Excel 转 JSON: npx ts-node cp@tianqi_common.ts <excel 文件路径>');
        // console.log('  JSON 转 Excel: npx ts-node cp@tianqi_common.ts --reverse <json 文件路径> [-o 输出文件名]');
        // console.log('');
        // console.log('选项:');
        // console.log('  --reverse, -r    启用反向转换模式（JSON 转 Excel）');
        // console.log('  --output, -o     指定输出文件名');
        nodeProcess.exit(0);
    }

    if (reverseMode) {
        // ==================== JSON 转 Excel 模式 ====================
        console.log(`正在将 JSON 转换为 Excel: ${file}`);

        try {
            let fileContent = fs.readFileSync(file, 'utf-8');
            // 处理可能包含 null 字符和文件名的输出格式
            const nullIndex = fileContent.indexOf('\0');
            if (nullIndex !== -1) {
                fileContent = fileContent.substring(0, nullIndex);
            }
            const jsonData = JSON.parse(fileContent);

            const reverseConverter = new JSONToExcelConverter({
                arraySeparator: '|',
                array2DSeparator: ';'
            });

            const workbook = reverseConverter.convert(jsonData);

            if (!outputFile) {
                // 优先使用 schema 中保存的文件名
                const schemas = jsonData.__sheet_schemas__ || {};
                const fileName = schemas._fileName;
                if (fileName) {
                    outputFile = `${fileName}.xlsx`;
                } else {
                    const baseName = file.replace(/\.jsonc?$/i, '');
                    outputFile = `${baseName}.xlsx`;
                }
            }

            XLSX.writeFile(workbook, outputFile);
            console.log(`转换完成！输出文件：${outputFile}`);
        } catch (error: any) {
            console.error('转换失败:', error.message);
            console.error(error.stack);
            nodeProcess.exitCode = 1;
        }
    } else {
        // ==================== Excel 转 JSON 模式 ====================
        let retJson: any = {};

        const converter = new FlexibleExcelToJSONConverter({
            autoTypeInference: true,
            arraySeparator: '|',
            skipEmptyRows: true
        });

        retJson = converter.convertFile(file);

        const nameStrList = file.split('@');
        let outName = outputFile || (nameStrList[1] ? nameStrList[1] + '.json' : 'output.json');

        nodeProcess.stdout.write(JSON.stringify(retJson, null, "    "));
        if(!DEBUG){
            nodeProcess.stdout.write("\0");
            nodeProcess.stdout.write(outName);
        }else{
            // 将 JSON 输出到本地文件
            const jsonPath = file.replace(/\.[^.]+$/, '.json');
            fs.writeFileSync(jsonPath, JSON.stringify(retJson, null, "    "));
            console.log(`\nJSON 已保存到：${jsonPath}`);
        }
    }
}
