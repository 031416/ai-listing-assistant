import { Component, ChangeDetectionStrategy, inject, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DbService } from '../../services/db.service';
import { AppState } from '../../state/app.state';
import { Listing } from '../../models';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class HomeComponent implements OnInit {
  @Output() newListing = new EventEmitter<void>();

  dbService = inject(DbService);
  appState = inject(AppState);

  listings = signal<Listing[]>([]);

  async ngOnInit() {
    this.loadListings();
  }

  async loadListings() {
    const listings = await this.dbService.getAllListings();
    this.listings.set(listings);
  }

  createNewListing() {
    this.newListing.emit();
  }

  async editListing(id: string) {
    const listing = await this.dbService.getListing(id);
    if (listing) {
      this.appState.editListing(listing);
    }
  }

  async deleteListing(id: string) {
    if (confirm('Are you sure you want to delete this draft?')) {
      await this.dbService.deleteListing(id);
      this.loadListings();
    }
  }
}