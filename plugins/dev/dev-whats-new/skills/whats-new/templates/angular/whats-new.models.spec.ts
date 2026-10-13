import { WhatsNewFile, WhatsNewItem, parseVersion, pickPendingRelease, resolveText } from './whats-new.models';

const item = (id: string, extra: Partial<WhatsNewItem> = {}): WhatsNewItem => ({ id, title: `Título ${id}`, body: `Texto ${id}`, ...extra });

const FILE: WhatsNewFile = {
  schemaVersion: 1,
  releases: [
    { version: '3.2.0', date: '2026-12-01', items: [item('futuro')] },
    { version: '3.1.0', date: '2026-10-20', items: [item('a'), item('b', { permit: 'OPS.VIEW' }), item('c'), item('d')] },
    { version: '3.0.0', date: '2026-09-29', items: [item('viejo')] },
  ],
};

describe('whats-new.models', () => {
  describe('pickPendingRelease', () => {
    it('muestra a un usuario nuevo la última versión <= la actual, ignorando -SNAPSHOT', () => {
      expect(pickPendingRelease(FILE, { currentVersion: '3.1.0-SNAPSHOT' })?.version).toBe('3.1.0');
    });

    it('no repite una versión ya vista', () => {
      expect(pickPendingRelease(FILE, { currentVersion: '3.1.0', lastSeen: '3.1.0' })).toBeNull();
      expect(pickPendingRelease(FILE, { currentVersion: '3.1.0', lastSeen: '3.0.0' })?.version).toBe('3.1.0');
    });

    it('filtra por permiso y recorta a maxItems', () => {
      const release = pickPendingRelease(FILE, { currentVersion: '3.1.0', canSee: () => false, maxItems: 3 });
      expect(release?.items.map((i) => i.id)).toEqual(['a', 'c', 'd']);
    });

    it('no muestra nada si tras filtrar no queda ningún item', () => {
      const onlyPermit: WhatsNewFile = { schemaVersion: 1, releases: [{ version: '1.0.0', date: '2026-01-01', items: [item('x', { permit: 'P' })] }] };
      expect(pickPendingRelease(onlyPermit, { currentVersion: '1.0.0', canSee: () => false })).toBeNull();
    });

    it('no muestra nada con versión actual ilegible o fichero nulo', () => {
      expect(pickPendingRelease(FILE, { currentVersion: 'dev' })).toBeNull();
      expect(pickPendingRelease(null, { currentVersion: '1.0.0' })).toBeNull();
    });
  });

  it('resolveText resuelve string, idioma, idioma base y fallback', () => {
    expect(resolveText('hola')).toBe('hola');
    expect(resolveText({ es: 'hola', en: 'hi' }, 'en-GB')).toBe('hi');
    expect(resolveText({ es: 'hola' }, 'fr')).toBe('hola');
  });

  it('parseVersion ignora prefijo v y sufijos', () => {
    expect(parseVersion('v3.1.0-SNAPSHOT')).toEqual([3, 1, 0]);
    expect(parseVersion('abc')).toBeNull();
  });
});
