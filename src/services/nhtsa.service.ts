// Fix: Refactored NhtsaService to use Angular's HttpClient, RxJS, and best practices.
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AutomotiveListing } from '../models';

// --- Interfaces (Unchanged) ---
export interface NhtsaVariable {
    Value: string | null;
    ValueId: string | null;
    Variable: string;
    VariableId: number;
}
export interface NhtsaVinDecodeResult {
    Results: NhtsaVariable[];
    Message: string;
    SearchCriteria: string;
}

// --- Constants for Type Safety and Maintainability ---
const NHTSA_API_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/';
const NOT_APPLICABLE_STRING = 'not applicable';

const NHTSA_TO_LISTING_MAP: { [key: string]: keyof AutomotiveListing } = {
    'Make': 'Make',
    'Model': 'Model',
    'Trim': 'Trim',
    'Transmission Style': 'Transmission',
    'Fuel Type - Primary': 'FuelType',
    'Body Class': 'BodyType',
    'Drive Type': 'Drivetrain',
};

@Injectable({
    providedIn: 'root'
})
export class NhtsaService {
    constructor(private http: HttpClient) { }

    /**
     * Decodes a VIN using the NHTSA API.
     * @param vin The 17-character Vehicle Identification Number.
     * @returns An Observable emitting a Partial<AutomotiveListing> or an empty object on failure.
     */
    decodeVin(vin: string): Observable<Partial<AutomotiveListing>> {
        if (!vin || vin.length !== 17) {
            return of({});
        }
        const url = `${NHTSA_API_BASE_URL}${vin}?format=json`;
        return this.http.get<NhtsaVinDecodeResult>(url).pipe(
            map(response => this._mapResponseToListing(response)),
            catchError(error => {
                console.error('Error decoding VIN from NHTSA API:', error);
                return of({});
            })
        );
    }

    /**
     * Maps the raw NHTSA API response to our application's model.
     * @param data The NhtsaVinDecodeResult from the API.
     * @returns A Partial<AutomotiveListing> object.
     */
    private _mapResponseToListing(data: NhtsaVinDecodeResult): Partial<AutomotiveListing> {
        if (!data?.Results) {
            return {};
        }

        const resultsMap = new Map<string, string>();
        data.Results.forEach(item => {
            if (item.Value && item.Value.toLowerCase() !== NOT_APPLICABLE_STRING) {
                resultsMap.set(item.Variable, item.Value);
            }
        });

        const listing: Partial<AutomotiveListing> = {};

        for (const [nhtsaKey, listingKey] of Object.entries(NHTSA_TO_LISTING_MAP)) {
            if (resultsMap.has(nhtsaKey)) {
                (listing as any)[listingKey] = resultsMap.get(nhtsaKey);
            }
        }

        // --- Handle Special Cases ---
        const modelYear = resultsMap.get('Model Year');
        if (modelYear) {
            const year = parseInt(modelYear, 10);
            if (!isNaN(year)) {
                listing.Year = year;
            }
        }

        const engineConfig = resultsMap.get('Engine Configuration');
        const displacementL = resultsMap.get('Displacement (L)');
        if (engineConfig && displacementL) {
            listing.Engine = `${engineConfig} ${displacementL}L`;
        } else if (engineConfig) {
            listing.Engine = engineConfig;
        }

        return listing;
    }
}
