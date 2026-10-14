export interface PaymentMethodsConfig {
  speiEnabled: boolean;
  bankTransfersEnabled: boolean;
  commercialAccountsEnabled: boolean;
  checkoutSessionsEnabled: boolean;
  cardsEnabled: boolean;
  installmentsEnabled: boolean;
}

export interface PayoutReceivingConfig {
  legalName: string;
  taxId: string; // RFC in Mexico, RUT in Chile
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

export interface FintocConfig {
  mode: 'live';
  // Active production keys
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  // Live / Production keys
  livePublicKey: string;
  liveSecretKey: string;
  liveWebhookSecret: string;
  // General parameters
  country: 'CL' | 'MX';
  currency: 'CLP' | 'MXN';
  successUrl: string;
  cancelUrl: string;
  merchantName: string;
  liveWebhookUrl?: string;
  requireLiveConfirmation?: boolean;
  // Destination account / Recipient for SPEI transfers in production
  destinationAccount?: string;
  destinationBank?: string;
  destinationBankCode?: string;
  destinationBeneficiary?: string;
  // Fintoc Created/Connected Account for SPEI Dispersal & Funding
  fintocAccountId?: string;
  fintocClabe?: string;
  fintocAccountHolder?: string;
  fintocAccountDescription?: string;
  fintocAccountCreatedAt?: string;
  // Claude / MCP Custom Connector
  mcpServerUrl?: string;
  mcpAuthType?: string;
  mcpStatus?: string;
  // Payment Methods & Payouts configuration
  paymentMethods?: PaymentMethodsConfig;
  payoutReceiving?: PayoutReceivingConfig;
}

export interface FintocConnectedAccount {
  id: string;
  clabe: string;
  holder: string;
  description: string;
  createdAt: string;
  status: 'active' | 'pending';
  currency: 'MXN' | 'CLP';
  balance: number;
}

export interface ClabeValidationResult {
  valid: boolean;
  clabe: string;
  bankCode?: string;
  bankName?: string;
  branchCode?: string;
  accountNumber?: string;
  controlDigit?: string;
  error?: string;
}

export interface CheckoutSession {
  id: string;
  object: 'checkout_session';
  mode: 'test' | 'live';
  status: 'created' | 'pending' | 'finished' | 'expired' | 'failed';
  amount: number; // In smallest currency units (CLP: 2476, MXN: 250000 = $2,500.00 MXN)
  currency: string;
  customer_email?: string;
  created_at: string;
  updated_at: string;
  success_url: string;
  cancel_url: string;
  redirect_url: string;
  metadata?: Record<string, any>;
  customer?: {
    email?: string;
    name?: string;
  };
  payment_intent?: PaymentIntent;
}

export interface PaymentIntent {
  id: string;
  status: 'succeeded' | 'failed' | 'pending';
  amount: number;
  currency: string;
  bank_name?: string;
  account_number?: string;
}

export interface WebhookEvent {
  id: string;
  type: 'checkout_session.finished' | 'checkout_session.expired' | 'payment_intent.succeeded' | 'payment_intent.failed' | string;
  created_at: string;
  status: 'delivered' | 'processed' | 'simulated';
  data: any;
}

export interface BankOption {
  id: string;
  name: string;
  logo: string;
  country: 'CL' | 'MX';
  popular?: boolean;
}

export interface AccountBalance {
  id: string;
  name: string;
  number: string;
  balance: number;
  type: 'checking' | 'savings' | 'credit';
  currency: string;
  subtitle?: string;
}

export interface Movement {
  id: string;
  title: string;
  timestamp: string;
  detail: string;
  amount: number;
  type: 'debit' | 'credit';
  category: 'shopping' | 'transfer' | 'food' | 'service';
  status: 'completed' | 'pending';
}

export interface TramitePaymentData {
  id: string;
  folio: string;
  lineaCaptura: string;
  tramiteTipo: string;
  dependencia: string;
  solicitanteNombre: string;
  identificacionFiscal: string; // RFC (MX) o RUT (CL)
  correoElectronico: string;
  telefono?: string;
  concepto: string;
  arancelBase: number;
  derechosGubernamentales: number;
  montoTotal: number;
  moneda: 'MXN' | 'CLP';
  fechaEmision: string;
  fechaVencimiento: string;
  estado: 'pendiente' | 'pagado' | 'vencido' | 'cancelado';
  fintocSessionId?: string;
  fintocPaymentIntentId?: string;
  fechaPago?: string;
  bancoPago?: string;
  selloDigital?: string;
  cadenaOriginal?: string;
}

export interface InvoiceRecord {
  id: string;
  folio: string;
  uuid: string; // CFDI UUID / Folio Fiscal
  clientName: string;
  clientTaxId: string; // RFC / RUT
  clientEmail: string;
  issueDate: string;
  dueDate: string;
  concept: string;
  subtotal: number;
  tax: number; // IVA (16% MXN o 19% CLP)
  total: number;
  currency: 'MXN' | 'CLP';
  status: 'pending' | 'settled' | 'overdue';
  paymentMethod: 'PPD' | 'PUE'; // Pago en Parcialidades o Diferido / Pago en Una Sola Exhibición
  settlementDate?: string;
  settlementReference?: string;
  settledViaDepositId?: string;
  settledViaMethod?: 'qr_clip' | 'qr_codi' | 'spei' | 'fintoc_checkout' | 'manual';
  qrReference?: string;
  clipTransactionId?: string;
  fintocCheckoutSessionId?: string;
  fintocPaymentIntentId?: string;
}

export interface QRPaymentSession {
  id: string;
  invoiceId?: string;
  folio?: string;
  amount: number;
  currency: 'MXN' | 'CLP';
  concept: string;
  clientName: string;
  provider: 'clip' | 'codi' | 'fintoc';
  qrPayload: string;
  qrDataUrl?: string;
  expiresAt: string;
  totalSeconds: number;
  status: 'pending' | 'completed' | 'cancelled';
  clipTerminalName?: string;
}

export interface DepositRecord {
  id: string;
  trackingKey: string; // Clave de Rastreo SPEI / CEP
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
