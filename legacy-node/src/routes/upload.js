const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { aiMapFields, autoMapFields } = require('../utils/fieldMapper');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage });

// 上传表格并识别字段
router.post('/recognize', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let headers = [];
    let rows = [];

    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.worksheets[0];

      worksheet.eachRow((row, rowNumber) => {
        const rowData = row.values.slice(1); // 去掉第一个空元素
        if (rowNumber === 1) {
          headers = rowData.map(h => String(h || '').trim());
        } else {
          const rowObj = {};
          headers.forEach((h, i) => { rowObj[h] = rowData[i] || ''; });
          if (Object.values(rowObj).some(v => v !== '')) rows.push(rowObj);
        }
      });
    } else if (ext === '.csv') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split(/\r?\n/).filter(l => l.trim());
      if (lines.length > 0) {
        headers = parseCSVLine(lines[0]);
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const rowObj = {};
          headers.forEach((h, idx) => { rowObj[h] = values[idx] || ''; });
          if (Object.values(rowObj).some(v => v !== '')) rows.push(rowObj);
        }
      }
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Use .xlsx, .xls, or .csv' });
    }

    // 使用 AI 或规则识别字段
    const mapping = await aiMapFields(headers, rows);

    // 清理上传的临时文件
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      headers,
      row_count: rows.length,
      sample_data: rows.slice(0, 5),
      all_data: rows,
      field_mapping: mapping,
      recognized_count: Object.values(mapping).filter(v => v !== null).length,
      total_fields: headers.length,
    });
  } catch (err) {
    console.error('Upload recognition error:', err);
    res.status(500).json({ error: 'Recognition failed: ' + err.message });
  }
});

// 手动确认映射并转换数据
router.post('/map', (req, res) => {
  const { headers, rows, mapping } = req.body;
  if (!headers || !rows || !mapping) {
    return res.status(400).json({ error: 'headers, rows, and mapping are required' });
  }

  const mappedItems = rows.map(row => {
    const item = {};
    headers.forEach(header => {
      const targetField = mapping[header];
      if (targetField) {
        item[targetField] = row[header] || '';
      }
    });
    return item;
  });

  res.json({
    success: true,
    items: mappedItems,
    count: mappedItems.length,
  });
});

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

module.exports = router;
