export interface CrossChexAuthRequest {
  header: {
    nameSpace:  'authorize.token';
    nameAction: 'token';
    version:    '1.0';
    requestId:  string;
    timestamp:  string;
  };
  payload: {
    api_key:    string;
    api_secret: string;
  };
}

export interface CrossChexAuthResponse {
  code: number;
  data: {
    payload: {
      token:   string;
      expires: string;
    };
  };
}

export interface CrossChexRecord {
  checktype: number;
  checktime: string;
  device:    { serial_number: string; name: string };
  employee:  { first_name: string; last_name: string; workno: string };
}

export interface CrossChexRecordsRequest {
  header: {
    nameSpace:  'attendance.record';
    nameAction: 'getrecord';
    version:    '1.0';
    requestId:  string;
    timestamp:  string;
  };
  authorize: { type: 'token'; token: string };
  payload: {
    begin_time: string;
    end_time:   string;
    workno?:    string;
    order?:     'asc' | 'desc';
    page:       number;
    per_page:   number;
  };
}

export interface CrossChexRecordsResponse {
  code: number;
  data: {
    payload: {
      count:     number;
      list:      CrossChexRecord[];
      page:      number;
      perPage:   number;
      pageCount: number;
    };
  };
}

export interface SyncResult {
  total:      number;
  procesados: number;
  duplicados: number;
  fallidos:   number;
  errores:    Array<{ registro: string; motivo: string }>;
}
