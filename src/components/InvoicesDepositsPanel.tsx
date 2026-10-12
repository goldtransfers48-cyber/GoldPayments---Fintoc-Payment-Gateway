import React, { useState, useEffect } from 'react';
import {
  Receipt,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Building2,
  DollarSign,
  FileText,
  Sparkles,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Hash,
  Search,
  Filter,
  Check,
  Calendar,
  Send,
  Zap,
  Download,
  Printer,
  ChevronRight,
  TrendingUp,
  Landmark,
  Save,
  QrCode
} from 'lucide-react';
import { FintocConfig, InvoiceRecord, DepositRecord } from '../types/fintoc';
import {
  getInvoices,
  settleAllInvoices,
  settleSingleInvoice,
  getDeposits,
  createDeposit,
  saveConfig,
} from '../services/fintocService';
import { ClipQRPaymentModal } from './ClipQRPaymentModal';

interface InvoicesDepositsPanelProps {
  config: FintocConfig;
  onConfigSaved: (cfg: FintocConfig) => void;
  onNotify: (msg: string) => void;
  onOpenMobileBank?: (invoice: InvoiceRecord) => void;
}

export const InvoicesDepositsPanel: React.FC<InvoicesDepositsPanelProps> = ({
  config,
  onConfigSaved,
  onNotify,
  onOpenMobileBank,
}) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'deposits' | 'reconcile'>('invoices');
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSettlingAll, setIsSettlingAll] = useState<boolean>(false);
  const [settleSuccessMsg, setSettleSuccessMsg] = useState<string | null>(null);

  // QR Payment Modal state (Mi Clip / CoDi)
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [selectedInvoiceForQR, setSelectedInvoiceForQR] = useState<InvoiceRecord | null>(null);

  // New deposit modal / form state
  const [showNewDepositModal, setShowNewDepositModal] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<number>(25000);
  const [depositBank, setDepositBank] = useState<string>('BBVA México');
  const [depositSourceAcc, setDepositSourceAcc] = useState<string>('012180015699482103');
  const [depositHolder, setDepositHolder] = useState<string>('Corporativo Financiero Global S.A.');
  const [depositConcept, setDepositConcept] = useState<string>('Abono SPEI liquidación de facturas Fintoc');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState<boolean>(false);

  // Filter / Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('all');

  // Load invoices and deposits
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invRes, depRes] = await Promise.all([getInvoices(), getDeposits()]);
      if (invRes.invoices) setInvoices(invRes.invoices);
      if (depRes.deposits) setDeposits(depRes.deposits);
    } catch (err: any) {
      console.info('Aviso al cargar datos:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Liquidar todas las facturas en 1 solo clic
  const handleSettleAll = async () => {
    setIsSettlingAll(true);
    setSettleSuccessMsg(null);
    try {
      const res = await settleAllInvoices();
      if (res.success) {
        setInvoices(res.invoices);
        setSettleSuccessMsg(
          `¡Éxito! Se liquidaron ${res.settledCount} facturas por $${Number(res.totalSettledAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} MXN y se conciliaron los depósitos.`
        );
        onNotify(`Todas las facturas (${res.settledCount}) han sido liquidadas.`);
        // Reload deposits to reflect reconciliation
        const depRes = await getDeposits();
        if (depRes.deposits) setDeposits(depRes.deposits);
      } else {
        onNotify(res.error || 'Error al liquidar facturas');
      }
    } catch (err: any) {
      onNotify(err.message || 'Error al ejecutar liquidación');
    } finally {
      setIsSettlingAll(false);
    }
  };

  // Liquidar factura individual
  const handleSettleSingle = async (invoiceId: string) => {
    try {
      const res = await settleSingleInvoice(invoiceId);
      if (res.success) {
        setInvoices((prev) =>
          prev.map((i) => (i.id === invoiceId ? res.invoice : i))
        );
        onNotify(`Factura ${res.invoice.folio} liquidada exitosamente.`);
      }
    } catch (err: any) {
      onNotify('Error al liquidar la factura seleccionada');
    }
  };

  // Integrar depósito faltante
  const handleCreateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDeposit(true);
    try {
      const res = await createDeposit({
        amount: depositAmount,
        sourceBank: depositBank,
        sourceAccount: depositSourceAcc,
        sourceHolder: depositHolder,
        concept: depositConcept,
        trackingKey: `SPEI${Date.now().toString().substring(3)}`,
      });
      if (res.success) {
        setShowNewDepositModal(false);
        onNotify(`Depósito SPEI por $${depositAmount.toLocaleString()} MXN integrado con éxito.`);
        await loadData();
      }
    } catch (err: any) {
      onNotify('Error al integrar depósito');
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  // Guardar configuración general
  const handleSaveConfig = async () => {
    try {
      const ok = await saveConfig(config);
      if (ok) {
        onConfigSaved(config);
        onNotify('Configuración guardada y sincronizada correctamente en disco y servidor.');
      }
    } catch (err: any) {
      onNotify('Error al guardar la configuración');
    }
  };

  // Calculations
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalSettled = invoices
    .filter((inv) => inv.status === 'settled')
    .reduce((sum, inv) => sum + inv.total, 0);
  const totalPending = invoices
    .filter((inv) => inv.status !== 'settled')
    .reduce((sum, inv) => sum + inv.total, 0);

  const pendingCount = invoices.filter((i) => i.status !== 'settled').length;
  const settledCount = invoices.filter((i) => i.status === 'settled').length;

  const totalDepositsAmount = deposits.reduce((sum, dep) => sum + dep.amount, 0);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.concept.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ? true : inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Liquidación de Facturas & Conciliación de Depósitos SPEI
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Fintoc Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Liquida facturas pendientes en 1 solo clic, integra depósitos faltantes transferidos por SPEI a la cuenta receptora HSBC y guarda la configuración de liquidación permanente.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Save className="w-4 h-4 text-slate-500" />
              Guardar Configuración
            </button>

            <button
              type="button"
              onClick={() => setShowNewDepositModal(true)}
              className="px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              Integrar Depósito Faltante
            </button>

            <button
              type="button"
              onClick={handleSettleAll}
              disabled={isSettlingAll || pendingCount === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                pendingCount === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20 active:scale-95'
              }`}
            >
              {isSettlingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Liquidando Facturas...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  Liquidar Todas las Facturas ({pendingCount})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Banner if settled */}
        {settleSuccessMsg && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{settleSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSettleSuccessMsg(null)}
              className="text-emerald-700 font-bold hover:underline"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Metric Cards Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Facturado
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              ${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })} MXN
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <Receipt className="w-3 h-3 text-slate-400" />
              {invoices.length} facturas emitidas
            </div>
          </div>

          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Total Liquidado
            </div>
            <div className="text-xl font-black text-emerald-900 mt-1">
              ${totalSettled.toLocaleString('en-US', { minimumFractionDigits: 2 })} MXN
            </div>
            <div className="text-[10px] text-emerald-700 mt-1 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {settledCount} facturas pagadas ({invoices.length > 0 ? Math.round((settledCount / invoices.length) * 100) : 0}%)
            </div>
          </div>

          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80">
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              Por Liquidar
            </div>
            <div className="text-xl font-black text-amber-900 mt-1">
              ${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })} MXN
            </div>
            <div className="text-[10px] text-amber-700 mt-1 flex items-center gap-1 font-semibold">
              <Clock className="w-3 h-3 text-amber-600" />
              {pendingCount} facturas pendientes
            </div>
          </div>

          <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80">
            <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
              Depósitos SPEI Registrados
            </div>
            <div className="text-xl font-black text-blue-900 mt-1">
              ${totalDepositsAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} MXN
            </div>
            <div className="text-[10px] text-blue-700 mt-1 flex items-center gap-1 font-semibold">
              <Landmark className="w-3 h-3 text-blue-600" />
              {deposits.length} depósitos en HSBC (**97732)
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Facturas Fiscales ({invoices.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deposits')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'deposits'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            Depósitos SPEI Acreditados ({deposits.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reconcile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'reconcile'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Cuenta Receptora & Calendario
          </button>
        </div>
      </div>

      {/* ================= TAB 1: INVOICES ================= */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por folio, cliente o concepto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Estado:
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas ({invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Pendientes ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('settled')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'settled'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Liquidadas ({settledCount})
              </button>
            </div>
          </div>

          {/* Invoices List / Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Folio / UUID</th>
                    <th className="py-3 px-4">Cliente & RFC</th>
                    <th className="py-3 px-4">Concepto del Servicio</th>
                    <th className="py-3 px-4 text-right">Monto Total</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4">Liquidación</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        inv.status === 'settled' ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">{inv.folio}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{inv.uuid.substring(0, 18)}...</div>
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                          {inv.paymentMethod}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{inv.clientName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">RFC: {inv.clientTaxId}</div>
                        <div className="text-[10px] text-slate-400">{inv.clientEmail}</div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-700 font-medium truncate">{inv.concept}</div>
                        <div className="text-[10px] text-slate-400">Emisión: {inv.issueDate} • Vence: {inv.dueDate}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-sm text-slate-900">
                          ${inv.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          IVA: ${inv.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {inv.status === 'settled' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            LIQUIDADA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            PENDIENTE
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {inv.status === 'settled' ? (
                          <div className="text-[10px]">
                            <div className="text-emerald-700 font-bold">{inv.settlementDate || 'Liquidado'}</div>
                            <div className="text-slate-500 font-mono">{inv.settlementReference}</div>
                            <div className="text-slate-400 font-mono">{inv.fintocCheckoutSessionId}</div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Pendiente de abono SPEI</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {inv.status === 'settled' ? (
                          <span className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1">
                            <Check className="w-4 h-4" /> Al día
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSettleSingle(inv.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
                          >
                            Liquidar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredInvoices.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No se encontraron facturas que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: DEPOSITS ================= */}
      {activeTab === 'deposits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900">
              Depósitos Interbancarios SPEI Recibidos
            </h3>
            <button
              type="button"
              onClick={() => setShowNewDepositModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Nuevo Depósito SPEI
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deposits.map((dep) => (
              <div
                key={dep.id}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        <ArrowDownLeft className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{dep.sourceBank}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Emisor: {dep.sourceHolder}</div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ACREDITADO SPEI
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Monto Acreditado:</span>
                      <span className="font-black text-base text-slate-900">
                        ${dep.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {dep.currency}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Concepto:</span>
                      <span className="font-medium text-slate-700 text-right max-w-xs truncate">{dep.concept}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Cuenta Destino:</span>
                      <span className="font-mono text-slate-800 font-semibold">{dep.destinationBank} ({dep.destinationAccount})</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Clave de Rastreo SPEI:</span>
                      <span className="font-mono text-slate-500">{dep.trackingKey}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Fecha y Hora:</span>
                      <span className="text-slate-600 font-medium">{dep.receivedAt}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Conciliación automática con Fintoc</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Conciliado
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: RECONCILE & SCHEDULE ================= */}
      {activeTab === 'reconcile' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 border border-amber-500/20 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Cuenta Bancaria Receptora Oficial y Calendario de Liquidación
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Datos sincronizados donde Fintoc dispersa y liquida la recaudación diaria de los clientes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Datos de Cuenta Registrada
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Titular de la Cuenta:</span>
                  <span className="font-bold text-slate-900">{config.destinationBeneficiary || 'Nexusbank / Oscar Bueno'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Banco Receptor:</span>
                  <span className="font-bold text-slate-900">{config.destinationBank || 'HSBC México'} (021)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CLABE Interbancaria:</span>
                  <span className="font-mono font-bold text-slate-900">{config.destinationAccount || '021650064944977732'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Correo de Notificación:</span>
                  <span className="font-medium text-slate-900">{config.payoutReceiving?.settlementEmail || 'buenooscar619@gmail.com'}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Horario de Desembolsos Fintoc
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Frecuencia:</span>
                  <span className="font-bold text-emerald-700">Diariamente en días hábiles</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hora de Corte:</span>
                  <span className="font-bold text-slate-900">00:00 hrs (Medianoche)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Velocidad de Liquidación:</span>
                  <span className="font-bold text-slate-900">Al día siguiente hábil antes de las 15:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estatus de Sincronización:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Conectado en Vivo
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <div className="font-bold text-amber-900">¿Deseas guardar permanentemente esta configuración?</div>
                <div className="text-amber-700 text-[11px]">Se actualiza el archivo persistente en servidor y data store.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95"
            >
              Guardar Ahora
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: INTEGRAR DEPÓSITO FALTANTE ================= */}
      {showNewDepositModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Integrar Depósito Faltante SPEI</h3>
                  <p className="text-[11px] text-slate-400">Registra un depósito interbancario recibido en HSBC</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewDepositModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDeposit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Monto del Depósito ($ MXN):</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Banco Emisor:</label>
                  <select
                    value={depositBank}
                    onChange={(e) => setDepositBank(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 bg-white"
                  >
                    <option value="BBVA México">BBVA México</option>
                    <option value="Citibanamex">Citibanamex</option>
                    <option value="Santander México">Santander México</option>
                    <option value="Banorte">Banorte</option>
                    <option value="HSBC México">HSBC México</option>
                    <option value="STP">STP SPEI</option>
                    <option value="Scotiabank">Scotiabank</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Cuenta/CLABE Emisora:</label>
                  <input
                    type="text"
                    value={depositSourceAcc}
                    onChange={(e) => setDepositSourceAcc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Nombre del Depositante / Empresa:</label>
                <input
                  type="text"
                  value={depositHolder}
                  onChange={(e) => setDepositHolder(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Concepto de Pago SPEI:</label>
                <input
                  type="text"
                  value={depositConcept}
                  onChange={(e) => setDepositConcept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Cuenta Destino (Fijada):</span>
                  <span className="font-mono font-bold text-slate-900">{config.destinationBank} ({config.destinationAccount})</span>
                </div>
                <div className="flex justify-between">
                  <span>Beneficiario:</span>
                  <span className="font-bold text-slate-900">{config.destinationBeneficiary}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewDepositModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDeposit}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
                >
                  {isSubmittingDeposit ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Integrar Depósito
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
