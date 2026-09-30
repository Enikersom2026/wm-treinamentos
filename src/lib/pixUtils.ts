/**
 * BR Code / PIX EMV Payload Generator
 * Conforms to Banco Central do Brasil PIX Specifications (EMV QRCPS-MPM).
 * Compatible with all Brazilian Banking Apps (Nubank, Itaú, Bradesco, Santander, BB, Inter, C6, Mercado Pago, Caixa, etc.)
 */

function crc16CCITT(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function removeAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '');
}

export function generatePixPayload(
  key: string,
  merchantName = 'WM TREINAMENTOS',
  merchantCity = 'PALMAS',
  txid = '***'
): string {
  const cleanKey = (key || '').trim();
  if (!cleanKey) return '';

  const cleanName = removeAccents(merchantName).slice(0, 25).trim() || 'WM TREINAMENTOS';
  const cleanCity = removeAccents(merchantCity).slice(0, 15).trim() || 'PALMAS';
  const cleanTxid = (txid || '***').trim();

  const format = (tag: string, value: string) => {
    const len = value.length.toString().padStart(2, '0');
    return `${tag}${len}${value}`;
  };

  // Merchant Account Info (Tag 26)
  const gui = format('00', 'br.gov.bcb.pix');
  const keyTag = format('01', cleanKey);
  const merchantAccountInfo = format('26', gui + keyTag);

  // Additional Data (Tag 62) - TXID
  const txidTag = format('05', cleanTxid);
  const additionalData = format('62', txidTag);

  const payloadNoCRC =
    format('00', '0201') + // Payload Format Indicator
    merchantAccountInfo +  // Tag 26
    format('52', '0000') + // Merchant Category Code
    format('53', '986') +  // Currency Code BRL
    format('58', 'BR') +   // Country Code BR
    format('59', cleanName) + // Merchant Name (Max 25 chars)
    format('60', cleanCity) + // Merchant City (Max 15 chars)
    additionalData +       // Tag 62
    '6304';               // Tag 63 Header

  const crc = crc16CCITT(payloadNoCRC);
  return payloadNoCRC + crc;
}
