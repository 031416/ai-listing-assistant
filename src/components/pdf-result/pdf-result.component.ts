import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AppState } from '../../state/app.state';
import { AiService } from '../../services/ai.service';
import { PdfService } from '../../services/pdf.service';
import { AutomotiveListing } from '../../models';

@Component({
  selector: 'app-pdf-result',
  templateUrl: './pdf-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class PdfResultComponent implements OnInit {
  appState = inject(AppState);
  aiService = inject(AiService);
  pdfService = inject(PdfService);
  sanitizer = inject(DomSanitizer);

  isLoading = signal(true);
  pdfUrl = signal<SafeResourceUrl | null>(null);
  private rawPdfUrl: string | null = null;

  async ngOnInit() {
    const listing = this.appState.currentListing() as AutomotiveListing;
    const photoData = this.appState.automotivePhotoData();

    if (listing) {
      try {
        const enhancedNotes = await this.aiService.enhanceAutomotiveNotes(listing);
        const updatedListing = { ...listing, ConditionNotes: enhancedNotes.condition, SpecialFeatures: enhancedNotes.features };
        
        const blobUrl = await this.pdfService.generatePdf(updatedListing, photoData);
        this.rawPdfUrl = blobUrl;
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl));
        
      } catch (error) {
        console.error('PDF Generation Error:', error);
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  downloadPdf() {
    if (this.rawPdfUrl) {
      const a = document.createElement('a');
      a.href = this.rawPdfUrl;
      // Fix: Cast currentListing to AutomotiveListing to safely access AuctionID.
      const listing = this.appState.currentListing() as AutomotiveListing;
      a.download = `${listing?.AuctionID || 'vehicle'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  editInputs() {
    this.appState.navigateTo('automotive-editor');
  }
}