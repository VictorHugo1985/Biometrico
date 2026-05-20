import { useState, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const COOKIE_NAME = 'biometrico_token';

interface ImportResult {
  total: number;
  procesados: number;
  duplicados: number;
  fallidos: number;
  errores: { fila: number; motivo: string }[];
}

interface Props {
  visible: boolean;
  onHide: () => void;
  onImportado: () => void;
}

type Step = 'upload' | 'loading' | 'result';

export function CsvImportDialog({ visible, onHide, onImportado }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep('upload');
    setFile(null);
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleClose() {
    reset();
    onHide();
  }

  async function handleImport() {
    if (!file) return;
    setStep('loading');
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const token = Cookies.get(COOKIE_NAME) ?? '';
      const res = await fetch(`${API_URL}/api/registros/import`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? 'Error al importar el archivo');
        setStep('upload');
        return;
      }
      setResult(body.data as ImportResult);
      setStep('result');
      onImportado();
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
      setStep('upload');
    }
  }

  function downloadErrorReport() {
    if (!result || result.errores.length === 0) return;
    const header = 'Fila,Motivo\n';
    const rows = result.errores.map((e) => `${e.fila},"${e.motivo.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'errores_importacion.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const footer = (
    <div className="flex gap-2 justify-content-end">
      {step === 'upload' && (
        <>
          <Button label="Cancelar" icon="pi pi-times" onClick={handleClose} outlined />
          <Button
            label="Importar"
            icon="pi pi-upload"
            onClick={handleImport}
            disabled={!file}
          />
        </>
      )}
      {step === 'result' && (
        <>
          {result && result.fallidos > 0 && (
            <Button
              label="Descargar errores"
              icon="pi pi-download"
              onClick={downloadErrorReport}
              outlined
              severity="warning"
            />
          )}
          <Button label="Cerrar" icon="pi pi-check" onClick={handleClose} />
        </>
      )}
    </div>
  );

  return (
    <Dialog
      header="Importar CSV de CrossChex"
      visible={visible}
      onHide={handleClose}
      style={{ width: '480px' }}
      modal
      footer={step !== 'loading' ? footer : undefined}
      closable={step !== 'loading'}
    >
      {step === 'upload' && (
        <div className="flex flex-column gap-3">
          <p className="text-color-secondary text-sm">
            Carga un archivo CSV exportado desde CrossChex Cloud. Límite: 5.000 filas.
          </p>
          <p className="text-xs text-color-secondary">
            Columnas esperadas: <code>No., Employee ID, Employee Name, Department, Check Time, State, Device Name</code>
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="p-2 border-1 surface-border border-round w-full"
          />
          {file && (
            <p className="text-sm text-green-600">
              <i className="pi pi-file mr-2" />
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
          {error && <Message severity="error" text={error} />}
        </div>
      )}

      {step === 'loading' && (
        <div className="flex flex-column align-items-center gap-3 py-4">
          <ProgressSpinner style={{ width: '50px', height: '50px' }} />
          <p className="text-color-secondary">Procesando archivo…</p>
        </div>
      )}

      {step === 'result' && result && (
        <div className="flex flex-column gap-3">
          <Message
            severity={result.fallidos === 0 ? 'success' : 'warn'}
            text={result.fallidos === 0 ? 'Importación completada sin errores.' : 'Importación completada con algunos errores.'}
          />
          <div className="grid text-center">
            <div className="col-3">
              <p className="text-2xl font-bold text-primary">{result.total}</p>
              <p className="text-xs text-color-secondary">Total</p>
            </div>
            <div className="col-3">
              <p className="text-2xl font-bold text-green-600">{result.procesados}</p>
              <p className="text-xs text-color-secondary">Importados</p>
            </div>
            <div className="col-3">
              <p className="text-2xl font-bold text-yellow-600">{result.duplicados}</p>
              <p className="text-xs text-color-secondary">Duplicados</p>
            </div>
            <div className="col-3">
              <p className="text-2xl font-bold text-red-600">{result.fallidos}</p>
              <p className="text-xs text-color-secondary">Fallidos</p>
            </div>
          </div>
          {result.errores.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Primeros errores:</p>
              <ul className="text-sm text-red-600 pl-3" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                {result.errores.slice(0, 10).map((e, i) => (
                  <li key={i}>Fila {e.fila}: {e.motivo}</li>
                ))}
                {result.errores.length > 10 && (
                  <li className="text-color-secondary">…y {result.errores.length - 10} más</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
