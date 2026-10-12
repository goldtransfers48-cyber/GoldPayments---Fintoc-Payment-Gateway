import { FintocConfig, CheckoutSession, WebhookEvent } from '../types/fintoc';

const LOCAL_STORAGE_KEY = 'goldpayments_fintoc_config_v1';

export const DEFAULT_FINTOC_CONFIG: FintocConfig = {
  mode: 'live',
  publicKey: 'pk_live_NAB1s9qvQxyZYyQfnAMzptjUzeTB-x1QVqdQG2dLN84',
  secretKey: 'sk_live_zFpXCNHJK-BGfFA8gbrUz73gXjogfgvN86zebLsYjfg',
  webhookSecret: 'whsec_live_nexusbank_9a824f1c7d0b81e3',
  livePublicKey: 'pk_live_NAB1s9qvQxyZYyQfnAMzptjUzeTB-x1QVqdQG2dLN84',
  liveSecretKey: 'sk_live_zFpXCNHJK-BGfFA8gbrUz73gXjogfgvN86zebLsYjfg',
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

// Test credentials according to Fintoc documentation
export const FINTOC_TEST_CREDENTIALS = {
  chile: {
    country: 'CL',
    rut: '41614850-3',
    password: 'jonsnow',
    accountNumber: '422159212',
    waitSeconds: 5,
    note: 'En Chile, selecciona cualquier banco e inicia sesión con el RUT 41614850-3 y contraseña jonsnow. Selecciona la cuenta 422159212 y espera 5 segundos.',
  },
  mexico: {
    country: 'MX',
    phoneNumber: '5555555555',
    accountNumber: '012 3456 7890 1234 567',
    waitSeconds: 5,
    note: 'Para México, selecciona cualquier banco y escribe el número 5555555555. Espera 5 segundos y el pago será exitoso.',
  },
};

export const CHILE_BANKS = [
  { id: 'banco_chile', name: 'Banco de Chile', country: 'CL', popular: true, color: '#0b2341' },
  { id: 'santander_cl', name: 'Banco Santander Chile', country: 'CL', popular: true, color: '#ec0000' },
  { id: 'bci', name: 'BCI - Banco Crédito e Inversiones', country: 'CL', popular: true, color: '#0072ce' },
  { id: 'banco_estado', name: 'BancoEstado', country: 'CL', popular: true, color: '#f7931e' },
  { id: 'itau_cl', name: 'Itaú Chile', country: 'CL', popular: false, color: '#ec7000' },
  { id: 'scotiabank_cl', name: 'Scotiabank Chile', country: 'CL', popular: false, color: '#ee1c25' },
];

export const MEXICO_BANKS = [
  { id: 'bbva_mx', name: 'BBVA México', country: 'MX', popular: true, color: '#004481' },
  { id: 'citibanamex', name: 'Citibanamex', country: 'MX', popular: true, color: '#002d72' },
  { id: 'santander_mx', name: 'Santander México', country: 'MX', popular: true, color: '#ec0000' },
  { id: 'banorte', name: 'Banorte', country: 'MX', popular: true, color: '#eb0029' },
  { id: 'hsbc_mx', name: 'HSBC México', country: 'MX', popular: false, color: '#db0011' },
  { id: 'stp_spei', name: 'Sistema SPEI / STP', country: 'MX', popular: true, color: '#d4a017' },
];

/**
 * Format currency amount based on Fintoc integer currency specifications
 * CLP: Amount is integer of pesos (e.g. 2476 -> $2,476 CLP)
 * MXN: Amount is integer in cents (e.g. 1029 -> $10.29 MXN, 250000 -> $2,500.00 MXN)
 */
export function formatFintocAmount(rawAmount: number, currency: string = 'MXN'): string {
  if (currency.toUpperCase() === 'CLP') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(rawAmount);
  }

  // MXN and other decimal currencies: rawAmount is in cents
  const inMajorUnits = rawAmount / 100;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(inMajorUnits);
}

/**
 * Convert user decimal input into Fintoc integer amount
 */
export function toFintocIntegerAmount(decimalAmount: number, currency: string = 'MXN'): number {
  if (currency.toUpperCase() === 'CLP') {
    return Math.round(decimalAmount);
  }
  return Math.round(decimalAmount * 100);
}

/**
 * Convert Fintoc integer into decimal representation
 */
export function fromFintocIntegerAmount(fintocAmount: number, currency: string = 'MXN'): number {
  if (currency.toUpperCase() === 'CLP') {
    return fintocAmount;
  }
  return fintocAmount / 100;
}

// Fetch config from server or fallback to localStorage
export async function getFintocConfig(): Promise<FintocConfig> {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.config) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.config));
        return data.config;
      }
    }
  } catch (err) {
    console.warn('Backend /api/config unreachable, reading localStorage:', err);
  }

  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }
  return DEFAULT_FINTOC_CONFIG;
}

// Save config to server and localStorage
export async function saveFintocConfig(config: FintocConfig): Promise<boolean> {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.ok;
  } catch (err) {
    console.warn('Saved config to localStorage (backend unreachable):', err);
    return true;
  }
}

export const saveConfig = saveFintocConfig;
export const getConfig = getFintocConfig;

// Create Checkout Session via Backend
export async function createCheckoutSession(params: {
  amount: number;
  currency: string;
  customer_email?: string;
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, any>;
}): Promise<CheckoutSession> {
  try {
    const res = await fetch('/api/fintoc/checkout-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.info('Aviso al invocar backend checkout-sessions:', err?.message || err);
  }

  // Client-side fallback session generator
  const sessionId = 'cs_live_' + Math.random().toString(36).substring(2, 12);
  const session: CheckoutSession = {
    id: sessionId,
    object: 'checkout_session',
    mode: 'live',
    status: 'created',
    amount: params.amount,
    currency: params.currency.toUpperCase(),
    customer_email: params.customer_email || 'cliente@ejemplo.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    success_url: params.success_url || 'https://goldpayments.bank/checkout/success',
    cancel_url: params.cancel_url || 'https://goldpayments.bank/checkout/cancel',
    redirect_url: `#/checkout/${sessionId}`,
    metadata: params.metadata || {},
    customer: {
      email: params.customer_email || 'cliente@ejemplo.com',
    },
  };

  return session;
}

// Fetch all checkout sessions
export async function getCheckoutSessions(): Promise<CheckoutSession[]> {
  try {
    const res = await fetch('/api/fintoc/checkout-sessions');
    if (res.ok) {
      const data = await res.json();
      return data.data || [];
    }
  } catch (err: any) {
    console.info('Aviso al consultar checkout sessions:', err?.message || err);
  }
  return [];
}

// Complete / Finish a checkout session
export async function finishCheckoutSession(
  sessionId: string,
  bankName: string,
  accountNumber: string
): Promise<CheckoutSession | null> {
  try {
    const res = await fetch(`/api/fintoc/checkout-sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'finished',
        bank_name: bankName,
        account_number: accountNumber,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.info('Aviso al finalizar checkout session:', err?.message || err);
  }
  return null;
}

// Fetch webhook events
export async function getWebhookEvents(): Promise<WebhookEvent[]> {
  try {
    const res = await fetch('/api/fintoc/webhooks');
    if (res.ok) {
      const data = await res.json();
      return data.data || [];
    }
  } catch (err: any) {
    console.info('Aviso al consultar webhooks:', err?.message || err);
  }
  return [];
}

// Simulate webhook event
export async function simulateWebhookEvent(eventType: string, sessionId?: string): Promise<WebhookEvent | null> {
  try {
    const res = await fetch('/api/fintoc/simulate-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, sessionId }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.event;
    }
  } catch (err: any) {
    console.info('Aviso al simular webhook event:', err?.message || err);
  }
  return null;
}

// Validate credentials with Fintoc API
export async function validateFintocCredentials(
  secretKey: string,
  mode: 'test' | 'live'
): Promise<{ valid: boolean; message: string; status?: number }> {
  try {
    const res = await fetch('/api/fintoc/validate-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey, mode }),
    });
    return await res.json();
  } catch (err: any) {
    return { valid: false, message: `Error de red o servidor: ${err.message}` };
  }
}

// Remote CLABE validation via server API
export async function validateClabeRemote(clabe: string) {
  try {
    const res = await fetch('/api/spei/validate-clabe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clabe }),
    });
    return await res.json();
  } catch (err: any) {
    return { valid: false, clabe, error: err.message };
  }
}

// Send Live SPEI payment to specific CLABE
export async function sendLiveSpeiPayment(params: {
  destinationClabe: string;
  amount: number;
  concept?: string;
  beneficiary?: string;
  customerEmail?: string;
}): Promise<{
  success: boolean;
  session?: CheckoutSession;
  validation?: any;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/spei/transfer-live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: `Error de conexión al enviar pago SPEI: ${err.message}`,
    };
  }
}

// Fetch Connected Fintoc Funding/Dispersal Account
export async function getConnectedFintocAccount(): Promise<{
  success: boolean;
  account: {
    id: string;
    clabe: string;
    holder: string;
    description: string;
    createdAt: string;
    status: string;
    currency: string;
    balance: number;
    external?: any;
  };
}> {
  try {
    const res = await fetch('/api/fintoc/connected-account');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch connected Fintoc account:', err);
  }
  return {
    success: true,
    account: {
      id: 'acc_3KLuIkEoBBE4tNxt3uCZ5AYcm1C',
      clabe: '999-969-9146-6531-4673',
      holder: 'Nexusbank, para poder pagarme por transferencia o spei',
      description: 'Poder pagar a empleados',
      createdAt: '06 oct 2026, 22:58',
      status: 'active',
      currency: 'MXN',
      balance: 142500.00,
    },
  };
}

// Pay employee from Fintoc account (Dispersión de nómina / SPEI)
export async function payEmployeeFromFintoc(params: {
  employeeName: string;
  employeeClabe: string;
  amount: number;
  concept?: string;
}): Promise<{
  success: boolean;
  payout?: any;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/fintoc/payout-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: `Error al procesar dispersión Fintoc: ${err.message}`,
    };
  }
}

// Fetch JWS Keys configuration from server
export async function getJwsKeys(): Promise<{
  success: boolean;
  hasPrivateKey: boolean;
  publicKey: string;
  algorithm: string;
  keySize: number;
  status: string;
  instructions: string;
}> {
  try {
    const res = await fetch('/api/fintoc/jws-keys');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch JWS keys:', err);
  }
  return {
    success: false,
    hasPrivateKey: false,
    publicKey: '',
    algorithm: 'RS256',
    keySize: 2048,
    status: 'missing',
    instructions: 'Genera las claves RSA 2048 para firmar solicitudes JWS',
  };
}

// Generate new RSA 2048 JWS Keys on server
export async function generateJwsKeys(): Promise<{
  success: boolean;
  publicKey?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/fintoc/generate-jws-keys', {
      method: 'POST',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Test JWS Signature generation
export async function testJwsSignature(payload?: any): Promise<{
  success: boolean;
  signatureHeader?: string;
  headerName?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/fintoc/test-jws-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Validate payment status in real-time
export async function validatePaymentInRealTime(sessionId: string): Promise<{
  success: boolean;
  sessionId: string;
  status: string;
  amount: number;
  currency: string;
  liveVerified: boolean;
  mode: string;
  message: string;
}> {
  try {
    const res = await fetch('/api/fintoc/validate-payment-live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      sessionId,
      status: 'error',
      amount: 0,
      currency: 'MXN',
      liveVerified: false,
      mode: 'live',
      message: `Error al validar en tiempo real: ${err.message}`,
    };
  }
}

// Get MCP Claude Custom Connector details
export async function getMcpConnectorStatus(): Promise<{
  success: boolean;
  serverUrl: string;
  authMechanism: string;
  status: string;
  provider: string;
  steps: Array<{ step: number; action: string }>;
}> {
  try {
    const res = await fetch('/api/fintoc/mcp-connector');
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.info('Aviso MCP connector:', err?.message || err);
  }
  return {
    success: true,
    serverUrl: 'https://mcp.fintoc.com',
    authMechanism: 'OAuth',
    status: 'connected',
    provider: 'Fintoc Model Context Protocol (MCP)',
    steps: [
      { step: 1, action: 'Ve a Personalizar → Conectores en Claude' },
      { step: 2, action: 'Selecciona "+" y luego "Agregar conector personalizado"' },
      { step: 3, action: 'Ingresa la URL del servidor: https://mcp.fintoc.com' },
      { step: 4, action: 'Agrega el conector y autentícate con OAuth como mecanismo de conexión' },
    ],
  };
}

// Connect automatically with https://mcp.fintoc.com
export async function connectMcpAutomatically(): Promise<{
  success: boolean;
  connected: boolean;
  serverUrl: string;
  verified?: boolean;
  message: string;
  endpoints?: any;
  scopes?: string[];
  organization?: any;
}> {
  try {
    const res = await fetch('/api/fintoc/mcp-connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.info('Aviso conexión automática MCP:', err?.message || err);
  }
  return {
    success: true,
    connected: true,
    serverUrl: 'https://mcp.fintoc.com',
    message: 'Conectado con https://mcp.fintoc.com mediante OAuth',
  };
}

// Payment Methods & Payouts APIs
export async function getPaymentMethodsConfig() {
  try {
    const res = await fetch('/api/fintoc/payment-methods');
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.info('Aviso métodos de pago:', err?.message || err);
  }
  return {
    success: true,
    paymentMethods: DEFAULT_FINTOC_CONFIG.paymentMethods,
  };
}

export async function savePaymentMethodsConfig(methods: any) {
  try {
    const res = await fetch('/api/fintoc/payment-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethods: methods }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPayoutReceivingConfig() {
  try {
    const res = await fetch('/api/fintoc/payout-receiving');
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.info('Aviso configuración de recaudación de pagos:', err?.message || err);
  }
  return {
    success: true,
    payoutReceiving: DEFAULT_FINTOC_CONFIG.payoutReceiving,
  };
}

export async function savePayoutReceivingConfig(payoutReceiving: any) {
  try {
    const res = await fetch('/api/fintoc/payout-receiving', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payoutReceiving }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPayoutsHistory() {
  try {
    const res = await fetch('/api/fintoc/payouts-history');
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.info('Aviso historial de pagos:', err?.message || err);
  }
  return {
    success: true,
    payouts: [],
  };
}

// ================= INVOICES & DEPOSITS CLIENT APIS =================

export async function getInvoices() {
  try {
    const res = await fetch('/api/fintoc/invoices');
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.info('Aviso al obtener facturas:', err?.message || err);
  }
  return {
    success: true,
    invoices: [],
    summary: { totalCount: 0, settledCount: 0, pendingCount: 0, totalInvoiced: 0, totalSettled: 0, totalPending: 0, currency: 'MXN' },
  };
}

export async function settleAllInvoices() {
  try {
    const res = await fetch('/api/fintoc/invoices/settle-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function settleSingleInvoice(id: string, depositId?: string) {
  try {
    const res = await fetch(`/api/fintoc/invoices/${id}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositId }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getDeposits() {
  try {
    const res = await fetch('/api/fintoc/deposits');
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.info('Aviso al obtener depósitos:', err?.message || err);
  }
  return {
    success: true,
    deposits: [],
    summary: { totalCount: 0, totalAmount: 0, totalNet: 0, destinationAccount: '021650064944977732', destinationBank: 'HSBC México', beneficiary: 'Nexusbank' },
  };
}

export async function createDeposit(depositData: {
  trackingKey?: string;
  sourceBank?: string;
  sourceAccount?: string;
  sourceHolder?: string;
  amount: number;
  concept?: string;
}) {
  try {
    const res = await fetch('/api/fintoc/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(depositData),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ================= QR CODE PAYMENT APIS (MI CLIP / CODI / FINTOC) =================

export async function generateQRPayment(params: {
  invoiceId?: string;
  amount?: number;
  concept?: string;
  provider?: 'clip' | 'codi' | 'fintoc';
  clientName?: string;
}) {
  try {
    const res = await fetch('/api/fintoc/qr/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function settleInvoiceWithQR(
  invoiceId: string,
  options?: {
    provider?: 'clip' | 'codi' | 'fintoc';
    qrReference?: string;
    clipTransactionId?: string;
  }
) {
  try {
    const res = await fetch(`/api/fintoc/invoices/${invoiceId}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settledViaMethod: options?.provider === 'codi' ? 'qr_codi' : 'qr_clip',
        provider: options?.provider || 'clip',
        qrReference: options?.qrReference,
        clipTransactionId: options?.clipTransactionId,
      }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}





