// 字段映射工具 - 基于规则的字段识别 + AI接口预留

const FIELD_DICTIONARY = {
  // INVOICE 字段
  invoice_no: ['invoice no', 'invoice number', 'invoice #', '发票号', '发票号码', 'inv no', 'inv. no'],
  invoice_date: ['invoice date', 'date', '发票日期', '日期', 'inv date'],
  seller: ['seller', 'exporter', 'shipper', 'beneficiary', '卖方', '出口商', '发货人', '受益人'],
  buyer: ['buyer', 'importer', 'consignee', 'applicant', '买方', '进口商', '收货人', '申请人'],
  payment_terms: ['payment terms', 'terms of payment', '付款方式', '支付条款', 'payment'],
  delivery_terms: ['delivery terms', 'trade terms', 'incoterms', '价格条款', '交货条款', '贸易术语'],
  port_of_loading: ['port of loading', 'pol', 'loading port', '装运港', '起运港', '装货港'],
  port_of_destination: ['port of destination', 'pod', 'destination port', 'discharge port', '目的港', '卸货港'],
  currency: ['currency', 'curr', '币种', '货币'],

  // 商品明细字段
  description: ['description', 'goods description', 'product description', 'commodity', 'item description', '商品名称', '品名', '货物描述', '产品描述', '货品名称'],
  quantity: ['quantity', 'qty', '数量'],
  unit_price: ['unit price', 'price', 'unit cost', '单价', '价格'],
  amount: ['amount', 'total', 'line total', 'subtotal', '金额', '总价', '小计'],
  unit: ['unit', 'uom', 'unit of measure', '单位', '计量单位'],

  // PACKING LIST 字段
  marks_numbers: ['marks & numbers', 'marks and numbers', 'marks', 'shipping marks', '唛头', '运输标志', '标记及号码'],
  gross_weight: ['gross weight', 'g.w.', 'gw', '毛重'],
  net_weight: ['net weight', 'n.w.', 'nw', '净重'],
  measurement: ['measurement', 'meas.', 'cbm', 'volume', '体积', '尺码'],
  packages: ['packages', 'pkgs', 'cartons', 'number of packages', '件数', '箱数', '包装数量'],

  // CONTRACT 字段
  contract_no: ['contract no', 'contract number', 'contract #', '合同号', '合同编号'],
  contract_date: ['contract date', '合同日期', '签约日期'],
  packing: ['packing', 'packing terms', '包装', '包装条款'],
  shipping_mark: ['shipping mark', 'ship mark', '运输标志', '唛头'],
  insurance: ['insurance', '保险', '保险条款'],
  inspection: ['inspection', '检验', '检验条款'],
  force_majeure: ['force majeure', '不可抗力'],
  arbitration: ['arbitration', '仲裁', '仲裁条款'],
};

/**
 * 基于规则的字段自动识别
 * @param {Array} headers - 表格表头数组
 * @returns {Object} - 映射结果 { 表头名: 目标字段名 }
 */
function autoMapFields(headers) {
  const mapping = {};
  const usedTargets = new Set();

  headers.forEach((header) => {
    const normalized = String(header).toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const [target, synonyms] of Object.entries(FIELD_DICTIONARY)) {
      for (const syn of synonyms) {
        const score = similarity(normalized, syn.toLowerCase());
        if (score > bestScore && !usedTargets.has(target)) {
          bestScore = score;
          bestMatch = target;
        }
        // 精确匹配直接命中
        if (normalized === syn.toLowerCase()) {
          bestMatch = target;
          bestScore = 1.0;
          break;
        }
      }
      if (bestScore === 1.0) break;
    }

    if (bestMatch && bestScore >= 0.5) {
      mapping[header] = bestMatch;
      usedTargets.add(bestMatch);
    } else {
      mapping[header] = null; // 未识别
    }
  });

  return mapping;
}

/**
 * 计算两个字符串的相似度（基于包含关系和编辑距离简化版）
 */
function similarity(a, b) {
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.85;

  // 计算共同字符比例
  const setA = new Set(a);
  const setB = new Set(b);
  let common = 0;
  for (const char of setA) {
    if (setB.has(char)) common++;
  }
  return common / Math.max(setA.size, setB.size);
}

/**
 * AI 字段识别（预留接口）
 * 配置 AI_API_KEY 后可启用真正的 AI 识别
 */
async function aiMapFields(headers, sampleData = []) {
  const apiKey = process.env.AI_API_KEY;
  const apiEndpoint = process.env.AI_API_ENDPOINT;

  // 如果没有配置 AI，回退到规则识别
  if (!apiKey || !apiEndpoint) {
    return autoMapFields(headers);
  }

  try {
    const prompt = `You are a trade document field mapping expert.
Given these Excel column headers: ${JSON.stringify(headers)}
And sample data: ${JSON.stringify(sampleData.slice(0, 3))}

Map each header to one of these standard trade document fields:
${JSON.stringify(Object.keys(FIELD_DICTIONARY))}

Return ONLY a JSON object mapping header -> standard_field, or null if no match.
Do not include any explanation.`;

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const result = JSON.parse(content.replace(/```json|```/g, '').trim());
    return result;
  } catch (err) {
    console.error('AI field mapping failed, falling back to rule-based:', err.message);
    return autoMapFields(headers);
  }
}

module.exports = {
  autoMapFields,
  aiMapFields,
  FIELD_DICTIONARY,
};
