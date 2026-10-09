import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';

import { provideWhatsNew } from './whats-new.config';
import { WhatsNewComponent } from './whats-new.component';
import { WhatsNewRelease } from './whats-new.models';
import { WhatsNewService } from './whats-new.service';

const RELEASE: WhatsNewRelease = {
  version: '2.0.0',
  date: '2026-10-20',
  items: [
    { id: 'uno', title: 'Primera novedad', body: 'Texto uno.', link: { label: 'Ir', route: '/destino' } },
    { id: 'dos', title: 'Segunda novedad', body: 'Texto dos.' },
  ],
};

describe('WhatsNewComponent', () => {
  let fixture: ComponentFixture<WhatsNewComponent>;
  let pending: ReturnType<typeof signal<WhatsNewRelease | null>>;
  let service: jasmine.SpyObj<Pick<WhatsNewService, 'check' | 'dismiss'>> & { pending: typeof pending };

  const el = () => fixture.nativeElement as HTMLElement;
  const title = () => el().querySelector('.wn__title')?.textContent?.trim();
  const primary = () => el().querySelector<HTMLButtonElement>('.wn__btn--primary')!;

  beforeEach(async () => {
    pending = signal<WhatsNewRelease | null>(RELEASE);
    service = Object.assign(jasmine.createSpyObj('WhatsNewService', ['check', 'dismiss']), { pending });
    service.check.and.resolveTo();
    service.dismiss.and.callFake(() => pending.set(null));

    await TestBed.configureTestingModule({
      imports: [WhatsNewComponent],
      providers: [provideRouter([]), provideWhatsNew(() => ({ currentVersion: '2.0.0' })), { provide: WhatsNewService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsNewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('comprueba al iniciar y abre el diálogo con la primera novedad', () => {
    expect(service.check).toHaveBeenCalled();
    expect(el().querySelector('dialog')?.open).toBeTrue();
    expect(el().querySelector('dialog')?.classList).not.toContain('wn--wide');
    expect(title()).toBe('Primera novedad');
  });

  it('Continuar avanza y en la última pasa a Entendido, que marca como vista', () => {
    primary().click();
    fixture.detectChanges();
    expect(title()).toBe('Segunda novedad');
    expect(primary().textContent?.trim()).toBe('Entendido');

    primary().click();
    fixture.detectChanges();
    expect(service.dismiss).toHaveBeenCalled();
    expect(el().querySelector('dialog')).toBeNull();
  });

  it('el enlace interno navega y marca como vista', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    el().querySelector<HTMLAnchorElement>('.wn__more')!.click();
    expect(service.dismiss).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/destino');
  });

  it('con vídeo pinta <video> en bucle con la imagen como póster', () => {
    pending.set({ ...RELEASE, items: [{ id: 'video', title: 'Con vídeo', body: 'Texto.', video: 'wn/v.mp4', image: 'wn/v.webp' }] });
    fixture.detectChanges();
    const video = el().querySelector<HTMLVideoElement>('video');
    expect(video?.getAttribute('src')).toBe('assets/wn/v.mp4');
    expect(video?.getAttribute('poster')).toBe('assets/wn/v.webp');
    expect(video?.loop).toBeTrue();
    expect(el().querySelector('dialog')?.classList).toContain('wn--wide');
  });

  it('no pinta nada si no hay versión pendiente', () => {
    pending.set(null);
    fixture.detectChanges();
    expect(el().querySelector('dialog')).toBeNull();
  });
});
