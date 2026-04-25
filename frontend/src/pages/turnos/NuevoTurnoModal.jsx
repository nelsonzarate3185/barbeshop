import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { crearTurno } from '../../api/turnos'
import { getBarberos, getDisponibilidad } from '../../api/barberos'
import { getServicios } from '../../api/barberos'
import { getClientes } from '../../api/clientes'
import { format } from 'date-fns'

export default function NuevoTurnoModal({ onClose }) {
  const qc = useQueryClient()
  const [barberoId, setBarberoId] = useState('')
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [error, setError] = useState('')

  const { register, handleSubmit, setValue, watch } = useForm()

  const { data: barberos } = useQuery({
    queryKey: ['barberos-lista'],
    queryFn: () => getBarberos({ page_size: 100 }).then(r => r.data.resultados ?? r.data),
  })
  const { data: servicios } = useQuery({
    queryKey: ['servicios-lista'],
    queryFn: () => getServicios().then(r => r.data.resultados ?? r.data),
  })
  const { data: clientes } = useQuery({
    queryKey: ['clientes-lista'],
    queryFn: () => getClientes({ page_size: 200 }).then(r => r.data.resultados ?? r.data),
  })
  const { data: disponibilidad } = useQuery({
    queryKey: ['disponibilidad', barberoId, fecha],
    queryFn: () => getDisponibilidad(barberoId, fecha).then(r => r.data),
    enabled: !!barberoId && !!fecha,
  })

  const { mutate, isPending } = useMutation({
    mutationFn: crearTurno,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turnos'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
    onError: (e) => setError(e.response?.data?.detail || JSON.stringify(e.response?.data)),
  })

  const onSubmit = (data) => {
    setError('')
    mutate({
      cliente: parseInt(data.cliente),
      barbero: parseInt(data.barbero),
      servicio: parseInt(data.servicio),
      fecha_inicio: `${fecha}T${data.hora}`,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Nuevo turno</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select {...register('cliente', { required: true })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Seleccionar cliente</option>
              {clientes?.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellido} — {c.telefono}</option>
              ))}
            </select>
          </div>

          {/* Servicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
            <select {...register('servicio', { required: true })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Seleccionar servicio</option>
              {servicios?.map(s => (
                <option key={s.id} value={s.id}>{s.nombre} — {s.duracion_minutos} min — ${s.precio_base}</option>
              ))}
            </select>
          </div>

          {/* Barbero */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barbero</label>
            <select {...register('barbero', { required: true })}
              onChange={e => { setBarberoId(e.target.value); setValue('barbero', e.target.value) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Seleccionar barbero</option>
              {barberos?.map(b => (
                <option key={b.id} value={b.id}>{b.usuario__first_name ?? b.nombre} {b.usuario__last_name ?? ''}</option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input type="date" value={fecha}
              onChange={e => setFecha(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Slots disponibles */}
          {disponibilidad?.slots?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horario disponible</label>
              <div className="grid grid-cols-4 gap-2">
                {disponibilidad.slots.map(slot => (
                  <label key={slot} className="cursor-pointer">
                    <input type="radio" {...register('hora', { required: true })} value={slot} className="sr-only peer" />
                    <div className="text-center py-2 rounded-lg border border-gray-200 text-sm peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:border-indigo-600 hover:bg-gray-50 transition-colors">
                      {slot}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          {disponibilidad && !disponibilidad.disponible && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              {disponibilidad.motivo}
            </p>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
              {isPending ? 'Guardando...' : 'Crear turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
