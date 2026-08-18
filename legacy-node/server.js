require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 数据库初始化
require('./src/db');

// API 路由
app.use('/api/companies', require('./src/routes/companies'));
app.use('/api/templates', require('./src/routes/templates'));
app.use('/api/documents', require('./src/routes/documents'));
app.use('/api/upload', require('./src/routes/upload'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 前端路由 - 返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  Trade Document Generator`);
  console.log(`  Server running at http://localhost:${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});
