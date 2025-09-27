import { Component, ChangeDetectionStrategy, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppState } from '../../state/app.state';
import { DbService } from '../../services/db.service';
import { AiService } from '../../services/ai.service';
import { NhtsaService } from '../../services/nhtsa.service';
import { AutomotiveListing, VehiclePhotoAnalysis } from '../../models';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-automotive-editor',
  template: `
    <div class="p-4 md:p-6 bg-gray-50 min-h-screen">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <button (click)="backToHome()" class="text-blue-600 hover:underline">&larr; Back to Home</button>
        <h1 class="text-2xl font-bold text-gray-800">Automotive Listing Editor</h1>
        <div class="w-24"></div>
      </div>

      <!-- Main Content -->
      <div class="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        
        <!-- Photo Analysis -->
        <div class="mb-6 border-b pb-6">
          <h2 class="text-xl font-semibold mb-3 text-gray-700">1. Analyze Vehicle Photos</h2>
          <p class="text-sm text-gray-500 mb-4">Upload photos to automatically extract VIN, mileage, and other details.</p>
          <input type="file" multiple (change)="onFileSelected($event)" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
          
          @if (isAnalyzingPhotos()) {
            <div class="mt-4 flex items-center">
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p class="ml-3 text-gray-600">Analyzing photos, please wait...</p>
            </div>
          }

          @if (photoAnalysisResult(); as result) {
            <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 class="font-semibold text-green-800">Analysis Complete!</h3>
              <p class="text-sm text-green-700">We've updated the form with the data found in the photos.</p>
            </div>
          }
        </div>

        <!-- Vehicle Details Form -->
        <div class="mb-6">
          <h2 class="text-xl font-semibold mb-4 text-gray-700">2. Vehicle Details</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- VIN -->
            <div>
              <label for="vin" class="block text-sm font-medium text-gray-700">VIN</label>
              <div class="relative">
                <input id="vin" type="text" [ngModel]="listing().VIN" (ngModelChange)="updateField('VIN', $event)" maxlength="17" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder="17-character VIN">
                @if (isDecodingVin()) {
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                }
              </div>
            </div>
            
            <!-- Other fields -->
            @for (field of formFields; track field.id) {
              <div>
                <label [for]="field.id" class="block text-sm font-medium text-gray-700">{{ field.label }}</label>
                <input [id]="field.id" [type]="field.type" [ngModel]="listing()[field.id]" (ngModelChange)="updateField(field.id, $event)" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
              </div>
            }
          </div>
        </div>

        <!-- Notes -->
        <div class="mb-6">
          <h2 class="text-xl font-semibold mb-4 text-gray-700">3. Notes</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label for="conditionNotes" class="block text-sm font-medium text-gray-700">Condition Notes</label>
                  <textarea id="conditionNotes" [ngModel]="listing().ConditionNotes" (ngModelChange)="updateField('ConditionNotes', $event)" rows="4" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"></textarea>
              </div>
              <div>
                  <label for="specialFeatures" class="block text-sm font-medium text-gray-700">Special Features</label>
                  <textarea id="specialFeatures" [ngModel]="listing().SpecialFeatures" (ngModelChange)="updateField('SpecialFeatures', $event)" rows="4" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"></textarea>
              </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-between items-center pt-6 border-t">
          <button (click)="backToHome()" class="text-gray-600 hover:text-gray-900">Cancel</button>
          <div>
            <button (click)="saveDraft()" [disabled]="isLoading()" class="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 mr-2">
              {{ isLoading() ? 'Saving...' : 'Save Draft' }}
            </button>
            <button (click)="generateReport()" [disabled]="isLoading()" class="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
              {{ isLoading() ? 'Generating...' : 'Generate PDF Report' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  `,
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
  isAnalyzingPhotos = signal(false);
  isDecodingVin = signal(false);
  photoAnalysisResult = signal<VehiclePhotoAnalysis | null>(null);

  private vin$ = new Subject<string>();

  formFields: { id: keyof AutomotiveListing, label: string, type: 'text' | 'number' }[] = [
    { id: 'Year', label: 'Year', type: 'number' },
    { id: 'Make', label: 'Make', type: 'text' },
    { id: 'Model', label: 'Model', type: 'text' },
    { id: 'Trim', label: 'Trim', type: 'text' },
    { id: 'Mileage', label: 'Mileage', type: 'number' },
    { id: 'ColorExterior', label: 'Exterior Color', type: 'text' },
    { id: 'ColorInterior', label: 'Interior Color', type: 'text' },
    { id: 'Transmission', label: 'Transmission', type: 'text' },
    { id: 'Engine', label: 'Engine', type: 'text' },
    { id: 'Drivetrain', label: 'Drivetrain', type: 'text' },
    { id: 'FuelType', label: 'Fuel Type', type: 'text' },
    { id: 'BodyType', label: 'Body Type', type: 'text' },
    { id: 'AuctionID', label: 'Auction ID', type: 'text' },
  ];

  constructor() {
    effect(() => {
      const vin = this.listing().VIN;
      if (vin) {
        this.vin$.next(vin);
      }
    });
  }

  ngOnInit() {
    const current = this.appState.currentListing();
    if (current && current.listingType === 'automotive') {
      this.listing.set(current as AutomotiveListing);
    }

    this.vin$.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      filter(vin => !!vin && vin.length === 17),
      switchMap(vin => {
        this.isDecodingVin.set(true);
        return this.nhtsaService.decodeVin(vin);
      })
    ).subscribe(decodedData => {
      this.listing.update(l => ({ ...l, ...decodedData }));
      this.isDecodingVin.set(false);
    });
  }
  
  updateField(field: keyof AutomotiveListing, value: any) {
    this.listing.update(l => ({ ...l, [field]: value }));
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.isAnalyzingPhotos.set(true);
    this.photoAnalysisResult.set(null);
    try {
      const files = Array.from(input.files);
      const analysis = await this.aiService.analyzeVehiclePhotos(files);
      this.photoAnalysisResult.set(analysis);
      this.appState.automotivePhotoData.set(analysis);

      // Merge AI data into listing, but don't overwrite user-entered data
      const vehicleData = analysis.vehicle_data;
      this.listing.update(currentListing => {
        const updated = { ...currentListing };
        for (const key in vehicleData) {
          if (Object.prototype.hasOwnProperty.call(vehicleData, key)) {
            const typedKey = key as keyof typeof vehicleData;
            if (updated[typedKey] === undefined || updated[typedKey] === null || updated[typedKey] === '') {
                (updated as any)[typedKey] = vehicleData[typedKey];
            }
          }
        }
        return updated;
      });
      
    } catch (error) {
      console.error('Error analyzing photos:', error);
      alert('Failed to analyze photos. Please check the console for details.');
    } finally {
      this.isAnalyzingPhotos.set(false);
    }
  }

  async saveDraft() {
    this.isLoading.set(true);
    const currentListing = this.listing();
    this.appState.currentListing.set(currentListing);
    await this.dbService.saveListing(currentListing);
    this.isLoading.set(false);
    alert('Draft saved!');
  }

  async generateReport() {
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
