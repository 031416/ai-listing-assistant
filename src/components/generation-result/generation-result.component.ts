import { Component, ChangeDetectionStrategy, inject, signal, OnInit, Sanitizer, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AppState } from '../../state/app.state';
import { AiService } from '../../services/ai.service';
import { EcommerceListing, GeneratedData } from '../../models';

@Component({
  selector: 'app-generation-result',
  templateUrl: './generation-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class GenerationResultComponent implements OnInit {
  appState = inject(AppState);
  aiService = inject(AiService);
  sanitizer = inject(DomSanitizer);

  isLoading = signal(true);
  generatedData = signal<GeneratedData | null>(null);
  htmlPreview = signal<SafeHtml>('');
  exportOutput = signal('');
  currentPlatform = signal('ebay');

  private formatters = {
    ebay: (data: any) => `Action,Category,ConditionID,Title,PicURL,Quantity,Format,StartPrice,ReturnsAcceptedOption,ShippingService-1:Option,ShippingService-1:Cost,C:Brand,C:Model\n`+
      `"Add","${data.category || ''}","${data.condition || '3000'}","${data.aiTitle.replace(/"/g, '""')}","Placeholder for PicURL","${data.quantity || '1'}","FixedPrice","${data.price || '0.00'}","ReturnsAccepted","USPSPriority","15.00","${data.brand || ''}","${data.model || ''}"`,
    poshmark: (data: any) => JSON.stringify({ title: data.aiTitle, description: data.aiDescription, sku: `${data.brand}-${data.model}`, category: 'Electronics > Other', size: 'One Size', original_price: (parseFloat(data.price) * 1.25).toFixed(2), listing_price: parseFloat(data.price).toFixed(2), brand: data.brand, color: 'Other' }, null, 2),
    whatnot: (data: any) => JSON.stringify({ title: data.aiTitle.substring(0, 80), description: data.aiDescription, quantity: parseInt(data.quantity, 10) || 1, starting_bid: parseFloat(data.price).toFixed(2) }, null, 2),
    ksl: (data: any) => `Title: ${data.aiTitle}\n\nPrice: $${data.price}\n\nDescription:\n${data.aiDescription}`
  };

  async ngOnInit() {
    const listing = this.appState.currentListing() as EcommerceListing;
    if (listing) {
      try {
        const result = await this.aiService.generateEcommerceListing(listing);
        this.generatedData.set(result);
        this.htmlPreview.set(this.sanitizer.bypassSecurityTrustHtml(result.html));
        this.updateExportView();
      } catch (error) {
        console.error('AI Generation Error:', error);
        // Handle error display
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  updateExportView() {
    const platform = this.currentPlatform();
    const listingData = this.appState.currentListing();
    const aiData = this.generatedData();
    if (!listingData || !aiData) return;

    const combinedData = {
      ...listingData,
      aiTitle: aiData.title,
      aiDescription: aiData.html.replace(/<[^>]*>?/gm, '')
    };
    
    const formatter = this.formatters[platform as keyof typeof this.formatters];
    this.exportOutput.set(formatter ? formatter(combinedData) : 'Formatter not found.');
  }

  // Fix: Renamed the parameter from 'string' to 'platform' to match its usage.
  selectPlatform(platform: string) {
    this.currentPlatform.set(platform);
    this.updateExportView();
  }
  
  exportFile() {
    const platform = this.currentPlatform();
    const content = this.exportOutput();
    const fileExtensions: { [key: string]: string } = { ebay: 'csv', poshmark: 'json', whatnot: 'json', ksl: 'txt' };
    const mimeTypes: { [key: string]: string } = { ebay: 'text/csv', poshmark: 'application/json', whatnot: 'application/json', ksl: 'text/plain' };
    const blob = new Blob([content], { type: `${mimeTypes[platform]};charset=utf-8,` });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${(this.appState.currentListing()?.title || 'listing').replace(/\s/g, '_')}_${platform}.${fileExtensions[platform]}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  editInputs() {
    this.appState.navigateTo('ecommerce-editor');
  }
}