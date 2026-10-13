import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { WHATS_NEW_CONFIG } from './whats-new.config';
import { WhatsNewItem, WhatsNewText, resolveText } from './whats-new.models';
import { WhatsNewService } from './whats-new.service';

const LABELS = {
  es: { title: 'Novedades', previous: 'Anterior', next: 'Continuar', done: 'Entendido', skip: 'Omitir', more: 'Saber más', goTo: 'Ir a la novedad' },
  en: { title: "What's new", previous: 'Previous', next: 'Continue', done: 'Got it', skip: 'Skip', more: 'Learn more', goTo: 'Go to item' },
} as const;

/**
 * Carrusel modal de novedades. Se monta una vez en el shell autenticado:
 *   <app-whats-new />
 * Al iniciarse comprueba si hay versión pendiente y, si la hay, se abre solo.
 *
 * ADAPTAR en /whats-new-setup: botones, enlace e icono al kit de UI del proyecto, y
 * variables --wn-* a sus tokens (o abrirlo con el servicio de diálogos del proyecto).
 * Requiere Angular >= 19 (afterRenderEffect).
 */
@Component({
  selector: 'app-whats-new',
  templateUrl: './whats-new.component.html',
  styleUrl: './whats-new.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsNewComponent implements OnInit {
  private readonly service = inject(WhatsNewService);
  private readonly config = inject(WHATS_NEW_CONFIG);
  private readonly router = inject(Router);

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly release = this.service.pending;
  protected readonly index = signal(0);
  protected readonly lang = computed(() => this.config.lang());
  protected readonly labels = computed(() => (this.lang().startsWith('en') ? LABELS.en : LABELS.es));
  protected readonly items = computed(() => this.release()?.items ?? []);
  protected readonly item = computed<WhatsNewItem | undefined>(() => this.items()[this.index()]);
  protected readonly isFirst = computed(() => this.index() === 0);
  protected readonly isLast = computed(() => this.index() === this.items().length - 1);
  /** Si alguna novedad de la versión trae vídeo, el diálogo es ancho en todas sus tarjetas (sin saltos de tamaño). */
  protected readonly hasVideo = computed(() => this.items().some((item) => !!item.video));
  /** Con "reducir movimiento" se muestra el póster en vez del vídeo. */
  protected readonly reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (dialog && this.release() && !dialog.open) {
        this.index.set(0);
        dialog.showModal();
      }
    });
  }

  ngOnInit(): void {
    void this.service.check();
  }

  protected text(value: WhatsNewText | undefined): string {
    return resolveText(value, this.lang());
  }

  protected imageSrc(image: string): string {
    return /^https:\/\//.test(image) ? image : this.config.assetsBaseUrl + image;
  }

  /** Autoplay silenciado; si el navegador lo bloquea igualmente, se queda el póster. */
  protected playMuted(video: HTMLVideoElement): void {
    video.muted = true;
    video.play().catch(() => undefined);
  }

  protected go(index: number): void {
    if (index >= 0 && index < this.items().length) this.index.set(index);
  }

  protected next(): void {
    if (this.isLast()) this.close();
    else this.go(this.index() + 1);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') this.go(this.index() + 1);
    if (event.key === 'ArrowLeft') this.go(this.index() - 1);
  }

  /** Esc: se trata como "Omitir". */
  protected onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  protected followRoute(event: Event, route: string): void {
    event.preventDefault();
    this.close();
    void this.router.navigateByUrl(route);
  }

  protected close(): void {
    this.dialog()?.nativeElement.close();
    this.service.dismiss();
  }
}
