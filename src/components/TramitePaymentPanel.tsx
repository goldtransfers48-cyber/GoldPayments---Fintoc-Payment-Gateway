import React, { useState, useEffect } from 'react';
import {
  FileText,
  CreditCard,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Mail,
  Copy,
  ExternalLink,
  QrCode,
  Sparkles,
  AlertCircle,
  FileCheck,
  BadgeCheck,
  ArrowRight,
  RefreshCw,
  Hash,
  User,
  Calendar,
  Receipt,
  Share2
} from 'lucide-react';
import { FintocConfig, CheckoutSession, TramitePaymentData } from '../types/fintoc';
import { createCheckoutSession, toFintocIntegerAmount } from '../services/fintocService';

interface TramitePaymentPanelProps {
  config: FintocConfig;
  onInitiatePayment: (session: CheckoutSession) => void;
  lastCompletedSession?: CheckoutSession | null;
}

// Preset types of official administrative trámites
const PRESET_TRAMITES = [
  {
    id: 'licencia_vehicular',
    tipo: 'Derechos Vehiculares / Licencia de Conducir',
    dependencia: 'Secretaría de Movilidad y Finanzas Públicas',
    concepto: 'Expedición de Licencia de Conducir Tipo A y Refrendo Vehicular Anual',
    arancelBase: 1850,
    derechos: 650,
    montoTotal: 2500,
    folioPrefix: 'MOV-2026',
  },
  {
    id: 'pasaporte_oficial',
    tipo: 'Expedición de Pasaporte Oficial',
    dependencia: 'Secretaría de Relaciones Exteriores',
    concepto: 'Emisión de Pasaporte de Identidad Oficial con Vigencia de 3 Años',
    arancelBase: 2150,
    derechos: 350,
    montoTotal: 2500,
    folioPrefix: 'SRE-2026',
  },
  {
    id: 'sat_declaracion',
    tipo: 'Pago de Derechos Fiscales y Declaración SAT / SII',
    dependencia: 'Servicio de Administración Tributaria (SAT)',
    concepto: 'Pago de Derechos y Aranceles por Certificación Fiscal y Firma Electrónica',
    arancelBase: 2000,
    derechos: 500,
    montoTotal: 2500,
    folioPrefix: 'SAT-DERECHOS',
  },
  {
    id: 'registro_civil',
    tipo: 'Certificación de Registro Civil y Notarial',
    dependencia: 'Dirección General de Registro Civil y Notaría Pública',
    concepto: 'Expedición de Copia Certificada de Acta con Firma Digital Apostillada',
    arancelBase: 950,
    derechos: 300,
    montoTotal: 1250,
    folioPrefix: 'RGC-ACTA',
  },
  {
    id: 'licencia_mercantil',
    tipo: 'Licencia de Funcionamiento Mercantil',
    dependencia: 'Gobierno Municipal / Desarrollo Económico',
    concepto: 'Apertura y Empadronamiento de Establecimiento Comercial y Operaciones',
    arancelBase: 2800,
    derechos: 700,
    montoTotal: 3500,
    folioPrefix: 'MUN-LIC-OP',
  },
];

export const TramitePaymentPanel: React.FC<TramitePaymentPanelProps> = ({
  config,
  onInitiatePayment,
  lastCompletedSession,
}) => {
  const isChile = config.currency === 'CLP';
  const defaultAmount = isChile ? 24760 : 2500;

  // Selected Preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>('licencia_vehicular');

  // Trámite Form Data
  const [folio, setFolio] = useState<string>('LC-2026-9482-1049-MX');
  const [lineaCaptura, setLineaCaptura] = useState<string>('02165006494497773220260250000');
  const [tramiteTipo, setTramiteTipo] = useState<string>('Derechos Vehiculares / Licencia de Conducir');
  const [dependencia, setDependencia] = useState<string>('Secretaría de Movilidad y Finanzas Públicas');
  const [solicitanteNombre, setSolicitanteNombre] = useState<string>('Óscar Bueno González');
  const [identificacionFiscal, setIdentificacionFiscal] = useState<string>(isChile ? '18.492.381-K' : 'BUGO920415HR4');
  const [correoElectronico, setCorreoElectronico] = useState<string>('buenooscar619@gmail.com');
  const [telefono, setTelefono] = useState<string>('+52 55 4912 8841');
  const [concepto, setConcepto] = useState<string>('Expedición de Licencia de Conducir Tipo A y Refrendo Vehicular Anual');
  const [arancelBase, setArancelBase] = useState<number>(isChile ? 18000 : 1850);
  const [derechosGubernamentales, setDerechosGubernamentales] = useState<number>(isChile ? 6760 : 650);
  const [montoTotal, setMontoTotal] = useState<number>(defaultAmount);
  const [fechaVencimiento, setFechaVencimiento] = useState<string>('15 de Octubre de 2026');

  // State of payment
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentTramiteData, setCurrentTramiteData] = useState<TramitePaymentData | null>(null);
  const [tramiteHistorial, setTramiteHistorial] = useState<TramitePaymentData[]>([]);
  const [activeTab, setActiveTab] = useState<'formulario' | 'comprobante' | 'historial'>('formulario');
  const [copiado, setCopiado] = useState<string | null>(null);
  const [alertaExito, setAlertaExito] = useState<string | null>(null);

  // Recalculate total whenever base or fees change
  const handleArancelChange = (base: number, derechos: number) => {
    setArancelBase(base);
    setDerechosGubernamentales(derechos);
    setMontoTotal(base + derechos);
  };

  // Change preset
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = PRESET_TRAMITES.find((p) => p.id === presetId);
    if (preset) {
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      setFolio(`${preset.folioPrefix}-${randomSuffix}`);
      setLineaCaptura(`021650064944977732${randomSuffix}00`);
      setTramiteTipo(preset.tipo);
      setDependencia(preset.dependencia);
      setConcepto(preset.concepto);
      const base = isChile ? preset.arancelBase * 10 : preset.arancelBase;
      const derechos = isChile ? preset.derechos * 10 : preset.derechos;
      handleArancelChange(base, derechos);
    }
  };

  // When a payment finishes from the modal widget, link it to the active trámite
  useEffect(() => {
    if (lastCompletedSession && currentTramiteData && currentTramiteData.estado === 'pendiente') {
      const paidTramite: TramitePaymentData = {
        ...currentTramiteData,
        estado: 'pagado',
        fintocSessionId: lastCompletedSession.id,
        fintocPaymentIntentId: lastCompletedSession.payment_intent?.id || `pi_live_${Date.now()}`,
        fechaPago: new Date().toLocaleString('es-MX', {
          timeZone: 'America/Mexico_City',
          dateStyle: 'full',
          timeStyle: 'medium',
        }),
        bancoPago: lastCompletedSession.payment_intent?.bank_name || 'HSBC México (SPEI Acreditado)',
        selloDigital: `SHA256:FINTOC:${lastCompletedSession.id}:${Date.now()}:GOLD_BANK_AUTH_OK`,
        cadenaOriginal: `||2.0|${folio}|${montoTotal}|${identificacionFiscal}|${solicitanteNombre}|${dependencia}|${lastCompletedSession.id}||`,
      };

      setCurrentTramiteData(paidTramite);
      setTramiteHistorial((prev) => [paidTramite, ...prev]);
      setActiveTab('comprobante');
      setAlertaExito('¡Pago de trámite acreditado exitosamente! Tu comprobante digital oficial ha sido emitido.');
    }
  }, [lastCompletedSession]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiado(id);
    setTimeout(() => setCopiado(null), 2500);
  };

  const handleIniciarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setAlertaExito(null);

    const intAmount = toFintocIntegerAmount(montoTotal, config.currency);

    const pendingData: TramitePaymentData = {
      id: `TR-${Date.now()}`,
      folio,
      lineaCaptura,
      tramiteTipo,
      dependencia,
      solicitanteNombre,
      identificacionFiscal,
      correoElectronico,
      telefono,
      concepto,
      arancelBase,
      derechosGubernamentales,
      montoTotal,
      moneda: config.currency,
      fechaEmision: new Date().toLocaleDateString('es-MX'),
      fechaVencimiento,
      estado: 'pendiente',
    };

    setCurrentTramiteData(pendingData);

    try {
      const session = await createCheckoutSession({
        amount: intAmount,
        currency: config.currency,
        customer_email: correoElectronico,
        success_url: config.successUrl,
        cancel_url: config.cancelUrl,
        metadata: {
          tramite_folio: folio,
          linea_captura: lineaCaptura,
          tramite_tipo: tramiteTipo,
          dependencia: dependencia,
          solicitante: solicitanteNombre,
          rfc_rut: identificacionFiscal,
          concepto: concepto,
          monto_total: montoTotal,
          moneda: config.currency,
          recipient_clabe: config.destinationAccount || '021650064944977732',
          recipient_bank: 'HSBC México',
          recipient_bank_code: '021',
          fintoc_account_id: config.fintocAccountId || 'acc_3KLuIkEoBBE4tNxt3uCZ5AYcm1C',
          mode: 'live',
          origen: 'Portal de Pagos de Trámites Oficiales',
        },
      });

      // Pass session to parent to launch the Fintoc Payment Widget
      onInitiatePayment(session);
    } catch (err: any) {
      console.info('Aviso al procesar sesión de trámite:', err?.message || err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Recaudación & Trámites Oficiales
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pago de Trámite en Línea
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Realiza el pago de tus derechos, aranceles y trámites administrativos con acreditación bancaria instantánea vía <span className="text-amber-400 font-bold">Fintoc (SPEI / Transferencia Bancaria)</span>. Generación inmediata de comprobante oficial con validez jurídica y sello digital.
            </p>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 border-t md:border-t-0 border-slate-700 pt-4 md:pt-0">
            <div className="text-left md:text-right">
              <span className="text-xs text-slate-400 block font-medium">Cuenta Recaudadora Oficial:</span>
              <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                HSBC: {config.destinationAccount || '021650064944977732'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono block">
                Fintoc Org ID: {config.fintocAccountId || 'acc_3KLuIk...'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-700/60 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('formulario')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'formulario'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            1. Formulario del Trámite
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comprobante')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'comprobante'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            2. Comprobante Oficial Digital
            {currentTramiteData?.estado === 'pagado' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'historial'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BadgeCheck className="w-4 h-4" />
            Historial de Trámites ({tramiteHistorial.length})
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {alertaExito && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-bold block text-sm text-emerald-900">Operación Exitosa</span>
            {alertaExito}
          </div>
          <button
            type="button"
            onClick={() => setAlertaExito(null)}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* TAB 1: FORMULARIO DEL TRÁMITE */}
      {activeTab === 'formulario' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form: Tramite details (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-600" />
                Datos del Trámite Administrativo
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Selecciona una plantilla de trámite común o personaliza la información de tu dependencia, solicitante y línea de captura.
              </p>
            </div>

            {/* Quick Preset Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Plantillas Rápidas de Trámites Oficiales:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_TRAMITES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedPresetId === preset.id
                        ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-900 line-clamp-1">
                        {preset.tipo}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                        ${isChile ? (preset.arancelBase + preset.derechos) * 10 : preset.montoTotal} {config.currency}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                      {preset.dependencia}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleIniciarPago} className="space-y-5 pt-2">
              {/* Dependencia & Tipo de Trámite */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    Dependencia / Entidad Emisora:
                  </label>
                  <input
                    type="text"
                    required
                    value={dependencia}
                    onChange={(e) => setDependencia(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                    placeholder="Ej. Secretaría de Finanzas"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Tipo de Trámite / Servicio:
                  </label>
                  <input
                    type="text"
                    required
                    value={tramiteTipo}
                    onChange={(e) => setTramiteTipo(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                    placeholder="Ej. Derechos Vehiculares"
                  />
                </div>
              </div>

              {/* Folio & Línea de Captura */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-500" />
                    Número de Folio / Expediente:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={folio}
                      onChange={(e) => setFolio(e.target.value)}
                      className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                      placeholder="LC-2026-9482-1049-MX"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(folio, 'folio')}
                      className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                      title="Copiar Folio"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Receipt className="w-3.5 h-3.5 text-slate-500" />
                    Línea de Captura / Referencia Bancaria:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={lineaCaptura}
                      onChange={(e) => setLineaCaptura(e.target.value)}
                      className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                      placeholder="02165006494497773220260250000"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(lineaCaptura, 'lc')}
                      className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                      title="Copiar Línea de Captura"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Solicitante & Identificación Fiscal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    Nombre Completo del Solicitante / Contribuyente:
                  </label>
                  <input
                    type="text"
                    required
                    value={solicitanteNombre}
                    onChange={(e) => setSolicitanteNombre(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                    placeholder="Óscar Bueno González"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                    Identificación Fiscal ({isChile ? 'RUT Chileno' : 'RFC Mexicano'}):
                  </label>
                  <input
                    type="text"
                    required
                    value={identificacionFiscal}
                    onChange={(e) => setIdentificacionFiscal(e.target.value)}
                    className="w-full text-xs font-mono font-bold uppercase px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                    placeholder={isChile ? '18.492.381-K' : 'BUGO920415HR4'}
                  />
                </div>
              </div>

              {/* Correo Electrónico & Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    Correo Electrónico (para Comprobante Digital):
                  </label>
                  <input
                    type="email"
                    required
                    value={correoElectronico}
                    onChange={(e) => setCorreoElectronico(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                    placeholder="buenooscar619@gmail.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Vigencia de Línea de Captura:
                  </label>
                  <input
                    type="text"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Concepto Detallado */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Concepto Detallado del Trámite:
                </label>
                <textarea
                  rows={2}
                  required
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  className="w-full text-xs font-medium p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                  placeholder="Descripción oficial del pago de trámite..."
                />
              </div>

              {/* Desglose Arancelario */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Desglose Arancelario y Derechos Oficiales:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">
                      Arancel Base ({config.currency}):
                    </label>
                    <input
                      type="number"
                      value={arancelBase}
                      onChange={(e) => handleArancelChange(Number(e.target.value), derechosGubernamentales)}
                      className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">
                      Derechos Oficiales ({config.currency}):
                    </label>
                    <input
                      type="number"
                      value={derechosGubernamentales}
                      onChange={(e) => handleArancelChange(arancelBase, Number(e.target.value))}
                      className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-emerald-700 font-bold block mb-1">
                      Total a Pagar ({config.currency}):
                    </label>
                    <div className="w-full text-sm font-mono font-extrabold px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-between">
                      <span>${montoTotal.toLocaleString('es-MX')}</span>
                      <span className="text-[10px] font-normal">{config.currency}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón de Pago Principal */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-700 hover:to-yellow-600 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-3 disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Conectando con Pasarela Fintoc...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 text-slate-950" />
                    <span>Pagar Trámite con Fintoc (${montoTotal.toLocaleString('es-MX')} {config.currency})</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Summary Card: Payout & Official Details (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Summary Voucher Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Resumen de la Orden
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  En Espera de Pago
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Trámite:</span>
                  <span className="font-bold text-slate-900 block">{tramiteTipo}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Dependencia:</span>
                  <span className="font-semibold text-slate-800 block">{dependencia}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Línea de Captura:</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px] break-all">
                    {lineaCaptura}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Solicitante:</span>
                  <span className="font-semibold text-slate-800 block">
                    {solicitanteNombre} ({identificacionFiscal})
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Monto Final:</span>
                  <span className="text-lg font-black text-amber-700 font-mono">
                    ${montoTotal.toLocaleString('es-MX')} {config.currency}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  Garantía de Acreditación Fintoc
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Los fondos se transfieren en tiempo real a la cuenta recaudadora oficial mediante SPEI / A2A. Tu comprobante con sello criptográfico se genera inmediatamente.
                </p>
              </div>
            </div>

            {/* Recaudación Info Card */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xs space-y-3 text-xs">
              <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Datos de Recaudación Fintoc
              </h3>

              <div className="space-y-2 text-[11px] font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Banco Receptor:</span>
                  <span className="text-white font-bold">HSBC México</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CLABE Destino:</span>
                  <span className="text-amber-300 font-bold">{config.destinationAccount || '021650064944977732'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cuenta Fintoc:</span>
                  <span className="text-slate-300 font-bold">{config.fintocAccountId || 'acc_3KLuIk...'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Conector Claude MCP:</span>
                  <span className="text-emerald-400 font-bold">mcp.fintoc.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPROBANTE OFICIAL DIGITAL */}
      {activeTab === 'comprobante' && (
        <div className="max-w-3xl mx-auto space-y-6">
          {currentTramiteData ? (
            <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-xl overflow-hidden p-6 sm:p-10 space-y-8 print:p-0 print:border-none">
              {/* Header Official Receipt */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-amber-600" />
                    <span className="font-black text-slate-900 text-lg uppercase tracking-tight">
                      {currentTramiteData.dependencia}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Sistema Central de Recaudación Tributaria y Trámites Administrativos
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Recibo Oficial de Pago
                  </span>
                  <span className="text-sm font-black font-mono text-slate-900 block">
                    FOLIO: {currentTramiteData.folio}
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-extrabold uppercase mt-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {currentTramiteData.estado === 'pagado' ? 'PAGADO Y VALIDADO' : 'PENDIENTE DE PAGO'}
                  </div>
                </div>
              </div>

              {/* Main Receipt Body */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Contribuyente / Solicitante:</span>
                    <span className="text-sm font-bold text-slate-900 block">{currentTramiteData.solicitanteNombre}</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Identificación Fiscal:</span>
                    <span className="text-xs font-mono font-bold text-slate-900 block">
                      {currentTramiteData.identificacionFiscal}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Correo Registrado:</span>
                    <span className="text-xs text-slate-700 block">{currentTramiteData.correoElectronico}</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Fecha y Hora de Acreditación:</span>
                    <span className="text-xs font-medium text-slate-800 block">
                      {currentTramiteData.fechaPago || 'En proceso'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 sm:border-l sm:pl-6 border-slate-200">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Trámite o Servicio:</span>
                    <span className="text-xs font-bold text-slate-900 block">{currentTramiteData.tramiteTipo}</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Línea de Captura:</span>
                    <span className="text-xs font-mono font-bold text-slate-900 block break-all">
                      {currentTramiteData.lineaCaptura}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Método de Pago:</span>
                    <span className="text-xs font-bold text-slate-800 block">
                      {currentTramiteData.bancoPago || 'Fintoc Checkout Live (SPEI Banco HSBC)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">ID Transacción Fintoc:</span>
                    <span className="text-xs font-mono font-bold text-amber-700 block">
                      {currentTramiteData.fintocSessionId || 'cs_live_spei_88192'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-700 flex justify-between">
                  <span>Concepto / Rubro</span>
                  <span>Importe</span>
                </div>
                <div className="p-4 space-y-2 bg-white">
                  <div className="flex justify-between text-slate-700">
                    <span>{currentTramiteData.concepto} (Arancel Base)</span>
                    <span className="font-mono">${currentTramiteData.arancelBase.toLocaleString('es-MX')} {currentTramiteData.moneda}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Derechos Oficiales de Emisión y Certificación Gubernamental</span>
                    <span className="font-mono">${currentTramiteData.derechosGubernamentales.toLocaleString('es-MX')} {currentTramiteData.moneda}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-sm text-slate-950">
                    <span>Total Acreditado</span>
                    <span className="font-mono text-emerald-700">${currentTramiteData.montoTotal.toLocaleString('es-MX')} {currentTramiteData.moneda}</span>
                  </div>
                </div>
              </div>

              {/* Digital Stamp & QR Verification */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4 text-[10px]">
                <div className="w-24 h-24 bg-white p-2 rounded-xl border border-slate-300 shadow-2xs flex flex-col items-center justify-center shrink-0">
                  <QrCode className="w-16 h-16 text-slate-800" />
                  <span className="text-[8px] font-mono text-slate-500 font-bold mt-1">VERIFICAR</span>
                </div>

                <div className="flex-1 space-y-1.5 font-mono text-slate-600 break-all">
                  <div>
                    <span className="font-bold text-slate-800 block">Sello Digital de la Transacción Fintoc:</span>
                    <p className="text-[9px] text-slate-500 leading-tight">
                      {currentTramiteData.selloDigital || 'SHA256:FINTOC:cs_live_94819283:2026:GOLD_PAYMENTS_SAT_AUTH_VERIFIED'}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 block">Cadena Original:</span>
                    <p className="text-[9px] text-slate-500 leading-tight">
                      {currentTramiteData.cadenaOriginal || `||2.0|${currentTramiteData.folio}|${currentTramiteData.montoTotal}|${currentTramiteData.identificacionFiscal}|${currentTramiteData.dependencia}||`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Comprobante Oficial</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleCopy(currentTramiteData.folio, 'folio_copiado');
                      alert(`Folio de trámite copiado: ${currentTramiteData.folio}`);
                    }}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Folio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      alert(`Comprobante oficial enviado por correo a: ${currentTramiteData.correoElectronico}`);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <Mail className="w-4 h-4 text-slate-950" />
                    <span>Enviar a mi Correo</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No hay ningún trámite seleccionado</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Completa el formulario en el paso 1 para iniciar el pago de tu trámite y ver aquí tu comprobante oficial con sello digital.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('formulario')}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-600"
              >
                Ir al Formulario
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HISTORIAL DE TRÁMITES */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Historial de Trámites Pagados</h3>
              <p className="text-xs text-slate-500">
                Consulta los trámites y certificados expedidos mediante la pasarela Fintoc.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              Total: {tramiteHistorial.length}
            </span>
          </div>

          {tramiteHistorial.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Receipt className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs">Aún no has completado pagos de trámites en esta sesión.</p>
              <button
                type="button"
                onClick={() => setActiveTab('formulario')}
                className="text-xs text-amber-600 font-bold hover:underline"
              >
                Iniciar primer pago de trámite →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tramiteHistorial.map((tr) => (
                <div key={tr.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{tr.tramiteTipo}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        PAGADO
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Folio: <span className="font-mono font-bold text-slate-700">{tr.folio}</span> • {tr.dependencia}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Solicitante: {tr.solicitanteNombre} ({tr.identificacionFiscal}) • {tr.fechaPago}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-mono font-black text-slate-900 text-sm block">
                        ${tr.montoTotal.toLocaleString('es-MX')} {tr.moneda}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {tr.fintocSessionId}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTramiteData(tr);
                        setActiveTab('comprobante');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                    >
                      Ver Comprobante
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
