import { Injectable, signal, WritableSignal } from '@angular/core';
import { Listing, ListingType, View, VehiclePhotoAnalysis } from '../models';

@Injectable({ providedIn: 'root' })
export class AppState {
  currentView: WritableSignal<View> = signal('home');
  currentListing: WritableSignal<Listing | null> = signal(null);
  automotivePhotoData: WritableSignal<VehiclePhotoAnalysis | null> = signal(null);

  navigateTo(view: View) {
    this.currentView.set(view);
  }

  startNewListing(type: ListingType) {
    const newListing: Listing = {
      id: crypto.randomUUID(),
      listingType: type,
      title: 'New Draft'
    };
    this.currentListing.set(newListing);
    this.automotivePhotoData.set(null); // Reset photo data
    if (type === 'ecommerce') {
      this.navigateTo('ecommerce-editor');
    } else {
      this.navigateTo('automotive-editor');
    }
  }

  editListing(listing: Listing) {
    this.currentListing.set(listing);
    this.automotivePhotoData.set(null); // Reset photo data for now, might need better logic
    if (listing.listingType === 'ecommerce') {
      this.navigateTo('ecommerce-editor');
    } else {
      this.navigateTo('automotive-editor');
    }
  }
}
