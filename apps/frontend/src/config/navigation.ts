export type RolUsuario = 'administrador' | 'supervisor' | 'caja' | 'colaborador';

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  href: string;
  roles: RolUsuario[];
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard',       label: 'Dashboard',           icon: 'pi pi-chart-bar',   href: '/dashboard',       roles: ['administrador', 'supervisor'] },
  { key: 'colaboradores',   label: 'Colaboradores',       icon: 'pi pi-users',       href: '/colaboradores',   roles: ['administrador', 'supervisor'] },
  { key: 'liquidacion',     label: 'Liquidación Semanal', icon: 'pi pi-calculator',  href: '/liquidacion',     roles: ['administrador'] },
  { key: 'bonos',           label: 'Bonos Diarios',       icon: 'pi pi-star',        href: '/bonos',           roles: ['administrador', 'supervisor'] },
  { key: 'notas',           label: 'Notas de Registro',   icon: 'pi pi-file-edit',   href: '/notas',           roles: ['administrador', 'supervisor'] },
  { key: 'pago-caja',       label: 'Pago por Caja',       icon: 'pi pi-wallet',      href: '/pago-caja',       roles: ['administrador', 'caja'] },
  { key: 'configuracion',   label: 'Configuración',       icon: 'pi pi-cog',         href: '/configuracion',   roles: ['administrador'] },
  { key: 'justificaciones', label: 'Justificaciones',     icon: 'pi pi-shield',      href: '/justificaciones', roles: ['administrador', 'supervisor'] },
  { key: 'usuarios',        label: 'Gestión de Usuarios', icon: 'pi pi-user-plus',   href: '/usuarios',        roles: ['administrador'] },
  { key: 'reportes',        label: 'Reportes',            icon: 'pi pi-download',    href: '/reportes',        roles: ['administrador', 'supervisor'] },
  { key: 'ingesta',         label: 'Ingesta Biométrica',  icon: 'pi pi-sync',        href: '/ingesta',         roles: ['administrador'] },
];

export const MODULE_DESCRIPTIONS: Record<string, string> = {
  dashboard:       'Estado de asistencia en tiempo real por área.',
  colaboradores:   'Registro y gestión del personal activo.',
  liquidacion:     'Cálculo y cierre de nómina semanal.',
  bonos:           'Confirmación de bonos de transporte y alimentación.',
  notas:           'Notas y adjuntos sobre registros biométricos.',
  'pago-caja':     'Consolidados de pago y confirmación de cobros.',
  configuracion:   'Horarios, tarifas y reglas de negocio configurables.',
  justificaciones: 'Aprobación de ausencias y ajustes manuales.',
  usuarios:        'Cuentas de usuario del sistema y asignación de roles.',
  reportes:        'Exportación de datos de nómina y asistencia.',
  ingesta:         'Sincronización manual de registros desde CrossChex.',
};
