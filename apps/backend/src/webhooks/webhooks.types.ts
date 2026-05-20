export interface CrossChexPayload {
  requestId:  string;
  deviceSn:   string;
  personId:   string;
  checkTime:  string;
  verifyType: number;
}

export interface EventoResult {
  id_solicitud_externo: string;
  estado: 'procesado' | 'duplicado' | 'fallido';
  motivo?: string;
}

export interface CSVImportResult {
  total:      number;
  procesados: number;
  duplicados: number;
  fallidos:   number;
  errores:    Array<{ fila: number; motivo: string }>;
}
