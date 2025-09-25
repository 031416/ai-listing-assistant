import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppState } from '../../state/app.state';
import { DbService } from '../../services/db.service';
import { AiService } from '../../services/ai.service';
import { EcommerceListing } from '../../models';

@Component({
  selector: 'app-ecommerce-editor',
  templateUrl: './ecommerce-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule]
})
export class EcommerceEditorComponent implements OnInit {
  appState = inject(AppState);
  dbService = inject(DbService);
  aiService = inject(AiService);

  listing = signal<EcommerceListing>({} as EcommerceListing);
  isLoading = signal(false);

  ngOnInit() {
    // Fix: Added a type check to ensure we only process ecommerce listings.
    const current = this.appState.currentListing();
    if (current && current.listingType === 'ecommerce') {
      this.listing.set(current as EcommerceListing);
    }
  }

  updateField(field: keyof EcommerceListing, value: any) {
    this.listing.update(l => ({ ...l, [field]: value }));
  }

  async saveDraft() {
    this.isLoading.set(true);
    const currentListing = this.listing();
    this.appState.currentListing.set(currentListing);
    await this.dbService.saveListing(currentListing);
    this.isLoading.set(false);
    alert('Draft saved!');
  }

  async generateListing() {
    this.isLoading.set(true);
    const currentListing = this.listing();
    this.appState.currentListing.set(currentListing);
    await this.dbService.saveListing(currentListing);
    this.appState.navigateTo('generation-result');
  }

  backToHome() {
    this.appState.navigateTo('home');
  }
}
