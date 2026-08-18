const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'templates')),
  filename: (req, file, cb) => cb(null, `custom_${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage });

// 获取所有模板
router.get('/', (req, res) => {
  const { doc_type } = req.query;
  let query = 'SELECT * FROM templates';
  const params = [];
  if (doc_type) {
    query += ' WHERE doc_type = ?';
    params.push(doc_type);
  }
  query += ' ORDER BY is_builtin DESC, doc_type, version';
  const templates = db.prepare(query).all(...params);
  res.json(templates);
});

// 上传自定义模板
router.post('/upload', upload.single('template'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { name, doc_type } = req.body;
  if (!name || !doc_type) return res.status(400).json({ error: 'Name and doc_type are required' });

  const result = db.prepare(`
    INSERT INTO templates (name, doc_type, version, is_builtin, file_path, config)
    VALUES (?, ?, 'custom', 0, ?, ?)
  `).run(name, doc_type, req.file.path, JSON.stringify({ filename: req.file.filename }));

  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(template);
});

// 删除自定义模板
router.delete('/:id', (req, res) => {
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  if (template.is_builtin) return res.status(400).json({ error: 'Cannot delete built-in template' });

  db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
