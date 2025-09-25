import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppState } from '../../state/app.state';
import { DbService } from '../../services/db.service';
import { AiService } from '../../services/ai.service';
import { NhtsaService } from '../../services/nhtsa.service';
import { AutomotiveListing, VehiclePhotoAnalysis } from '../../models';

@Component({
  selector: 'app-automotive-editor',
  templateUrl: './automotive-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule]
})
export class AutomotiveEditorComponent implements OnInit {
  appState = inject(AppState);
  dbService = inject(DbService);
  aiService = inject(AiService);
  nhtsaService = inject(NhtsaService);

  listing = signal<AutomotiveListing>({} as AutomotiveListing);
  isLoading = signal(false);
  isDecodingVin = signal(false);
  isAnalyzingPhotos = signal(false);

  selectedFiles: File[] = [];

  photoSlots = [
    'PhotoFrontView', 'PhotoRearView', 'PhotoLeftSide', 'PhotoRightSide', 'PhotoInteriorFront',
    'PhotoInteriorRear', 'PhotoEngineBay', 'PhotoOdometer', 'PhotoVINPlate', 'PhotoFeatureBonus'
  ];
  
  photoPreviews = computed(() => this.appState.automotivePhotoData());

  ngOnInit() {
    const current = this.appState.currentListing();
    if (current && current.listingType === 'automotive') {
      this.listing.set(current as AutomotiveListing);
    }
  }

  updateField(field: keyof AutomotiveListing, value: any) {
    this.listing.update(l => ({ ...l, [field]: value }));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  async analyzePhotos() {
    if (this.selectedFiles.length === 0) {
      alert('Please select photos to analyze.');
      return;
    }
    this.isAnalyzingPhotos.set(true);
    try {
      const analysis: VehiclePhotoAnalysis = await this.aiService.analyzeVehiclePhotos(this.selectedFiles);

      if (analysis && analysis.vehicle_data) {
        // Smart merge: only update fields that have a value from the API
        const updatedData: Partial<AutomotiveListing> = {};
        for (const key of Object.keys(analysis.vehicle_data) as Array<keyof typeof analysis.vehicle_data>) {
            if (analysis.vehicle_data[key] !== null && analysis.vehicle_data[key] !== undefined && analysis.vehicle_data[key] !== '') {
                (updatedData as any)[key] = analysis.vehicle_data[key];
            }
        }
        this.listing.update(l => ({ ...l, ...updatedData }));
      }


      if (analysis && analysis.photo_categorization) {
        const photoData: { [key: string]: string } = {};
        const fileToBase64 = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
          });
        };
        
        const photoCategorization = analysis.photo_categorization;
        const categorizedKeys = Object.keys(photoCategorization) as Array<keyof typeof photoCategorization>;
        
        for (const key of categorizedKeys) {
          const index = photoCategorization[key];
          if (index != null && index >= 0 && index < this.selectedFiles.length) {
            photoData[key] = await fileToBase64(this.selectedFiles[index]);
          }
        }
        this.appState.automotivePhotoData.set(photoData);
      }


    } catch (error) {
      console.error('Error analyzing photos:', error);
      alert('An error occurred during photo analysis. Please check the console.');
    } finally {
      this.isAnalyzingPhotos.set(false);
    }
  }

  decodeVin() {
    const vin = this.listing().VIN;
    if (!vin || vin.length !== 17) {
      alert('Please enter a valid 17-character VIN.');
      return;
    }
    this.isDecodingVin.set(true);
    
    this.nhtsaService.decodeVin(vin).subscribe({
      next: (decodedData) => {
        // Smart merge: only update fields that have a value
        const updatedData: Partial<AutomotiveListing> = {};
        for (const key of Object.keys(decodedData) as Array<keyof typeof decodedData>) {
            if (decodedData[key] !== null && decodedData[key] !== undefined && decodedData[key] !== '') {
                (updatedData as any)[key] = decodedData[key];
            }
        }
        this.listing.update(l => ({ ...l, ...updatedData }));
        this.isDecodingVin.set(false);
      },
      error: (error) => {
        console.error('Error decoding VIN:', error);
        alert('An error occurred while decoding the VIN.');
        this.isDecodingVin.set(false);
      }
    });
  }

  async saveDraft() {
    this.isLoading.set(true);
    const currentListing = this.listing();
    this.appState.currentListing.set(currentListing);
    await this.dbService.saveListing(currentListing);
    this.isLoading.set(false);
    alert('Draft saved!');
  }

  async generatePdf() {
    this.isLoading.set(true);
    const currentListing = this.listing();
    this.appState.currentListing.set(currentListing);
    await this.dbService.saveListing(currentListing);
    this.appState.navigateTo('pdf-result');
  }

  backToHome() {
    this.appState.navigateTo('home');
  }
}