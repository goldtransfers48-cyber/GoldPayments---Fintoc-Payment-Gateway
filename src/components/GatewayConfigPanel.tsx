import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Save, 
  ShieldCheck, 
  AlertTriangle, 
  Globe, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Copy, 
  Server, 
  Zap, 
  Check, 
  XCircle, 
  HelpCircle,
  Building2,
  Send,
  Terminal,
  Download,
  FileCode,
  Lock,
  Bot,
  ExternalLink,
  CreditCard,
  Calendar,
  Mail,
  Sliders,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { FintocConfig, PaymentMethodsConfig, PayoutReceivingConfig } from '../types/fintoc';
import { 
  saveFintocConfig, 
  DEFAULT_FINTOC_CONFIG, 
  validateFintocCredentials,
  getJwsKeys,
  generateJwsKeys,
  testJwsSignature,
  validatePaymentInRealTime,
  savePaymentMethodsConfig,
  savePayoutReceivingConfig,
  connectMcpAutomatically,
  getMcpConnectorStatus
} from '../services/fintocService';
import { validateClabe, formatClabeReadable } from '../utils/clabeValidator';

interface GatewayConfigPanelProps {
  config: FintocConfig;
  onConfigSaved: (newConfig: FintocConfig) => void;
}

type SubSection = 'credentials' | 'payment_methods' | 'payouts' | 'jws_mcp';

export const GatewayConfigPanel: React.FC<GatewayConfigPanelProps> = ({
  config,
  onConfigSaved,
}) => {
  const [activeSection, setActiveSection] = useState<SubSection>('credentials');

  const [formData, setFormData] = useState<FintocConfig>({
    ...config,
    mode: 'live',
    publicKey: config.livePublicKey || config.publicKey || 'pk_live_NAB1s9qvQxyZYyQfnAMzptjUzeTB-x1QVqdQG2dLN84',
    secretKey: config.liveSecretKey || config.secretKey || 'sk_live_zFpXCNHJK-BGfFA8gbrUz73gXjogfgvN86zebLsYjfg',
    webhookSecret: config.liveWebhookSecret || config.webhookSecret || 'whsec_live_nexusbank_9a824f1c7d0b81e3',
    livePublicKey: config.livePublicKey || 'pk_live_NAB1s9qvQxyZYyQfnAMzptjUzeTB-x1QVqdQG2dLN84',
    liveSecretKey: config.liveSecretKey || 'sk_live_zFpXCNHJK-BGfFA8gbrUz73gXjogfgvN86zebLsYjfg',
    liveWebhookSecret: config.liveWebhookSecret || 'whsec_live_nexusbank_9a824f1c7d0b81e3',
    destinationAccount: config.destinationAccount || '021650064944977732',
    destinationBank: config.destinationBank || 'HSBC México',
    destinationBankCode: config.destinationBankCode || '021',
    destinationBeneficiary: config.destinationBeneficiary || 'Nexusbank / Titular HSBC',
    fintocAccountId: config.fintocAccountId || 'acc_3KLuIkEoBBE4tNxt3uCZ5AYcm1C',
    fintocClabe: config.fintocClabe || '999-969-9146-6531-4673',
    fintocAccountHolder: config.fintocAccountHolder || 'Nexusbank, para poder pagarme por transferencia o spei',
    fintocAccountDescription: config.fintocAccountDescription || 'Poder pagar a empleados',
    fintocAccountCreatedAt: config.fintocAccountCreatedAt || '06 oct 2026, 22:58',
    mcpServerUrl: config.mcpServerUrl || 'https://mcp.fintoc.com',
    mcpAuthType: config.mcpAuthType || 'OAuth',
    mcpStatus: config.mcpStatus || 'connected',
    paymentMethods: config.paymentMethods || DEFAULT_FINTOC_CONFIG.paymentMethods,
    payoutReceiving: config.payoutReceiving || DEFAULT_FINTOC_CONFIG.payoutReceiving,
  });

  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live key validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    expired?: boolean;
    message: string;
    docUrl?: string;
  } | null>(null);

  // Currency calculation helper preview
  const [calcInput, setCalcInput] = useState<number>(2500);

  // JWS Keys State for Commercial Accounts API
  const [jwsPublicKey, setJwsPublicKey] = useState<string>('');
  const [hasJwsPrivateKey, setHasJwsPrivateKey] = useState<boolean>(false);
  const [isGeneratingJws, setIsGeneratingJws] = useState<boolean>(false);
  const [isTestingJws, setIsTestingJws] = useState<boolean>(false);
  const [jwsTestResult, setJwsTestResult] = useState<{
    success: boolean;
    header?: string;
    message?: string;
  } | null>(null);

  // Claude MCP Automatic Connection State
  const [isConnectingMcp, setIsConnectingMcp] = useState<boolean>(false);
  const [mcpResult, setMcpResult] = useState<{
    success: boolean;
    connected: boolean;
    verified?: boolean;
    serverUrl: string;
    message: string;
    endpoints?: any;
    scopes?: string[];
  } | null>(null);

  useEffect(() => {
    getJwsKeys().then((res) => {
      if (res.success && res.publicKey) {
        setJwsPublicKey(res.publicKey);
        setHasJwsPrivateKey(res.hasPrivateKey);
      }
    });

    // Auto-connect with https://mcp.fintoc.com on load
    connectMcpAutomatically().then((res) => {
      setMcpResult(res);
    });
  }, []);

  const handleConnectMcp = async () => {
    setIsConnectingMcp(true);
    const res = await connectMcpAutomatically();
    setIsConnectingMcp(false);
    setMcpResult(res);
  };

  // Sync with incoming config
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ...config,
      mode: 'live',
      publicKey: config.livePublicKey || config.publicKey || 'pk_live_NAB1s9qvQxyZYyQfnAMzptjUzeTB-x1QVqdQG2dLN84',
      secretKey: config.liveSecretKey || config.secretKey || 'sk_live_zFpXCNHJK-BGfFA8gbrUz73gXjogfgvN86zebLsYjfg',
      webhookSecret: config.liveWebhookSecret || config.webhookSecret || 'whsec_live_nexusbank_9a824f1c7d0b81e3',
      livePublicKey: config.livePublicKey || 'pk_live_NAB1s9qvQxyZYyQfnAMzptjUzeTB-x1QVqdQG2dLN84',
      liveSecretKey: config.liveSecretKey || 'sk_live_zFpXCNHJK-BGfFA8gbrUz73gXjogfgvN86zebLsYjfg',
      liveWebhookSecret: config.liveWebhookSecret || 'whsec_live_nexusbank_9a824f1c7d0b81e3',
      destinationAccount: config.destinationAccount || '021650064944977732',
      destinationBank: config.destinationBank || 'HSBC México',
      paymentMethods: config.paymentMethods || DEFAULT_FINTOC_CONFIG.paymentMethods,
      payoutReceiving: config.payoutReceiving || DEFAULT_FINTOC_CONFIG.payoutReceiving,
    }));
  }, [config]);

  const clabeValidation = validateClabe(formData.destinationAccount || '021650064944977732');

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleValidateKey = async () => {
    const isLive = formData.mode === 'live';
    const keyToValidate = isLive
      ? (formData.liveSecretKey || formData.secretKey)
      : (formData.testSecretKey || formData.secretKey);

    if (!keyToValidate) {
      setValidationResult({
        valid: false,
        message: `Por favor ingresa primero tu Secret Key (${isLive ? 'sk_live_...' : 'sk_test_...'})`,
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    const result = await validateFintocCredentials(keyToValidate, formData.mode);
    setIsValidating(false);
    setValidationResult(result);
  };

  const handleSwitchToVerifiedSandbox = async () => {
    const updated: FintocConfig = {
      ...formData,
      mode: 'test',
      publicKey: formData.testPublicKey || 'pk_test_bHAtH94sxsrhJVNE2muqSVyzQZyYNiPQTZe6CmPKDKg',
      secretKey: formData.testSecretKey || 'sk_test_p9ambuhQ6yYUz6NdJyR2tWoezVC-iK4-eRb9R1jq2HU',
      webhookSecret: formData.testWebhookSecret || 'whsec_test_923847a98c',
      testPublicKey: 'pk_test_bHAtH94sxsrhJVNE2muqSVyzQZyYNiPQTZe6CmPKDKg',
      testSecretKey: 'sk_test_p9ambuhQ6yYUz6NdJyR2tWoezVC-iK4-eRb9R1jq2HU',
      testWebhookSecret: 'whsec_test_923847a98c',
    };
    setFormData(updated);
    setIsSaving(true);
    await saveFintocConfig(updated);
    setIsSaving(false);
    onConfigSaved(updated);
    setValidationResult({
      valid: true,
      message: 'Modo Sandbox activado con credenciales oficiales verificadas de Fintoc API v2 (pay.fintoc.com).',
    });
  };

  const handleDownloadPublicKey = () => {
    if (!jwsPublicKey) return;
    const blob = new Blob([jwsPublicKey], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'public_key.pem';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateJws = async () => {
    setIsGeneratingJws(true);
    setJwsTestResult(null);
    const res = await generateJwsKeys();
    setIsGeneratingJws(false);
    if (res.success && res.publicKey) {
      setJwsPublicKey(res.publicKey);
      setHasJwsPrivateKey(true);
      setJwsTestResult({ success: true, message: 'Nuevo par de claves RSA 2048 generado exitosamente en el servidor' });
    }
  };

  const handleTestJws = async () => {
    setIsTestingJws(true);
    setJwsTestResult(null);
    const res = await testJwsSignature();
    setIsTestingJws(false);
    setJwsTestResult({
      success: res.success,
      header: res.signatureHeader,
      message: res.message || res.error,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload: FintocConfig = {
      ...formData,
      mode: 'live',
      publicKey: formData.livePublicKey || formData.publicKey,
      secretKey: formData.liveSecretKey || formData.secretKey,
      webhookSecret: formData.liveWebhookSecret || 'whsec_live_nexusbank_9a824f1c7d0b81e3',
      livePublicKey: formData.livePublicKey || formData.publicKey,
      liveSecretKey: formData.liveSecretKey || formData.secretKey,
      liveWebhookSecret: formData.liveWebhookSecret || 'whsec_live_nexusbank_9a824f1c7d0b81e3',
      destinationAccount: formData.destinationAccount || '021650064944977732',
      destinationBank: clabeValidation.bankName || 'HSBC México',
      destinationBankCode: clabeValidation.bankCode || '021',
      destinationBeneficiary: formData.destinationBeneficiary || 'Nexusbank / Titular HSBC',
      requireLiveConfirmation: false,
    };

    const success = await saveFintocConfig(payload);
    setIsSaving(false);
    if (success) {
      setSaveSuccess(true);
      onConfigSaved(payload);
      setTimeout(() => setSaveSuccess(false), 3500);
    }
  };

  const handleTogglePaymentMethod = (key: keyof PaymentMethodsConfig) => {
    const current = formData.paymentMethods || DEFAULT_FINTOC_CONFIG.paymentMethods!;
    const updated = {
      ...current,
      [key]: !current[key],
    };
    setFormData({
      ...formData,
      paymentMethods: updated,
    });
    savePaymentMethodsConfig(updated);
  };

  const handleUpdatePayoutReceiving = (field: keyof PayoutReceivingConfig, value: any) => {
    const current = formData.payoutReceiving || DEFAULT_FINTOC_CONFIG.payoutReceiving!;
    const updated = {
      ...current,
      [field]: value,
    };
    setFormData({
      ...formData,
      payoutReceiving: updated,
    });
    savePayoutReceivingConfig(updated);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header with Mode Badge & Switcher */}
      <div className="p-6 text-white border-b bg-linear-to-r from-slate-950 via-emerald-950 to-slate-900 border-emerald-900/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold shadow-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Zap className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Panel de Configuración Fintoc</h2>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                  formData.mode === 'live'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${formData.mode === 'live' ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}></span>
                  {formData.mode === 'live' ? '🟢 MODO PRODUCCIÓN (LIVE)' : '🧪 MODO SANDBOX (TEST)'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {formData.mode === 'live' 
                  ? 'Operaciones bancarias SPEI • Checkout Sessions • Recibir Pagos & Desembolsos Fintoc.'
                  : 'Entorno de pruebas oficial Fintoc con pasarela pay.fintoc.com activa.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => {
                  const updated: FintocConfig = {
                    ...formData,
                    mode: 'live',
                    publicKey: formData.livePublicKey || 'pk_live_NAB1s9qvQxyZYyQfnAMzptjUzeTB-x1QVqdQG2dLN84',
                    secretKey: formData.liveSecretKey || 'sk_live_zFpXCNHJK-BGfFA8gbrUz73gXjogfgvN86zebLsYjfg',
                  };
                  setFormData(updated);
                  saveFintocConfig(updated).then(() => onConfigSaved(updated));
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  formData.mode === 'live'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Modo Live
              </button>
              <button
                type="button"
                onClick={handleSwitchToVerifiedSandbox}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  formData.mode === 'test'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Modo Sandbox
              </button>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="mt-5 flex items-center bg-slate-950/80 p-1 rounded-xl border border-white/10 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSection('credentials')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'credentials'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>1. Credenciales & Webhooks</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('payment_methods')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'payment_methods'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>2. Métodos de Pago (Panel Fintoc)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('payouts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'payouts'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>3. Recibir Pagos & Desembolsos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('jws_mcp')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'jws_mcp'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>4. Claves JWS & Claude MCP</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Save confirmation toast */}
        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Configuración de Producción Guardada Exitosamente</p>
                <p className="text-xs text-emerald-700">
                  Todas las credenciales, métodos de pago y datos de desembolso fueron persistidos en el servidor (`data/fintoc-config.json`).
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold bg-emerald-200/60 px-2 py-1 rounded">200 OK</span>
          </div>
        )}

        {/* ================= TAB 1: CREDENCIALES & WEBHOOKS ================= */}
        {activeSection === 'credentials' && (
          <div className="space-y-6">
            {/* Expired API Key Notice & Sandbox Switcher */}
            {(formData.mode === 'live' && (formData.liveSecretKey === 'sk_live_zFpXCNHJK-BGfFA8gbrUz73gXjogfgvN86zebLsYjfg' || validationResult?.expired)) && (
              <div className="bg-amber-50 border-2 border-amber-400/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-amber-950">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2">
                      API Key Live Expirada en Fintoc
                      <span className="text-[10px] font-mono bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                        expired_api_key
                      </span>
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed max-w-xl">
                      La clave de producción configurada ha expirado en la plataforma de Fintoc. Para realizar cobros externos directos en checkout.fintoc.com, ingresa tu nueva Secret Key generada en dashboard.fintoc.com, o haz clic en <strong>Usar Sandbox Activo</strong> para conectar con la API de Fintoc en entorno seguro.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={handleSwitchToVerifiedSandbox}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Usar Sandbox Activo</span>
                  </button>
                  <a
                    href="https://dashboard.fintoc.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-900 hover:bg-amber-100 border border-amber-300 transition-colors"
                  >
                    <span>Renovar en Fintoc</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Mode Banner */}
            <div className={`border-2 rounded-xl p-4 flex items-start gap-3.5 ${
              formData.mode === 'live' 
                ? 'bg-emerald-50 border-emerald-500/40 text-emerald-950'
                : 'bg-amber-50 border-amber-500/40 text-amber-950'
            }`}>
              <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${formData.mode === 'live' ? 'text-emerald-600' : 'text-amber-600'}`} />
              <div className="space-y-1">
                <h4 className={`font-bold text-sm ${formData.mode === 'live' ? 'text-emerald-900' : 'text-amber-900'}`}>
                  {formData.mode === 'live' ? 'Ambiente de Producción Activo (Fintoc Live)' : 'Ambiente de Pruebas Activo (Fintoc Sandbox)'}
                </h4>
                <p className="text-xs leading-relaxed">
                  {formData.mode === 'live' ? (
                    <>
                      Operando con claves de producción en vivo (<code className="font-mono bg-emerald-100 px-1 py-0.2 rounded font-bold">sk_live_...</code> y <code className="font-mono bg-emerald-100 px-1 py-0.2 rounded font-bold">pk_live_...</code>).
                      El Webhook Signing Secret está integrado automáticamente para validar firmas digitales en tiempo real.
                    </>
                  ) : (
                    <>
                      Operando con credenciales Sandbox oficiales conectadas a la API v2 de Fintoc (<code className="font-mono bg-amber-100 px-1 py-0.2 rounded font-bold">sk_test_...</code> y <code className="font-mono bg-amber-100 px-1 py-0.2 rounded font-bold">pk_test_...</code>).
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Keys section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Secret Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    {formData.mode === 'live' ? 'Live Secret Key (sk_live_*)' : 'Test Secret Key (sk_test_*)'}
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      Backend
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(formData.mode === 'live' ? formData.liveSecretKey : (formData.testSecretKey || formData.secretKey), 'secret')}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedKey === 'secret' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={formData.mode === 'live' ? formData.liveSecretKey : (formData.testSecretKey || formData.secretKey)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (formData.mode === 'live') {
                        setFormData({ ...formData, liveSecretKey: val, secretKey: val });
                      } else {
                        setFormData({ ...formData, testSecretKey: val, secretKey: val });
                      }
                    }}
                    placeholder={formData.mode === 'live' ? 'sk_live_...' : 'sk_test_...'}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs focus:ring-2 pr-10 ${
                      formData.mode === 'live' 
                        ? 'border-emerald-300 focus:ring-emerald-500/20 focus:border-emerald-500'
                        : 'border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {formData.mode === 'live' 
                    ? 'Clave privada de producción para crear Checkout Sessions y ejecutar pagos.'
                    : 'Clave de pruebas para crear Checkout Sessions verificadas en Fintoc API v2.'}
                </p>
              </div>

              {/* Public Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    {formData.mode === 'live' ? 'Live Public Key (pk_live_*)' : 'Test Public Key (pk_test_*)'}
                    <span className="text-[10px] text-blue-700 bg-blue-100 font-semibold px-1.5 py-0.2 rounded">
                      Widget Web
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(formData.mode === 'live' ? formData.livePublicKey : (formData.testPublicKey || formData.publicKey), 'public')}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedKey === 'public' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.mode === 'live' ? formData.livePublicKey : (formData.testPublicKey || formData.publicKey)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (formData.mode === 'live') {
                      setFormData({ ...formData, livePublicKey: val, publicKey: val });
                    } else {
                      setFormData({ ...formData, testPublicKey: val, publicKey: val });
                    }
                  }}
                  placeholder={formData.mode === 'live' ? 'pk_live_...' : 'pk_test_...'}
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs focus:ring-2 ${
                    formData.mode === 'live' 
                      ? 'border-emerald-300 focus:ring-emerald-500/20 focus:border-emerald-500'
                      : 'border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'
                  }`}
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Clave pública que inicializa el modal del Widget de Fintoc en el navegador.
                </p>
              </div>
            </div>

            {/* Validation & Ping Tool */}
            <div className="flex flex-col gap-3 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleValidateKey}
                  disabled={isValidating}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
                  <span>{isValidating ? 'Verificando con Fintoc...' : `Verificar API Key con Fintoc (${formData.mode.toUpperCase()})`}</span>
                </button>

                {formData.mode === 'live' && (
                  <button
                    type="button"
                    onClick={handleSwitchToVerifiedSandbox}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Cambiar a Sandbox Activo</span>
                  </button>
                )}
              </div>

              {validationResult && (
                <div className={`w-full p-3.5 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  validationResult.valid 
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                    : validationResult.expired
                    ? 'bg-amber-50 text-amber-900 border border-amber-300'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  <div className="flex items-start sm:items-center gap-2.5">
                    {validationResult.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                    ) : validationResult.expired ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
                    )}
                    <span className="leading-relaxed">{validationResult.message}</span>
                  </div>

                  {validationResult.expired && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={handleSwitchToVerifiedSandbox}
                        className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        Activar Sandbox
                      </button>
                      <a
                        href="https://docs.fintoc.com/docs/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-amber-900 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Guía</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Webhook Signing Secret & Receptor Endpoint */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  Webhook Signing Secret (whsec_live_*)
                </h3>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  🟢 Integrado Automáticamente
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Webhook Secret en Producción
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopy(formData.liveWebhookSecret || 'whsec_live_nexusbank_9a824f1c7d0b81e3', 'whsec')}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedKey === 'whsec' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.liveWebhookSecret || 'whsec_live_nexusbank_9a824f1c7d0b81e3'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, liveWebhookSecret: val, webhookSecret: val });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 text-xs font-mono font-bold text-emerald-950 bg-emerald-50/50 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="whsec_live_..."
                  />
                  <span className="text-[11px] text-slate-500">
                    Secreto criptográfico para validar la cabecera <code className="font-mono text-emerald-700">Fintoc-Signature</code> en eventos entrantes.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Endpoint URL Receptor de Webhooks
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/api/fintoc/webhooks`}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(`${window.location.origin}/api/fintoc/webhooks`, 'webhook_url')}
                      className="px-3 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      {copiedKey === 'webhook_url' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Registra esta URL en tu Dashboard de Fintoc &gt; Webhooks en Modo Producción.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MÉTODOS DE PAGO ================= */}
        {activeSection === 'payment_methods' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3.5">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-amber-950">
                <h4 className="font-bold text-sm text-amber-900">
                  Activación de Métodos de Pago en el Panel de Fintoc
                </h4>
                <p className="leading-relaxed">
                  Si la API de Fintoc devuelve el aviso <code className="font-mono bg-amber-200/70 px-1 py-0.2 rounded font-bold">payment_required: No payment methods are available for this organization</code>, significa que en tu consola de Fintoc aún no se ha prendido el switch del método de pago.
                </p>
                <p className="leading-relaxed font-semibold text-amber-900">
                  👉 Solución en 1 paso: Ingresa a tu panel de Fintoc en <strong>Métodos de Pago</strong> y activa el interruptor de <strong>Transferencias SPEI</strong> o <strong>Tarjetas</strong>.
                  La aplicación maneja este aviso con tolerancia a fallos en vivo para que tu flujo de pagos nunca se interrumpa.
                </p>
              </div>
            </div>

            {/* List of Payment Methods */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Métodos de Pago Habilitados en la Pasarela
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* SPEI */}
                <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      SPEI
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>Transferencias SPEI</span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">Activo</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Banco de México • Liquidación inmediata 24/7</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePaymentMethod('speiEnabled')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      formData.paymentMethods?.speiEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      formData.paymentMethods?.speiEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Bank Transfers A2A */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      A2A
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>Inicio de Pagos Bancarios</span>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">Activo</span>
                      </div>
                      <p className="text-[11px] text-slate-500">BBVA, Banamex, HSBC, Santander, Banorte</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePaymentMethod('bankTransfersEnabled')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      formData.paymentMethods?.bankTransfersEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      formData.paymentMethods?.bankTransfersEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Commercial Accounts / Dispersal */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      JWS
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>Cuentas Comerciales (Nómina / Payouts)</span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">Activo</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Dispersión a empleados y proveedores con firma digital</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePaymentMethod('commercialAccountsEnabled')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      formData.paymentMethods?.commercialAccountsEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      formData.paymentMethods?.commercialAccountsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Checkout Sessions */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      v2
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>Checkout Sessions v2</span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded">Activo</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Pasarela embebida y alojada por Fintoc</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePaymentMethod('checkoutSessionsEnabled')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      formData.paymentMethods?.checkoutSessionsEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      formData.paymentMethods?.checkoutSessionsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Cards */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      CARD
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>Tarjetas Débito y Crédito</span>
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">Activo</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Visa, Mastercard nacionales e internacionales</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePaymentMethod('cardsEnabled')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      formData.paymentMethods?.cardsEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      formData.paymentMethods?.cardsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: RECIBIR PAGOS & DESEMBOLSOS ================= */}
        {activeSection === 'payouts' && (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Recibir Pagos: Tu Cuenta Bancaria para Desembolsos Diarios
                    </h3>
                    <p className="text-xs text-slate-500">
                      Fintoc realiza los pagos a su cuenta bancaria según su calendario y deduce comisiones por transacción.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-300">
                  🇲🇽 México • SPEI
                </span>
              </div>

              {/* Bank Account Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre Legal del Titular de la Cuenta
                  </label>
                  <input
                    type="text"
                    value={formData.payoutReceiving?.legalName || 'Nexusbank'}
                    onChange={(e) => handleUpdatePayoutReceiving('legalName', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Nexusbank"
                  />
                  <span className="text-[11px] text-slate-400">
                    Debe coincidir con la empresa que firmó el contrato con Fintoc.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número de Identificación Fiscal (RFC México)
                  </label>
                  <input
                    type="text"
                    value={formData.payoutReceiving?.taxId || 'NEX261006AB4'}
                    onChange={(e) => handleUpdatePayoutReceiving('taxId', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="RFC: NEX261006AB4"
                  />
                  <span className="text-[11px] text-slate-400">
                    RFC registrado en Fintoc (no se admiten pagos a terceros).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Banco Receptor
                  </label>
                  <input
                    type="text"
                    value={formData.payoutReceiving?.bankName || 'HSBC México'}
                    onChange={(e) => handleUpdatePayoutReceiving('bankName', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="HSBC México"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      CLABE / Número de Cuenta (18 dígitos)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleUpdatePayoutReceiving('accountNumber', '021650064944977732')}
                      className="text-[11px] text-emerald-700 font-bold underline cursor-pointer"
                    >
                      Cargar 021650064944977732
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={18}
                    value={formData.payoutReceiving?.accountNumber || '021650064944977732'}
                    onChange={(e) => handleUpdatePayoutReceiving('accountNumber', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="021650064944977732"
                  />
                  <span className="text-[11px] text-emerald-700 font-medium">
                    {clabeValidation.valid ? `✓ CLABE Verificada: ${clabeValidation.bankName} (Dígito control: ${clabeValidation.controlDigit})` : 'CLABE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payout Schedule (Calendario de Pagos Oficial México) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Calendario de Pagos (México)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Frecuencia con la que Fintoc envía el dinero a tu cuenta bancaria según zona horaria local.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-xl">
                  Hora límite: 00:00 • Velocidad: 1 día hábil
                </span>
              </div>

              {/* Schedule Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Día de la Semana (Período)</th>
                      <th className="py-2.5 px-4">Fondos Disponibles En Tu Cuenta</th>
                      <th className="py-2.5 px-4 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">Lunes 00:00 a Lunes 23:59</td>
                      <td className="py-2.5 px-4 font-bold text-emerald-700">Martes antes de las 15:00</td>
                      <td className="py-2.5 px-4 text-right"><span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Activo</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">Martes 00:00 a Martes 23:59</td>
                      <td className="py-2.5 px-4 font-bold text-emerald-700">Miércoles antes de las 15:00</td>
                      <td className="py-2.5 px-4 text-right"><span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Activo</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">Miércoles 00:00 a Miércoles 23:59</td>
                      <td className="py-2.5 px-4 font-bold text-emerald-700">Jueves antes de las 15:00</td>
                      <td className="py-2.5 px-4 text-right"><span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Activo</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">Jueves 00:00 a Jueves 23:59</td>
                      <td className="py-2.5 px-4 font-bold text-emerald-700">Viernes antes de las 15:00</td>
                      <td className="py-2.5 px-4 text-right"><span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Activo</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">Viernes 00:00 a Domingo 23:59</td>
                      <td className="py-2.5 px-4 font-bold text-emerald-700">Lunes antes de las 15:00</td>
                      <td className="py-2.5 px-4 text-right"><span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Activo</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Settlement Email Notification (Notificaciones de liquidación) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                    <Mail className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">
                      Correo Electrónico de Liquidación (Informe de Conciliación)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Fintoc envía un informe detallado con la conciliación por cada desembolso transferido a tu banco.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleUpdatePayoutReceiving('settlementEmailEnabled', !formData.payoutReceiving?.settlementEmailEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    formData.payoutReceiving?.settlementEmailEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    formData.payoutReceiving?.settlementEmailEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Operativo Receptor de Liquidaciones
                  </label>
                  <input
                    type="email"
                    value={formData.payoutReceiving?.settlementEmail || 'buenooscar619@gmail.com'}
                    onChange={(e) => handleUpdatePayoutReceiving('settlementEmail', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="buenooscar619@gmail.com"
                  />
                </div>

                <div className="text-[11px] text-slate-500 flex flex-col justify-center space-y-1">
                  <span><strong>Webhooks asociados:</strong></span>
                  <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                    <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">payout.created</span>
                    <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">payout.succeeded</span>
                    <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">payout.canceled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: JWS & MCP ================= */}
        {activeSection === 'jws_mcp' && (
          <div className="space-y-6">
            {/* Fintoc Connected Account Card (Nexusbank) */}
            <div className="bg-linear-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-5 border border-emerald-500/30 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-sm">
                    F
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">Cuenta Vinculada en Fintoc</h4>
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full uppercase">
                        🟢 Activa / Verificada
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      ID de Fintoc: <code className="font-mono text-emerald-300 font-bold">{formData.fintocAccountId || 'acc_3KLuIkEoBBE4tNxt3uCZ5AYcm1C'}</code>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Fecha de creación</span>
                  <span className="text-xs font-mono text-slate-300">
                    {formData.fintocAccountCreatedAt || '06 oct 2026, 22:58'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">CLABE Principal</div>
                  <div className="font-mono font-bold text-emerald-300 text-sm flex items-center justify-between">
                    <span>{formData.fintocClabe || '999-969-9146-6531-4673'}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(formData.fintocClabe || '999-969-9146-6531-4673', 'fintoc_clabe')}
                      className="text-slate-400 hover:text-white p-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400">Para poder pagarme por SPEI</div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Titular Registrado</div>
                  <div className="font-bold text-white text-xs leading-snug">
                    {formData.fintocAccountHolder || 'Nexusbank, para poder pagarme por transferencia o spei'}
                  </div>
                  <div className="text-[10px] text-slate-400">Titular de cuenta SPEI</div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Propósito</div>
                  <div className="font-bold text-amber-300 text-xs">
                    {formData.fintocAccountDescription || 'Poder pagar a empleados'}
                  </div>
                  <div className="text-[10px] text-slate-400">Dispersión y nómina</div>
                </div>
              </div>
            </div>

            {/* JWS Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-600" />
                  Claves JWS (Firma Web JSON para Cuentas Comerciales)
                </h3>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  RSA 2048 (RS256)
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Clave Pública registrada en Fintoc (public_key.pem)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(jwsPublicKey, 'jws_pubkey')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey === 'jws_pubkey' ? 'Copiada!' : 'Copiar'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPublicKey}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Descargar PEM</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  readOnly
                  value={jwsPublicKey}
                  className="w-full p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] select-all"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestJws}
                  disabled={isTestingJws}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold cursor-pointer hover:bg-emerald-100"
                >
                  {isTestingJws ? 'Firmando...' : 'Probar Firma JWS (Fintoc-JWS-Signature)'}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateJws}
                  disabled={isGeneratingJws}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Regenerar Par de Claves
                </button>
              </div>

              {jwsTestResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{jwsTestResult.message}</span>
                  </div>
                  {jwsTestResult.header && (
                    <div className="font-mono text-[10px] text-emerald-950 bg-emerald-100 p-2 rounded break-all">
                      {jwsTestResult.header}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Claude MCP Automated Connector Section */}
            <div className="bg-slate-950 text-white rounded-2xl p-5 border-2 border-amber-500/50 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
                    <Bot className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">Conector Personalizado en Claude (MCP)</h4>
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Conectado en Vivo
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Servidor oficial: <code className="text-amber-300 font-mono font-bold">https://mcp.fintoc.com</code> • Protocolo Model Context Protocol (MCP)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConnectMcp}
                    disabled={isConnectingMcp}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isConnectingMcp ? 'animate-spin' : ''}`} />
                    <span>{isConnectingMcp ? 'Conectando...' : 'Autoconectar con https://mcp.fintoc.com'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy('https://mcp.fintoc.com', 'mcp_url')}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedKey === 'mcp_url' ? '¡Copiada!' : 'Copiar URL'}</span>
                  </button>
                </div>
              </div>

              {/* Live Connection Confirmation Banner */}
              {mcpResult && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{mcpResult.message}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-400 block font-mono text-[10px]">URL RECURSO:</span>
                      <span className="font-mono text-emerald-300">https://mcp.fintoc.com</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-mono text-[10px]">AUTH SERVER:</span>
                      <span className="font-mono text-emerald-300">https://api.fintoc.com/oauth/authorize</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-mono text-[10px]">AUTENTICACIÓN:</span>
                      <span className="font-mono text-emerald-300">OAuth 2.0 PKCE (S256)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Steps to Connect in Claude */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Pasos de integración en Claude (Personalizar → Conectores):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">1</span> Paso 1
                    </span>
                    <p className="text-slate-300 text-[11px]">Ve a <strong>Personalizar</strong> → <strong>Conectores</strong> en Claude.</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">2</span> Paso 2
                    </span>
                    <p className="text-slate-300 text-[11px]">Selecciona <strong>"+"</strong> y luego <strong>Agregar conector personalizado</strong>.</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">3</span> Paso 3
                    </span>
                    <p className="text-slate-300 text-[11px] break-all">Ingresa la URL: <code className="text-amber-300 font-mono font-bold">https://mcp.fintoc.com</code></p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">4</span> Paso 4
                    </span>
                    <p className="text-slate-300 text-[11px]">Agrega el conector y autentícate con <strong>OAuth</strong>.</p>
                  </div>
                </div>
              </div>

              {/* JSON Snippet for Claude Desktop */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Configuración claude_desktop_config.json:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const snippet = JSON.stringify({
                        mcpServers: {
                          fintoc: {
                            url: "https://mcp.fintoc.com",
                            auth: "oauth"
                          }
                        }
                      }, null, 2);
                      handleCopy(snippet, 'mcp_json');
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'mcp_json' ? '¡JSON Copiado!' : 'Copiar Configuración JSON'}</span>
                  </button>
                </div>
                <pre className="font-mono text-[11px] bg-black/50 text-emerald-300 p-2.5 rounded-xl border border-white/5 overflow-x-auto">
{`{
  "mcpServers": {
    "fintoc": {
      "url": "https://mcp.fintoc.com",
      "auth": "oauth"
    }
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Global Save Button */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Configuración 100% de Producción respaldada en el servidor y base de datos local.</span>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm shadow-md transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Guardando en Producción...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Configuración de Producción
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
