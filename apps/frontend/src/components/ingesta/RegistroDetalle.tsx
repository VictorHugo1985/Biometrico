import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';

export interface RegistroRow {
  id: string;
  colaborador: { id: string; nombre: string; apellido: string };
  dispositivo: { id: string; nombre: string } | null;
  hora_marcacion: string;
  tipo_verificacion: string | null;
  origen: string;
  estado: string;
  payload_crudo?: unknown;
  motivo_fallo?: string | null;
}

interface Props {
  registro: RegistroRow | null;
  onHide: () => void;
}

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

export function RegistroDetalle({ registro, onHide }: Props) {
  if (!registro) return null;

  const origenLabel = ORIGEN_LABEL[registro.origen] ?? registro.origen;
  const estadoSev = ESTADO_SEVERITY[registro.estado] ?? 'info';
  const fecha = new Date(registro.hora_marcacion).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return (
    <Dialog
      header="Detalle del registro"
      visible={!!registro}
      onHide={onHide}
      style={{ width: '560px' }}
      modal
      footer={
        <Button label="Cerrar" icon="pi pi-times" onClick={onHide} outlined />
      }
    >
      <div className="flex flex-column gap-3">
        <div className="grid">
          <div className="col-6">
            <p className="text-sm text-color-secondary mb-1">Colaborador</p>
            <p className="font-medium">{registro.colaborador.nombre} {registro.colaborador.apellido}</p>
          </div>
          <div className="col-6">
            <p className="text-sm text-color-secondary mb-1">Fecha y hora</p>
            <p className="font-medium">{fecha}</p>
          </div>
          <div className="col-6">
            <p className="text-sm text-color-secondary mb-1">Dispositivo</p>
            <p className="font-medium">{registro.dispositivo?.nombre ?? '—'}</p>
          </div>
          <div className="col-6">
            <p className="text-sm text-color-secondary mb-1">Tipo verificación</p>
            <p className="font-medium">{registro.tipo_verificacion ?? '—'}</p>
          </div>
          <div className="col-6">
            <p className="text-sm text-color-secondary mb-1">Fuente</p>
            <Tag value={origenLabel} severity="info" />
          </div>
          <div className="col-6">
            <p className="text-sm text-color-secondary mb-1">Estado</p>
            <Tag value={registro.estado} severity={estadoSev} />
          </div>
          {registro.motivo_fallo && (
            <div className="col-12">
              <p className="text-sm text-color-secondary mb-1">Motivo del fallo</p>
              <p className="font-medium text-red-600">{registro.motivo_fallo}</p>
            </div>
          )}
        </div>

        {!!registro.payload_crudo && (
          <div>
            <p className="text-sm text-color-secondary mb-1">Datos originales</p>
            <pre className="surface-100 border-round p-3 text-xs overflow-auto" style={{ maxHeight: '200px' }}>
              {JSON.stringify(registro.payload_crudo as object, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Dialog>
  );
}
