import { Injectable, signal, WritableSignal } from '@angular/core';
import { View, Listing, ListingType, GeneratedData } from '../models';

@Injectable({ providedIn: 'root' })
export class AppState {
  view: WritableSignal<View> = signal('home');
  currentListing: WritableSignal<Listing | null> = signal(null);
  currentListingType: WritableSignal<ListingType> = signal('ecommerce');
  generatedData: WritableSignal<GeneratedData | null> = signal(null);
  automotivePhotoData: WritableSignal<{ [key: string]: string }> = signal({});

  navigateTo(view: View) {
    this.view.set(view);
  }

  startNewListing(type: ListingType) {
    this.currentListingType.set(type);
    const newListing: Listing = {
      id: `listing-${Date.now()}`,
      listingType: type,
    };
    this.currentListing.set(newListing);
    // Reset data for the new listing
    this.automotivePhotoData.set({}); 
    this.generatedData.set(null);
    this.navigateTo(type === 'ecommerce' ? 'ecommerce-editor' : 'automotive-editor');
  }

  editListing(listing: Listing) {
    this.currentListing.set(listing);
    this.currentListingType.set(listing.listingType);
    // Reset photo data before loading a draft, as they are not persisted.
    this.automotivePhotoData.set({});
    this.generatedData.set(null);
    this.navigateTo(listing.listingType === 'ecommerce' ? 'ecommerce-editor' : 'automotive-editor');
  }
}