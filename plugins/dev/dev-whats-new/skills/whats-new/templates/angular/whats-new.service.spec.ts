import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideWhatsNew } from './whats-new.config';
import { WhatsNewFile } from './whats-new.models';
import { WhatsNewService } from './whats-new.service';

const KEY = 'test.whatsNew';
const FILE: WhatsNewFile = {
  schemaVersion: 1,
  releases: [
    {
      version: '2.0.0',
      date: '2026-10-20',
      items: [
        { id: 'publica', title: 'Novedad pública', body: 'La ve todo el mundo.' },
        { id: 'admin', title: 'Novedad de admin', body: 'Solo con permiso.', permit: 'ADMIN' },
      ],
    },
  ],
};

describe('WhatsNewService', () => {
  let permits: string[];
  let service: WhatsNewService;
  let http: HttpTestingController;

  const setup = (currentVersion = '2.0.0') => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideWhatsNew(() => ({ currentVersion, storageKey: () => KEY, canSee: (p) => permits.includes(p) })),
      ],
    });
    service = TestBed.inject(WhatsNewService);
    http = TestBed.inject(HttpTestingController);
  };

  const flushFile = (body: WhatsNewFile | null = FILE) => {
    const req = http.expectOne((r) => r.url === 'assets/whats-new/whats-new.json');
    if (body) req.flush(body);
    else req.flush('no', { status: 404, statusText: 'Not Found' });
  };

  beforeEach(() => {
    permits = [];
    localStorage.removeItem(KEY);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(KEY);
  });

  it('muestra la versión a un usuario que no la ha visto, filtrando por permiso', async () => {
    setup();
    const done = service.check();
    flushFile();
    await done;
    expect(service.pending()?.items.map((i) => i.id)).toEqual(['publica']);
  });

  it('incluye los items con permiso cuando el usuario lo tiene', async () => {
    permits = ['ADMIN'];
    setup();
    const done = service.check();
    flushFile();
    await done;
    expect(service.pending()?.items.length).toBe(2);
  });

  it('no muestra nada si ya la vio', async () => {
    localStorage.setItem(KEY, '2.0.0');
    setup();
    const done = service.check();
    flushFile();
    await done;
    expect(service.pending()).toBeNull();
  });

  it('dismiss guarda la versión y cierra', async () => {
    setup();
    const done = service.check();
    flushFile();
    await done;
    service.dismiss();
    expect(service.pending()).toBeNull();
    expect(localStorage.getItem(KEY)).toBe('2.0.0');
  });

  it('showLatest reabre aunque ya se viera, sin volver a pedir el JSON', async () => {
    localStorage.setItem(KEY, '2.0.0');
    setup();
    const first = service.check();
    flushFile();
    await first;
    await service.showLatest();
    expect(service.pending()?.version).toBe('2.0.0');
  });

  it('un error al cargar el JSON no rompe nada', async () => {
    setup();
    const done = service.check();
    flushFile(null);
    await done;
    expect(service.pending()).toBeNull();
  });
});
