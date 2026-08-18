const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取所有公司
router.get('/', (req, res) => {
  const companies = db.prepare('SELECT * FROM companies ORDER BY created_at DESC').all();
  res.json(companies);
});

// 获取单个公司
router.get('/:id', (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json(company);
});

// 创建公司
router.post('/', (req, res) => {
  const { name, type, address, city, country, phone, email, tax_id, bank_name, bank_account, bank_swift, bank_address } = req.body;
  if (!name) return res.status(400).json({ error: 'Company name is required' });

  const result = db.prepare(`
    INSERT INTO companies (name, type, address, city, country, phone, email, tax_id, bank_name, bank_account, bank_swift, bank_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, type || 'seller', address, city, country, phone, email, tax_id, bank_name, bank_account, bank_swift, bank_address);

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(company);
});

// 更新公司
router.put('/:id', (req, res) => {
  const { name, type, address, city, country, phone, email, tax_id, bank_name, bank_account, bank_swift, bank_address } = req.body;
  const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Company not found' });

  db.prepare(`
    UPDATE companies SET name=?, type=?, address=?, city=?, country=?, phone=?, email=?, tax_id=?,
    bank_name=?, bank_account=?, bank_swift=?, bank_address=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(name || existing.name, type || existing.type, address ?? existing.address, city ?? existing.city,
    country ?? existing.country, phone ?? existing.phone, email ?? existing.email, tax_id ?? existing.tax_id,
    bank_name ?? existing.bank_name, bank_account ?? existing.bank_account, bank_swift ?? existing.bank_swift,
    bank_address ?? existing.bank_address, req.params.id);

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  res.json(company);
});

// 删除公司
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Company not found' });
  res.json({ success: true });
});

module.exports = router;
