
import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from './services/pwa.service';
import { AppState } from './state/app.state';
import { ListingType } from './models';
import { HomeComponent } from './components/home/home.component';
import { EcommerceEditorComponent } from './components/ecommerce-editor/ecommerce-editor.component';
import { AutomotiveEditorComponent } from './components/automotive-editor/automotive-editor.component';
import { GenerationResultComponent } from './components/generation-result/generation-result.component';
import { PdfResultComponent } from './components/pdf-result/pdf-result.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    HomeComponent, 
    EcommerceEditorComponent, 
    AutomotiveEditorComponent,
    GenerationResultComponent,
    PdfResultComponent
  ],
})
export class AppComponent implements OnInit {
  pwaService = inject(PwaService);
  appState = inject(AppState);

  isTypeSelectionModalVisible = false;

  ngOnInit() {
    this.pwaService.init();
  }

  showTypeSelectionModal() {
    this.isTypeSelectionModalVisible = true;
  }

  selectListingType(type: ListingType) {
    this.appState.startNewListing(type);
    this.isTypeSelectionModalVisible = false;
  }

  cancelTypeSelection() {
    this.isTypeSelectionModalVisible = false;
  }

  installPwa() {
    this.pwaService.triggerInstallPrompt();
  }
}
