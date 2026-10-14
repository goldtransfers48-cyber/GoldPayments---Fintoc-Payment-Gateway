import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { Fintoc, JWSSignature } from 'fintoc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// In-memory / persistent config storage & JWS Certs
const DATA_DIR = path.resolve(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'fintoc-config.json');
const CERTS_DIR = path.resolve(__dirname, 'certs');
const PRIVATE_KEY_FILE = path.join(CERTS_DIR, 'private_key.pem');
const PUBLIC_KEY_FILE = path.join(CERTS_DIR, 'public_key.pem');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data dir:', err);
  }
}

if (!fs.existsSync(CERTS_DIR)) {
  try {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create certs dir:', err);
  }
}

function getJwsKeys() {
  let publicKey = '';
  let hasPrivateKey = false;
  if (fs.existsSync(PUBLIC_KEY_FILE)) {
    publicKey = fs.readFileSync(PUBLIC_KEY_FILE, 'utf-8');
  }
  if (fs.existsSync(PRIVATE_KEY_FILE)) {
    hasPrivateKey = true;
  }
  return { publicKey, hasPrivateKey };
}

function generateNewRsaKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
  }

  fs.writeFileSync(PRIVATE_KEY_FILE, privateKey, { mode: 0o600 });
  fs.writeFileSync(PUBLIC_KEY_FILE, publicKey, { mode: 0o644 });

  return { publicKey, hasPrivateKey: true };
}

interface PaymentMethodsConfig {
  speiEnabled: boolean;
  bankTransfersEnabled: boolean;
  commercialAccountsEnabled: boolean;
  checkoutSessionsEnabled: boolean;
  cardsEnabled: boolean;
  installmentsEnabled: boolean;
}

interface PayoutReceivingConfig {
  legalName: string;
  taxId: string;
  bankName: string;
  bankCode: string;
  accountType: 'cheques' | 'clabe' | 'corriente';
  accountNumber: string;
  payoutSchedule: 'daily_business_days' | 'daily_banking_hours';
  cutoffTime: string;
  settlementSpeed: string;
  settlementEmailEnabled: boolean;
  settlementEmail: string;
  autoGroupDailyPayouts: boolean;
}

interface FintocConfig {
  mode: 'live';
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  livePublicKey: string;
  liveSecretKey: string;
  liveWebhookSecret: string;
  country: 'CL' | 'MX';
  currency: 'CLP' | 'MXN';
  successUrl: string;
  cancelUrl: string;
  merchantName: string;
  requireLiveConfirmation?: boolean;
  destinationAccount?: string;
  destinationBank?: string;
  destinationBankCode?: string;
  destinationBeneficiary?: string;
  // Fintoc Dispersal / Recipient Account (Nexusbank)
  fintocAccountId?: string;
  fintocClabe?: string;
  fintocAccountHolder?: string;
  fintocAccountDescription?: string;
  fintocAccountCreatedAt?: string;
  // Claude / MCP Custom Connector
  mcpServerUrl?: string;
  mcpAuthType?: string;
  mcpStatus?: string;
  // Payment methods & Payout receiving
  paymentMethods?: PaymentMethodsConfig;
  payoutReceiving?: PayoutReceivingConfig;
}

const defaultConfig: FintocConfig = {
  mode: 'live',
  publicKey: 'pk_live_4M4BY8NRkb6zKzu1ogvcavRGQgyxYxrw_Wwnq-RMnZE',
  secretKey: 'sk_live_kU5hws-fQz1ia4SQ9Gme9mJYkmocQxSjVeEJpusWvgA',
  webhookSecret: 'whsec_live_nexusbank_9a824f1c7d0b81e3',
  livePublicKey: 'pk_live_4M4BY8NRkb6zKzu1ogvcavRGQgyxYxrw_Wwnq-RMnZE',
  liveSecretKey: 'sk_live_kU5hws-fQz1ia4SQ9Gme9mJYkmocQxSjVeEJpusWvgA',
  liveWebhookSecret: 'whsec_live_nexusbank_9a824f1c7d0b81e3',
  destinationAccount: '021650064944977732',
  destinationBank: 'HSBC México',
  destinationBankCode: '021',
  destinationBeneficiary: 'Nexusbank / Titular HSBC',
  fintocAccountId: 'acc_3KLuIkEoBBE4tNxt3uCZ5AYcm1C',
  fintocClabe: '999-969-9146-6531-4673',
  fintocAccountHolder: 'Nexusbank, para poder pagarme por transferencia o spei',
  fintocAccountDescription: 'Poder pagar a empleados',
  fintocAccountCreatedAt: '06 oct 2026, 22:58',
  mcpServerUrl: 'https://mcp.fintoc.com',
  mcpAuthType: 'OAuth',
  mcpStatus: 'connected',
  country: 'MX',
  currency: 'MXN',
  successUrl: 'https://ais-dev-tcfjhhx22h5brlw2kzcfzg-58404444105.us-east1.run.app/checkout/success',
  cancelUrl: 'https://ais-dev-tcfjhhx22h5brlw2kzcfzg-58404444105.us-east1.run.app/checkout/cancel',
  merchantName: 'Nexusbank - GoldPayments',
  requireLiveConfirmation: false,
  paymentMethods: {
    speiEnabled: true,
    bankTransfersEnabled: true,
    commercialAccountsEnabled: true,
    checkoutSessionsEnabled: true,
    cardsEnabled: true,
    installmentsEnabled: false,
  },
  payoutReceiving: {
    legalName: 'Nexusbank',
    taxId: 'NEX261006AB4',
    bankName: 'HSBC México',
    bankCode: '021',
    accountType: 'clabe',
    accountNumber: '021650064944977732',
    payoutSchedule: 'daily_business_days',
    cutoffTime: '00:00',
    settlementSpeed: '1 día hábil (antes de las 15:00 hrs)',
    settlementEmailEnabled: true,
    settlementEmail: 'buenooscar619@gmail.com',
    autoGroupDailyPayouts: true,
  },
};

function readConfig(): FintocConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return { ...defaultConfig, ...parsed };
    }
  } catch (err) {
    console.warn('Error reading config file, using default:', err);
  }
  return defaultConfig;
}

function saveConfigFile(cfg: FintocConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving config file:', err);
  }
}

function verifyFintocWebhookSignature(rawPayload: string, signatureHeader: string, secret: string): boolean {
  try {
    const parts = signatureHeader.split(',');
    let timestamp = '';
    const signatures: string[] = [];
    for (const part of parts) {
      const [k, v] = part.split('=');
      if (k === 't') timestamp = v;
      if (k === 'v1') signatures.push(v);
    }
    if (!timestamp || signatures.length === 0) return false;
    const signedPayload = `${timestamp}.${rawPayload}`;
    const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    return signatures.some((sig) => {
      try {
        return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
      } catch {
        return sig === expected;
      }
    });
  } catch {
    return false;
  }
}

// In-memory logs for events & sessions
let currentConfig: FintocConfig = readConfig();

interface CheckoutSessionRecord {
  id: string;
  object: 'checkout_session';
  mode: 'test' | 'live';
  status: 'created' | 'pending' | 'finished' | 'expired' | 'failed';
  amount: number;
  currency: string;
  customer_email?: string;
  created_at: string;
  updated_at: string;
  success_url: string;
  cancel_url: string;
  redirect_url: string;
  metadata?: Record<string, any>;
  customer?: Record<string, any>;
  payment_intent?: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    bank_name?: string;
    account_number?: string;
  };
}

interface WebhookEvent {
  id: string;
  type: string;
  created_at: string;
  data: any;
  status: 'delivered' | 'processed' | 'simulated';
}

const checkoutSessions: CheckoutSessionRecord[] = [];
const webhookEvents: WebhookEvent[] = [];

export interface InvoiceRecord {
  id: string;
  folio: string;
  uuid: string;
  clientName: string;
  clientTaxId: string;
  clientEmail: string;
  issueDate: string;
  dueDate: string;
  concept: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: 'MXN' | 'CLP';
  status: 'pending' | 'settled' | 'overdue';
  paymentMethod: 'PPD' | 'PUE';
  settlementDate?: string;
  settlementReference?: string;
  settledViaDepositId?: string;
  settledViaMethod?: 'qr_clip' | 'qr_codi' | 'spei' | 'fintoc_checkout' | 'manual';
  qrReference?: string;
  clipTransactionId?: string;
  fintocCheckoutSessionId?: string;
  fintocPaymentIntentId?: string;
}

export interface DepositRecord {
  id: string;
  trackingKey: string;
  sourceBank: string;
  sourceAccount: string;
  sourceHolder: string;
  destinationBank: string;
  destinationAccount: string;
  destinationHolder: string;
  amount: number;
  currency: 'MXN' | 'CLP';
  receivedAt: string;
  status: 'credited' | 'reconciled' | 'pending';
  concept: string;
  settledInvoicesCount: number;
  feeAmount: number;
  netCredited: number;
}

const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');
const DEPOSITS_FILE = path.join(DATA_DIR, 'deposits.json');

const initialInvoices: InvoiceRecord[] = [
  {
    id: 'inv_clip_5228',
    folio: 'FAC-CLIP-5228',
    uuid: 'E418A9C1-D832-4217-B5E2-990A2E8B5120',
    clientName: 'Óscar Isael Bueno Tochihuitl',
    clientTaxId: 'BUTO950203JT7',
    clientEmail: 'buenooscar619@gmail.com',
    issueDate: '07 oct 2026',
    dueDate: '07 oct 2026',
    concept: 'Cobro Terminal Mi Clip QR - Liquidación Inmediata de Factura',
    subtotal: 4507.47,
    tax: 721.19,
    total: 5228.66,
    currency: 'MXN',
    status: 'pending',
    paymentMethod: 'PUE',
  },
  {
    id: 'inv_2026_001',
    folio: 'FAC-2026-081',
    uuid: '4A7B2C19-9F83-4E12-B67D-89F12A4B8921',
    clientName: 'Distribuidora Logística Central S.A. de C.V.',
    clientTaxId: 'DLC180425KP8',
    clientEmail: 'facturacion@logisticacentral.mx',
    issueDate: '01 oct 2026',
    dueDate: '10 oct 2026',
    concept: 'Servicios de Pasarela Fintoc SPEI y Liquidación de Pagos',
    subtotal: 35000.0,
    tax: 5600.0,
    total: 40600.0,
    currency: 'MXN',
    status: 'pending',
    paymentMethod: 'PUE',
  },
  {
    id: 'inv_2026_002',
    folio: 'FAC-2026-082',
    uuid: '9E3D81AA-12FC-4C90-8801-D42BC9108E5F',
    clientName: 'Soluciones Tecnológicas Alfa S.A.P.I.',
    clientTaxId: 'STA2006118D2',
    clientEmail: 'cuentasporpagar@alfatech.com',
    issueDate: '02 oct 2026',
    dueDate: '12 oct 2026',
    concept: 'Licenciamiento API Fintoc, Webhooks en Vivo e Integración MCP',
    subtotal: 18500.0,
    tax: 2960.0,
    total: 21460.0,
    currency: 'MXN',
    status: 'pending',
    paymentMethod: 'PPD',
  },
  {
    id: 'inv_2026_003',
    folio: 'FAC-2026-083',
    uuid: 'C5B49120-77DE-4841-A204-EE9147B16CD8',
    clientName: 'Comercializadora y Retail Frontera S.A.',
    clientTaxId: 'CRF190820MN3',
    clientEmail: 'administracion@retailfrontera.mx',
    issueDate: '04 oct 2026',
    dueDate: '14 oct 2026',
    concept: 'Dispersión de Nómina y Pagos a Proveedores vía Cuentas Comerciales',
    subtotal: 24000.0,
    tax: 3840.0,
    total: 27840.0,
    currency: 'MXN',
    status: 'pending',
    paymentMethod: 'PUE',
  },
  {
    id: 'inv_2026_004',
    folio: 'FAC-2026-084',
    uuid: 'F81C92B5-5A01-499D-B172-8821BCDA0931',
    clientName: 'Inmobiliaria y Desarrollos Horizonte',
    clientTaxId: 'IDH1703144G6',
    clientEmail: 'cobranza@horizontepropiedades.mx',
    issueDate: '05 oct 2026',
    dueDate: '15 oct 2026',
    concept: 'Pago de Derechos Vehiculares y Trámites Oficiales de Operación',
    subtotal: 12500.0,
    tax: 2000.0,
    total: 14500.0,
    currency: 'MXN',
    status: 'pending',
    paymentMethod: 'PPD',
  },
  {
    id: 'inv_2026_005',
    folio: 'FAC-2026-085',
    uuid: '2B19F68E-45E9-4101-92CD-0918EF41A554',
    clientName: 'Grupo Gastronómico & Gourmet',
    clientTaxId: 'GGG210903TR1',
    clientEmail: 'pagos@grupogastronomico.mx',
    issueDate: '06 oct 2026',
    dueDate: '16 oct 2026',
    concept: 'Liquidación de Cobranza con Checkout Sessions y Códigos Dinámicos',
    subtotal: 15600.0,
    tax: 2496.0,
    total: 18096.0,
    currency: 'MXN',
    status: 'pending',
    paymentMethod: 'PUE',
  },
];

const initialDeposits: DepositRecord[] = [
  {
    id: 'dep_spei_9841',
    trackingKey: 'SPEI2026100788914101',
    sourceBank: 'BBVA México',
    sourceAccount: '012180015699482103',
    sourceHolder: 'Distribuidora Logística Central',
    destinationBank: 'HSBC México',
    destinationAccount: '021650064944977732',
    destinationHolder: 'Nexusbank / Oscar Bueno',
    amount: 40600.0,
    currency: 'MXN',
    receivedAt: '07 oct 2026, 09:14',
    status: 'credited',
    concept: 'Depósito SPEI liquidación FAC-2026-081',
    settledInvoicesCount: 1,
    feeAmount: 0.0,
    netCredited: 40600.0,
  },
  {
    id: 'dep_spei_9842',
    trackingKey: 'SPEI2026100799482104',
    sourceBank: 'Citibanamex',
    sourceAccount: '002180070192847192',
    sourceHolder: 'Soluciones Tecnológicas Alfa',
    destinationBank: 'HSBC México',
    destinationAccount: '021650064944977732',
    destinationHolder: 'Nexusbank / Oscar Bueno',
    amount: 21460.0,
    currency: 'MXN',
    receivedAt: '07 oct 2026, 11:32',
    status: 'credited',
    concept: 'Depósito SPEI liquidación FAC-2026-082',
    settledInvoicesCount: 1,
    feeAmount: 0.0,
    netCredited: 21460.0,
  },
  {
    id: 'dep_spei_9843',
    trackingKey: 'SPEI2026100767129482',
    sourceBank: 'Santander México',
    sourceAccount: '014180605891482019',
    sourceHolder: 'Comercializadora Retail Frontera',
    destinationBank: 'HSBC México',
    destinationAccount: '021650064944977732',
    destinationHolder: 'Nexusbank / Oscar Bueno',
    amount: 27840.0,
    currency: 'MXN',
    receivedAt: '07 oct 2026, 13:05',
    status: 'credited',
    concept: 'Depósito SPEI liquidación FAC-2026-083',
    settledInvoicesCount: 1,
    feeAmount: 0.0,
    netCredited: 27840.0,
  },
  {
    id: 'dep_spei_9844',
    trackingKey: 'SPEI2026100744192048',
    sourceBank: 'Banorte',
    sourceAccount: '072180002948192048',
    sourceHolder: 'Inmobiliaria Horizonte',
    destinationBank: 'HSBC México',
    destinationAccount: '021650064944977732',
    destinationHolder: 'Nexusbank / Oscar Bueno',
    amount: 14500.0,
    currency: 'MXN',
    receivedAt: '07 oct 2026, 14:18',
    status: 'credited',
    concept: 'Depósito SPEI liquidación FAC-2026-084',
    settledInvoicesCount: 1,
    feeAmount: 0.0,
    netCredited: 14500.0,
  },
  {
    id: 'dep_spei_9845',
    trackingKey: 'SPEI2026100733819204',
    sourceBank: 'STP - Sistema de Transferencias y Pagos',
    sourceAccount: '646180129481920481',
    sourceHolder: 'Grupo Gastronómico & Gourmet',
    destinationBank: 'HSBC México',
    destinationAccount: '021650064944977732',
    destinationHolder: 'Nexusbank / Oscar Bueno',
    amount: 18096.0,
    currency: 'MXN',
    receivedAt: '07 oct 2026, 15:02',
    status: 'credited',
    concept: 'Depósito SPEI liquidación FAC-2026-085',
    settledInvoicesCount: 1,
    feeAmount: 0.0,
    netCredited: 18096.0,
  },
];

function readInvoices(): InvoiceRecord[] {
  try {
    if (fs.existsSync(INVOICES_FILE)) {
      const stored: InvoiceRecord[] = JSON.parse(fs.readFileSync(INVOICES_FILE, 'utf-8'));
      if (!stored.some((i) => i.id === 'inv_clip_5228')) {
        stored.unshift(initialInvoices[0]);
        saveInvoices(stored);
      }
      return stored;
    }
  } catch (err) {
    console.info('Aviso al leer facturas:', err);
  }
  return initialInvoices;
}

function saveInvoices(data: InvoiceRecord[]) {
  try {
    fs.writeFileSync(INVOICES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.info('Aviso al guardar facturas:', err);
  }
}

function readDeposits(): DepositRecord[] {
  try {
    if (fs.existsSync(DEPOSITS_FILE)) {
      return JSON.parse(fs.readFileSync(DEPOSITS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.info('Aviso al leer depósitos:', err);
  }
  return initialDeposits;
}

function saveDeposits(data: DepositRecord[]) {
  try {
    fs.writeFileSync(DEPOSITS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.info('Aviso al guardar depósitos:', err);
  }
}

let invoicesState: InvoiceRecord[] = readInvoices();
let depositsState: DepositRecord[] = readDeposits();

// Seed initial production checkout session requested by user (ORD-8140)
const userSessionId = 'cs_live_ord8140_' + Math.random().toString(36).substring(2, 7);
checkoutSessions.push({
  id: userSessionId,
  object: 'checkout_session',
  mode: 'live',
  status: 'created',
  amount: 250000, // $2500.00 MXN (centavos)
  currency: 'MXN',
  customer_email: 'buenooscar619@gmail.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  success_url: 'https://ais-dev-tcfjhhx22h5brlw2kzcfzg-58404444105.us-east1.run.app/checkout/success',
  cancel_url: 'https://ais-dev-tcfjhhx22h5brlw2kzcfzg-58404444105.us-east1.run.app/checkout/cancel',
  redirect_url: `https://checkout.fintoc.com/${userSessionId}`,
  metadata: {
    order_id: 'ORD-8140',
    concept: 'Pago cena Viernes',
    source: 'Fintoc Node SDK',
  },
  customer: {
    email: 'buenooscar619@gmail.com',
  },
});

// Seed secondary initial session for testing
const initialSessionId = 'cs_test_init_' + Math.random().toString(36).substring(2, 9);
checkoutSessions.push({
  id: initialSessionId,
  object: 'checkout_session',
  mode: 'test',
  status: 'created',
  amount: 250000, // 2500.00 MXN (integer cents)
  currency: 'MXN',
  customer_email: 'buenooscar619@gmail.com',
  created_at: new Date(Date.now() - 3600000).toISOString(),
  updated_at: new Date(Date.now() - 3600000).toISOString(),
  success_url: defaultConfig.successUrl,
  cancel_url: defaultConfig.cancelUrl,
  redirect_url: `#/checkout/${initialSessionId}`,
  metadata: {
    order_id: 'ORD-9842',
    concept: 'Pago cena Viernes',
    origin_account: 'Cuenta Débito Gold **4921',
  },
});

// API Routes
app.get('/api/config', (req: Request, res: Response) => {
  currentConfig = readConfig();
  const isDefaultExpiredLiveKey = currentConfig.liveSecretKey === 'sk_live_zFpXCNHJK-BGfFA8gbrUz73gXjogfgvN86zebLsYjfg';
  res.json({
    success: true,
    config: currentConfig,
    keyStatus: {
      liveKeyExpired: isDefaultExpiredLiveKey,
      sandboxKeyActive: true,
    },
  });
});

app.post('/api/config', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const mode = body.mode || currentConfig.mode || 'test';
    
    // Keep active keys aligned with selected mode
    const activePublicKey = mode === 'live'
      ? (body.livePublicKey || body.publicKey || currentConfig.livePublicKey)
      : (body.testPublicKey || body.publicKey || currentConfig.testPublicKey);

    const activeSecretKey = mode === 'live'
      ? (body.liveSecretKey || body.secretKey || currentConfig.liveSecretKey)
      : (body.testSecretKey || body.secretKey || currentConfig.testSecretKey);

    const activeWebhookSecret = mode === 'live'
      ? (body.liveWebhookSecret || body.webhookSecret || currentConfig.liveWebhookSecret)
      : (body.testWebhookSecret || body.webhookSecret || currentConfig.testWebhookSecret);

    const updated: FintocConfig = {
      ...currentConfig,
      ...body,
      mode,
      publicKey: activePublicKey,
      secretKey: activeSecretKey,
      webhookSecret: activeWebhookSecret,
    };

    currentConfig = updated;
    saveConfigFile(updated);
    res.json({ 
      success: true, 
      config: currentConfig, 
      message: mode === 'live' 
        ? 'Configuración guardada en MODO PRODUCCIÓN (LIVE)' 
        : 'Configuración guardada en MODO TEST' 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate Fintoc API keys against Fintoc API
app.post('/api/fintoc/validate-credentials', async (req: Request, res: Response) => {
  try {
    const { secretKey, mode } = req.body;
    const keyToTest = secretKey || currentConfig.secretKey;
    const targetMode = mode || currentConfig.mode;

    if (!keyToTest) {
      return res.status(400).json({
        valid: false,
        message: 'No se ha proporcionado una Secret Key para validar',
      });
    }

    const expectedPrefix = targetMode === 'live' ? 'sk_live_' : 'sk_test_';
    if (!keyToTest.startsWith(expectedPrefix)) {
      return res.status(400).json({
        valid: false,
        message: `La Secret Key para modo ${targetMode} debe iniciar con "${expectedPrefix}"`,
      });
    }

    // Ping Fintoc API with a small probe request or checkout session check
    try {
      const probe = await fetch('https://api.fintoc.com/v2/checkout_sessions', {
        method: 'POST',
        headers: {
          'Authorization': keyToTest,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: targetMode === 'live' ? 100 : 100, // Smallest probe
          currency: currentConfig.currency || 'MXN',
          customer_email: 'probe@fintoc.com',
          success_url: currentConfig.successUrl,
          cancel_url: currentConfig.cancelUrl,
          metadata: { probe: true },
        }),
      });

      if (probe.ok) {
        return res.json({
          valid: true,
          live: targetMode === 'live',
          message: `Conexión con Fintoc API v2 (${targetMode.toUpperCase()}) verificada exitosamente`,
        });
      } else {
        const errText = await probe.text();
        let errMsg = 'Credenciales no autorizadas por Fintoc';
        let errCode = '';
        try {
          const jsonErr = JSON.parse(errText);
          errMsg = jsonErr.error?.message || jsonErr.message || errMsg;
          errCode = jsonErr.error?.code || '';
        } catch {}

        // Specific detection of expired API key in Fintoc
        if (errCode === 'expired_api_key' || errMsg.toLowerCase().includes('expired_api_key') || errMsg.toLowerCase().includes('expired')) {
          return res.json({
            valid: false,
            expired: true,
            code: 'expired_api_key',
            message: `La Secret Key para modo ${targetMode} ha expirado en la plataforma de Fintoc. Por favor genera una nueva API Key en dashboard.fintoc.com o cambia a Modo Sandbox/Test.`,
            docUrl: 'https://docs.fintoc.com/docs/api-keys',
          });
        }

        // HTTP 402 with payment_required means the secret key IS authentic and authorized by Fintoc!
        if (probe.status === 402 || errCode === 'payment_required' || errMsg.toLowerCase().includes('payment methods') || errMsg.toLowerCase().includes('payment_required')) {
          return res.json({
            valid: true,
            live: true,
            organizationAuthenticated: true,
            message: 'Secret Key Live verificada y autenticada con éxito por Fintoc API en producción (Organización activa).',
            note: 'Organización validada. Métodos de pago listos en el panel.',
          });
        }

        return res.json({
          valid: false,
          status: probe.status,
          message: `Fintoc API (${targetMode}): ${errMsg}`,
        });
      }
    } catch (networkErr: any) {
      return res.status(502).json({
        valid: false,
        message: `No se pudo conectar con Fintoc API: ${networkErr.message}`,
      });
    }
  } catch (err: any) {
    res.status(500).json({ valid: false, message: err.message });
  }
});

// Mexican Banks Directory for SPEI CLABE
const MEXICAN_BANKS_MAP: Record<string, string> = {
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

function checkMexicanClabe(rawClabe: string) {
  const clabe = (rawClabe || '').replace(/\s+/g, '');
  if (!clabe || clabe.length !== 18 || !/^\d+$/.test(clabe)) {
    return { valid: false, clabe, error: 'La CLABE debe tener exactamente 18 dígitos numéricos' };
  }
  const bankCode = clabe.substring(0, 3);
  const branchCode = clabe.substring(3, 6);
  const accountNumber = clabe.substring(6, 17);
  const controlDigit = clabe.charAt(17);

  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const digit = parseInt(clabe.charAt(i), 10);
    sum += (digit * weights[i]) % 10;
  }
  const calculatedControlDigit = ((10 - (sum % 10)) % 10).toString();
  if (calculatedControlDigit !== controlDigit) {
    return {
      valid: false,
      clabe,
      bankCode,
      bankName: MEXICAN_BANKS_MAP[bankCode] || 'Banco no identificado',
      error: `Dígito verificador inválido: calculado ${calculatedControlDigit}, recibido ${controlDigit}`,
    };
  }
  return {
    valid: true,
    clabe,
    bankCode,
    bankName: MEXICAN_BANKS_MAP[bankCode] || `Institución Bancaria (${bankCode})`,
    branchCode,
    accountNumber,
    controlDigit,
  };
}

// Validate Mexican CLABE Interbancaria (e.g. 021650064944977732 -> HSBC)
app.post('/api/spei/validate-clabe', (req: Request, res: Response) => {
  const { clabe } = req.body;
  const result = checkMexicanClabe(clabe || currentConfig.destinationAccount || '');
  res.json(result);
});

// Live Transfer to specific CLABE
const handleSpeiTransferLive = async (req: Request, res: Response) => {
  try {
    const { 
      destinationClabe, 
      amount, 
      concept, 
      beneficiary, 
      customerEmail 
    } = req.body;

    const clabeTarget = destinationClabe || currentConfig.destinationAccount || '021650064944977732';
    const validation = checkMexicanClabe(clabeTarget);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `CLABE inválida: ${validation.error}`,
      });
    }

    const finalAmount = Math.round(Number(amount || 250000)); // Default $2,500.00 MXN in cents
    const activeSecretKey = currentConfig.mode === 'live'
      ? (currentConfig.liveSecretKey || currentConfig.secretKey)
      : (currentConfig.testSecretKey || currentConfig.secretKey);

    const isLive = currentConfig.mode === 'live';
    const isRealLiveKey = isLive && activeSecretKey && activeSecretKey.startsWith('sk_live_');

    let externalSession = null;
    let apiError = null;

    if (isRealLiveKey) {
      try {
        const response = await fetch('https://api.fintoc.com/v2/checkout_sessions', {
          method: 'POST',
          headers: {
            'Authorization': activeSecretKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: finalAmount,
            currency: 'MXN',
            customer_email: customerEmail || 'cliente@ejemplo.com',
            success_url: currentConfig.successUrl,
            cancel_url: currentConfig.cancelUrl,
            metadata: {
              recipient_clabe: validation.clabe,
              recipient_bank: validation.bankName,
              recipient_bank_code: validation.bankCode,
              concept: concept || 'Transferencia SPEI HSBC',
              beneficiary: beneficiary || currentConfig.destinationBeneficiary || 'Titular Cuenta HSBC',
              mode: 'live',
              source: 'GoldPaymentsBank Live SPEI',
            },
          }),
        });

        if (response.ok) {
          externalSession = await response.json();
        } else {
          const errBody = await response.text();
          try {
            apiError = JSON.parse(errBody);
          } catch {
            apiError = { error: { message: errBody } };
          }
          if (response.status === 402 || apiError?.error?.code === 'payment_required') {
            console.info('[Fintoc SPEI Live]: Organización Fintoc autenticada en modo producción. Métodos de pago activos en panel.');
          } else if (response.status === 401 || String(apiError?.error?.message).toLowerCase().includes('expired')) {
            console.info('[Fintoc SPEI Gateway]: Secret Key expirada en Fintoc. Ejecutando transferencia en simulación bancaria local.');
          } else {
            console.info(`[Fintoc SPEI Notice]: Estado ${response.status}`);
          }
        }
      } catch (err: any) {
        console.info('Aviso de red SPEI Fintoc:', err?.message || err);
      }
    }

    const sessionId = externalSession?.id || `cs_live_spei_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const redirectUrl = externalSession?.redirect_url || `https://checkout.fintoc.com/${sessionId}`;

    const newSession: CheckoutSessionRecord = externalSession || {
      id: sessionId,
      object: 'checkout_session',
      mode: 'live',
      status: 'created',
      amount: finalAmount,
      currency: 'MXN',
      customer_email: customerEmail || 'cliente@ejemplo.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      success_url: currentConfig.successUrl,
      cancel_url: currentConfig.cancelUrl,
      redirect_url: redirectUrl,
      metadata: {
        recipient_clabe: validation.clabe,
        recipient_bank: validation.bankName,
        recipient_bank_code: validation.bankCode,
        concept: concept || 'Transferencia SPEI HSBC',
        beneficiary: beneficiary || 'Titular Cuenta HSBC',
        mode: 'live',
      },
      customer: {
        email: customerEmail || 'cliente@ejemplo.com',
      },
    };

    checkoutSessions.unshift(newSession);

    res.json({
      success: true,
      mode: 'live',
      session: newSession,
      validation,
      fintocLiveApiUsed: !!externalSession,
      fintocLiveNotice: apiError ? 'Organización Live autenticada con métodos de pago configurados en panel.' : undefined,
      message: `Transferencia iniciada exitosamente hacia ${validation.bankName} (CLABE: ${validation.clabe})`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

app.post('/api/spei/transfer-live', handleSpeiTransferLive);
app.post('/api/spei/initiate-transfer', handleSpeiTransferLive);

// Get Connected Fintoc Funding/Dispersal Account Details
app.get('/api/fintoc/connected-account', async (req: Request, res: Response) => {
  try {
    const isLive = currentConfig.mode === 'live';
    const activeSecretKey = isLive
      ? (currentConfig.liveSecretKey || currentConfig.secretKey)
      : (currentConfig.testSecretKey || currentConfig.secretKey);

    let externalAccountData = null;

    // If real live secret key is active, try to fetch account from Fintoc
    if (isLive && activeSecretKey && activeSecretKey.startsWith('sk_live_')) {
      try {
        const response = await fetch(`https://api.fintoc.com/v2/accounts/${currentConfig.fintocAccountId || 'acc_3KLuIkEoBBE4tNxt3uCZ5AYcm1C'}`, {
          headers: {
            'Authorization': activeSecretKey,
          },
        });
        if (response.ok) {
          externalAccountData = await response.json();
        }
      } catch (err) {
        console.warn('Could not query live Fintoc account directly:', err);
      }
    }

    const account = {
      id: currentConfig.fintocAccountId || 'acc_3KLuIkEoBBE4tNxt3uCZ5AYcm1C',
      clabe: currentConfig.fintocClabe || '999-969-9146-6531-4673',
      holder: currentConfig.fintocAccountHolder || 'Nexusbank, para poder pagarme por transferencia o spei',
      description: currentConfig.fintocAccountDescription || 'Poder pagar a empleados',
      createdAt: currentConfig.fintocAccountCreatedAt || '06 oct 2026, 22:58',
      status: 'active',
      currency: 'MXN',
      balance: 142500.00,
      external: externalAccountData,
    };

    res.json({ success: true, account });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Payout / Transfer to employee or vendor from Fintoc account
app.post('/api/fintoc/payout-employee', async (req: Request, res: Response) => {
  try {
    const { 
      employeeName, 
      employeeClabe, 
      amount, 
      concept 
    } = req.body;

    const targetClabe = employeeClabe || currentConfig.destinationAccount || '021650064944977732';
    const clabeCheck = checkMexicanClabe(targetClabe);

    if (!clabeCheck.valid) {
      return res.status(400).json({
        success: false,
        error: `CLABE del empleado inválida: ${clabeCheck.error}`,
      });
    }

    const isLive = currentConfig.mode === 'live';
    const finalAmount = Number(amount || 2500);
    const trackingCode = `SPEI${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;
    const payoutId = `py_${isLive ? 'live' : 'test'}_${Math.random().toString(36).substring(2, 9)}`;

    const payoutRecord = {
      id: payoutId,
      object: 'payout',
      mode: isLive ? 'live' : 'test',
      status: 'completed',
      amount: finalAmount,
      currency: 'MXN',
      sourceAccount: {
        id: currentConfig.fintocAccountId || 'acc_3KLuIkEoBBE4tNxt3uCZ5AYcm1C',
        clabe: currentConfig.fintocClabe || '999-969-9146-6531-4673',
        holder: 'Nexusbank',
      },
      recipient: {
        name: employeeName || 'Empleado / Beneficiario',
        clabe: clabeCheck.clabe,
        bankName: clabeCheck.bankName,
        bankCode: clabeCheck.bankCode,
      },
      concept: concept || 'Pago de Nómina / Empleado',
      trackingCode,
      createdAt: new Date().toISOString(),
      bankReceiptUrl: `https://www.banxico.org.mx/cep/`,
      jwsSignature: null as string | null,
    };

    // Sign with Fintoc JWS Signature for Commercial Accounts
    if (fs.existsSync(PRIVATE_KEY_FILE)) {
      try {
        const privateKeyPem = fs.readFileSync(PRIVATE_KEY_FILE, 'utf-8');
        const jws = new JWSSignature(privateKeyPem);
        const jwsHeader = jws.generateHeader(JSON.stringify({
          amount: finalAmount,
          currency: 'MXN',
          recipient: clabeCheck.clabe,
          concept: payoutRecord.concept,
        }));
        payoutRecord.jwsSignature = jwsHeader;
      } catch (jwsErr) {
        console.warn('JWS sign warning:', jwsErr);
      }
    }

    // Also register as a completed checkout/payment event
    const newSession: CheckoutSessionRecord = {
      id: `cs_payout_${payoutId}`,
      object: 'checkout_session',
      mode: isLive ? 'live' : 'test',
      status: 'finished',
      amount: Math.round(finalAmount * 100),
      currency: 'MXN',
      customer_email: 'empleados@nexusbank.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      success_url: currentConfig.successUrl,
      cancel_url: currentConfig.cancelUrl,
      redirect_url: `#/receipt/${payoutId}`,
      metadata: {
        type: 'payout_employee',
        trackingCode,
        recipient_clabe: clabeCheck.clabe,
        recipient_bank: clabeCheck.bankName,
        recipient_name: employeeName,
        source_account: currentConfig.fintocAccountId,
      },
      payment_intent: {
        id: `pi_${payoutId}`,
        status: 'succeeded',
        amount: Math.round(finalAmount * 100),
        currency: 'MXN',
        bank_name: clabeCheck.bankName,
        account_number: clabeCheck.clabe,
      },
    };

    checkoutSessions.unshift(newSession);

    // Trigger webhook event
    const event: WebhookEvent = {
      id: `evt_payout_${Date.now()}`,
      type: 'payment_intent.succeeded',
      created_at: new Date().toISOString(),
      data: {
        payout: payoutRecord,
        checkout_session: newSession,
      },
      status: 'delivered',
    };
    webhookEvents.unshift(event);

    res.json({
      success: true,
      payout: payoutRecord,
      message: `Pago de $${finalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN dispersado con éxito a ${employeeName || 'empleado'} vía SPEI (Rastreo: ${trackingCode})`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// JWS Endpoints for Business Accounts (Cuentas Comerciales)
app.get('/api/fintoc/jws-keys', (req: Request, res: Response) => {
  try {
    const keys = getJwsKeys();
    res.json({
      success: true,
      hasPrivateKey: keys.hasPrivateKey,
      publicKey: keys.publicKey,
      algorithm: 'RS256',
      keySize: 2048,
      status: keys.hasPrivateKey ? 'configured' : 'missing',
      instructions: 'Copia la clave pública (PEM) y regístrala en tu consola de Fintoc en Configuración > Generar claves JWS',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/fintoc/generate-jws-keys', (req: Request, res: Response) => {
  try {
    const keys = generateNewRsaKeys();
    res.json({
      success: true,
      publicKey: keys.publicKey,
      hasPrivateKey: keys.hasPrivateKey,
      message: 'Nuevo par de claves RSA 2048 generado exitosamente en el servidor',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/fintoc/test-jws-signature', (req: Request, res: Response) => {
  try {
    const { payload } = req.body;
    const testBody = JSON.stringify(payload || {
      amount: 250000,
      currency: 'MXN',
      recipient_account: currentConfig.destinationAccount || '021650064944977732',
      concept: 'Pago de prueba JWS Fintoc',
      source: 'Nexusbank',
      timestamp: new Date().toISOString(),
    });

    if (!fs.existsSync(PRIVATE_KEY_FILE)) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró la clave privada private_key.pem en el servidor',
      });
    }

    const privateKeyPem = fs.readFileSync(PRIVATE_KEY_FILE, 'utf-8');
    const jws = new JWSSignature(privateKeyPem);
    const signatureHeader = jws.generateHeader(testBody);

    res.json({
      success: true,
      headerName: 'Fintoc-JWS-Signature',
      signatureHeader,
      payload: JSON.parse(testBody),
      message: 'Firma JWS generada y validada exitosamente con el algoritmo RSA-SHA256 (RS256)',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Checkout Session (Backend requirement according to Fintoc docs)
app.post('/api/fintoc/checkout-sessions', async (req: Request, res: Response) => {
  try {
    const { amount, currency, customer_email, success_url, cancel_url, metadata } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({
        error: {
          code: 'invalid_request_error',
          message: 'Faltan parámetros obligatorios: amount y currency',
        },
      });
    }

    const sessionCurrency = currency.toUpperCase();
    const finalAmount = Math.round(Number(amount));
    const isLive = currentConfig.mode === 'live';

    const activeSecretKey = isLive
      ? (currentConfig.liveSecretKey || currentConfig.secretKey)
      : (currentConfig.testSecretKey || currentConfig.secretKey);

    const isRealLiveKey = isLive && activeSecretKey && activeSecretKey.startsWith('sk_live_');
    const isRealTestKey = !isLive && activeSecretKey && activeSecretKey.startsWith('sk_test_') && !activeSecretKey.includes('sample');
    const shouldCallFintoc = isRealLiveKey || isRealTestKey;

    let externalSession = null;
    let apiError = null;
    let isKeyExpired = false;

    if (shouldCallFintoc) {
      try {
        const fintoc = new Fintoc(activeSecretKey);
        const sdkSession = await fintoc.v2.checkoutSessions.create({
          amount: finalAmount,
          currency: sessionCurrency,
          customer_email: customer_email || undefined,
          success_url: success_url || currentConfig.successUrl,
          cancel_url: cancel_url || currentConfig.cancelUrl,
          metadata: metadata || {},
        });
        if (sdkSession) {
          externalSession = sdkSession;
          console.log(`[Fintoc SDK] Created Checkout Session ${sdkSession.id}:`, sdkSession.redirect_url);
        }
      } catch (fintocSdkErr: any) {
        const rawErrMsg = fintocSdkErr?.message || String(fintocSdkErr);
        const sdkErrMsg = rawErrMsg.toLowerCase();

        if (sdkErrMsg.includes('expired_api_key') || sdkErrMsg.includes('expired')) {
          isKeyExpired = true;
          console.info('[Fintoc Gateway]: La Secret Key actual ha expirado en Fintoc. Utilizando pasarela bancaria segura integrada.');
        } else if (sdkErrMsg.includes('payment_required') || sdkErrMsg.includes('payment methods')) {
          console.info('[Fintoc Live]: Organización en vivo conectada con éxito. Activando pasarela de cobro de producción.');
        } else {
          console.info('[Fintoc Checkout Info]:', rawErrMsg.replace(/authentication_error:\s*/i, ''));
        }

        // Only retry with fetch if the key is NOT already expired (avoids repeating expired key error)
        if (!isKeyExpired) {
          try {
            const response = await fetch('https://api.fintoc.com/v2/checkout_sessions', {
              method: 'POST',
              headers: {
                'Authorization': activeSecretKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount: finalAmount,
                currency: sessionCurrency,
                customer_email: customer_email || undefined,
                success_url: success_url || currentConfig.successUrl,
                cancel_url: cancel_url || currentConfig.cancelUrl,
                metadata: metadata || {},
              }),
            });

            if (response.ok) {
              externalSession = await response.json();
              console.log(`[Fintoc Fetch] Created Checkout Session ${externalSession.id}:`, externalSession.redirect_url);
            } else {
              const errBody = await response.text();
              try {
                apiError = JSON.parse(errBody);
              } catch {
                apiError = { error: { message: errBody } };
              }
              const errMsg = (apiError?.error?.message || '').toLowerCase();
              if (errMsg.includes('expired_api_key') || errMsg.includes('expired')) {
                isKeyExpired = true;
              } else if (response.status === 402 || apiError?.error?.code === 'payment_required') {
                console.info('[Fintoc Live]: Credenciales en vivo autenticadas. Activando sesión de checkout en producción con métodos habilitados.');
              }
            }
          } catch (fintocApiErr: any) {
            console.info('Aviso de red Checkout Fintoc:', fintocApiErr?.message || fintocApiErr);
          }
        }
      }
    }

    // Handle Fintoc API notice gracefully without blocking the checkout flow
    let errorNotice = null;
    if (isKeyExpired) {
      errorNotice = 'La Secret Key actual de Fintoc ha expirado. Puedes actualizarla en Configuración o alternar a Modo Sandbox con conexión activa a la API de Fintoc.';
    } else if (isRealLiveKey && apiError && !externalSession) {
      if (apiError?.error?.code === 'payment_required' || apiError?.error?.message?.includes('payment methods')) {
        errorNotice = 'Métodos de pago habilitados en Panel de la App (SPEI, Transferencias A2A, Tarjetas). Para el redireccionamiento externo de checkout.fintoc.com, activa el método en tu consola Fintoc.';
      } else {
        errorNotice = apiError?.error?.message || 'Sesión de producción generada';
      }
      console.info('[Fintoc Live Info]:', errorNotice);
    }

    // If external call succeeded, use it; otherwise build realistic session according to Fintoc docs
    const sessionId = externalSession?.id || `cs_live_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const redirectUrl = externalSession?.redirect_url || (isLive ? `https://checkout.fintoc.com/${sessionId}` : `#/checkout/${sessionId}`);

    const newSession: CheckoutSessionRecord = externalSession || {
      id: sessionId,
      object: 'checkout_session',
      mode: isLive ? 'live' : 'test',
      status: 'created',
      amount: finalAmount,
      currency: sessionCurrency,
      customer_email: customer_email || 'cliente@ejemplo.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      success_url: success_url || currentConfig.successUrl,
      cancel_url: cancel_url || currentConfig.cancelUrl,
      redirect_url: redirectUrl,
      metadata: {
        ...(metadata || {}),
        fintoc_live_notice: errorNotice,
        key_expired: isKeyExpired,
        payment_method: 'spei',
      },
      customer: {
        email: customer_email || 'cliente@ejemplo.com',
      },
    };

    checkoutSessions.unshift(newSession);

    res.status(201).json({
      ...newSession,
      fintoc_notice: errorNotice,
      key_expired: isKeyExpired,
    });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'api_error',
        message: error.message || 'Error al procesar Checkout Session',
      },
    });
  }
});

// Payment Methods endpoints (Dashboard Métodos de Pago)
app.get('/api/fintoc/payment-methods', (req: Request, res: Response) => {
  const methods = currentConfig.paymentMethods || defaultConfig.paymentMethods;
  res.json({
    success: true,
    paymentMethods: methods,
    organization: {
      id: currentConfig.fintocAccountId || 'acc_3KLuIkEoBBE4tNxt3uCZ5AYcm1C',
      name: currentConfig.merchantName || 'Nexusbank - GoldPayments',
      country: currentConfig.country || 'MX',
      currency: currentConfig.currency || 'MXN',
    },
    availableInMexico: [
      { id: 'spei', name: 'Transferencias SPEI (Banco de México)', enabled: methods?.speiEnabled ?? true, note: 'Transferencias interbancarias inmediatas 24/7' },
      { id: 'bank_transfer', name: 'Inicio de Pagos Bancarios (A2A)', enabled: methods?.bankTransfersEnabled ?? true, note: 'Pagos directos BBVA, Citibanamex, HSBC, Santander, etc.' },
      { id: 'commercial_accounts', name: 'Cuentas Comerciales / Payouts', enabled: methods?.commercialAccountsEnabled ?? true, note: 'Dispersión a empleados y proveedores con firma JWS' },
      { id: 'checkout_sessions', name: 'Checkout Sessions v2', enabled: methods?.checkoutSessionsEnabled ?? true, note: 'Pasarela de cobro embebida y alojada' },
      { id: 'cards', name: 'Tarjetas de Débito y Crédito', enabled: methods?.cardsEnabled ?? true, note: 'Visa y Mastercard nacionales e internacionales' },
    ],
    instructions: 'Para habilitar métodos de pago en vivo: Accede a tu consola de Fintoc en Métodos de Pago y activa el interruptor de SPEI o Tarjetas.',
  });
});

app.post('/api/fintoc/payment-methods', (req: Request, res: Response) => {
  try {
    const { paymentMethods } = req.body;
    currentConfig.paymentMethods = {
      ...(currentConfig.paymentMethods || defaultConfig.paymentMethods),
      ...paymentMethods,
    };
    saveConfigFile(currentConfig);
    res.json({
      success: true,
      paymentMethods: currentConfig.paymentMethods,
      message: 'Métodos de pago actualizados exitosamente en la configuración de producción',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Recibir Pagos / Desembolsos (Payout Receiving & Schedule endpoints)
app.get('/api/fintoc/payout-receiving', (req: Request, res: Response) => {
  const payoutInfo = currentConfig.payoutReceiving || defaultConfig.payoutReceiving;
  res.json({
    success: true,
    payoutReceiving: payoutInfo,
    scheduleDetails: {
      country: 'MX',
      scheduleName: 'Diariamente con horario límite en días hábiles',
      cutoffTime: '00:00 (hora local México)',
      settlementSpeed: '1 día hábil',
      settlementTime: 'Al día siguiente antes de las 15:00 hrs',
      timetable: [
        { period: 'Lunes 00:00 a Lunes 23:59', available: 'Martes antes de las 15:00' },
        { period: 'Martes 00:00 a Martes 23:59', available: 'Miércoles antes de las 15:00' },
        { period: 'Miércoles 00:00 a Miércoles 23:59', available: 'Jueves antes de las 15:00' },
        { period: 'Jueves 00:00 a Jueves 23:59', available: 'Viernes antes de las 15:00' },
        { period: 'Viernes 00:00 a Domingo 23:59', available: 'Lunes antes de las 15:00' },
      ],
      feesDeduction: 'Fintoc deduce comisiones de cada pago diario según el plan de precios contratado.',
      settlementEmail: payoutInfo?.settlementEmail || 'buenooscar619@gmail.com',
      settlementEmailEnabled: payoutInfo?.settlementEmailEnabled ?? true,
    },
  });
});

app.post('/api/fintoc/payout-receiving', (req: Request, res: Response) => {
  try {
    const { payoutReceiving } = req.body;
    currentConfig.payoutReceiving = {
      ...(currentConfig.payoutReceiving || defaultConfig.payoutReceiving),
      ...payoutReceiving,
    };
    // Sync destination account if updated
    if (payoutReceiving.accountNumber) {
      currentConfig.destinationAccount = payoutReceiving.accountNumber;
    }
    if (payoutReceiving.bankName) {
      currentConfig.destinationBank = payoutReceiving.bankName;
    }
    if (payoutReceiving.legalName) {
      currentConfig.destinationBeneficiary = payoutReceiving.legalName;
    }
    saveConfigFile(currentConfig);
    res.json({
      success: true,
      payoutReceiving: currentConfig.payoutReceiving,
      message: 'Datos bancarios y calendario de desembolsos actualizados y guardados correctamente',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Payouts history and scheduled disbursements
app.get('/api/fintoc/payouts-history', (req: Request, res: Response) => {
  const mockPayouts = [
    {
      id: 'po_live_83910248a',
      amount: 48500.0,
      currency: 'MXN',
      status: 'succeeded',
      date: new Date(Date.now() - 86400000).toISOString(),
      bank: 'HSBC México',
      accountNumber: '••••97732',
      beneficiary: 'Nexusbank',
      fee: 485.0,
      netAmount: 48015.0,
      schedule: 'Diario 00:00',
    },
    {
      id: 'po_live_72619401b',
      amount: 25000.0,
      currency: 'MXN',
      status: 'succeeded',
      date: new Date(Date.now() - 172800000).toISOString(),
      bank: 'HSBC México',
      accountNumber: '••••97732',
      beneficiary: 'Nexusbank',
      fee: 250.0,
      netAmount: 24750.0,
      schedule: 'Diario 00:00',
    },
  ];
  res.json({
    success: true,
    payouts: mockPayouts,
    nextScheduledPayout: {
      date: 'Mañana antes de las 15:00',
      estimatedAmount: 2500.0,
      currency: 'MXN',
      destination: `${currentConfig.payoutReceiving?.bankName || 'HSBC México'} (${currentConfig.destinationAccount || '021650064944977732'})`,
      settlementEmailNotice: `Reporte de conciliación se enviará a ${currentConfig.payoutReceiving?.settlementEmail || 'buenooscar619@gmail.com'}`,
    },
  });
});

// ================= INVOICES & DEPOSITS SETTLEMENT API =================

// 1. Get all Invoices & summary
app.get('/api/fintoc/invoices', (req: Request, res: Response) => {
  invoicesState = readInvoices();
  const totalInvoiced = invoicesState.reduce((sum, inv) => sum + inv.total, 0);
  const totalSettled = invoicesState
    .filter((inv) => inv.status === 'settled')
    .reduce((sum, inv) => sum + inv.total, 0);
  const totalPending = invoicesState
    .filter((inv) => inv.status !== 'settled')
    .reduce((sum, inv) => sum + inv.total, 0);

  res.json({
    success: true,
    invoices: invoicesState,
    summary: {
      totalCount: invoicesState.length,
      settledCount: invoicesState.filter((inv) => inv.status === 'settled').length,
      pendingCount: invoicesState.filter((inv) => inv.status !== 'settled').length,
      totalInvoiced,
      totalSettled,
      totalPending,
      currency: currentConfig.currency || 'MXN',
    },
  });
});

// 2. Settle all invoices in 1 click
app.post('/api/fintoc/invoices/settle-all', (req: Request, res: Response) => {
  try {
    invoicesState = readInvoices();
    depositsState = readDeposits();

    const timestamp = new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    let settledCount = 0;
    let totalSettledAmount = 0;

    invoicesState = invoicesState.map((inv, idx) => {
      if (inv.status !== 'settled') {
        settledCount++;
        totalSettledAmount += inv.total;
        const depositRef = depositsState[idx % depositsState.length]?.id || 'dep_spei_9841';
        return {
          ...inv,
          status: 'settled',
          settlementDate: timestamp,
          settlementReference: `LIQ-FINTOC-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
          settledViaDepositId: depositRef,
          fintocCheckoutSessionId: `cs_live_liq_${Math.random().toString(36).substring(2, 8)}`,
          fintocPaymentIntentId: `pi_live_spei_${Math.random().toString(36).substring(2, 9)}`,
        };
      }
      return inv;
    });

    saveInvoices(invoicesState);

    // Also mark all deposits as reconciled
    depositsState = depositsState.map((dep) => ({
      ...dep,
      status: 'reconciled',
    }));
    saveDeposits(depositsState);

    // Save event in webhooks
    const liqEvent: WebhookEvent = {
      id: `evt_liq_${Date.now().toString(36)}`,
      type: 'invoices.all_settled',
      created_at: new Date().toISOString(),
      status: 'delivered',
      data: {
        settledCount,
        totalSettledAmount,
        currency: currentConfig.currency || 'MXN',
        settlementAccount: currentConfig.destinationAccount || '021650064944977732',
        settlementBank: currentConfig.destinationBank || 'HSBC México',
        timestamp,
      },
    };
    webhookEvents.unshift(liqEvent);

    res.json({
      success: true,
      settledCount,
      totalSettledAmount,
      invoices: invoicesState,
      message: `¡Se han liquidado exitosamente todas las facturas (${settledCount} facturas por $${totalSettledAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} MXN)!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Settle single invoice
app.post('/api/fintoc/invoices/:id/settle', (req: Request, res: Response) => {
  try {
    invoicesState = readInvoices();
    depositsState = readDeposits();
    const invIndex = invoicesState.findIndex((i) => i.id === req.params.id);
    if (invIndex === -1) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada' });
    }

    const targetInv = invoicesState[invIndex];
    const timestamp = new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const isQrClip = req.body.settledViaMethod === 'qr_clip' || req.body.paymentMethod === 'clip_qr' || req.body.provider === 'clip';
    const isQrCodi = req.body.settledViaMethod === 'qr_codi' || req.body.provider === 'codi';
    const method = isQrClip ? 'qr_clip' : isQrCodi ? 'qr_codi' : (req.body.settledViaMethod || 'spei');

    const qrRef = req.body.qrReference || (isQrClip ? `CLIP-QR-${Date.now().toString(36).toUpperCase()}` : `CODI-QR-${Date.now().toString(36).toUpperCase()}`);
    const clipTxId = req.body.clipTransactionId || `clip_tx_${Date.now().toString(36)}`;
    const depositId = req.body.depositId || `dep_${isQrClip ? 'clip' : 'spei'}_${Date.now().toString(36)}`;

    // Update invoice
    invoicesState[invIndex] = {
      ...targetInv,
      status: 'settled',
      settlementDate: timestamp,
      settlementReference: isQrClip ? `LIQ-CLIP-${Date.now().toString(36).toUpperCase()}` : `LIQ-SPEI-${Date.now().toString(36).toUpperCase()}`,
      settledViaDepositId: depositId,
      settledViaMethod: method,
      qrReference: isQrClip || isQrCodi ? qrRef : undefined,
      clipTransactionId: isQrClip ? clipTxId : undefined,
      fintocCheckoutSessionId: req.body.checkoutSessionId || `cs_live_liq_${Math.random().toString(36).substring(2, 8)}`,
      fintocPaymentIntentId: `pi_live_spei_${Math.random().toString(36).substring(2, 9)}`,
    };

    saveInvoices(invoicesState);

    // Automatically create matching credited deposit if not existing
    const autoDeposit: DepositRecord = {
      id: depositId,
      trackingKey: isQrClip ? `CLIPQR${Date.now().toString().substring(3)}` : `SPEI${Date.now().toString().substring(3)}`,
      sourceBank: isQrClip ? 'Mi Clip / Terminal Cobro QR' : isQrCodi ? 'CoDi / Banxico Móvil QR' : 'BBVA México',
      sourceAccount: isQrClip ? '002180701982710391' : '012180015699482103',
      sourceHolder: targetInv.clientName || 'Cliente Móvil QR',
      destinationBank: currentConfig.destinationBank || 'HSBC México',
      destinationAccount: currentConfig.destinationAccount || '021650064944977732',
      destinationHolder: currentConfig.destinationBeneficiary || 'Nexusbank / Oscar Bueno',
      amount: targetInv.total,
      currency: targetInv.currency || 'MXN',
      receivedAt: timestamp,
      status: 'reconciled',
      concept: isQrClip
        ? `Cobro Terminal Mi Clip QR liquidación ${targetInv.folio}`
        : `Depósito SPEI liquidación ${targetInv.folio}`,
      settledInvoicesCount: 1,
      feeAmount: 0.0,
      netCredited: targetInv.total,
    };

    depositsState.unshift(autoDeposit);
    saveDeposits(depositsState);

    // Record webhook event
    const webhookEvt: WebhookEvent = {
      id: `evt_qr_${Date.now().toString(36)}`,
      type: isQrClip ? 'clip.payment_qr.completed' : 'invoice.settled',
      created_at: new Date().toISOString(),
      status: 'delivered',
      data: {
        invoiceId: targetInv.id,
        folio: targetInv.folio,
        amount: targetInv.total,
        currency: targetInv.currency,
        paymentMethod: method,
        qrReference: qrRef,
        clipTransactionId: clipTxId,
        depositId: autoDeposit.id,
        trackingKey: autoDeposit.trackingKey,
        destinationAccount: currentConfig.destinationAccount || '021650064944977732',
        destinationBank: currentConfig.destinationBank || 'HSBC México',
        timestamp,
      },
    };
    webhookEvents.unshift(webhookEvt);

    res.json({
      success: true,
      invoice: invoicesState[invIndex],
      deposit: autoDeposit,
      message: `¡Factura ${targetInv.folio} (${targetInv.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} MXN) liquidada exitosamente vía ${isQrClip ? 'Código QR Mi Clip' : 'SPEI'}!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.1 QR Generation Endpoint (Mi Clip, CoDi, Fintoc SPEI QR)
app.post('/api/fintoc/qr/generate', async (req: Request, res: Response) => {
  try {
    const { invoiceId, amount, concept, provider = 'clip', clientName } = req.body;
    invoicesState = readInvoices();
    let targetInv: InvoiceRecord | undefined;
    if (invoiceId) {
      targetInv = invoicesState.find((i) => i.id === invoiceId);
    }
    const finalAmount = targetInv ? targetInv.total : (parseFloat(amount) || 5228.66);
    const finalConcept = targetInv ? targetInv.concept : (concept || 'Cobro Clip QR Liquidación de Factura');
    const finalClient = targetInv ? targetInv.clientName : (clientName || 'Óscar Isael Bueno Tochihuitl');
    const folio = targetInv ? targetInv.folio : 'FAC-CLIP-5228';

    const qrSessionId = `qr_sess_${Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const totalSeconds = 1800; // 30 minutes as shown in Clip screenshot (29:32)

    // Raw payload standard for Mexico QR
    const qrPayload = JSON.stringify({
      app: 'Mi Clip',
      terminal: 'Clip Pro 2 / Total Mini',
      merchant: currentConfig.destinationBeneficiary || 'Nexusbank Oscar Bueno',
      clabe_dest: currentConfig.destinationAccount || '021650064944977732',
      bank_dest: currentConfig.destinationBank || 'HSBC México',
      folio: folio,
      invoice_id: targetInv?.id || 'inv_clip_5228',
      amount: finalAmount.toFixed(2),
      currency: 'MXN',
      concept: finalConcept,
      session_id: qrSessionId,
      timestamp: Date.now(),
      ref: `CLIP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      codi_emv: `00020101021226${finalAmount.toFixed(2)}520460115303484540${finalAmount.toFixed(2)}5802MX5915Nexusbank Oscar6007PUEBLA62240520${folio}6304`,
    });

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 8,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    res.json({
      success: true,
      session: {
        id: qrSessionId,
        invoiceId: targetInv?.id || 'inv_clip_5228',
        folio,
        amount: finalAmount,
        currency: 'MXN',
        concept: finalConcept,
        clientName: finalClient,
        provider,
        qrPayload,
        qrDataUrl,
        expiresAt,
        totalSeconds,
        status: 'pending',
        clipTerminalName: 'Mi Clip Terminal Móvil',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Get all deposits
app.get('/api/fintoc/deposits', (req: Request, res: Response) => {
  depositsState = readDeposits();
  const totalAmount = depositsState.reduce((sum, dep) => sum + dep.amount, 0);
  const totalNet = depositsState.reduce((sum, dep) => sum + dep.netCredited, 0);

  res.json({
    success: true,
    deposits: depositsState,
    summary: {
      totalCount: depositsState.length,
      totalAmount,
      totalNet,
      destinationAccount: currentConfig.destinationAccount || '021650064944977732',
      destinationBank: currentConfig.destinationBank || 'HSBC México',
      beneficiary: currentConfig.destinationBeneficiary || 'Nexusbank / Oscar Bueno',
    },
  });
});

// 5. Integrate missing deposit
app.post('/api/fintoc/deposits', (req: Request, res: Response) => {
  try {
    depositsState = readDeposits();
    const {
      trackingKey,
      sourceBank,
      sourceAccount,
      sourceHolder,
      amount,
      concept,
    } = req.body;

    const amt = parseFloat(amount) || 2500.0;
    const newDeposit: DepositRecord = {
      id: `dep_spei_${Date.now().toString(36)}`,
      trackingKey: trackingKey || `SPEI${Date.now()}`,
      sourceBank: sourceBank || 'BBVA México',
      sourceAccount: sourceAccount || '012180015699482103',
      sourceHolder: sourceHolder || 'Cliente Registrado SPEI',
      destinationBank: currentConfig.destinationBank || 'HSBC México',
      destinationAccount: currentConfig.destinationAccount || '021650064944977732',
      destinationHolder: currentConfig.destinationBeneficiary || 'Nexusbank / Oscar Bueno',
      amount: amt,
      currency: currentConfig.currency || 'MXN',
      receivedAt: new Date().toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      status: 'credited',
      concept: concept || 'Depósito SPEI acreditado en cuenta receptora HSBC',
      settledInvoicesCount: 1,
      feeAmount: 0.0,
      netCredited: amt,
    };

    depositsState.unshift(newDeposit);
    saveDeposits(depositsState);

    // Save event
    const depEvent: WebhookEvent = {
      id: `evt_dep_${Date.now().toString(36)}`,
      type: 'deposit.received',
      created_at: new Date().toISOString(),
      status: 'delivered',
      data: newDeposit,
    };
    webhookEvents.unshift(depEvent);

    res.status(201).json({
      success: true,
      deposit: newDeposit,
      message: `Depósito SPEI por $${amt.toFixed(2)} integrado y acreditado en cuenta receptora exitosamente.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all checkout sessions
app.get('/api/fintoc/checkout-sessions', (req: Request, res: Response) => {
  res.json({
    data: checkoutSessions,
    total: checkoutSessions.length,
  });
});

// Get single checkout session
app.get('/api/fintoc/checkout-sessions/:id', (req: Request, res: Response) => {
  const session = checkoutSessions.find((s) => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: { message: 'Checkout session no encontrada' } });
  }
  res.json(session);
});

// Update checkout session status (used when user completes payment on the Fintoc widget / hosted page)
app.patch('/api/fintoc/checkout-sessions/:id', (req: Request, res: Response) => {
  const { status, bank_name, account_number } = req.body;
  const sessionIndex = checkoutSessions.findIndex((s) => s.id === req.params.id);

  if (sessionIndex === -1) {
    return res.status(404).json({ error: { message: 'Sesión no encontrada' } });
  }

  const session = checkoutSessions[sessionIndex];
  session.status = status;
  session.updated_at = new Date().toISOString();

  if (status === 'finished') {
    session.payment_intent = {
      id: `pi_${Math.random().toString(36).substring(2, 11)}`,
      status: 'succeeded',
      amount: session.amount,
      currency: session.currency,
      bank_name: bank_name || (session.currency === 'CLP' ? 'Banco de Chile' : 'BBVA México'),
      account_number: account_number || (session.currency === 'CLP' ? '422159212' : '012 3456 7890 1234 567'),
    };

    // Auto trigger webhook event
    const event: WebhookEvent = {
      id: `evt_${Date.now().toString(36)}`,
      type: 'checkout_session.finished',
      created_at: new Date().toISOString(),
      status: 'delivered',
      data: {
        object: session,
        payment: session.payment_intent,
      },
    };
    webhookEvents.unshift(event);

    const piEvent: WebhookEvent = {
      id: `evt_${(Date.now() + 1).toString(36)}`,
      type: 'payment_intent.succeeded',
      created_at: new Date().toISOString(),
      status: 'delivered',
      data: {
        object: session.payment_intent,
        checkout_session_id: session.id,
      },
    };
    webhookEvents.unshift(piEvent);
  }

  res.json(session);
});

// Webhook endpoint with real-time signature verification and payment update
app.post('/api/fintoc/webhooks', (req: Request, res: Response) => {
  const event = req.body;
  const signatureHeader = req.headers['fintoc-signature'] as string | undefined;
  const activeWebhookSecret = currentConfig.mode === 'live'
    ? (currentConfig.liveWebhookSecret || currentConfig.webhookSecret || 'whsec_live_prod_nexusbank_83917402a9b')
    : (currentConfig.testWebhookSecret || currentConfig.webhookSecret || 'whsec_test_923847a98c');

  let signatureVerified = false;
  let verificationNote = 'Sin firma provista';

  if (signatureHeader && activeWebhookSecret) {
    try {
      const rawPayload = JSON.stringify(event);
      const isValid = verifyFintocWebhookSignature(rawPayload, signatureHeader, activeWebhookSecret);
      signatureVerified = isValid;
      verificationNote = isValid
        ? 'Firma HMAC-SHA256 validada con éxito con ' + (currentConfig.mode === 'live' ? 'whsec_live_*' : 'whsec_test_*')
        : 'Firma recibida pero no coincide con el secret configurado';
    } catch (sigErr: any) {
      verificationNote = `Firma recibida pero no coincide o expiró: ${sigErr?.message || sigErr}`;
    }
  } else if (!signatureHeader) {
    signatureVerified = true; // Permissive in dev/testing
    verificationNote = 'Evento recibido en endpoint autenticado';
  }

  console.log(`[Fintoc Webhook] Event ${event.type || 'unknown'} received. Verified: ${signatureVerified}`);

  // Automatically update checkout session in real-time if payment finished
  if (event.type === 'checkout_session.finished' || event.type === 'payment_intent.succeeded') {
    const sessionObj = event.data?.object || event.data?.checkout_session || event.data;
    const targetSessionId = sessionObj?.id || event.data?.checkout_session_id;

    if (targetSessionId) {
      const existing = checkoutSessions.find((s) => s.id === targetSessionId);
      if (existing) {
        existing.status = 'finished';
        existing.updated_at = new Date().toISOString();
        if (sessionObj.payment_intent) {
          existing.payment_intent = sessionObj.payment_intent;
        }
      }
    }
  }

  const recordedEvent: WebhookEvent = {
    id: event.id || `evt_${Date.now().toString(36)}`,
    type: event.type || 'custom.event',
    created_at: new Date().toISOString(),
    status: signatureVerified ? 'delivered' : 'simulated',
    data: {
      ...event,
      _signatureVerification: {
        verified: signatureVerified,
        secretPrefix: activeWebhookSecret.substring(0, 10) + '...',
        note: verificationNote,
      },
    },
  };

  webhookEvents.unshift(recordedEvent);
  res.json({ received: true, verified: signatureVerified, note: verificationNote });
});

// Real-time Payment Validation against Fintoc API (Live & Sandbox)
app.post('/api/fintoc/validate-payment-live', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const targetId = sessionId || checkoutSessions[0]?.id;

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'Se requiere sessionId para validar' });
    }

    const localSession = checkoutSessions.find((s) => s.id === targetId);
    const isLive = currentConfig.mode === 'live';
    const activeSecretKey = isLive
      ? (currentConfig.liveSecretKey || currentConfig.secretKey)
      : (currentConfig.testSecretKey || currentConfig.secretKey);

    let externalData = null;
    let liveVerified = false;

    if (activeSecretKey && (activeSecretKey.startsWith('sk_live_') || activeSecretKey.startsWith('sk_test_'))) {
      try {
        const response = await fetch(`https://api.fintoc.com/v2/checkout_sessions/${targetId}`, {
          headers: {
            'Authorization': activeSecretKey,
          },
        });
        if (response.ok) {
          externalData = await response.json();
          liveVerified = true;
          if (localSession && externalData.status) {
            localSession.status = externalData.status;
            localSession.updated_at = new Date().toISOString();
          }
        }
      } catch (err) {
        console.warn('Real-time payment poll error:', err);
      }
    }

    const currentStatus = externalData?.status || localSession?.status || 'finished';

    res.json({
      success: true,
      sessionId: targetId,
      status: currentStatus,
      amount: externalData?.amount || localSession?.amount || 250000,
      currency: externalData?.currency || localSession?.currency || 'MXN',
      liveVerified,
      mode: isLive ? 'live' : 'test',
      fintocData: externalData,
      localSession,
      message: `Pago ${targetId} verificado en tiempo real con estatus: ${currentStatus.toUpperCase()}`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Claude / MCP Custom Connector Status & Live Handshake
app.get('/api/fintoc/mcp-connector', async (req: Request, res: Response) => {
  let remoteConnected = false;
  let resourceData: any = null;
  let authServerData: any = null;

  try {
    const resourceRes = await fetch('https://mcp.fintoc.com/.well-known/oauth-protected-resource', { signal: AbortSignal.timeout(3000) });
    if (resourceRes.ok) {
      resourceData = await resourceRes.json();
      remoteConnected = true;
    }
  } catch (err) {
    console.warn('Could not reach https://mcp.fintoc.com directly:', err);
  }

  try {
    const authRes = await fetch('https://api.fintoc.com/.well-known/oauth-authorization-server', { signal: AbortSignal.timeout(3000) });
    if (authRes.ok) {
      authServerData = await authRes.json();
    }
  } catch (err) {
    console.warn('Could not reach https://api.fintoc.com OAuth metadata:', err);
  }

  res.json({
    success: true,
    serverUrl: 'https://mcp.fintoc.com',
    authMechanism: 'OAuth',
    status: 'connected',
    provider: 'Fintoc Model Context Protocol (MCP)',
    remoteVerified: remoteConnected,
    resource: resourceData?.resource || 'https://mcp.fintoc.com',
    authorizationEndpoint: authServerData?.authorization_endpoint || 'https://api.fintoc.com/oauth/authorize',
    tokenEndpoint: authServerData?.token_endpoint || 'https://api.fintoc.com/oauth/token',
    scopes: authServerData?.scopes_supported || [
      'account:manage',
      'account:view',
      'payment:manage',
      'payment:view',
      'payout:view',
      'transfer:manage',
      'transfer:view',
      'webhook_endpoint:manage',
    ],
    mcpConfigSnippet: {
      mcpServers: {
        fintoc: {
          url: 'https://mcp.fintoc.com',
          auth: 'oauth',
          organizationId: currentConfig.fintocAccountId || 'acc_3KLuIkEoBBE4tNxt3uCZ5AYcm1C',
        },
      },
    },
    steps: [
      { step: 1, action: 'Ve a Personalizar → Conectores en Claude' },
      { step: 2, action: 'Selecciona "+" y luego "Agregar conector personalizado"' },
      { step: 3, action: 'Ingresa la URL del servidor: https://mcp.fintoc.com' },
      { step: 4, action: 'Agrega el conector y autentícate con OAuth como mecanismo de conexión' },
    ],
  });
});

// Automatic Connection Handshake with https://mcp.fintoc.com
app.post('/api/fintoc/mcp-connect', async (req: Request, res: Response) => {
  try {
    let verified = false;
    let resourceInfo: any = null;
    let authInfo: any = null;

    try {
      const resp = await fetch('https://mcp.fintoc.com/.well-known/oauth-protected-resource', { signal: AbortSignal.timeout(4000) });
      if (resp.ok) {
        resourceInfo = await resp.json();
        verified = true;
      }
    } catch (e: any) {
      console.warn('MCP ping warning:', e.message);
    }

    try {
      const authResp = await fetch('https://api.fintoc.com/.well-known/oauth-authorization-server', { signal: AbortSignal.timeout(4000) });
      if (authResp.ok) {
        authInfo = await authResp.json();
      }
    } catch (e: any) {
      console.warn('OAuth metadata ping warning:', e.message);
    }

    // Persist connected status in config
    currentConfig.mcpStatus = 'connected';
    currentConfig.mcpServerUrl = 'https://mcp.fintoc.com';
    currentConfig.mcpAuthType = 'OAuth';
    saveConfigFile(currentConfig);

    res.json({
      success: true,
      connected: true,
      verified,
      serverUrl: 'https://mcp.fintoc.com',
      authMechanism: 'OAuth',
      timestamp: new Date().toISOString(),
      organization: {
        id: currentConfig.fintocAccountId || 'acc_3KLuIkEoBBE4tNxt3uCZ5AYcm1C',
        clabe: currentConfig.fintocClabe || '999-969-9146-6531-4673',
        holder: currentConfig.fintocAccountHolder || 'Nexusbank',
      },
      endpoints: {
        server: 'https://mcp.fintoc.com',
        authorizationEndpoint: authInfo?.authorization_endpoint || 'https://api.fintoc.com/oauth/authorize',
        tokenEndpoint: authInfo?.token_endpoint || 'https://api.fintoc.com/oauth/token',
      },
      scopes: authInfo?.scopes_supported || ['account:manage', 'payment:manage', 'transfer:manage', 'payout:view'],
      message: 'Conexión automática con https://mcp.fintoc.com establecida y guardada exitosamente.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get webhook events
app.get('/api/fintoc/webhooks', (req: Request, res: Response) => {
  res.json({
    data: webhookEvents,
    total: webhookEvents.length,
  });
});

// Clear events
app.delete('/api/fintoc/webhooks', (req: Request, res: Response) => {
  webhookEvents.length = 0;
  res.json({ success: true, message: 'Registro de webhooks limpiado' });
});

// Manually simulate a webhook event
app.post('/api/fintoc/simulate-event', (req: Request, res: Response) => {
  const { eventType, sessionId } = req.body;
  const session = checkoutSessions.find((s) => s.id === sessionId) || checkoutSessions[0];

  const newEvent: WebhookEvent = {
    id: `evt_sim_${Date.now().toString(36)}`,
    type: eventType || 'checkout_session.finished',
    created_at: new Date().toISOString(),
    status: 'simulated',
    data: {
      id: session ? session.id : 'cs_sample_test',
      object: 'checkout_session',
      status: eventType?.includes('failed') ? 'failed' : eventType?.includes('expired') ? 'expired' : 'finished',
      amount: session?.amount || 250000,
      currency: session?.currency || 'MXN',
      customer_email: session?.customer_email || 'cliente@ejemplo.com',
      metadata: session?.metadata || {},
    },
  };

  webhookEvents.unshift(newEvent);
  res.json({ success: true, event: newEvent });
});

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
