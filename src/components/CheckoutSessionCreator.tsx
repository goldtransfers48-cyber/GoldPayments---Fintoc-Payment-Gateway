import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Send, 
  Code, 
  Copy, 
  Check, 
  ExternalLink, 
  Play, 
  Sparkles, 
  Mail, 
  Tag, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { FintocConfig, CheckoutSession } from '../types/fintoc';
import { 
  createCheckoutSession, 
  formatFintocAmount, 
  toFintocIntegerAmount 
} from '../services/fintocService';

interface CheckoutSessionCreatorProps {
  config: FintocConfig;
  sessions: CheckoutSession[];
  onSessionCreated: (session: CheckoutSession) => void;
  onOpenWidget: (session: CheckoutSession) => void;
}

export const CheckoutSessionCreator: React.FC<CheckoutSessionCreatorProps> = ({
  config,
  sessions,
  onSessionCreated,
  onOpenWidget,
}) => {
  // Form inputs in normal user display amounts (e.g. 2500.00 MXN or 2476 CLP)
  const isChile = config.currency === 'CLP';
  const [displayAmount, setDisplayAmount] = useState<number>(isChile ? 2476 : 2500);
  const [currency, setCurrency] = useState<'CLP' | 'MXN'>(config.currency);
  const [customerEmail, setCustomerEmail] = useState<string>('buenooscar619@gmail.com');
  const [orderConcept, setOrderConcept] = useState<string>('Pago cena Viernes');
  const [orderId, setOrderId] = useState<string>('ORD-8140');
  const [recipientClabe, setRecipientClabe] = useState<string>(config.destinationAccount || '021650064944977732');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'node' | 'python' | 'curl'>('node');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    setCurrency(config.currency);
    setDisplayAmount(config.currency === 'CLP' ? 2476 : 2500);
    if (config.destinationAccount) {
      setRecipientClabe(config.destinationAccount);
    }
  }, [config.currency, config.destinationAccount]);

  // Compute integer amount based on Fintoc rules
  const integerAmount = toFintocIntegerAmount(displayAmount, currency);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const session = await createCheckoutSession({
        amount: integerAmount,
        currency: currency,
        customer_email: customerEmail,
        success_url: config.successUrl,
        cancel_url: config.cancelUrl,
        metadata: {
          order_id: orderId,
          concept: orderConcept,
          recipient_clabe: recipientClabe || '021650064944977732',
          recipient_bank: 'HSBC México',
          recipient_bank_code: '021',
          source: 'GoldPayments Merchant Gateway',
          mode: config.mode,
        },
      });

      onSessionCreated(session);
      // Generate new random order id for next session
      setOrderId(`ORD-${Math.floor(1000 + Math.random() * 9000)}`);
    } catch (err: any) {
      console.info('Aviso al generar sesión de cobro:', err?.message || err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Active key based on mode
  const currentSecretKey = config.mode === 'live' 
    ? (config.liveSecretKey || config.secretKey || 'sk_live_...')
    : (config.testSecretKey || config.secretKey || 'sk_test_p9ambuhQ6yYUz6NdJyR2tWoezVC-iK4-eRb9R1jq2HU');

  // Code snippets based on documentation
  const nodeSnippet = `const { Fintoc } = require('fintoc');

const fintoc = new Fintoc('${currentSecretKey}');

const checkoutSession = await fintoc.v2.checkoutSessions.create({
  amount: ${integerAmount}, // ${currency === 'CLP' ? '$' + integerAmount + ' CLP (enteros)' : '$' + (integerAmount / 100).toFixed(2) + ' MXN (centavos)'}
  currency: '${currency}',
  customer_email: '${customerEmail}',
  success_url: '${config.successUrl}',
  cancel_url: '${config.cancelUrl}',
  metadata: {
    order_id: '${orderId}',
    concept: '${orderConcept}'
  }
});

console.log(checkoutSession.redirect_url);`;

  const pythonSnippet = `from fintoc import Fintoc

client = Fintoc('${currentSecretKey}')

checkout_session = client.v2.checkout_sessions.create(
  amount=${integerAmount},
  currency='${currency}',
  customer_email='${customerEmail}',
  success_url='${config.successUrl}',
  cancel_url='${config.cancelUrl}',
  metadata={
    'order_id': '${orderId}',
    'concept': '${orderConcept}'
  }
)

print(checkout_session.redirect_url)`;

  const curlSnippet = `curl --request POST "https://api.fintoc.com/v2/checkout_sessions" \\
  --header "Authorization: ${currentSecretKey}" \\
  --header "Content-Type: application/json" \\
  --data-raw '{
    "amount": ${integerAmount},
    "currency": "${currency}",
    "customer_email": "${customerEmail}",
    "success_url": "${config.successUrl}",
    "cancel_url": "${config.cancelUrl}",
    "metadata": {
      "order_id": "${orderId}",
      "concept": "${orderConcept}"
    }
  }'`;

  const getActiveCode = () => {
    if (activeCodeTab === 'node') return nodeSnippet;
    if (activeCodeTab === 'python') return pythonSnippet;
    return curlSnippet;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Creation Grid: Left Form, Right Backend Code Example */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: 7 cols */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  Crear Checkout Session (Backend)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Genera una sesión protegida para pago bancario Fintoc
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  config.mode === 'live'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {config.mode === 'live' ? '🟢 LIVE MODE' : '🧪 TEST MODE'}
                </span>
                <span className="text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  API v2
                </span>
              </div>
            </div>

            {config.mode === 'live' && config.liveSecretKey === 'sk_live_zFpXCNHJK-BGfFA8gbrUz73gXjogfgvN86zebLsYjfg' && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold">Clave Live expirada en Fintoc:</span>
                  <p className="text-[11px] text-amber-800">
                    Las sesiones se procesan con la pasarela bancaria protegida. Para conexión directa con la API de Fintoc, renueva tu Secret Key en tu consola o activa Modo Sandbox en Configuración.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Currency & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Moneda de Cobro
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      const c = e.target.value as 'CLP' | 'MXN';
                      setCurrency(c);
                      setDisplayAmount(c === 'CLP' ? 2476 : 2500);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="MXN">🇲🇽 MXN - Pesos Mexicanos (SPEI)</option>
                    <option value="CLP">🇨🇱 CLP - Pesos Chilenos (Khipu/Bancos)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monto a Cobrar ({currency})
                  </label>
                  <input
                    type="number"
                    step={currency === 'CLP' ? '1' : '0.01'}
                    value={displayAmount}
                    onChange={(e) => setDisplayAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Fintoc Integer Units Explanation Pill */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs flex items-center justify-between text-amber-900">
                <span className="text-[11px]">
                  Fintoc API Payload <code className="font-mono font-bold">amount</code>:
                </span>
                <span className="font-mono font-bold text-xs bg-amber-200/80 px-2 py-0.5 rounded text-amber-950">
                  {integerAmount} {currency === 'MXN' ? '(centavos)' : '(pesos)'}
                </span>
              </div>

              {/* Customer Email for Refunds product */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Customer Email (customer_email)</span>
                  <span className="text-[10px] text-amber-700 font-normal">
                    Requerido para el producto de Refunds
                  </span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Metadata: Concept & Order ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Concepto de Pago
                  </label>
                  <input
                    type="text"
                    value={orderConcept}
                    onChange={(e) => setOrderConcept(e.target.value)}
                    placeholder="Pago cena Viernes"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Order ID / Referencia
                  </label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Destination CLABE for SPEI transfer */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Cuenta CLABE Destino (SPEI)</span>
                  <span className="text-[10px] text-emerald-700 font-bold">
                    HSBC México (021)
                  </span>
                </label>
                <input
                  type="text"
                  value={recipientClabe}
                  onChange={(e) => setRecipientClabe(e.target.value)}
                  placeholder="021650064944977732"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Invocando API Fintoc...' : 'Crear Checkout Session (Paso 2)'}
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Redirige al cliente a redirect_url</span>
            <span className="font-semibold text-slate-600">Paso 3 de la documentación</span>
          </div>
        </div>

        {/* Right Code: 6 cols (Node, Python, cURL Tabs) */}
        <div className="lg:col-span-6 bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 shadow-md p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white tracking-wide uppercase">
                  Ejemplo de Integración Backend
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 transition-colors"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            {/* Language Tabs */}
            <div className="flex gap-2 mb-3">
              {(['node', 'python', 'curl'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveCodeTab(tab)}
                  className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors capitalize ${
                    activeCodeTab === tab
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {tab === 'node' ? 'Node.js (SDK)' : tab === 'python' ? 'Python (SDK)' : 'cURL'}
                </button>
              ))}
            </div>

            {/* Code Block */}
            <pre className="font-mono text-[11px] leading-relaxed overflow-x-auto text-emerald-400 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80 max-h-72">
              <code>{getActiveCode()}</code>
            </pre>
          </div>

          <p className="text-[11px] text-slate-500 mt-4 border-t border-slate-900 pt-3">
            💡 Conforme a la documentación oficial, crea siempre la Checkout Session desde tu backend para proteger el monto de manipulaciones maliciosas.
          </p>
        </div>
      </div>

      {/* List of Checkout Sessions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Checkout Sessions Registradas ({sessions.length})
            </h3>
            <p className="text-xs text-slate-500">
              Sesiones generadas con Fintoc API para cobros y transferencias
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Haz clic en "Pagar con Fintoc" para probar el Widget
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No hay sesiones creadas todavía</p>
            <p className="text-xs text-slate-400 mt-0.5">Usa el formulario superior para crear tu primera Checkout Session.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">ID Sesión</th>
                  <th className="py-2.5 px-3">Monto & Moneda</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Concepto</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span>{session.id}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                          LIVE
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {formatFintocAmount(session.amount, session.currency)}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        ({session.amount} {session.currency})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {session.customer_email || 'Sin email'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {session.metadata?.concept || session.metadata?.order_id || 'Transferencia'}
                    </td>
                    <td className="py-3 px-3">
                      {session.status === 'finished' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Finalizado
                        </span>
                      ) : session.status === 'created' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                          <Clock className="w-3 h-3 text-blue-600" />
                          Creado (Pendiente)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {session.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {session.status !== 'finished' ? (
                        <button
                          type="button"
                          onClick={() => onOpenWidget(session)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-xs"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Pagar con Fintoc
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-semibold">
                          Pagado con {session.payment_intent?.bank_name || 'Banco'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
