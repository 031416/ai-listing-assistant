import { Injectable } from '@angular/core';
import { AutomotiveListing, VehiclePhotoAnalysis } from '../models';

// Assume jsPDF and jsPDF-autoTable are loaded globally from a CDN
// For example, in index.html:
// <script src="https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js"></script>
// <script src="https://unpkg.com/jspdf-autotable@3.5.23/dist/jspdf.plugin.autotable.js"></script>

@Injectable({ providedIn: 'root' })
export class PdfService {

  async generatePdf(listing: AutomotiveListing, photoData: VehiclePhotoAnalysis | null): Promise<string> {
    // This relies on jspdf being available on the window object
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    const margin = 15;
    let yPos = margin;

    // Header
    doc.setFontSize(22);
    doc.text('Vehicle Condition Report', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
    yPos += 10;

    // Subheader
    doc.setFontSize(16);
    const title = `${listing.Year || ''} ${listing.Make || ''} ${listing.Model || ''} ${listing.Trim || ''}`.trim();
    doc.text(title, doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
    yPos += 8;

    const vin = `VIN: ${listing.VIN || 'N/A'}`;
    const mileage = `Mileage: ${listing.Mileage ? listing.Mileage.toLocaleString() : 'N/A'}`;
    const auctionId = `Auction ID: ${listing.AuctionID || 'N/A'}`;
    
    doc.setFontSize(12);
    doc.text(vin, margin, yPos);
    doc.text(mileage, doc.internal.pageSize.getWidth() - margin, yPos, { align: 'right' });
    yPos += 7;
    doc.text(auctionId, margin, yPos);
    yPos += 10;

    // Vehicle Details Table
    const vehicleDetails = [
      ['Exterior Color', listing.ColorExterior || ''],
      ['Interior Color', listing.ColorInterior || ''],
      ['Engine', listing.Engine || ''],
      ['Transmission', listing.Transmission || ''],
      ['Drivetrain', listing.Drivetrain || ''],
      ['Fuel Type', listing.FuelType || ''],
      ['Body Type', listing.BodyType || ''],
    ];

    (doc as any).autoTable({
      startY: yPos,
      head: [['Vehicle Details', '']],
      body: vehicleDetails,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Condition Notes
    this.addSection(doc, 'Condition Notes', listing.ConditionNotes || 'No notes provided.', yPos);
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Special Features
    this.addSection(doc, 'Special Features', listing.SpecialFeatures || 'No notes provided.', yPos);
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Damage Report
    if (photoData?.damages && photoData.damages.length > 0) {
        doc.addPage();
        yPos = margin;
        doc.setFontSize(16);
        doc.text('Cosmetic Damage Report', margin, yPos);
        yPos += 10;
        
        (doc as any).autoTable({
            startY: yPos,
            head: [['Type', 'Location', 'Severity (0-5)', 'Confidence']],
            body: photoData.damages.map(d => [d.type, d.location, d.severity, `${(d.confidence * 100).toFixed(0)}%`]),
            theme: 'grid',
            headStyles: { fillColor: [231, 76, 60] }
        });
    }

    // Generate Blob URL
    const pdfBlob = doc.output('blob');
    return URL.createObjectURL(pdfBlob);
  }

  private addSection(doc: any, title: string, content: string, yPos: number) {
    (doc as any).autoTable({
      startY: yPos,
      head: [[title]],
      body: [[content]],
      theme: 'plain',
      headStyles: { fontSize: 14, fontStyle: 'bold' },
      bodyStyles: { cellPadding: 2 }
    });
  }
}
