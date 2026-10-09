import { InjectionToken, Provider } from '@angular/core';

// ADAPTAR: en proyectos con carpeta de constantes, mover DEFAULT_WHATS_NEW_CONFIG allí.

export interface WhatsNewConfig {
  /** URL del JSON servido como asset estático. */
  readonly url: string;
  /** Prefijo para las rutas relativas de "image". */
  readonly assetsBaseUrl: string;
  /** Versión de la app en ejecución (p. ej. la del build). Admite -SNAPSHOT. */
  readonly currentVersion: string;
  /** Clave de localStorage; función para poder incluir el id del usuario. */
  readonly storageKey: () => string;
  /** Resuelve el "permit" genérico de cada item con el sistema de permisos del proyecto. */
  readonly canSee: (permit: string) => boolean;
  /** Idioma activo para textos { es, en }. */
  readonly lang: () => string;
  /** Máximo de tarjetas por versión. */
  readonly maxItems: number;
}

export const DEFAULT_WHATS_NEW_CONFIG: Omit<WhatsNewConfig, 'currentVersion'> = {
  url: 'assets/whats-new/whats-new.json',
  assetsBaseUrl: 'assets/',
  storageKey: () => 'whatsNew.lastSeen',
  canSee: () => true,
  lang: () => 'es',
  maxItems: 3,
};

export const WHATS_NEW_CONFIG = new InjectionToken<WhatsNewConfig>('WHATS_NEW_CONFIG');

/**
 * Registra la configuración. La factoría corre en contexto de inyección, así que puede
 * usar inject() (servicio de auth, de idioma…):
 *
 *   provideWhatsNew(() => {
 *     const auth = inject(AuthService);
 *     return {
 *       currentVersion: BUILD_INFO.version,
 *       storageKey: () => `app.whatsNew.${auth.userId()}`,
 *       canSee: (permit) => auth.hasAction(permit),
 *     };
 *   })
 */
export function provideWhatsNew(factory: () => Partial<WhatsNewConfig> & Pick<WhatsNewConfig, 'currentVersion'>): Provider {
  return { provide: WHATS_NEW_CONFIG, useFactory: () => ({ ...DEFAULT_WHATS_NEW_CONFIG, ...factory() }) };
}
