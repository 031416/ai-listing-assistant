
import { Injectable } from '@angular/core';
import { AutomotiveListing } from '../models';

// These are loaded from CDN, so we declare them to satisfy TypeScript.
declare const jspdf: any;
declare const autoTable: any;


@Injectable({ providedIn: 'root' })
export class PdfService {

  async generatePdf(listingData: AutomotiveListing, photoData: { [key: string]: string }): Promise<string> {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`${listingData.Year} ${listingData.Make} ${listingData.Model}`, 15, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`${listingData.AuctionDate}, Auction ID: ${listingData.AuctionID}`, 15, 27);
    
    const tableData = [
        ['VIN', listingData.VIN || ''], 
        ['Mileage', listingData.Mileage ? `${listingData.Mileage} mi` : ''],
        ['Exterior', listingData.ColorExterior || ''], 
        ['Interior', listingData.ColorInterior || ''],
        ['Engine', listingData.Engine || ''], 
        ['Transmission', listingData.Transmission || '']
    ];
    doc.autoTable({ startY: 35, head: [['Vehicle Information', '']], body: tableData, theme: 'grid' });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFont("helvetica", "bold");
    doc.text("Condition Notes", 15, finalY);
    doc.setFont("helvetica", "normal");
    const conditionText = doc.splitTextToSize(listingData.ConditionNotes || 'N/A', 180);
    doc.text(conditionText, 15, finalY + 5);
    finalY += conditionText.length * 5 + 10;
    
    doc.setFont("helvetica", "bold");
    doc.text("Special Features", 15, finalY);
    doc.setFont("helvetica", "normal");
    const featuresText = doc.splitTextToSize(listingData.SpecialFeatures || 'N/A', 180);
    doc.text(featuresText, 15, finalY + 5);

    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.text("Photo Gallery", 15, 20);
    const photoKeys = Object.keys(photoData);
    let x = 15, y = 30;
    for(let i=0; i < photoKeys.length; i++) {
        const key = photoKeys[i];
        if (photoData[key]) {
            try {
              // jsPDF needs the prefix `data:image/jpeg;base64,`
              const fullBase64 = `data:image/jpeg;base64,${photoData[key]}`;
              doc.addImage(fullBase64, 'JPEG', x, y, 60, 45);
              x += 65;
              if (x > 150) { x = 15; y += 50; }
            } catch(e) {
              console.error(`Failed to add image ${key} to PDF:`, e);
            }
        }
    }
    
    return doc.output('bloburl');
  }
}
