import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { WHATS_NEW_CONFIG } from './whats-new.config';
import { WhatsNewFile, WhatsNewRelease, pickPendingRelease } from './whats-new.models';

/**
 * Decide si hay novedades pendientes para el usuario actual y guarda cuándo las ha visto.
 * Persistencia v1: localStorage (por navegador). Para pasar a un endpoint por usuario
 * basta con cambiar readSeen/writeSeen.
 */
@Injectable({ providedIn: 'root' })
export class WhatsNewService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(WHATS_NEW_CONFIG);

  private readonly pendingRelease = signal<WhatsNewRelease | null>(null);
  /** Versión a enseñar ahora mismo, o null. */
  readonly pending = this.pendingRelease.asReadonly();

  private file: Promise<WhatsNewFile | null> | null = null;

  /** Comprueba si toca enseñar novedades. Idempotente: el JSON se pide una sola vez. */
  async check(): Promise<void> {
    const release = pickPendingRelease(await this.load(), {
      currentVersion: this.config.currentVersion,
      lastSeen: this.readSeen(),
      canSee: this.config.canSee,
      maxItems: this.config.maxItems,
    });
    this.pendingRelease.set(release);
  }

  /** Reapertura manual (menú "Novedades"): enseña la última versión aunque ya se viera. */
  async showLatest(): Promise<void> {
    const release = pickPendingRelease(await this.load(), {
      currentVersion: this.config.currentVersion,
      canSee: this.config.canSee,
      maxItems: this.config.maxItems,
    });
    this.pendingRelease.set(release);
  }

  /** Cierra y marca la versión como vista (al terminar, omitir o navegar; nunca al abrir). */
  dismiss(): void {
    const release = this.pendingRelease();
    if (!release) return;
    this.writeSeen(release.version);
    this.pendingRelease.set(null);
  }

  private load(): Promise<WhatsNewFile | null> {
    this.file ??= firstValueFrom(
      // ?v= evita servir un JSON cacheado de la versión anterior.
      this.http.get<WhatsNewFile>(this.config.url, { params: { v: this.config.currentVersion } }),
    ).catch(() => null); // Las novedades nunca deben romper la app.
    return this.file;
  }

  private readSeen(): string | null {
    try {
      return localStorage.getItem(this.config.storageKey());
    } catch {
      return null;
    }
  }

  private writeSeen(version: string): void {
    try {
      localStorage.setItem(this.config.storageKey(), version);
    } catch {
      // Sin storage (modo privado, bloqueado): se volverá a mostrar, mal menor.
    }
  }
}
