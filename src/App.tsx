import { useState, useEffect, useMemo } from 'react'
import { supabase, type Ticket } from './lib/supabase'
import { Search, RotateCcw, X, Ticket as TicketIcon, Users, Clock } from 'lucide-react'

type TicketMap = Map<number, Ticket>

function App() {
  const [tickets, setTickets] = useState<TicketMap>(new Map())
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null)
  const [buyerName, setBuyerName] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'sold' | 'reserved'>('sold')
  const [search, setSearch] = useState('')
  const [buyerSearch, setBuyerSearch] = useState('')
  const [buyerFilter, setBuyerFilter] = useState<'all' | 'sold' | 'reserved'>('all')
  const [saving, setSaving] = useState(false)

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
    return { sold, reserved, available: 100 - sold - reserved }
  }, [tickets])

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
      alert('Error al guardar. Intenta de nuevo.')
    } else {
      await fetchTickets()
      setModalOpen(false)
    }
    setSaving(false)
  }

  async function handleFree() {
    if (selectedNumber === null) return
    if (!confirm('¿Liberar este número?')) return
    setSaving(true)

    const { error } = await supabase.from('tickets').delete().eq('number', selectedNumber)
    if (error) {
      console.error('Error deleting:', error)
      alert('Error al liberar. Intenta de nuevo.')
    } else {
      await fetchTickets()
      setModalOpen(false)
    }
    setSaving(false)
  }

  async function handleReset() {
    if (!confirm('¿Estás seguro de reiniciar TODA la rifa? Se borrarán todos los datos.')) return
    if (!confirm('Esta acción NO se puede deshacer. ¿Continuar?')) return

    const { error } = await supabase.from('tickets').delete().gte('number', 0)
    if (error) {
      console.error('Error resetting:', error)
      alert('Error al reiniciar.')
    } else {
      await fetchTickets()
    }
  }

  function handleSearchJump() {
    const num = parseInt(search, 10)
    if (!isNaN(num) && num >= 0 && num <= 99) {
      openModal(num)
      setSearch('')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-foreground border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <TicketIcon className="w-5 h-5" />
              Talonario de Rifa
            </h1>
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reiniciar
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-card rounded-lg p-2 text-center border">
              <div className="text-lg font-bold">{stats.available}</div>
              <div className="text-[11px] text-muted-foreground">Disponibles</div>
            </div>
            <div className="bg-sold/10 rounded-lg p-2 text-center border border-sold/30">
              <div className="text-lg font-bold text-sold">{stats.sold}</div>
              <div className="text-[11px] text-sold/70">Vendidos</div>
            </div>
            <div className="bg-reserved/10 rounded-lg p-2 text-center border border-reserved/30">
              <div className="text-lg font-bold text-reserved">{stats.reserved}</div>
              <div className="text-[11px] text-reserved/70">Reservados</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="number"
              min={0}
              max={99}
              placeholder="Buscar número (00–99)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchJump()}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-2xl mx-auto px-3 pt-4">
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          {Array.from({ length: 100 }, (_, i) => {
            const ticket = tickets.get(i)
            const isSold = ticket?.status === 'sold'
            const isReserved = ticket?.status === 'reserved'

            return (
              <button
                key={i}
                onClick={() => openModal(i)}
                className={`
                  relative aspect-square rounded-lg border text-center flex flex-col items-center justify-center
                  transition-all active:scale-95 overflow-hidden
                  ${isSold
                    ? 'bg-sold text-white border-sold shadow-sm'
                    : isReserved
                      ? 'bg-reserved text-white border-reserved shadow-sm'
                      : 'bg-card hover:bg-muted border-border hover:border-foreground/20'
                  }
                `}
              >
                <span className={`text-xs font-bold ${ticket ? 'opacity-70' : ''}`}>
                  {String(i).padStart(2, '0')}
                </span>
                {ticket && (
                  <span className="text-[7px] sm:text-[8px] leading-tight px-0.5 truncate w-full font-medium">
                    {ticket.buyer_name.split(' ')[0]}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Buyer List */}
        <section className="mt-8">
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
            <div className="space-y-1.5">
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
                    {String(t.number).padStart(2, '0')}
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
        </section>
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
                  {String(selectedNumber).padStart(2, '0')}
                </span>
                Número {String(selectedNumber).padStart(2, '0')}
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
    </div>
  )
}

export default App
