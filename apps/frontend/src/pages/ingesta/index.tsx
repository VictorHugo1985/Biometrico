import { useState, useCallback, useEffect } from 'react';
import type { NextPage } from 'next';
import { DataTable, DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Nullable } from 'primereact/ts-helpers';
import Cookies from 'js-cookie';
import { useAuth } from '@/hooks/useAuth';
import { RegistroDetalle, RegistroRow } from '@/components/ingesta/RegistroDetalle';
import { CsvImportDialog } from '@/components/ingesta/CsvImportDialog';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const COOKIE_NAME = 'biometrico_token';

const ESTADO_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Procesado', value: 'procesado' },
  { label: 'Fallido', value: 'fallido' },
  { label: 'Duplicado', value: 'duplicado' },
];

const ORIGEN_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Webhook', value: 'webhook_crosschex' },
  { label: 'CSV', value: 'sincronizacion_api' },
];

const ESTADO_SEVERITY: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  procesado: 'success',
  fallido: 'danger',
  duplicado: 'warning',
};

const ORIGEN_LABEL: Record<string, string> = {
  webhook_crosschex: 'Webhook',
  sincronizacion_api: 'CSV',
  csv_importacion: 'CSV',
};

const IngestaPage: NextPage & { requiredRoles: string[] } = () => {
  const { usuario } = useAuth();
  const isAdmin = usuario?.rol === 'administrador';

  const [registros, setRegistros] = useState<RegistroRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState<Nullable<Date>>(null);
  const [fechaHasta, setFechaHasta] = useState<Nullable<Date>>(null);
  const [estado, setEstado] = useState('');
  const [origen, setOrigen] = useState('');

  const [registroSeleccionado, setRegistroSeleccionado] = useState<RegistroRow | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [importVisible, setImportVisible] = useState(false);

  const fetchRegistros = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const token = Cookies.get(COOKIE_NAME) ?? '';
      const params = new URLSearchParams({ page: String(currentPage), page_size: String(pageSize) });
      if (fechaDesde) params.set('desde', fechaDesde.toISOString());
      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        params.set('hasta', hasta.toISOString());
      }
      if (estado) params.set('estado', estado);
      if (origen) params.set('origen', origen);

      const res = await fetch(`${API_URL}/api/registros?${params}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const body = await res.json();
      setRegistros(body.data ?? []);
      setTotal(body.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [pageSize, fechaDesde, fechaHasta, estado, origen]);

  useEffect(() => {
    fetchRegistros(page);
  }, [fetchRegistros, page]);

  function handleBuscar() {
    setPage(1);
    fetchRegistros(1);
  }

  function handleLimpiar() {
    setFechaDesde(null);
    setFechaHasta(null);
    setEstado('');
    setOrigen('');
    setBusqueda('');
    setPage(1);
  }

  function handlePageChange(e: DataTablePageEvent) {
    setPage((e.page ?? 0) + 1);
  }

  async function handleRowClick(row: RegistroRow) {
    setDetalleLoading(true);
    setRegistroSeleccionado(null);
    try {
      const token = Cookies.get(COOKIE_NAME) ?? '';
      const res = await fetch(`${API_URL}/api/registros/${row.id}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = await res.json();
        setRegistroSeleccionado(body.data);
      } else {
        setRegistroSeleccionado(row);
      }
    } catch {
      setRegistroSeleccionado(row);
    } finally {
      setDetalleLoading(false);
    }
  }

  const registrosFiltrados = busqueda.trim()
    ? registros.filter((r) => {
        const nombre = `${r.colaborador.nombre} ${r.colaborador.apellido}`.toLowerCase();
        return nombre.includes(busqueda.toLowerCase());
      })
    : registros;

  return (
    <div>
      <div className="flex align-items-center justify-content-between mb-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">Ingesta Biométrica</h1>
          <p className="text-color-secondary text-sm">Registros recibidos por webhook y CSV de CrossChex</p>
        </div>
        {isAdmin && (
          <Button
            label="Importar CSV"
            icon="pi pi-upload"
            onClick={() => setImportVisible(true)}
          />
        )}
      </div>

      <div className="surface-card p-3 border-round border-1 surface-border mb-3">
        <div className="flex flex-wrap gap-2 align-items-end">
          <div className="flex flex-column gap-1">
            <label className="text-xs text-color-secondary">Colaborador</label>
            <InputText
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre…"
              style={{ width: '200px' }}
            />
          </div>
          <div className="flex flex-column gap-1">
            <label className="text-xs text-color-secondary">Desde</label>
            <Calendar
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.value ?? null)}
              dateFormat="dd/mm/yy"
              showIcon
              style={{ width: '160px' }}
            />
          </div>
          <div className="flex flex-column gap-1">
            <label className="text-xs text-color-secondary">Hasta</label>
            <Calendar
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.value ?? null)}
              dateFormat="dd/mm/yy"
              showIcon
              style={{ width: '160px' }}
            />
          </div>
          <div className="flex flex-column gap-1">
            <label className="text-xs text-color-secondary">Estado</label>
            <Dropdown
              value={estado}
              options={ESTADO_OPTIONS}
              onChange={(e) => setEstado(e.value)}
              style={{ width: '140px' }}
            />
          </div>
          <div className="flex flex-column gap-1">
            <label className="text-xs text-color-secondary">Fuente</label>
            <Dropdown
              value={origen}
              options={ORIGEN_OPTIONS}
              onChange={(e) => setOrigen(e.value)}
              style={{ width: '130px' }}
            />
          </div>
          <div className="flex gap-2">
            <Button icon="pi pi-search" label="Filtrar" onClick={handleBuscar} />
            <Button icon="pi pi-times" outlined onClick={handleLimpiar} tooltip="Limpiar filtros" />
          </div>
        </div>
      </div>

      <DataTable
        value={registrosFiltrados}
        loading={loading}
        paginator
        lazy
        rows={pageSize}
        totalRecords={total}
        first={(page - 1) * pageSize}
        onPage={handlePageChange}
        onRowClick={(e) => handleRowClick(e.data as RegistroRow)}
        rowClassName={() => 'cursor-pointer'}
        emptyMessage="No se encontraron registros biométricos"
        className="surface-card border-round border-1 surface-border"
        rowHover
      >
        <Column
          header="Colaborador"
          body={(r: RegistroRow) => `${r.colaborador.nombre} ${r.colaborador.apellido}`}
        />
        <Column
          header="Fecha y hora"
          body={(r: RegistroRow) =>
            new Date(r.hora_marcacion).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
          }
        />
        <Column
          header="Verificación"
          body={(r: RegistroRow) => r.tipo_verificacion ?? '—'}
        />
        <Column
          header="Dispositivo"
          body={(r: RegistroRow) => r.dispositivo?.nombre ?? '—'}
        />
        <Column
          header="Fuente"
          body={(r: RegistroRow) => (
            <Tag value={ORIGEN_LABEL[r.origen] ?? r.origen} severity="info" />
          )}
        />
        <Column
          header="Estado"
          body={(r: RegistroRow) => (
            <Tag value={r.estado} severity={ESTADO_SEVERITY[r.estado] ?? 'info'} />
          )}
        />
      </DataTable>

      {detalleLoading && (
        <div
          className="fixed top-0 left-0 w-full h-full flex align-items-center justify-content-center"
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.4)' }}
        >
          <div className="surface-card p-4 border-round shadow-4">Cargando detalle…</div>
        </div>
      )}

      <RegistroDetalle
        registro={registroSeleccionado}
        onHide={() => setRegistroSeleccionado(null)}
      />

      <CsvImportDialog
        visible={importVisible}
        onHide={() => setImportVisible(false)}
        onImportado={() => { setPage(1); fetchRegistros(1); }}
      />
    </div>
  );
};

IngestaPage.requiredRoles = ['administrador', 'supervisor'];
export default IngestaPage;
