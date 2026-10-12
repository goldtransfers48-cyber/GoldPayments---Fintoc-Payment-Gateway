import React, { useState } from 'react';
import { 
  Server, 
  RefreshCw, 
  Send, 
  Code, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Trash2,
  Check,
  ShieldCheck,
  Info
} from 'lucide-react';
import { WebhookEvent, CheckoutSession } from '../types/fintoc';
import { simulateWebhookEvent } from '../services/fintocService';

interface WebhookInspectorProps {
  events: WebhookEvent[];
  sessions: CheckoutSession[];
  onEventCreated: (event: WebhookEvent) => void;
  onRefresh: () => void;
}

export const WebhookInspector: React.FC<WebhookInspectorProps> = ({
  events,
  sessions,
  onEventCreated,
  onRefresh,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(events[0] || null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simEventType, setSimEventType] = useState<string>('checkout_session.finished');
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || '');
  const [copiedPayload, setCopiedPayload] = useState(false);

  React.useEffect(() => {
    if (!selectedEvent && events.length > 0) {
      setSelectedEvent(events[0]);
    }
  }, [events, selectedEvent]);

  React.useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  const handleSimulate = async () => {
    setIsSimulating(true);
    const event = await simulateWebhookEvent(simEventType, selectedSessionId);
    setIsSimulating(false);
    if (event) {
      onEventCreated(event);
      setSelectedEvent(event);
    }
  };

  const handleCopyPayload = () => {
    if (!selectedEvent) return;
    navigator.clipboard.writeText(JSON.stringify(selectedEvent, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Documentation Table of Events from Quickstart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-600" />
              Eventos Post-Pago Oficiales de Fintoc (Paso 4)
            </h3>
            <p className="text-xs text-slate-500">
              Escucha estos webhooks en lugar de esperar callbacks del cliente para prevenir manipulaciones.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar Registro
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Evento Fintoc</th>
                <th className="py-2.5 px-3">Descripción Oficial</th>
                <th className="py-2.5 px-3">Acción Recomendada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 bg-emerald-50/50">
                  checkout_session.finished
                </td>
                <td className="py-2.5 px-3 text-slate-700">
                  Se envía cuando un cliente ha completado un pago. Contiene estado final del pago.
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  Confirma la orden al cliente o permítele reintentar el pago.
                </td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-mono font-bold text-amber-700 bg-amber-50/50">
                  checkout_session.expired
                </td>
                <td className="py-2.5 px-3 text-slate-700">
                  Se envía cuando un cliente abandona el flujo de pago antes de terminar.
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  Ofrece al cliente otro intento de pagar.
                </td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-mono font-bold text-blue-700 bg-blue-50/50">
                  payment_intent.succeeded
                </td>
                <td className="py-2.5 px-3 text-slate-700">
                  Se envía cuando el pago relacionado a una checkout session tiene éxito.
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  Confirma y procesa el despacho de la orden del cliente.
                </td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-mono font-bold text-rose-700 bg-rose-50/50">
                  payment_intent.failed
                </td>
                <td className="py-2.5 px-3 text-slate-700">
                  Se envía cuando el pago relacionado a una checkout session falla o es rechazado.
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  Ofrece al cliente un nuevo intento de transferir.
                </td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-mono font-bold text-purple-700 bg-purple-50/50">
                  payout.created
                </td>
                <td className="py-2.5 px-3 text-slate-700">
                  Se envía cuando se crea un pago de liquidación hacia tu cuenta bancaria y comienza su procesamiento.
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  Registra desembolso pendiente en conciliación contable.
                </td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 bg-emerald-50/50">
                  payout.succeeded
                </td>
                <td className="py-2.5 px-3 text-slate-700">
                  Se envía cuando el pago se transfiere correctamente a tu cuenta bancaria (HSBC 021650064944977732).
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  Marca fondos disponibles en cuenta bancaria.
                </td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-mono font-bold text-rose-700 bg-rose-50/50">
                  payout.canceled
                </td>
                <td className="py-2.5 px-3 text-slate-700">
                  Se envía cuando falla una transferencia de pago (datos bancarios inválidos o límite mensual alcanzado).
                </td>
                <td className="py-2.5 px-3 text-slate-600">
                  Fintoc conserva el importe y lo añade automáticamente al siguiente intento de pago.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulator bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h4 className="font-bold text-sm">Simulador y Dispatcher de Webhooks</h4>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Dispara manualmente eventos hacia tu servidor para verificar el procesamiento post-pago
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={simEventType}
            onChange={(e) => setSimEventType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-hidden"
          >
            <option value="checkout_session.finished">checkout_session.finished</option>
            <option value="payment_intent.succeeded">payment_intent.succeeded</option>
            <option value="payout.created">payout.created</option>
            <option value="payout.succeeded">payout.succeeded</option>
            <option value="payout.canceled">payout.canceled</option>
            <option value="checkout_session.expired">checkout_session.expired</option>
            <option value="payment_intent.failed">payment_intent.failed</option>
          </select>

          <button
            type="button"
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {isSimulating ? 'Disparando...' : 'Emitir Evento'}
          </button>
        </div>
      </div>

      {/* Two columns: Event log list on left, JSON payload inspect on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Event List: 5 cols */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-bold text-sm text-slate-900">Historial de Eventos Recibidos</h4>
            <span className="text-xs font-mono font-semibold text-slate-500">
              Total: {events.length}
            </span>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Aún no se han recibido eventos</p>
              <p className="text-[11px] text-slate-400">
                Completa un pago en el Widget o pulsa "Emitir Evento".
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {events.map((evt) => {
                const isSelected = selectedEvent?.id === evt.id;
                const isSuccess = evt.type.includes('finished') || evt.type.includes('succeeded');
                return (
                  <button
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          isSuccess
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {evt.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(evt.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono truncate">
                      ID: {evt.id}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* JSON Inspector: 7 cols */}
        <div className="lg:col-span-7 bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 shadow-md p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white tracking-wide uppercase">
                  Webhook Payload Inspector
                </span>
                {selectedEvent && (
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded">
                    {selectedEvent.type}
                  </span>
                )}
              </div>
              {selectedEvent && (
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 transition-colors"
                >
                  {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPayload ? 'Copiado!' : 'Copiar JSON'}</span>
                </button>
              )}
            </div>

            {selectedEvent ? (
              <pre className="font-mono text-[11px] leading-relaxed overflow-x-auto text-emerald-400 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80 max-h-80">
                <code>{JSON.stringify(selectedEvent, null, 2)}</code>
              </pre>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs">
                Selecciona un evento de la lista izquierda para inspeccionar sus datos.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-900 mt-4 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Firmado con Webhook Secret (Fintoc Signature Verification)
            </span>
            <span>HTTP 200 OK</span>
          </div>
        </div>
      </div>
    </div>
  );
};
