# 国际贸易单证生成器 · Trade Document Generator

纯前端、零依赖、单文件 HTML 的国际贸易单证生成工具。无需后端、无需安装，双击即可在浏览器中使用。

## 功能

- **三类单证**：商业发票（Commercial Invoice）、装箱单（Packing List）、销售合同（Sales Contract）。
- **多公司模板**：以「公司」维度管理模板，选择不同公司即套用对应的单证版式（青龙经典蓝 / 赤阳现代橙 / 青松简约绿 / 2nd Life 真实版式）。
- **公司管理**：可新增、编辑、删除公司及其模板信息（买方/卖方、地址、银行、条款等）。
- **模板上传与识别**：上传已有 Excel/CSV 单证，按中英文表头自动映射字段并回填。
- **导出**：浏览器直接打印导出 **PDF**（与原版式一致）；一键导出 **Excel**（SheetJS）。
- **本地持久化**：所有公司与单证数据保存在浏览器 localStorage，刷新不丢失。

## 使用

直接用浏览器打开 `index.html` 即可。或访问已部署的网页版：

- CloudStudio 网页版：https://f8953099217743188c85e17b23601432.app.workbuddy.link

## 模板说明

| 公司 | 版式特点 |
| --- | --- |
| 青龙（经典蓝） | 双线边框 + 衬线，稳重正式 |
| 赤阳（现代橙） | 顶部色带 + 卡片化，现代商务 |
| 青松（简约绿） | 极简留白，清爽易读 |
| 2nd Life Solutions GmbH | 还原真实单证版式（含柜型/封条/件数/毛净重明细） |

## 技术栈

- 原生 HTML / CSS / JS（单文件，约 88KB）
- [SheetJS](https://sheetjs.com/)（CDN）用于 Excel 导出
- 浏览器 `window.print()` 用于 PDF 导出

## 目录

- `index.html` — 应用主文件（即 `trade-doc-generator-final.html`）
- `trade-doc-generator-interpretation.html` — 原始 zip 的解读与说明页
