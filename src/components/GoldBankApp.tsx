import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Bell, 
  Eye, 
  EyeOff, 
  ArrowLeftRight, 
  Receipt, 
  Banknote, 
  TrendingUp, 
  Wallet, 
  ChevronDown, 
  Lock, 
  ArrowRight, 
  CreditCard, 
  Bot, 
  Home, 
  Shield, 
  ShieldAlert, 
  Wifi, 
  Check, 
  Fingerprint, 
  Grid, 
  HelpCircle, 
  MapPin, 
  Sparkles,
  RefreshCw,
  ShoppingBag,
  ArrowDownLeft,
  Utensils,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { FintocConfig, CheckoutSession } from '../types/fintoc';
import { 
  createCheckoutSession, 
  formatFintocAmount, 
  toFintocIntegerAmount 
} from '../services/fintocService';
import { validateClabe, formatClabeReadable } from '../utils/clabeValidator';

interface GoldBankAppProps {
  config: FintocConfig;
  onInitiateTransfer: (session: CheckoutSession) => void;
  lastCompletedSession: CheckoutSession | null;
}

type TabType = 'home' | 'transfers' | 'cards' | 'assistant';

export const GoldBankApp: React.FC<GoldBankAppProps> = ({
  config,
  onInitiateTransfer,
  lastCompletedSession,
}) => {
  // Mobile app state
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showBalance, setShowBalance] = useState<boolean>(true);

  // Transfers Form State (matches screenshot 1 and saved destination account)
  const defaultSavedAccount = config.destinationAccount || '021650064944977732';
  const defaultSavedName = config.destinationBeneficiary || 'Titular Cuenta HSBC';

  const [transferAmount, setTransferAmount] = useState<number>(2500);
  const [destAccount, setDestAccount] = useState<string>(defaultSavedAccount);
  const [destName, setDestName] = useState<string>(defaultSavedName);
  const [concept, setConcept] = useState<string>('Pago SPEI HSBC');
  const [isProcessingTransfer, setIsProcessingTransfer] = useState<boolean>(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Real-time CLABE validation
  const clabeValidation = validateClabe(destAccount);

  useEffect(() => {
    if (config.destinationAccount) {
      setDestAccount(config.destinationAccount);
    }
    if (config.destinationBeneficiary) {
      setDestName(config.destinationBeneficiary);
    }
  }, [config.destinationAccount, config.destinationBeneficiary]);

  // Card Controls State (matches screenshot 2)
  const [dynamicCvv, setDynamicCvv] = useState<string>('***');
  const [cvvTimer, setCvvTimer] = useState<number>(0);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [allowInternational, setAllowInternational] = useState<boolean>(true);
  const [allowOnline, setAllowOnline] = useState<boolean>(true);

  // Account balances
  const [totalBalance, setTotalBalance] = useState<number>(142500);
  const [nominaBalance, setNominaBalance] = useState<number>(120000);
  const [ahorroBalance, setAhorroBalance] = useState<number>(22500);

  // Origin account selection state
  const [selectedOrigin, setSelectedOrigin] = useState<'gold_debit' | 'fintoc_nexusbank'>('fintoc_nexusbank');
  const [nexusbankBalance, setNexusbankBalance] = useState<number>(142500);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState<string | null>(null);

  // Dynamic recent movements list
  const [recentMovements, setRecentMovements] = useState([
    {
      id: 'm1',
      title: 'Supermercado Express',
      detail: 'Hoy, 14:30 • Tarjeta Crédito',
      amount: -1250.0,
      icon: ShoppingBag,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'm2',
      title: 'Transferencia Recibida',
      detail: 'Ayer, 09:15 • Empresa S.A.',
      amount: 25000.0,
      icon: ArrowDownLeft,
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      id: 'm3',
      title: 'Restaurante La Cima',
      detail: '12 Oct, 20:00 • Tarjeta Débito',
      amount: -850.0,
      icon: Utensils,
      color: 'bg-rose-100 text-rose-600',
    },
  ]);

  // When a Fintoc session finishes, deduct balance and add movement!
  useEffect(() => {
    if (lastCompletedSession) {
      const deduction = lastCompletedSession.currency === 'CLP' 
        ? lastCompletedSession.amount 
        : lastCompletedSession.amount / 100;

      const newMovement = {
        id: `m_${Date.now()}`,
        title: lastCompletedSession.metadata?.concept || 'Transferencia Fintoc SPEI',
        detail: `Hoy, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Fintoc Checkout`,
        amount: -deduction,
        icon: ArrowLeftRight,
        color: 'bg-amber-100 text-amber-700',
      };

      setRecentMovements((prev) => [newMovement, ...prev]);
      setTotalBalance((prev) => Math.max(0, prev - deduction));
      setNominaBalance((prev) => Math.max(0, prev - deduction));
    }
  }, [lastCompletedSession]);

  // Dynamic CVV countdown timer
  useEffect(() => {
    let interval: any;
    if (cvvTimer > 0) {
      interval = setInterval(() => {
        setCvvTimer((prev) => prev - 1);
      }, 1000);
    } else if (cvvTimer === 0 && dynamicCvv !== '***') {
      setDynamicCvv('***');
    }
    return () => clearInterval(interval);
  }, [cvvTimer, dynamicCvv]);

  const handleGenerateCVV = () => {
    const randomCVV = Math.floor(100 + Math.random() * 900).toString();
    setDynamicCvv(randomCVV);
    setCvvTimer(300); // 5 minutes validity
  };

  const handleStartSPEITransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);

    if (!clabeValidation.valid) {
      setTransferError(clabeValidation.error || 'La CLABE de destino no es válida');
      return;
    }

    setIsProcessingTransfer(true);

    try {
      const integerAmt = toFintocIntegerAmount(transferAmount, config.currency);
      // Create session in backend according to Fintoc rules with recipient CLABE
      const session = await createCheckoutSession({
        amount: integerAmt,
        currency: config.currency,
        customer_email: 'alejandro.gold@example.com',
        success_url: config.successUrl,
        cancel_url: config.cancelUrl,
        metadata: {
          concept: concept,
          beneficiary: destName,
          account_dest: destAccount,
          recipient_clabe: destAccount,
          recipient_bank: clabeValidation.bankName || 'HSBC México',
          recipient_bank_code: clabeValidation.bankCode || '021',
          origin: 'Cuenta Débito Gold **4921',
          mode: 'live',
        },
      });

      setIsProcessingTransfer(false);
      onInitiateTransfer(session);
    } catch (err: any) {
      console.info('Aviso al iniciar transferencia:', err?.message || err);
      setTransferError(err.message || 'Error al iniciar la transferencia');
      setIsProcessingTransfer(false);
    }
  };

  // SCREEN 4: Biometric Login Screen if locked
  if (isLocked) {
    return (
      <div className="w-full max-w-sm mx-auto h-[780px] bg-white rounded-[40px] shadow-2xl border-8 border-slate-900 p-6 flex flex-col justify-between items-center text-slate-800 animate-in fade-in duration-300">
        <div className="pt-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#c59b27] flex items-center justify-center text-white shadow-md mb-3">
            <Building2 className="w-9 h-9" />
          </div>
          <h1 className="text-xl font-bold text-[#8c6b12] tracking-tight">GoldPaymentsBank</h1>
        </div>

        <div className="flex flex-col items-center space-y-8 w-full">
          <h2 className="text-2xl font-bold text-slate-900">Seguridad de Grado Oro</h2>

          {/* Biometric circle */}
          <button
            type="button"
            onClick={() => setIsLocked(false)}
            className="w-36 h-36 rounded-full bg-[#fdf9ee] border border-[#f5e9c9] flex flex-col items-center justify-center text-[#996515] hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer group"
          >
            <Fingerprint className="w-16 h-16 text-[#b8860b] group-hover:text-[#996515] transition-colors" />
            <span className="text-xs font-medium text-slate-600 mt-2">Toca para entrar</span>
          </button>

          {/* PIN Button */}
          <button
            type="button"
            onClick={() => setIsLocked(false)}
            className="w-full py-3.5 px-4 rounded-xl border-2 border-[#1e3a5f] text-[#1e3a5f] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1e3a5f]/5 transition-colors cursor-pointer"
          >
            <Grid className="w-4 h-4" />
            Ingresar con PIN
          </button>
        </div>

        <div className="flex items-center justify-center gap-8 text-xs text-[#1e3a5f] font-semibold pb-4">
          <button type="button" className="flex items-center gap-1.5 hover:underline">
            <HelpCircle className="w-4 h-4" /> Ayuda
          </button>
          <button type="button" className="flex items-center gap-1.5 hover:underline">
            <MapPin className="w-4 h-4" /> Sucursales
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto h-[840px] bg-[#f8f9fb] rounded-[40px] shadow-2xl border-8 border-slate-900 overflow-hidden flex flex-col relative select-none">
      {/* Mobile Top Bar / Status Bar */}
      <div className="bg-white px-6 pt-3 pb-2 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 border border-amber-300">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
              alt="Alejandro"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium">Bienvenido de nuevo</div>
            <div className="text-xs font-bold text-slate-900">Hola, Alejandro</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLocked(true)}
            title="Bloquear sesión"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
          >
            <Lock className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 relative"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1 right-1"></span>
          </button>
        </div>
      </div>

      {/* Main Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ================= TAB 1: HOME (Dashboard) ================= */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Header branding */}
            <div className="flex items-center justify-between px-1">
              <span className="font-extrabold text-[#996515] text-base tracking-tight">
                GoldPaymentsBank
              </span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                {config.currency}
              </span>
            </div>

            {/* Saldo Total Disponible (Navy card as in screenshot 3) */}
            <div className="bg-[#0b1a30] text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-300 text-xs font-semibold uppercase tracking-wider">
                <span>SALDO TOTAL DISPONIBLE</span>
                <button
                  type="button"
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-3xl font-extrabold text-white tracking-tight my-3">
                {showBalance ? `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '••••••••'}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
                <span className="text-amber-300 font-medium">Gold Premium</span>
                <span className="font-mono">CLABE: **1234</span>
              </div>
            </div>

            {/* Operaciones Rápidas */}
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-2.5 px-1">Operaciones Rápidas</h3>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('transfers')}
                  className="flex flex-col items-center p-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#d4a017] text-white flex items-center justify-center mb-1.5 shadow-xs">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">Transferir</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('transfers')}
                  className="flex flex-col items-center p-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#3b82f6] text-white flex items-center justify-center mb-1.5 shadow-xs">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">Pagar</span>
                </button>

                <button
                  type="button"
                  className="flex flex-col items-center p-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#10b981] text-white flex items-center justify-center mb-1.5 shadow-xs">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">Retiro</span>
                </button>

                <button
                  type="button"
                  className="flex flex-col items-center p-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center mb-1.5 shadow-xs">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">Invertir</span>
                </button>
              </div>
            </div>

            {/* Mis Cuentas */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="font-bold text-slate-900 text-sm">Mis Cuentas</h3>
                <button type="button" className="text-xs text-[#b8860b] font-semibold hover:underline">
                  Ver todas
                </button>
              </div>

              <div className="space-y-2">
                {/* Cuenta Nexusbank Fintoc (Pagar a empleados) */}
                <div className="bg-linear-to-r from-emerald-950/20 via-slate-900/10 to-amber-950/20 p-3.5 rounded-2xl border-2 border-emerald-500/50 flex items-center justify-between relative shadow-xs">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-800 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                      F
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>Nexusbank Fintoc</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                          Pagar a empleados
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        CLABE: **4673 • ID: acc_3KLu...
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-slate-900">
                      {showBalance ? `$${nexusbankBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '••••'}
                    </div>
                    <div className="text-[9px] text-emerald-700 font-semibold">Disponible SPEI</div>
                  </div>
                </div>

                {/* Nomina Gold */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between relative overflow-hidden shadow-2xs">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#b8860b]"></div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Nómina Gold</div>
                      <div className="text-[11px] text-slate-400 font-mono">**4582</div>
                    </div>
                  </div>
                  <div className="font-bold text-sm text-slate-900">
                    {showBalance ? `$${nominaBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '••••'}
                  </div>
                </div>

                {/* Ahorro Plus */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Ahorro Plus</div>
                      <div className="text-[11px] text-slate-400 font-mono">**8910</div>
                    </div>
                  </div>
                  <div className="font-bold text-sm text-slate-900">
                    {showBalance ? `$${ahorroBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '••••'}
                  </div>
                </div>

                {/* Crédito Platinum */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Crédito Platinum</div>
                      <div className="text-[11px] text-slate-400 font-mono">**3341</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-rose-600">
                      {showBalance ? '-$5,420.00' : '••••'}
                    </div>
                    <div className="text-[10px] text-rose-500 font-medium">Pago próximo: 15 Oct</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Movimientos Recientes */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="font-bold text-slate-900 text-sm">Movimientos Recientes</h3>
                <span className="text-xs text-slate-400">Historial</span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                {recentMovements.map((m) => {
                  const IconComp = m.icon;
                  return (
                    <div key={m.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl ${m.color} flex items-center justify-center`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-800">{m.title}</div>
                          <div className="text-[10px] text-slate-400">{m.detail}</div>
                        </div>
                      </div>
                      <div
                        className={`font-bold text-xs ${
                          m.amount > 0 ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {m.amount > 0 ? '+' : ''}${Math.abs(m.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: TRANSFERS / SPEI (Screenshot 1) ================= */}
        {activeTab === 'transfers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Transferencias SPEI</h2>
                <p className="text-xs text-slate-500">Envía dinero de forma rápida y segura en tiempo real.</p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Producción Live
              </span>
            </div>

            {/* CUENTA ORIGEN Card */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  CUENTA ORIGEN
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSelectedOrigin('fintoc_nexusbank')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                      selectedOrigin === 'fintoc_nexusbank'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Nexusbank Fintoc
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOrigin('gold_debit')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                      selectedOrigin === 'gold_debit'
                        ? 'bg-[#c59b27] text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Débito Gold
                  </button>
                </div>
              </div>

              {selectedOrigin === 'fintoc_nexusbank' ? (
                <div className="bg-white p-3.5 rounded-2xl border-2 border-emerald-500/50 flex items-center justify-between relative shadow-2xs">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      F
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>Nexusbank (Fintoc SPEI)</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-1 rounded">
                          acc_3KLu...
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        CLABE: **4673 • Poder pagar a empleados
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                    {showBalance ? `$${nexusbankBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '••••'}
                  </span>
                </div>
              ) : (
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between relative shadow-2xs">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#b8860b]"></div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Cuenta Débito Gold</div>
                      <div className="text-[11px] text-slate-500">
                        ** 4921 • Disponible: $45,230.00
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>

            {/* Transfer form card */}
            <form onSubmit={handleStartSPEITransfer} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="text-center pt-2 pb-1 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Importe a transferir
                </span>
                <div className="flex items-center justify-center gap-1 font-extrabold text-slate-900 text-3xl">
                  <span>$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                    className="w-36 text-center bg-transparent font-extrabold text-3xl focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Form fields with underline style as in screenshot 1 */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block text-[10px] text-slate-400 font-medium">
                      CLABE o Tarjeta destino
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setDestAccount('021650064944977732');
                        setDestName('Titular Cuenta HSBC');
                        setConcept('Pago SPEI HSBC');
                      }}
                      className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                    >
                      Usar 021650064944977732 (HSBC)
                    </button>
                  </div>
                  <input
                    type="text"
                    value={destAccount}
                    onChange={(e) => setDestAccount(e.target.value)}
                    className="w-full py-1 border-b border-slate-300 font-mono text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
                    placeholder="021 650 06494497773 2"
                    required
                  />

                  {/* Real-time CLABE Validation Banner */}
                  {destAccount && (
                    <div className="mt-1.5">
                      {clabeValidation.valid ? (
                        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-bold">{clabeValidation.bankName}</span>
                            <span className="font-mono text-[10px] text-emerald-700">({clabeValidation.bankCode})</span>
                          </div>
                          <span className="text-[10px] font-semibold bg-emerald-200/70 text-emerald-900 px-1.5 py-0.2 rounded font-mono">
                            Dígito: {clabeValidation.controlDigit} ✓
                          </span>
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-[10px] text-rose-800 flex items-center gap-1.5">
                          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>{clabeValidation.error}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-medium">
                    Nombre del beneficiario
                  </label>
                  <input
                    type="text"
                    value={destName}
                    onChange={(e) => setDestName(e.target.value)}
                    className="w-full py-1 border-b border-slate-300 text-xs text-slate-800 font-medium focus:outline-hidden focus:border-amber-500"
                    placeholder="Titular Cuenta HSBC"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-medium">
                    Concepto de pago
                  </label>
                  <input
                    type="text"
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    className="w-full py-1 border-b border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
                    placeholder="Pago SPEI HSBC"
                    required
                  />
                </div>
              </div>

              {transferError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}

              {/* Mode indicator (Production Direct) */}
              <div className="flex items-center justify-between text-[11px] pt-1 px-1">
                <span className="text-emerald-700 font-semibold font-mono text-[10px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  🟢 Modo Producción Directo (Fintoc Live)
                </span>
                <span className="font-semibold text-slate-600">SPEI Banco de México</span>
              </div>

              {/* Security seal */}
              <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-slate-600">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Operación encriptada con Fintoc API v2</span>
              </div>

              {/* Continue button */}
              <button
                type="submit"
                disabled={isProcessingTransfer}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isProcessingTransfer ? 'Iniciando Fintoc en Producción...' : `Transferir $${transferAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ================= TAB 3: CARDS (Screenshot 2) ================= */}
        {activeTab === 'cards' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Control de Tarjetas</h2>
              <p className="text-xs text-slate-500">Gestiona la seguridad y configuración de tus plásticos.</p>
            </div>

            {/* Physical Card (Exact replica of screenshot 2) */}
            <div className="relative rounded-2xl bg-linear-to-br from-[#0c1c34] via-[#102444] to-[#0a1424] text-white p-5 shadow-xl border border-slate-700/50 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <Wifi className="w-6 h-6 text-amber-400 rotate-90" />
                <span className="text-[10px] tracking-widest text-slate-300 uppercase font-semibold">
                  FÍSICA
                </span>
              </div>

              {/* Chip representation */}
              <div className="w-9 h-7 rounded-md bg-linear-to-r from-amber-200 to-amber-400 border border-amber-500/50 mb-6 shadow-xs flex items-center justify-center">
                <div className="w-6 h-4 border border-amber-600/40 rounded-xs"></div>
              </div>

              <div className="font-mono text-base font-bold tracking-widest text-white mb-3">
                •••• •••• •••• 4092
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold uppercase">
                <span>MARIA GONZALEZ</span>
                <span className="font-mono">12/26</span>
              </div>
            </div>

            {/* Tarjeta Digital Segura with Dynamic CVV */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Tarjeta Digital Segura</h4>
                  <p className="text-[11px] text-slate-500">Usa un CVV dinámico para compras en línea.</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    CVV DINÁMICO
                  </span>
                  <div className="font-mono font-extrabold text-base text-slate-900 tracking-widest">
                    {dynamicCvv}
                  </div>
                  {cvvTimer > 0 && (
                    <span className="text-[10px] text-emerald-600 font-mono">
                      Expira en: {Math.floor(cvvTimer / 60)}:{String(cvvTimer % 60).padStart(2, '0')}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGenerateCVV}
                  className="px-4 py-2 rounded-xl bg-[#c59b27] hover:bg-[#b0871b] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Generar CVV
                </button>
              </div>
            </div>

            {/* Controles de Seguridad */}
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm px-1">Controles de Seguridad</h3>

              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-2xs">
                {/* Bloqueo Temporal */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-slate-600" />
                    <div>
                      <div className="font-bold text-xs text-slate-900">Bloqueo Temporal</div>
                      <div className="text-[10px] text-slate-500">Apaga tu tarjeta si no la encuentras.</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFrozen(!isFrozen)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      isFrozen ? 'bg-amber-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform absolute top-0.5 ${
                        isFrozen ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    ></div>
                  </button>
                </div>

                {/* Compras Internacionales */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wifi className="w-5 h-5 text-slate-600" />
                    <div>
                      <div className="font-bold text-xs text-slate-900">Compras Internacionales</div>
                      <div className="text-[10px] text-slate-500">Habilita uso fuera de tu país.</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowInternational(!allowInternational)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      allowInternational ? 'bg-[#c59b27]' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform flex items-center justify-center text-[10px] absolute top-0.5 ${
                        allowInternational ? 'translate-x-5 text-emerald-600' : 'translate-x-0.5'
                      }`}
                    >
                      {allowInternational && <Check className="w-3 h-3 text-emerald-600" />}
                    </div>
                  </button>
                </div>

                {/* Compras por Internet */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-slate-600" />
                    <div>
                      <div className="font-bold text-xs text-slate-900">Compras por Internet</div>
                      <div className="text-[10px] text-slate-500">Permite pagos en sitios web.</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowOnline(!allowOnline)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      allowOnline ? 'bg-[#c59b27]' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform flex items-center justify-center text-[10px] absolute top-0.5 ${
                        allowOnline ? 'translate-x-5 text-emerald-600' : 'translate-x-0.5'
                      }`}
                    >
                      {allowOnline && <Check className="w-3 h-3 text-emerald-600" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Reportar robo */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Reportar por robo o extravío
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: ASSISTANT ================= */}
        {activeTab === 'assistant' && (
          <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-[#b8860b] flex items-center justify-center mx-auto">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">GoldAssistant</h3>
            <p className="text-xs text-slate-500">
              Soporte financiero y ayuda con tus pagos e integraciones SPEI Fintoc.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-left text-slate-600 space-y-1">
              <p>• Línea directa: 800-GOLD-BANK</p>
              <p>• Cobertura Fintoc: México (MXN) y Chile (CLP)</p>
              <p>• Protocolo: ISO 20022 / SPEI Banxico</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Exact styling from screenshots) */}
      <div className="bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-around">
        {/* Home */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'home'
              ? 'bg-[#c59b27] text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-4 h-4" />
          <span className="text-[10px] font-semibold mt-0.5">Home</span>
        </button>

        {/* Transfers */}
        <button
          type="button"
          onClick={() => setActiveTab('transfers')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'transfers'
              ? 'bg-[#c59b27] text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span className="text-[10px] font-semibold mt-0.5">Transfers</span>
        </button>

        {/* Cards */}
        <button
          type="button"
          onClick={() => setActiveTab('cards')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'cards'
              ? 'bg-[#c59b27] text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span className="text-[10px] font-semibold mt-0.5">Cards</span>
        </button>

        {/* Assistant */}
        <button
          type="button"
          onClick={() => setActiveTab('assistant')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'assistant'
              ? 'bg-[#c59b27] text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span className="text-[10px] font-semibold mt-0.5">Assistant</span>
        </button>
      </div>
    </div>
  );
};
