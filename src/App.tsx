import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Settings, 
  CreditCard, 
  Server, 
  Smartphone, 
  Split, 
  Sparkles, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Globe,
  Bot,
  FileCheck,
  Receipt,
  Layers,
  ArrowDownLeft
} from 'lucide-react';
import { FintocConfig, CheckoutSession, WebhookEvent } from './types/fintoc';
import { 
  getFintocConfig, 
  saveFintocConfig,
  getCheckoutSessions, 
  getWebhookEvents, 
  DEFAULT_FINTOC_CONFIG,
  connectMcpAutomatically
} from './services/fintocService';
import { GatewayConfigPanel } from './components/GatewayConfigPanel';
import { CheckoutSessionCreator } from './components/CheckoutSessionCreator';
import { WebhookInspector } from './components/WebhookInspector';
import { GoldBankApp } from './components/GoldBankApp';
import { FintocWidgetModal } from './components/FintocWidgetModal';
import { TramitePaymentPanel } from './components/TramitePaymentPanel';
import { InvoicesDepositsPanel } from './components/InvoicesDepositsPanel';

type AppView = 'split' | 'invoices' | 'tramite' | 'mobile_bank' | 'config' | 'checkout' | 'webhooks';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('split');
  const [config, setConfig] = useState<FintocConfig>(DEFAULT_FINTOC_CONFIG);
  const [sessions, setSessions] = useState<CheckoutSession[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  
  // Fintoc Widget Modal state
  const [activeWidgetSession, setActiveWidgetSession] = useState<CheckoutSession | null>(null);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [lastFinishedSession, setLastFinishedSession] = useState<CheckoutSession | null>(null);

  // Global toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load config on mount
    getFintocConfig().then((cfg) => {
      setConfig(cfg);
    });

    // Load initial sessions
    getCheckoutSessions().then((data) => {
      setSessions(data);
    });

    // Load initial webhook events
    getWebhookEvents().then((evts) => {
      setWebhookEvents(evts);
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleConfigSaved = (newConfig: FintocConfig) => {
    setConfig(newConfig);
    showToast('Configuración de Fintoc guardada y sincronizada correctamente');
  };

  const handleSessionCreated = (session: CheckoutSession) => {
    setSessions((prev) => [session, ...prev]);
    showToast(`Checkout Session creada: ${session.id}`);
  };

  const handleOpenWidget = (session: CheckoutSession) => {
    setActiveWidgetSession(session);
    setIsWidgetOpen(true);
  };

  const handlePaymentFinished = (updatedSession: CheckoutSession) => {
    // Update session in list
    setSessions((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    );
    setLastFinishedSession(updatedSession);
    showToast(`Pago acreditado con éxito vía Fintoc (${updatedSession.currency})`);

    // Reload webhook events from server
    getWebhookEvents().then((evts) => {
      setWebhookEvents(evts);
    });
  };

  const handleWebhookCreated = (event: WebhookEvent) => {
    setWebhookEvents((prev) => [event, ...prev]);
    showToast(`Evento webhook emitido: ${event.type}`);
  };

  const handleRefreshWebhooks = () => {
    getWebhookEvents().then((evts) => {
      setWebhookEvents(evts);
      showToast('Registro de webhooks actualizado');
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Top Application Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <Building2 className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  GoldPayments
                </span>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Fintoc Gateway
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Pasarela de inicio de pagos bancarios • SPEI & Khipu • Checkout Sessions v2
              </p>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 text-xs">
            <button
              type="button"
              onClick={() => setCurrentView('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                currentView === 'split'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Vista Dual: Pasarela + Banca Móvil"
            >
              <Split className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Vista Dual</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('invoices')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                currentView === 'invoices'
                  ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400'
                  : 'text-emerald-300 hover:text-white bg-emerald-500/15 border border-emerald-500/30'
              }`}
              title="Liquidación de Facturas y Depósitos SPEI"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-300" />
              <span>Facturas & Liquidar</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('tramite')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                currentView === 'tramite'
                  ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-400'
                  : 'text-amber-300 hover:text-white bg-amber-500/15 border border-amber-500/30'
              }`}
              title="Pago Oficial de Trámite con Fintoc"
            >
              <FileCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Pago de Trámite</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('mobile_bank')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                currentView === 'mobile_bank'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="App Banca Móvil GoldPaymentsBank"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Banca Móvil</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('config')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                currentView === 'config'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Configurar claves y parámetros Fintoc"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configuración</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('checkout')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                currentView === 'checkout'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Crear y probar Checkout Sessions"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Checkout Sessions</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('webhooks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                currentView === 'webhooks'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Registro e inspección de Webhooks"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Webhooks</span>
              {webhookEvents.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-[9px] font-bold text-slate-950 flex items-center justify-center">
                  {webhookEvents.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Info & Production Status Pill */}
          <div className="hidden lg:flex items-center gap-2">
            <div
              className="px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs"
              title="Ambiente 100% Producción Real en Vivo"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>🟢 MODO PRODUCCIÓN (LIVE)</span>
            </div>

            <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              {config.country === 'MX' ? '🇲🇽 MXN' : '🇨🇱 CLP'}
            </span>
          </div>
        </div>
      </header>

      {/* Global Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-amber-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main View Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* ================= 1. SPLIT VIEW: Dual screen ================= */}
        {currentView === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left side: Merchant Gateway Management (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Quick Summary Banner */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Pasarela de Pagos Fintoc Activa
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Nexusbank ({config.fintocAccountId || 'acc_3KLu...'}): CLABE {config.fintocClabe || '999-969-9146-6531-4673'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Destino SPEI: {config.destinationAccount || '021650064944977732'} (HSBC)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentView('invoices')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Facturas & Liquidar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('tramite')}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Pago de Trámite</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('config')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    Configuración
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('checkout')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    + Nuevo Cobro
                  </button>
                </div>
              </div>

              {/* MCP Live Connector Status Strip */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
                    <Bot className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">Conector Claude MCP</span>
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.2 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Conectado: https://mcp.fintoc.com
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Protocolo OAuth • Expone transferencias SPEI, cobros y payouts a Claude AI
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      connectMcpAutomatically().then(() => {
                        showToast('Handshake automático con https://mcp.fintoc.com confirmado');
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Autoconectar MCP</span>
                  </button>
                </div>
              </div>

              {/* Checkout Session Creator */}
              <CheckoutSessionCreator
                config={config}
                sessions={sessions}
                onSessionCreated={handleSessionCreated}
                onOpenWidget={handleOpenWidget}
              />

              {/* Mini Webhook status */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-600" />
                    Últimos Webhooks Recibidos ({webhookEvents.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setCurrentView('webhooks')}
                    className="text-xs text-amber-700 font-semibold hover:underline"
                  >
                    Ver Inspector Completo →
                  </button>
                </div>

                {webhookEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Los eventos aparecerán aquí automáticamente tras completar pagos o transferencias.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {webhookEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 font-mono">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="font-bold text-slate-800">{evt.type}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(evt.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Mobile App GoldPaymentsBank (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="mb-2 text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Simulador de Aplicación Móvil
                </span>
                <h3 className="text-sm font-extrabold text-slate-800">
                  GoldPaymentsBank (Experiencia Cliente)
                </h3>
              </div>

              <GoldBankApp
                config={config}
                onInitiateTransfer={handleOpenWidget}
                lastCompletedSession={lastFinishedSession}
              />
            </div>
          </div>
        )}

        {/* ================= 1.2. LIQUIDACIÓN DE FACTURAS Y DEPÓSITOS ================= */}
        {currentView === 'invoices' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <InvoicesDepositsPanel
              config={config}
              onConfigSaved={handleConfigSaved}
              onNotify={showToast}
            />
          </div>
        )}

        {/* ================= 1.5. PAGO DE TRÁMITE ================= */}
        {currentView === 'tramite' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <TramitePaymentPanel
              config={config}
              onInitiatePayment={handleOpenWidget}
              lastCompletedSession={lastFinishedSession}
            />
          </div>
        )}

        {/* ================= 2. MOBILE BANK ONLY ================= */}
        {currentView === 'mobile_bank' && (
          <div className="max-w-md mx-auto py-4">
            <div className="mb-4 text-center">
              <h2 className="text-xl font-bold text-slate-900">GoldPaymentsBank</h2>
              <p className="text-xs text-slate-500">
                Prueba transferencias SPEI integradas con Fintoc Checkout Sessions en tiempo real.
              </p>
            </div>
            <GoldBankApp
              config={config}
              onInitiateTransfer={handleOpenWidget}
              lastCompletedSession={lastFinishedSession}
            />
          </div>
        )}

        {/* ================= 3. GATEWAY CONFIGURATION ================= */}
        {currentView === 'config' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <GatewayConfigPanel config={config} onConfigSaved={handleConfigSaved} />
          </div>
        )}

        {/* ================= 4. CHECKOUT SESSIONS CREATOR ================= */}
        {currentView === 'checkout' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <CheckoutSessionCreator
              config={config}
              sessions={sessions}
              onSessionCreated={handleSessionCreated}
              onOpenWidget={handleOpenWidget}
            />
          </div>
        )}

        {/* ================= 5. WEBHOOKS & AUDIT ================= */}
        {currentView === 'webhooks' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <WebhookInspector
              events={webhookEvents}
              sessions={sessions}
              onEventCreated={handleWebhookCreated}
              onRefresh={handleRefreshWebhooks}
            />
          </div>
        )}
      </main>

      {/* Fintoc Hosted Payment Widget / Simulator Modal */}
      <FintocWidgetModal
        session={activeWidgetSession}
        isOpen={isWidgetOpen}
        onClose={() => setIsWidgetOpen(false)}
        onSuccess={handlePaymentFinished}
      />
    </div>
  );
}
