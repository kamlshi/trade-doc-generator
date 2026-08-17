const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 公司信息表
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'seller',
    address TEXT,
    city TEXT,
    country TEXT,
    phone TEXT,
    email TEXT,
    tax_id TEXT,
    bank_name TEXT,
    bank_account TEXT,
    bank_swift TEXT,
    bank_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 模板表
db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    version TEXT NOT NULL,
    is_builtin INTEGER DEFAULT 0,
    file_path TEXT,
    config TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 单证历史记录表
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_type TEXT NOT NULL,
    doc_no TEXT,
    template_id INTEGER,
    seller_id INTEGER,
    buyer_id INTEGER,
    data TEXT NOT NULL,
    items TEXT,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES templates(id),
    FOREIGN KEY (seller_id) REFERENCES companies(id),
    FOREIGN KEY (buyer_id) REFERENCES companies(id)
  );
`);

// 字段映射规则表
db.exec(`
  CREATE TABLE IF NOT EXISTS field_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source_columns TEXT NOT NULL,
    target_fields TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 初始化内置模板记录
const initTemplates = db.prepare('SELECT COUNT(*) as cnt FROM templates WHERE is_builtin = 1');
const count = initTemplates.get().cnt;

if (count === 0) {
  const insertTemplate = db.prepare(`
    INSERT INTO templates (name, doc_type, version, is_builtin, config)
    VALUES (?, ?, ?, 1, ?)
  `);

  const builtinTemplates = [
    ['Classic INVOICE', 'invoice', 'v1', JSON.stringify({ style: 'classic', color: '#1a1a2e' })],
    ['Modern INVOICE', 'invoice', 'v2', JSON.stringify({ style: 'modern', color: '#0f3460' })],
    ['Minimal INVOICE', 'invoice', 'v3', JSON.stringify({ style: 'minimal', color: '#333333' })],
    ['Classic PACKING LIST', 'packing', 'v1', JSON.stringify({ style: 'classic', color: '#1a1a2e' })],
    ['Modern PACKING LIST', 'packing', 'v2', JSON.stringify({ style: 'modern', color: '#0f3460' })],
    ['Minimal PACKING LIST', 'packing', 'v3', JSON.stringify({ style: 'minimal', color: '#333333' })],
    ['Classic CONTRACT', 'contract', 'v1', JSON.stringify({ style: 'classic', color: '#1a1a2e' })],
    ['Modern CONTRACT', 'contract', 'v2', JSON.stringify({ style: 'modern', color: '#0f3460' })],
    ['Minimal CONTRACT', 'contract', 'v3', JSON.stringify({ style: 'minimal', color: '#333333' })],
  ];

  const insertMany = db.transaction((templates) => {
    for (const t of templates) {
      insertTemplate.run(...t);
    }
  });
  insertMany(builtinTemplates);
  console.log('Built-in templates initialized.');
}

module.exports = db;
