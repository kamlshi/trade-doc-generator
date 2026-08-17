# Trade Document Generator

国际贸易单证自动化生成工具，支持 INVOICE、PACKING LIST、CONTRACT 三种单证，AI 自动识别表格字段，导出 PDF 和 Excel 格式。

## 功能特性

- 三种单证类型：Commercial INVOICE / PACKING LIST / SALES CONTRACT
- 3 套内置模板风格：Classic / Modern / Minimal
- 支持上传自定义 Excel 模板
- AI 自动识别上传的 Excel/CSV 表格字段（支持规则匹配 + 可配置 AI 接口）
- 字段映射人工确认与调整
- 公司信息管理（卖方/买方）
- 单证历史记录保存与复用
- 实时预览
- 导出 PDF 和 Excel 两种格式
- 纯英文单证内容（国际贸易惯例）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
npm start
```

### 3. 访问应用

打开浏览器访问：http://localhost:3000

## 配置 AI 字段识别（可选）

复制 `.env.example` 为 `.env`，填入你的 AI API 配置：

```
AI_API_KEY=your_api_key
AI_API_ENDPOINT=https://api.openai.com/v1/chat/completions
AI_MODEL=gpt-4
```

不配置时使用内置规则匹配识别字段。

## 项目结构

```
trade-doc-generator/
├── server.js              # Express 服务入口
├── package.json
├── .env                   # 环境变量
├── data/                  # SQLite 数据库
├── uploads/               # 上传的临时文件
├── exports/               # 导出的 PDF/Excel
├── templates/             # 用户上传的自定义模板
├── public/                # 前端静态文件
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── src/
    ├── db.js              # 数据库初始化
    ├── routes/
    │   ├── companies.js   # 公司管理 API
    │   ├── templates.js   # 模板管理 API
    │   ├── documents.js   # 单证生成与历史 API
    │   └── upload.js      # 表格上传与字段识别 API
    ├── services/
    │   ├── excelService.js # Excel 生成
    │   └── pdfService.js   # PDF 生成
    └── utils/
        └── fieldMapper.js  # 字段识别（规则+AI）
```

## API 接口

- `GET /api/companies` - 获取公司列表
- `POST /api/companies` - 创建公司
- `PUT /api/companies/:id` - 更新公司
- `DELETE /api/companies/:id` - 删除公司
- `GET /api/templates` - 获取模板列表
- `POST /api/templates/upload` - 上传自定义模板
- `GET /api/documents` - 获取历史单证
- `POST /api/documents` - 保存单证
- `POST /api/documents/generate` - 直接生成导出
- `POST /api/documents/:id/export` - 导出历史单证
- `POST /api/upload/recognize` - 上传表格并 AI 识别字段
