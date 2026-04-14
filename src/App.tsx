import { useState, useEffect, useMemo } from 'react'
import { supabase, type Ticket } from './lib/supabase'
import { Search, RotateCcw, X, Ticket as TicketIcon, Users, Clock, Plus, AlertTriangle, Eye, EyeOff } from 'lucide-react'

type TicketMap = Map<number, Ticket>
type ConfirmState = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
}

function App() {
  const [tickets, setTickets] = useState<TicketMap>(new Map())
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null)
  const [buyerName, setBuyerName] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'sold' | 'reserved'>('sold')
  const [buyerSearch, setBuyerSearch] = useState('')
  const [buyerFilter, setBuyerFilter] = useState<'all' | 'sold' | 'reserved'>('all')
  const [saving, setSaving] = useState(false)
  const [totalNumbers, setTotalNumbers] = useState(100)
  const [buyerView, setBuyerView] = useState(false)
  const [gridFilter, setGridFilter] = useState<'all' | 'available' | 'sold' | 'reserved'>('all')
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({ open: false, title: '', message: '', onConfirm: () => {} })

  function showConfirm(opts: Omit<ConfirmState, 'open'>) {
    setConfirmModal({ ...opts, open: true })
  }

  function closeConfirm() {
    setConfirmModal(prev => ({ ...prev, open: false }))
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  async function fetchTickets() {
    const { data, error } = await supabase.from('tickets').select('*')
    if (error) {
      console.error('Error fetching tickets:', error)
      return
    }
    const map = new Map<number, Ticket>()
    data?.forEach(t => map.set(t.number, t))
    setTickets(map)
    setLoading(false)
  }

  const stats = useMemo(() => {
    let sold = 0, reserved = 0
    tickets.forEach(t => {
      if (t.status === 'sold') sold++
      else reserved++
    })
    return { sold, reserved, available: totalNumbers - tickets.size }
  }, [tickets, totalNumbers])

  const filteredBuyers = useMemo(() => {
    const list = Array.from(tickets.values())
    return list
      .filter(t => buyerFilter === 'all' || t.status === buyerFilter)
      .filter(t => t.buyer_name.toLowerCase().includes(buyerSearch.toLowerCase()))
      .sort((a, b) => a.number - b.number)
  }, [tickets, buyerFilter, buyerSearch])

  function openModal(num: number) {
    const existing = tickets.get(num)
    setSelectedNumber(num)
    setBuyerName(existing?.buyer_name ?? '')
    setPhone(existing?.phone ?? '')
    setStatus(existing?.status ?? 'sold')
    setModalOpen(true)
  }

  async function handleSave() {
    if (selectedNumber === null || !buyerName.trim()) return
    setSaving(true)

    const { error } = await supabase.from('tickets').upsert({
      number: selectedNumber,
      buyer_name: buyerName.trim(),
      phone: phone.trim() || null,
      status,
    })

    if (error) {
      console.error('Error saving:', error)
      showConfirm({ title: 'Error', message: 'Error al guardar. Intenta de nuevo.', confirmLabel: 'Aceptar', onConfirm: closeConfirm })
    } else {
      await fetchTickets()
      setModalOpen(false)
    }
    setSaving(false)
  }

  function handleFree() {
    if (selectedNumber === null) return
    showConfirm({
      title: 'Liberar número',
      message: `¿Estás seguro de liberar el número ${selectedNumber}?`,
      confirmLabel: 'Liberar',
      danger: true,
      onConfirm: async () => {
        closeConfirm()
        setSaving(true)
        const { error } = await supabase.from('tickets').delete().eq('number', selectedNumber)
        if (error) {
          console.error('Error deleting:', error)
          showConfirm({ title: 'Error', message: 'Error al liberar. Intenta de nuevo.', confirmLabel: 'Aceptar', onConfirm: closeConfirm })
        } else {
          await fetchTickets()
          setModalOpen(false)
        }
        setSaving(false)
      },
    })
  }

  function handleReset() {
    showConfirm({
      title: 'Reiniciar rifa',
      message: '¿Estás seguro de reiniciar TODA la rifa? Se borrarán todos los datos.',
      confirmLabel: 'Sí, reiniciar',
      danger: true,
      onConfirm: () => {
        closeConfirm()
        showConfirm({
          title: 'Confirmación final',
          message: 'Esta acción NO se puede deshacer. ¿Continuar?',
          confirmLabel: 'Eliminar todo',
          danger: true,
          onConfirm: async () => {
            closeConfirm()
            const { error } = await supabase.from('tickets').delete().gte('number', 1)
            if (error) {
              console.error('Error resetting:', error)
              showConfirm({ title: 'Error', message: 'Error al reiniciar. Intenta de nuevo.', confirmLabel: 'Aceptar', onConfirm: closeConfirm })
            } else {
              await fetchTickets()
            }
          },
        })
      },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-foreground border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-4">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <TicketIcon className="w-5 h-5" />
              Talonario de Rifa
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setBuyerView(v => !v); setGridFilter('all') }}
                className={`text-xs transition-colors flex items-center gap-1 px-2 py-1 rounded-md ${
                  buyerView
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {buyerView ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {buyerView ? 'Vista comprador' : 'Vista admin'}
              </button>
              {!buyerView && (
                <button
                  onClick={handleReset}
                  className="text-xs text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reiniciar
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Two-column layout */}
      <main className={`mx-auto px-3 pt-4 flex flex-col lg:flex-row gap-6 ${buyerView ? 'max-w-3xl' : 'max-w-7xl'}`}>
        {/* Left column: Stats + Search + Grid */}
        <div className="flex-1 min-w-0">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={() => buyerView && setGridFilter(f => f === 'available' ? 'all' : 'available')}
              className={`rounded-lg p-2 text-center border transition-all ${
                buyerView ? 'cursor-pointer active:scale-95' : 'cursor-default'
              } ${
                gridFilter === 'available' && buyerView
                  ? 'bg-foreground/10 border-foreground/40 ring-2 ring-foreground/20'
                  : 'bg-card'
              }`}
            >
              <div className="text-lg font-bold">{stats.available}</div>
              <div className="text-[11px] text-muted-foreground">Disponibles</div>
            </button>
            <button
              onClick={() => buyerView && setGridFilter(f => f === 'sold' ? 'all' : 'sold')}
              className={`rounded-lg p-2 text-center border transition-all ${
                buyerView ? 'cursor-pointer active:scale-95' : 'cursor-default'
              } ${
                gridFilter === 'sold' && buyerView
                  ? 'bg-sold/20 border-sold ring-2 ring-sold/30'
                  : 'bg-sold/10 border-sold/30'
              }`}
            >
              <div className="text-lg font-bold text-sold">{stats.sold}</div>
              <div className="text-[11px] text-sold/70">Vendidos</div>
            </button>
            <button
              onClick={() => buyerView && setGridFilter(f => f === 'reserved' ? 'all' : 'reserved')}
              className={`rounded-lg p-2 text-center border transition-all ${
                buyerView ? 'cursor-pointer active:scale-95' : 'cursor-default'
              } ${
                gridFilter === 'reserved' && buyerView
                  ? 'bg-reserved/20 border-reserved ring-2 ring-reserved/30'
                  : 'bg-reserved/10 border-reserved/30'
              }`}
            >
              <div className="text-lg font-bold text-reserved">{stats.reserved}</div>
              <div className="text-[11px] text-reserved/70">Reservados</div>
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            {Array.from({ length: totalNumbers }, (_, i) => i + 1).map(i => {
              const ticket = tickets.get(i)
              const isSold = ticket?.status === 'sold'
              const isReserved = ticket?.status === 'reserved'

              const hidden = buyerView && gridFilter !== 'all' && (
                (gridFilter === 'available' && ticket != null) ||
                (gridFilter === 'sold' && !isSold) ||
                (gridFilter === 'reserved' && !isReserved)
              )

              return (
                <button
                  key={i}
                  onClick={() => !buyerView && openModal(i)}
                  className={`
                    relative aspect-square rounded-lg border text-center flex flex-col items-center justify-center
                    transition-all overflow-hidden
                    ${hidden ? 'opacity-10 pointer-events-none' : ''}
                    ${buyerView ? 'cursor-default' : 'active:scale-95'}
                    ${isSold
                      ? 'bg-sold text-white border-sold shadow-sm'
                      : isReserved
                        ? 'bg-reserved text-white border-reserved shadow-sm'
                        : 'bg-card border-border' + (buyerView ? '' : ' hover:bg-muted hover:border-foreground/20')
                    }
                  `}
                >
                  <span className={`text-xs font-bold ${ticket && !buyerView ? 'opacity-70' : ''}`}>
                    {String(i)}
                  </span>
                  {ticket && !buyerView && (
                    <span className="text-[7px] sm:text-[8px] leading-tight px-0.5 truncate w-full font-medium">
                      {ticket.buyer_name.split(' ')[0]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Add more numbers button */}
          {!buyerView && <button
            onClick={() => setTotalNumbers(prev => prev + 50)}
            className="w-full mt-3 py-2.5 text-sm font-medium rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Agregar 50 números más (hasta {totalNumbers + 50})
          </button>}
        </div>

        {/* Right column: Buyer List */}
        {!buyerView && (
        <aside className="lg:w-96 lg:shrink-0">
          <div className="lg:sticky lg:top-16">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Compradores ({filteredBuyers.length})
              </h2>
            </div>

            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={buyerSearch}
                  onChange={e => setBuyerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <select
                value={buyerFilter}
                onChange={e => setBuyerFilter(e.target.value as typeof buyerFilter)}
                className="px-3 py-1.5 text-sm rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="all">Todos</option>
                <option value="sold">Vendidos</option>
                <option value="reserved">Reservados</option>
              </select>
            </div>

            {filteredBuyers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay compradores registrados
              </p>
            ) : (
              <div className="space-y-1.5 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
                {filteredBuyers.map(t => (
                  <button
                    key={t.number}
                    onClick={() => openModal(t.number)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted transition-colors text-left"
                  >
                    <span
                      className={`w-9 h-9 rounded-md flex items-center justify-center text-sm font-bold text-white shrink-0 ${
                        t.status === 'sold' ? 'bg-sold' : 'bg-reserved'
                      }`}
                    >
                      {String(t.number)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t.buyer_name}</div>
                      {t.phone && (
                        <div className="text-xs text-muted-foreground">{t.phone}</div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        t.status === 'sold'
                          ? 'bg-sold/10 text-sold'
                          : 'bg-reserved/10 text-reserved'
                      }`}
                    >
                      {t.status === 'sold' ? 'Vendido' : 'Reservado'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
        )}
      </main>

      {/* Modal */}
      {modalOpen && selectedNumber !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-card w-full sm:max-w-md sm:rounded-xl rounded-t-xl border shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold flex items-center gap-2">
                <span
                  className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold text-white ${
                    tickets.get(selectedNumber)?.status === 'sold'
                      ? 'bg-sold'
                      : tickets.get(selectedNumber)?.status === 'reserved'
                        ? 'bg-reserved'
                        : 'bg-foreground'
                  }`}
                >
                  {String(selectedNumber)}
                </span>
                Número {String(selectedNumber)}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nombre del comprador *</label>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Teléfono (opcional)</label>
                <input
                  type="tel"
                  placeholder="+58 412 1234567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Estado</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setStatus('sold')}
                    className={`py-2 rounded-lg text-sm font-medium transition-all border ${
                      status === 'sold'
                        ? 'bg-sold text-white border-sold'
                        : 'bg-card hover:bg-sold/10 border-border'
                    }`}
                  >
                    Vendido
                  </button>
                  <button
                    onClick={() => setStatus('reserved')}
                    className={`py-2 rounded-lg text-sm font-medium transition-all border ${
                      status === 'reserved'
                        ? 'bg-reserved text-white border-reserved'
                        : 'bg-card hover:bg-reserved/10 border-border'
                    }`}
                  >
                    Reservado
                  </button>
                </div>
              </div>

              {tickets.has(selectedNumber) && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Actualizado: {new Date(tickets.get(selectedNumber)!.updated_at).toLocaleString('es')}
                </div>
              )}
            </div>

            <div className="p-4 border-t flex gap-2">
              {tickets.has(selectedNumber) && (
                <button
                  onClick={handleFree}
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Liberar
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !buyerName.trim()}
                className="flex-1 py-2 text-sm font-medium rounded-lg bg-foreground text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Guardando...' : tickets.has(selectedNumber) ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirm Modal */}
      {confirmModal.open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          onClick={closeConfirm}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-card w-full max-w-sm mx-4 rounded-xl border shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 text-center">
              {confirmModal.danger && (
                <div className="mx-auto w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
              )}
              <h3 className="font-bold text-base mb-1">{confirmModal.title}</h3>
              <p className="text-sm text-muted-foreground">{confirmModal.message}</p>
            </div>
            <div className="flex border-t">
              {confirmModal.confirmLabel !== 'Aceptar' && (
                <button
                  onClick={closeConfirm}
                  className="flex-1 py-3 text-sm font-medium hover:bg-muted transition-colors rounded-bl-xl border-r"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  confirmModal.confirmLabel === 'Aceptar' ? 'rounded-b-xl' : 'rounded-br-xl'
                } ${
                  confirmModal.danger
                    ? 'text-red-500 hover:bg-red-50'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {confirmModal.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
