const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * 生成单证 Excel 文件
 * @param {string} docType - invoice / packing / contract
 * @param {string} version - v1 / v2 / v3
 * @param {Object} data - 单证数据
 * @param {Array} items - 商品明细
 * @returns {string} - 生成的文件路径
 */
async function generateExcel(docType, version, data, items = []) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(docType.toUpperCase(), {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
    margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5 },
  });

  const styles = getStyleConfig(version);
  const filename = `${docType}_${data.doc_no || 'draft'}_${Date.now()}.xlsx`;
  const outputPath = path.join(__dirname, '..', '..', 'exports', filename);

  if (docType === 'invoice') {
    buildInvoiceSheet(worksheet, data, items, styles);
  } else if (docType === 'packing') {
    buildPackingSheet(worksheet, data, items, styles);
  } else if (docType === 'contract') {
    buildContractSheet(worksheet, data, items, styles);
  }

  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

function getStyleConfig(version) {
  const configs = {
    v1: { // Classic
      titleColor: 'FF1A1A2E',
      headerBg: 'FF1A1A2E',
      headerColor: 'FFFFFFFF',
      borderColor: 'FF1A1A2E',
      accentColor: 'FFE94560',
      fontFamily: 'Times New Roman',
    },
    v2: { // Modern
      titleColor: 'FF0F3460',
      headerBg: 'FF0F3460',
      headerColor: 'FFFFFFFF',
      borderColor: 'FF0F3460',
      accentColor: 'FFE94560',
      fontFamily: 'Arial',
    },
    v3: { // Minimal
      titleColor: 'FF333333',
      headerBg: 'FFF5F5F5',
      headerColor: 'FF333333',
      borderColor: 'FFCCCCCC',
      accentColor: 'FF666666',
      fontFamily: 'Calibri',
    },
  };
  return configs[version] || configs.v1;
}

function applyBorder(cell, color) {
  cell.border = {
    top: { style: 'thin', color: { argb: color } },
    left: { style: 'thin', color: { argb: color } },
    bottom: { style: 'thin', color: { argb: color } },
    right: { style: 'thin', color: { argb: color } },
  };
}

function buildInvoiceSheet(ws, data, items, styles) {
  // 列宽
  ws.columns = [
    { width: 5 }, { width: 25 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 15 }
  ];

  let row = 1;

  // 标题
  ws.mergeCells(`A${row}:F${row}`);
  const titleCell = ws.getCell(`A${row}`);
  titleCell.value = 'COMMERCIAL INVOICE';
  titleCell.font = { name: styles.fontFamily, size: 22, bold: true, color: { argb: styles.titleColor } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 40;
  row += 2;

  // 卖方信息
  ws.mergeCells(`A${row}:C${row}`);
  ws.getCell(`A${row}`).value = 'SELLER / EXPORTER';
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10, bold: true, color: { argb: styles.accentColor } };
  ws.mergeCells(`D${row}:F${row}`);
  ws.getCell(`D${row}`).value = 'INVOICE INFORMATION';
  ws.getCell(`D${row}`).font = { name: styles.fontFamily, size: 10, bold: true, color: { argb: styles.accentColor } };
  row++;

  ws.mergeCells(`A${row}:C${row + 3}`);
  ws.getCell(`A${row}`).value = `${data.seller_name || ''}\n${data.seller_address || ''}\n${data.seller_city || ''} ${data.seller_country || ''}\nTel: ${data.seller_phone || ''}  Email: ${data.seller_email || ''}`;
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10 };
  ws.getCell(`A${row}`).alignment = { vertical: 'top', wrapText: true };

  const infoFields = [
    ['Invoice No:', data.invoice_no || ''],
    ['Invoice Date:', data.invoice_date || ''],
    ['Payment Terms:', data.payment_terms || ''],
    ['Delivery Terms:', data.delivery_terms || ''],
  ];
  infoFields.forEach((f, i) => {
    ws.getCell(`D${row + i}`).value = f[0];
    ws.getCell(`D${row + i}`).font = { name: styles.fontFamily, size: 10, bold: true };
    ws.mergeCells(`E${row + i}:F${row + i}`);
    ws.getCell(`E${row + i}`).value = f[1];
    ws.getCell(`E${row + i}`).font = { name: styles.fontFamily, size: 10 };
  });
  row += 4;

  // 买方信息
  ws.mergeCells(`A${row}:C${row}`);
  ws.getCell(`A${row}`).value = 'BUYER / IMPORTER';
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10, bold: true, color: { argb: styles.accentColor } };
  ws.mergeCells(`D${row}:F${row}`);
  ws.getCell(`D${row}`).value = 'SHIPPING INFORMATION';
  ws.getCell(`D${row}`).font = { name: styles.fontFamily, size: 10, bold: true, color: { argb: styles.accentColor } };
  row++;

  ws.mergeCells(`A${row}:C${row + 3}`);
  ws.getCell(`A${row}`).value = `${data.buyer_name || ''}\n${data.buyer_address || ''}\n${data.buyer_city || ''} ${data.buyer_country || ''}\nTel: ${data.buyer_phone || ''}  Email: ${data.buyer_email || ''}`;
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10 };
  ws.getCell(`A${row}`).alignment = { vertical: 'top', wrapText: true };

  const shipFields = [
    ['Port of Loading:', data.port_of_loading || ''],
    ['Port of Destination:', data.port_of_destination || ''],
    ['Currency:', data.currency || 'USD'],
    ['', ''],
  ];
  shipFields.forEach((f, i) => {
    ws.getCell(`D${row + i}`).value = f[0];
    ws.getCell(`D${row + i}`).font = { name: styles.fontFamily, size: 10, bold: true };
    ws.mergeCells(`E${row + i}:F${row + i}`);
    ws.getCell(`E${row + i}`).value = f[1];
    ws.getCell(`E${row + i}`).font = { name: styles.fontFamily, size: 10 };
  });
  row += 5;

  // 商品明细表头
  const headers = ['No.', 'Description', 'Quantity', 'Unit', 'Unit Price', 'Amount'];
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = { name: styles.fontFamily, size: 10, bold: true, color: { argb: styles.headerColor } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: styles.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorder(cell, styles.borderColor);
  });
  ws.getRow(row).height = 25;
  row++;

  // 商品明细
  let totalAmount = 0;
  items.forEach((item, idx) => {
    const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    totalAmount += amount;
    const values = [idx + 1, item.description || '', item.quantity || '', item.unit || '', item.unit_price || '', amount.toFixed(2)];
    values.forEach((v, i) => {
      const cell = ws.getCell(row, i + 1);
      cell.value = v;
      cell.font = { name: styles.fontFamily, size: 10 };
      cell.alignment = { horizontal: i >= 2 ? 'right' : 'left', vertical: 'middle', wrapText: true };
      applyBorder(cell, styles.borderColor);
    });
    ws.getRow(row).height = 20;
    row++;
  });

  // 空行填充
  for (let i = 0; i < Math.max(0, 5 - items.length); i++) {
    for (let j = 1; j <= 6; j++) {
      applyBorder(ws.getCell(row, j), styles.borderColor);
    }
    row++;
  }

  // 总计
  ws.mergeCells(`A${row}:E${row}`);
  ws.getCell(`A${row}`).value = 'TOTAL AMOUNT';
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 11, bold: true };
  ws.getCell(`A${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  const totalCell = ws.getCell(`F${row}`);
  totalCell.value = totalAmount.toFixed(2);
  totalCell.font = { name: styles.fontFamily, size: 11, bold: true, color: { argb: styles.accentColor } };
  totalCell.alignment = { horizontal: 'right', vertical: 'middle' };
  totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  applyBorder(totalCell, styles.borderColor);
  row += 2;

  // 银行信息
  if (data.bank_name) {
    ws.mergeCells(`A${row}:F${row}`);
    ws.getCell(`A${row}`).value = 'BANK INFORMATION';
    ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10, bold: true, color: { argb: styles.accentColor } };
    row++;
    ws.mergeCells(`A${row}:F${row + 2}`);
    ws.getCell(`A${row}`).value = `Bank Name: ${data.bank_name || ''}\nAccount No: ${data.bank_account || ''}\nSWIFT: ${data.bank_swift || ''}\nBank Address: ${data.bank_address || ''}`;
    ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10 };
    ws.getCell(`A${row}`).alignment = { vertical: 'top', wrapText: true };
    row += 3;
  }

  // 签名
  row += 1;
  ws.mergeCells(`A${row}:C${row}`);
  ws.getCell(`A${row}`).value = 'Authorized Signature';
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10, italic: true };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
  ws.mergeCells(`D${row}:F${row}`);
  ws.getCell(`D${row}`).value = 'Company Stamp';
  ws.getCell(`D${row}`).font = { name: styles.fontFamily, size: 10, italic: true };
  ws.getCell(`D${row}`).alignment = { horizontal: 'center' };
}

function buildPackingSheet(ws, data, items, styles) {
  ws.columns = [
    { width: 5 }, { width: 20 }, { width: 18 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 12 }
  ];

  let row = 1;
  ws.mergeCells(`A${row}:G${row}`);
  ws.getCell(`A${row}`).value = 'PACKING LIST';
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 22, bold: true, color: { argb: styles.titleColor } };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 40;
  row += 2;

  // 卖方
  ws.mergeCells(`A${row}:D${row}`);
  ws.getCell(`A${row}`).value = 'SELLER / EXPORTER';
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10, bold: true, color: { argb: styles.accentColor } };
  ws.mergeCells(`E${row}:G${row}`);
  ws.getCell(`E${row}`).value = 'PACKING INFORMATION';
  ws.getCell(`E${row}`).font = { name: styles.fontFamily, size: 10, bold: true, color: { argb: styles.accentColor } };
  row++;

  ws.mergeCells(`A${row}:D${row + 3}`);
  ws.getCell(`A${row}`).value = `${data.seller_name || ''}\n${data.seller_address || ''}\n${data.seller_city || ''} ${data.seller_country || ''}\nTel: ${data.seller_phone || ''}`;
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10 };
  ws.getCell(`A${row}`).alignment = { vertical: 'top', wrapText: true };

  const infoFields = [
    ['Invoice No:', data.invoice_no || ''],
    ['Date:', data.invoice_date || ''],
    ['Payment Terms:', data.payment_terms || ''],
  ];
  infoFields.forEach((f, i) => {
    ws.getCell(`E${row + i}`).value = f[0];
    ws.getCell(`E${row + i}`).font = { name: styles.fontFamily, size: 10, bold: true };
    ws.mergeCells(`F${row + i}:G${row + i}`);
    ws.getCell(`F${row + i}`).value = f[1];
    ws.getCell(`F${row + i}`).font = { name: styles.fontFamily, size: 10 };
  });
  row += 4;

  // 买方
  ws.mergeCells(`A${row}:D${row}`);
  ws.getCell(`A${row}`).value = 'BUYER / CONSIGNEE';
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10, bold: true, color: { argb: styles.accentColor } };
  row++;
  ws.mergeCells(`A${row}:D${row + 2}`);
  ws.getCell(`A${row}`).value = `${data.buyer_name || ''}\n${data.buyer_address || ''}\n${data.buyer_city || ''} ${data.buyer_country || ''}`;
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10 };
  ws.getCell(`A${row}`).alignment = { vertical: 'top', wrapText: true };
  row += 3;

  // 明细表头
  const headers = ['No.', 'Marks & Numbers', 'Description', 'Packages', 'Gross Weight', 'Net Weight', 'Measurement'];
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = { name: styles.fontFamily, size: 10, bold: true, color: { argb: styles.headerColor } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: styles.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyBorder(cell, styles.borderColor);
  });
  ws.getRow(row).height = 30;
  row++;

  let totalPkg = 0, totalGW = 0, totalNW = 0, totalMeas = 0;
  items.forEach((item, idx) => {
    totalPkg += parseFloat(item.packages) || 0;
    totalGW += parseFloat(item.gross_weight) || 0;
    totalNW += parseFloat(item.net_weight) || 0;
    totalMeas += parseFloat(item.measurement) || 0;
    const values = [idx + 1, item.marks_numbers || '', item.description || '', item.packages || '', item.gross_weight || '', item.net_weight || '', item.measurement || ''];
    values.forEach((v, i) => {
      const cell = ws.getCell(row, i + 1);
      cell.value = v;
      cell.font = { name: styles.fontFamily, size: 10 };
      cell.alignment = { horizontal: i >= 3 ? 'right' : 'left', vertical: 'middle', wrapText: true };
      applyBorder(cell, styles.borderColor);
    });
    row++;
  });

  for (let i = 0; i < Math.max(0, 5 - items.length); i++) {
    for (let j = 1; j <= 7; j++) applyBorder(ws.getCell(row, j), styles.borderColor);
    row++;
  }

  // 总计
  const totals = ['', 'TOTAL', '', totalPkg, totalGW.toFixed(2), totalNW.toFixed(2), totalMeas.toFixed(3)];
  totals.forEach((v, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = v;
    cell.font = { name: styles.fontFamily, size: 10, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
    cell.alignment = { horizontal: i >= 3 ? 'right' : 'left', vertical: 'middle' };
    applyBorder(cell, styles.borderColor);
  });
  row += 2;

  ws.mergeCells(`A${row}:G${row}`);
  ws.getCell(`A${row}`).value = `Total Packages: ${totalPkg}    Total Gross Weight: ${totalGW.toFixed(2)} KG    Total Net Weight: ${totalNW.toFixed(2)} KG    Total Measurement: ${totalMeas.toFixed(3)} CBM`;
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10, bold: true };
  row += 2;

  ws.mergeCells(`A${row}:D${row}`);
  ws.getCell(`A${row}`).value = 'Authorized Signature';
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10, italic: true };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
  ws.mergeCells(`E${row}:G${row}`);
  ws.getCell(`E${row}`).value = 'Company Stamp';
  ws.getCell(`E${row}`).font = { name: styles.fontFamily, size: 10, italic: true };
  ws.getCell(`E${row}`).alignment = { horizontal: 'center' };
}

function buildContractSheet(ws, data, items, styles) {
  ws.columns = [{ width: 5 }, { width: 30 }, { width: 12 }, { width: 12 }, { width: 15 }];
  let row = 1;

  ws.mergeCells(`A${row}:E${row}`);
  ws.getCell(`A${row}`).value = 'SALES CONTRACT';
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 22, bold: true, color: { argb: styles.titleColor } };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 40;
  row++;

  ws.mergeCells(`A${row}:E${row}`);
  ws.getCell(`A${row}`).value = `Contract No: ${data.contract_no || ''}    Date: ${data.contract_date || ''}`;
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 11, bold: true };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
  row += 2;

  // 双方信息
  const parties = [
    ['THE SELLER:', data.seller_name, data.seller_address, data.seller_city, data.seller_country],
    ['THE BUYER:', data.buyer_name, data.buyer_address, data.buyer_city, data.buyer_country],
  ];
  parties.forEach((party) => {
    ws.mergeCells(`A${row}:E${row}`);
    ws.getCell(`A${row}`).value = party[0];
    ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 11, bold: true, color: { argb: styles.accentColor } };
    row++;
    ws.mergeCells(`A${row}:E${row + 2}`);
    ws.getCell(`A${row}`).value = `${party[1] || ''}\n${party[2] || ''}\n${party[3] || ''} ${party[4] || ''}`;
    ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10 };
    ws.getCell(`A${row}`).alignment = { vertical: 'top', wrapText: true };
    row += 3;
  });

  // 条款
  const clauses = [
    ['1. GOODS DESCRIPTION', ''],
    ['2. QUANTITY', ''],
    ['3. UNIT PRICE', ''],
    ['4. TOTAL AMOUNT', ''],
    ['5. DELIVERY TERMS', data.delivery_terms || ''],
    ['6. PAYMENT TERMS', data.payment_terms || ''],
    ['7. PACKING', data.packing || 'In standard export packing.'],
    ['8. SHIPPING MARK', data.shipping_mark || 'At seller\'s option.'],
    ['9. PORT OF LOADING', data.port_of_loading || ''],
    ['10. PORT OF DESTINATION', data.port_of_destination || ''],
  ];

  clauses.forEach((clause) => {
    ws.mergeCells(`A${row}:E${row}`);
    ws.getCell(`A${row}`).value = clause[0];
    ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10, bold: true, color: { argb: styles.titleColor } };
    row++;
    if (clause[1]) {
      ws.mergeCells(`A${row}:E${row}`);
      ws.getCell(`A${row}`).value = clause[1];
      ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10 };
      ws.getCell(`A${row}`).alignment = { wrapText: true };
      row++;
    }
  });

  // 商品明细
  row++;
  ws.mergeCells(`A${row}:E${row}`);
  ws.getCell(`A${row}`).value = 'GOODS DETAILS';
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 11, bold: true, color: { argb: styles.accentColor } };
  row++;

  const headers = ['No.', 'Description', 'Quantity', 'Unit Price', 'Amount'];
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = { name: styles.fontFamily, size: 10, bold: true, color: { argb: styles.headerColor } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: styles.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorder(cell, styles.borderColor);
  });
  row++;

  let totalAmount = 0;
  items.forEach((item, idx) => {
    const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    totalAmount += amount;
    const values = [idx + 1, item.description || '', item.quantity || '', item.unit_price || '', amount.toFixed(2)];
    values.forEach((v, i) => {
      const cell = ws.getCell(row, i + 1);
      cell.value = v;
      cell.font = { name: styles.fontFamily, size: 10 };
      cell.alignment = { horizontal: i >= 2 ? 'right' : 'left', vertical: 'middle', wrapText: true };
      applyBorder(cell, styles.borderColor);
    });
    row++;
  });

  ws.mergeCells(`A${row}:D${row}`);
  ws.getCell(`A${row}`).value = 'TOTAL';
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10, bold: true };
  ws.getCell(`A${row}`).alignment = { horizontal: 'right' };
  ws.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  const tc = ws.getCell(`E${row}`);
  tc.value = totalAmount.toFixed(2);
  tc.font = { name: styles.fontFamily, size: 10, bold: true, color: { argb: styles.accentColor } };
  tc.alignment = { horizontal: 'right' };
  tc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  applyBorder(tc, styles.borderColor);
  row += 3;

  // 签名
  ws.mergeCells(`A${row}:C${row}`);
  ws.getCell(`A${row}`).value = 'THE SELLER';
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10, bold: true };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
  ws.mergeCells(`D${row}:E${row}`);
  ws.getCell(`D${row}`).value = 'THE BUYER';
  ws.getCell(`D${row}`).font = { name: styles.fontFamily, size: 10, bold: true };
  ws.getCell(`D${row}`).alignment = { horizontal: 'center' };
  row += 3;
  ws.mergeCells(`A${row}:C${row}`);
  ws.getCell(`A${row}`).value = 'Signature & Date';
  ws.getCell(`A${row}`).font = { name: styles.fontFamily, size: 10, italic: true };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
  ws.mergeCells(`D${row}:E${row}`);
  ws.getCell(`D${row}`).value = 'Signature & Date';
  ws.getCell(`D${row}`).font = { name: styles.fontFamily, size: 10, italic: true };
  ws.getCell(`D${row}`).alignment = { horizontal: 'center' };
}

module.exports = { generateExcel };
