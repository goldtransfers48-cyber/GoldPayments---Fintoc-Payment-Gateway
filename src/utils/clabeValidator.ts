import { ClabeValidationResult } from '../types/fintoc';

export const MEXICAN_BANKS_CATALOG: Record<string, string> = {
  '002': 'Citibanamex',
  '012': 'BBVA México',
  '014': 'Santander México',
  '021': 'HSBC México',
  '030': 'Banco del Bajío',
  '036': 'Inbursa',
  '042': 'Banca Mifel',
  '044': 'Scotiabank Inverlat',
  '058': 'Banregio',
  '072': 'Banorte',
  '127': 'Banco Azteca',
  '137': 'Bancoppel',
  '166': 'Banco del Bienestar',
  '646': 'STP (Sistema de Transferencias y Pagos)',
  '659': 'Nu México',
  '670': 'Ualá / ABC Capital',
  '846': 'Albo / STP',
};

/**
 * Validates an 18-digit Mexican CLABE according to Banco de México (Banxico) standards.
 */
export function validateClabe(rawClabe: string): ClabeValidationResult {
  const clabe = (rawClabe || '').replace(/\s+/g, '');

  if (!clabe) {
    return { valid: false, clabe, error: 'La CLABE no puede estar vacía' };
  }

  if (!/^\d+$/.test(clabe)) {
    return { valid: false, clabe, error: 'La CLABE solo debe contener dígitos numéricos' };
  }

  if (clabe.length !== 18) {
    return { 
      valid: false, 
      clabe, 
      error: `La CLABE debe tener exactamente 18 dígitos (tiene ${clabe.length})` 
    };
  }

  const bankCode = clabe.substring(0, 3);
  const branchCode = clabe.substring(3, 6);
  const accountNumber = clabe.substring(6, 17);
  const controlDigit = clabe.charAt(17);

  // Banxico Modulo 10 Check Digit calculation
  // Weights: [3, 7, 1] repeated for first 17 digits
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;

  for (let i = 0; i < 17; i++) {
    const digit = parseInt(clabe.charAt(i), 10);
    const product = (digit * weights[i]) % 10;
    sum += product;
  }

  const calculatedControlDigit = ((10 - (sum % 10)) % 10).toString();

  if (calculatedControlDigit !== controlDigit) {
    return {
      valid: false,
      clabe,
      bankCode,
      bankName: MEXICAN_BANKS_CATALOG[bankCode] || 'Banco no identificado',
      branchCode,
      accountNumber,
      controlDigit,
      error: `Dígito verificador inválido: calculado ${calculatedControlDigit}, recibido ${controlDigit}`,
    };
  }

  const bankName = MEXICAN_BANKS_CATALOG[bankCode] || `Institución bancaria (${bankCode})`;

  return {
    valid: true,
    clabe,
    bankCode,
    bankName,
    branchCode,
    accountNumber,
    controlDigit,
  };
}

/**
 * Formats an 18-digit CLABE with standard readable spacing: "021 650 06494497773 2"
 */
export function formatClabeReadable(clabe: string): string {
  const clean = (clabe || '').replace(/\s+/g, '');
  if (clean.length === 18) {
    return `${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6, 17)} ${clean.substring(17)}`;
  }
  return clabe;
}
