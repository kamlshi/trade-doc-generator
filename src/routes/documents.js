const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateExcel } = require('../services/excelService');
const { generatePDF } = require('../services/pdfService');
const path = require('path');
const fs = require('fs');

// 获取所有历史单证
router.get('/', (req, res) => {
  const { doc_type } = req.query;
  let query = `
    SELECT d.*, s.name as seller_name, b.name as buyer_name, t.name as template_name
    FROM documents d
    LEFT JOIN companies s ON d.seller_id = s.id
    LEFT JOIN companies b ON d.buyer_id = b.id
    LEFT JOIN templates t ON d.template_id = t.id
  `;
  const params = [];
  if (doc_type) {
    query += ' WHERE d.doc_type = ?';
    params.push(doc_type);
  }
  query += ' ORDER BY d.created_at DESC';
  const docs = db.prepare(query).all(...params).map(d => ({
    ...d,
    data: JSON.parse(d.data || '{}'),
    items: JSON.parse(d.items || '[]'),
  }));
  res.json(docs);
});

// 获取单个单证
router.get('/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  doc.data = JSON.parse(doc.data || '{}');
  doc.items = JSON.parse(doc.items || '[]');
  res.json(doc);
});

// 保存单证（草稿）
router.post('/', (req, res) => {
  const { doc_type, doc_no, template_id, seller_id, buyer_id, data, items } = req.body;
  if (!doc_type) return res.status(400).json({ error: 'doc_type is required' });

  const result = db.prepare(`
    INSERT INTO documents (doc_type, doc_no, template_id, seller_id, buyer_id, data, items, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
  `).run(doc_type, doc_no, template_id || null, seller_id || null, buyer_id || null,
    JSON.stringify(data || {}), JSON.stringify(items || []));

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
  doc.data = JSON.parse(doc.data || '{}');
  doc.items = JSON.parse(doc.items || '[]');
  res.status(201).json(doc);
});

// 更新单证
router.put('/:id', (req, res) => {
  const { doc_no, template_id, seller_id, buyer_id, data, items, status } = req.body;
  const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Document not found' });

  db.prepare(`
    UPDATE documents SET doc_no=?, template_id=?, seller_id=?, buyer_id=?, data=?, items=?, status=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(doc_no ?? existing.doc_no, template_id ?? existing.template_id, seller_id ?? existing.seller_id,
    buyer_id ?? existing.buyer_id, JSON.stringify(data || JSON.parse(existing.data)),
    JSON.stringify(items || JSON.parse(existing.items)), status || existing.status, req.params.id);

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  doc.data = JSON.parse(doc.data || '{}');
  doc.items = JSON.parse(doc.items || '[]');
  res.json(doc);
});

// 生成并导出单证
router.post('/:id/export', async (req, res) => {
  try {
    const { format, version } = req.body;
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const data = JSON.parse(doc.data || '{}');
    const items = JSON.parse(doc.items || '[]');
    const docVersion = version || 'v1';

    let filePath;
    if (format === 'excel') {
      filePath = await generateExcel(doc.doc_type, docVersion, data, items);
    } else if (format === 'pdf') {
      filePath = await generatePDF(doc.doc_type, docVersion, data, items);
    } else {
      return res.status(400).json({ error: 'Invalid format. Use excel or pdf' });
    }

    const fileName = path.basename(filePath);
    res.json({
      success: true,
      file_path: filePath,
      file_name: fileName,
      download_url: `/api/documents/download/${fileName}`,
    });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
});

// 直接生成导出（不保存）
router.post('/generate', async (req, res) => {
  try {
    const { doc_type, data, items, format, version } = req.body;
    if (!doc_type) return res.status(400).json({ error: 'doc_type is required' });

    const docVersion = version || 'v1';
    let filePath;
    if (format === 'excel') {
      filePath = await generateExcel(doc_type, docVersion, data || {}, items || []);
    } else if (format === 'pdf') {
      filePath = await generatePDF(doc_type, docVersion, data || {}, items || []);
    } else {
      return res.status(400).json({ error: 'Invalid format' });
    }

    const fileName = path.basename(filePath);
    res.json({
      success: true,
      file_name: fileName,
      download_url: `/api/documents/download/${fileName}`,
    });
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: 'Generation failed: ' + err.message });
  }
});

// 下载文件
router.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'exports', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

// 删除单证
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Document not found' });
  res.json({ success: true });
});

// 复制单证
router.post('/:id/duplicate', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const result = db.prepare(`
    INSERT INTO documents (doc_type, doc_no, template_id, seller_id, buyer_id, data, items, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
  `).run(doc.doc_type, doc.doc_no + '_copy', doc.template_id, doc.seller_id, doc.buyer_id, doc.data, doc.items);

  const newDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
  newDoc.data = JSON.parse(newDoc.data || '{}');
  newDoc.items = JSON.parse(newDoc.items || '[]');
  res.status(201).json(newDoc);
});

module.exports = router;
