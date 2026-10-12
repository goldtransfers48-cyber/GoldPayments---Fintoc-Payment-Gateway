import React, { useState, useEffect } from 'react';
import {
  QrCode,
  X,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  Building2,
  RefreshCw,
  ExternalLink,
  Receipt,
  FileCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { InvoiceRecord, QRPaymentSession } from '../types/fintoc';
import { generateQRPayment, settleInvoiceWithQR } from '../services/fintocService';

interface ClipQRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: InvoiceRecord | null;
  defaultAmount?: number;
  onInvoiceSettled: (settledInvoice: InvoiceRecord) => void;
  onNotify: (msg: string) => void;
  onOpenMobileBank?: (invoice: InvoiceRecord) => void;
}

export const ClipQRPaymentModal: React.FC<ClipQRPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  defaultAmount = 5228.66,
  onInvoiceSettled,
  onNotify,
  onOpenMobileBank,
}) => {
  const [provider, setProvider] = useState<'clip' | 'codi' | 'fintoc'>('clip');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [qrSession, setQrSession] = useState<QRPaymentSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(1772); // 29:32 in seconds
  const [isSettling, setIsSettling] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [settledResult, setSettledResult] = useState<InvoiceRecord | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const amountToPay = invoice ? invoice.total : defaultAmount;
  const clientName = invoice?.clientName || 'Óscar Isael Bueno Tochihuitl';
  const folio = invoice?.folio || 'FAC-CLIP-5228';
  const concept = invoice?.concept || 'Cobro Terminal Mi Clip QR - Liquidación Inmediata';

  // Load / Generate QR
  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      setSettledResult(null);
      return;
    }

    let isMounted = true;
    const fetchQR = async () => {
      setIsLoading(true);
      try {
        const res = await generateQRPayment({
          invoiceId: invoice?.id,
          amount: amountToPay,
          concept,
          clientName,
          provider,
        });

        if (isMounted && res.success && res.session) {
          setQrSession(res.session);
          setTimeLeft(1772); // 29 mins 32 seconds as shown in Clip screenshot
        }
      } catch (err: any) {
        console.info('Aviso al generar QR:', err?.message || err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchQR();
    return () => {
      isMounted = false;
    };
  }, [isOpen, invoice, provider, amountToPay]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || isSuccess || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isSuccess, timeLeft]);

  // Format time mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Settle invoice via QR
  const handleSettleViaQR = async () => {
    setIsSettling(true);
    try {
      const invId = invoice?.id || 'inv_clip_5228';
      const res = await settleInvoiceWithQR(invId, {
        provider,
        qrReference: `CLIP-QR-${Date.now().toString(36).toUpperCase()}`,
        clipTransactionId: `clip_tx_${Math.random().toString(36).substring(2, 9)}`,
      });

      if (res.success && res.invoice) {
        setSettledResult(res.invoice);
        setIsSuccess(true);
        onInvoiceSettled(res.invoice);
        onNotify(`¡Factura ${res.invoice.folio} liquidada exitosamente vía Código QR!`);
      } else {
        onNotify(res.error || 'Error al liquidar factura con QR');
      }
    } catch (err: any) {
      onNotify('Error al procesar liquidación por QR');
    } finally {
      setIsSettling(false);
    }
  };

  const handleCopyLink = () => {
    const link = `https://pay.clip.mx/checkout/qr/${folio.toLowerCase()}?amt=${amountToPay}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    onNotify('Enlace de pago QR copiado al portapapeles');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* ================= HEADER ESTILO MI CLIP ================= */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            {/* Clip Logo Badge */}
            <div className="w-8 h-8 rounded-xl bg-[#ff5a00] flex items-center justify-center text-white shadow-sm font-black text-sm tracking-tighter">
              C
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-slate-900 tracking-tight">
                  Mi Clip
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-[#ff5a00]">
                  Terminal QR
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Pagos CoDi® & SPEI Fintoc Integrados
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ================= CONTENT BODY ================= */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center text-center">
          {!isSuccess ? (
            <>
              {/* Selector de Protocolo */}
              <div className="w-full flex items-center justify-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setProvider('clip')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                    provider === 'clip'
                      ? 'bg-white text-[#ff5a00] shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Mi Clip QR
                </button>
                <button
                  type="button"
                  onClick={() => setProvider('codi')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                    provider === 'codi'
                      ? 'bg-white text-blue-700 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  CoDi® Banxico
                </button>
                <button
                  type="button"
                  onClick={() => setProvider('fintoc')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                    provider === 'fintoc'
                      ? 'bg-white text-emerald-700 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Fintoc SPEI
                </button>
              </div>

              {/* Subtítulo: Total a pagar */}
              <div className="text-xs text-slate-500 font-medium mb-1">
                Total a pagar
              </div>

              {/* Monto Principal Grande (Estilo idéntico a la captura de pantalla: $5,228.66) */}
              <div className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                ${amountToPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>

              {/* Detalle de Factura */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50/70 border border-orange-200/60 rounded-full text-[11px] font-semibold text-orange-950 mb-3">
                <Receipt className="w-3.5 h-3.5 text-[#ff5a00]" />
                <span>Factura: {folio}</span>
                <span className="text-slate-300">•</span>
                <span className="truncate max-w-[140px]">{clientName}</span>
              </div>

              {/* Instrucción (Como en la captura: "Muestra este código al cliente para que lo escanee desde su celular") */}
              <p className="text-xs text-slate-600 max-w-xs mb-4">
                Muestra este código al cliente para que lo escanee desde su celular
              </p>

              {/* Contenedor del Código QR */}
              <div className="relative p-4 bg-white rounded-3xl border-2 border-slate-200 shadow-sm flex items-center justify-center mb-4 group hover:border-[#ff5a00]/40 transition-colors">
                {isLoading ? (
                  <div className="w-64 h-64 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 text-[#ff5a00] animate-spin" />
                    <span className="text-xs text-slate-500">Generando código QR dinámico...</span>
                  </div>
                ) : qrSession?.qrDataUrl ? (
                  <div className="relative">
                    <img
                      src={qrSession.qrDataUrl}
                      alt="Código QR de Pago"
                      className="w-60 h-60 object-contain rounded-xl select-none"
                    />

                    {/* Emblem Badge en el centro del QR */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-2xl bg-white p-1.5 shadow-md border border-slate-100 flex items-center justify-center">
                        {provider === 'clip' ? (
                          <div className="w-full h-full rounded-xl bg-[#ff5a00] text-white flex items-center justify-center font-black text-sm">
                            C
                          </div>
                        ) : provider === 'codi' ? (
                          <div className="w-full h-full rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                            CoDi
                          </div>
                        ) : (
                          <div className="w-full h-full rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                            F
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-64 h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                    <QrCode className="w-16 h-16 text-slate-300 mb-2" />
                    <span>No fue posible cargar el QR</span>
                  </div>
                )}
              </div>

              {/* Tiempo Restante (Como en la captura de pantalla: "Tiempo restante: 29:32") */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-700 font-bold mb-5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                <span>Tiempo restante: {formatTime(timeLeft)}</span>
              </div>

              {/* Botón Principal: Simular Escaneo y Liquidar Factura */}
              <div className="w-full space-y-2">
                <button
                  type="button"
                  onClick={handleSettleViaQR}
                  disabled={isSettling}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#ff5a00] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold text-sm shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSettling ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Acreditando Pago y Liquidando Factura...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      Simular Escaneo y Liquidar Factura
                    </>
                  )}
                </button>

                {/* Acciones Secundarias */}
                <div className="grid grid-cols-2 gap-2 w-full pt-1">
                  {onOpenMobileBank && invoice && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenMobileBank(invoice);
                      }}
                      className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                      App Bancaria Gold
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        Copiar Enlace
                      </>
                    )}
                  </button>
                </div>

                {/* Botón: Cancelar cobro (Igual a la captura de pantalla) */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer mt-1"
                >
                  Cancelar cobro
                </button>
              </div>
            </>
          ) : (
            /* ================= PANTALLA DE ÉXITO Y FACTURA LIQUIDADA ================= */
            <div className="w-full py-4 flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-sm border border-emerald-200">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 mb-2">
                ¡PAGO RECIBIDO Y FACTURA LIQUIDADA!
              </span>

              <div className="text-3xl font-black text-slate-900 tracking-tight mb-1">
                ${amountToPay.toLocaleString('en-US', { minimumFractionDigits: 2 })} MXN
              </div>

              <p className="text-xs text-slate-500 mb-5">
                Acreditación inmediata vía terminal digital Mi Clip QR
              </p>

              {/* Recibo digital */}
              <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 mb-5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-400">Folio de Factura:</span>
                  <span className="font-bold text-slate-900 font-mono">{settledResult?.folio || folio}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Estado Fiscal:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> LIQUIDADA (PUE)
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Método de Liquidación:</span>
                  <span className="font-semibold text-slate-800">Código QR Mi Clip / CoDi</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Referencia de Cobro:</span>
                  <span className="font-mono text-slate-700">{settledResult?.settlementReference || 'LIQ-CLIP-QR-9821'}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Cuenta de Abono:</span>
                  <span className="font-semibold text-slate-800">HSBC México (••••7732)</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Beneficiario:</span>
                  <span className="font-semibold text-slate-800">Nexusbank / Oscar Bueno</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-400">Fecha y Hora:</span>
                  <span className="font-medium text-slate-700">{settledResult?.settlementDate || new Date().toLocaleString()}</span>
                </div>
              </div>

              <div className="w-full space-y-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-md cursor-pointer transition-all"
                >
                  Finalizar y Volver a Facturas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer legal */}
        <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Cifrado de grado bancario PCI-DSS
          </span>
          <span>Soporte SPEI / CoDi Banxico</span>
        </div>
      </div>
    </div>
  );
};
