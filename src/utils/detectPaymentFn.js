
/* BEATRIZ_PAY_FIX */
function beatrizNormTxid(s) {
  if (!s) return "";
  return String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function beatrizTxidLooksSame(a, b) {
  a = beatrizNormTxid(a);
  b = beatrizNormTxid(b);
  if (!a || !b) return false;
  if (a === b) return true;
  // confusao OCR 0/O 1/I 7/T etc — se 80%+ iguais no mesmo tamanho
  if (a.length === b.length && a.length >= 8) {
    var same = 0;
    for (var i = 0; i < a.length; i++) if (a[i] === b[i]) same++;
    if (same / a.length >= 0.85) return true;
  }
  return false;
}
function beatrizDigitsPhone(s) {
  return String(s || "").replace(/\D/g, "");
}

function detectPayment(text) {
  if (!text || text.length < 20) return null;

  const lower = text.toLowerCase();

  let provider = null;
  if (
    lower.includes('mpesa') ||
    lower.includes('m-pesa') ||
    /id\s*da\s*transac/i.test(text) ||
    /id\s*trans/i.test(text) ||
    /trans:\s*[a-z0-9.]+/i.test(text) ||
    /transferiste/i.test(text) ||
    /transferiu/i.test(text)
  ) {
    provider = 'mpesa';
  } else if (lower.includes('e-mola') || lower.includes('emola') || lower.includes('e mola')) {
    provider = 'emola';
  } else if (lower.includes('m-kash') || lower.includes('mkash') || lower.includes('m kash')) {
    provider = 'mkash';
  }

  const hasConfirmed =
    /confirmado|confirmed|enviou|recebeu|transferência|transferencia|transferiste|transferiu|pagou|pagamento/i.test(
      text
    );
  const hasValue =
    /(?:valor|value|mt|mzn)[:\s]*[\d.,]+/i.test(text) || /[\d.,]+\s*(?:mt|mzn)/i.test(text);
  const hasId =
    /(?:id|trans|ref|código|codigo|chave|transacao|transação)[\s:]*[a-z0-9.]+/i.test(text) ||
    /[A-Z]{1,3}\d{5,}\.[\dA-Za-z.]+/.test(text);

  if (!provider && !(hasConfirmed && hasValue && hasId)) return null;
  if (!hasValue) return null;

  const result = {
    provider: provider || 'unknown',
    transactionId: null,
    value: null,
    fee: null,
    destinationNumber: null,
    destinationName: null,
    date: null,
    time: null,
    raw: text
  };

  const idPatterns = [
    /ID\s*da\s*transac(?:ao|ão)?[:\s.]*([A-Za-z0-9.]{8,})/i,
    /ID\s*Trans[:\s.]*([A-Za-z0-9.]{8,})/i,
    /(?:Trans|Ref|Código|Codigo|Chave)[:\s.]*([A-Za-z0-9.]{8,})/i,
    /\b([A-Z]{1,3}\d{5,}\.[\dA-Za-z.]+)\b/,
    /\b([A-Z0-9]{10,})\b/
  ];
  for (const p of idPatterns) {
    const m = text.match(p);
    if (m) {
      result.transactionId = m[1].replace(/\.+$/, '').trim();
      break;
    }
  }

  const valuePatterns = [
    /transferiste\s+([\d.,]+)\s*(?:mt|mzn)/i,
    /transferiu\s+([\d.,]+)\s*(?:mt|mzn)/i,
    /valor[:\s]*([\d.,]+)\s*(?:mt|mzn)?/i,
    /([\d.,]+)\s*(?:mt|mzn)/i,
    /enviou[^\d]{0,40}([\d.,]+)/i
  ];
  for (const p of valuePatterns) {
    const m = text.match(p);
    if (m) {
      result.value = parseFloat(m[1].replace(',', '.'));
      if (!isNaN(result.value)) break;
    }
  }

  const feeMatch = text.match(/taxa[:\s]*([\d.,]+)/i);
  if (feeMatch) result.fee = parseFloat(feeMatch[1].replace(',', '.'));

  const numMatch =
    text.match(/para\s+conta\s+(\d{8,12})/i) ||
    text.match(/(?:para\s+o\s+)?(?:MPESA|M-PESA|EMOLA|E-MOLA|MKASH|M-KASH)\s+(\d{8,12})/i) ||
    text.match(/(?:para|destino)[\s:]*(\d{8,12})/i) ||
    text.match(/\b(8[4-7]\d{7})\b/);
  if (numMatch) result.destinationNumber = numMatch[1];

  const nameMatch = text.match(/nome[:\s]+([A-Za-zÁÉÍÓÚÂÊÎÔÛÃÕÇáéíóúâêîôûãõç][A-Za-zÁÉÍÓÚÂÊÎÔÛÃÕÇáéíóúâêîôûãõç\s]{2,40})/);
  if (nameMatch) result.destinationName = nameMatch[1].trim();

  const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (dateMatch) result.date = dateMatch[1];
  const timeMatch = text.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
  if (timeMatch) result.time = timeMatch[1];

  if (!result.transactionId && !result.value) return null;
  return result;
}

module.exports = { detectPayment };
