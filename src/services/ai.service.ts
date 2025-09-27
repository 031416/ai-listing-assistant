import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';
import { AutomotiveListing, EcommerceListing, GeneratedData, VehiclePhotoAnalysis, VehicleData } from '../models';

@Injectable({ providedIn: 'root' })
export class AiService {

  private getAi() {
    // API key is expected to be in environment variables.
    return new GoogleGenAI({ apiKey: process.env.API_KEY! });
  }

  private async fileToGenerativePart(file: File) {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  }

  async analyzeVehiclePhotos(files: File[]): Promise<VehiclePhotoAnalysis> {
    const ai = this.getAi();
    const model = 'gemini-2.5-flash';

    const imageParts = await Promise.all(files.map(file => this.fileToGenerativePart(file)));
    
    const prompt = `You are an expert automotive analyst. Analyze the provided vehicle photos.
1.  **OCR:** Find and extract text. Prioritize the 17-character VIN. Also extract any visible auction/stock numbers and mileage. Interpret shortened mileage (e.g., '48.3' should become 48300).
2.  **Visual ID:** If OCR is incomplete, visually identify the Make, Model, Year, Trim, Body Type, Drivetrain, and colors.
3.  **Categorize Each Photo:** Assign each image to EXACTLY ONE of the following slots: PhotoFrontView, PhotoRearView, PhotoLeftSide, PhotoRightSide, PhotoInteriorFront, PhotoInteriorRear, PhotoEngineBay, PhotoOdometer, PhotoVINPlate, PhotoFeatureBonus.
4.  **Output:** Return a single, valid JSON object that strictly conforms to the provided schema. Use null for any fields or photo slots that cannot be determined.`;

    const photoIndexProp = { type: Type.INTEGER, nullable: true };

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }, ...imageParts] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vehicle_data: {
              type: Type.OBJECT,
              properties: {
                VIN: { type: Type.STRING, nullable: true },
                Year: { type: Type.INTEGER, nullable: true },
                Make: { type: Type.STRING, nullable: true },
                Model: { type: Type.STRING, nullable: true },
                Trim: { type: Type.STRING, nullable: true },
                ColorExterior: { type: Type.STRING, nullable: true },
                ColorInterior: { type: Type.STRING, nullable: true },
                Transmission: { type: Type.STRING, nullable: true },
                Engine: { type: Type.STRING, nullable: true },
                FuelType: { type: Type.STRING, nullable: true },
                BodyType: { type: Type.STRING, nullable: true },
                Drivetrain: { type: Type.STRING, nullable: true },
                Mileage: { type: Type.INTEGER, nullable: true },
                AuctionID: { type: Type.STRING, nullable: true },
              }
            },
            photo_categorization: {
              type: Type.OBJECT,
              description: "Map of slot name to image index (0-based) or null if not found.",
              properties: {
                  PhotoFrontView: photoIndexProp,
                  PhotoRearView: photoIndexProp,
                  PhotoLeftSide: photoIndexProp,
                  PhotoRightSide: photoIndexProp,
                  PhotoInteriorFront: photoIndexProp,
                  PhotoInteriorRear: photoIndexProp,
                  PhotoEngineBay: photoIndexProp,
                  PhotoOdometer: photoIndexProp,
                  PhotoVINPlate: photoIndexProp,
                  PhotoFeatureBonus: photoIndexProp,
              }
            },
            damages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, "enum": ["scratch", "dent", "crack", "wheel_rash", "rust", "paint_fade", "chip"] },
                  location: { type: Type.STRING },
                  severity: { type: Type.INTEGER, "minimum": 0, "maximum": 5 },
                  photoIndex: { type: Type.INTEGER },
                  confidence: { type: Type.NUMBER, "minimum": 0, "maximum": 1 }
                }
              }
            }
          },
          required: ["vehicle_data", "photo_categorization"]
        }
      }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  }

  async generateEcommerceListing(listing: EcommerceListing): Promise<GeneratedData> {
    const ai = this.getAi();
    const model = 'gemini-2.5-flash';

    const prompt = `
        Based on the following product information, generate an engaging ecommerce listing.
        Product Name: ${listing.productName || 'N/A'}
        Brand: ${listing.brand || 'N/A'}
        Model: ${listing.model || 'N/A'}
        Condition: ${listing.condition || 'N/A'}
        Description: ${listing.description || 'N/A'}

        Provide the output in JSON format with the following keys:
        - "title": A compelling, SEO-friendly title, max 80 characters.
        - "html": A well-structured HTML description. Use headings, paragraphs, and lists. Do not include <html> or <body> tags.
        - "category": A suggested product category string.
        - "price": A suggested price as a number, based on the info. If not possible, use the input price or 0.
        - "brand": The brand name.
        - "model": The model name.
        - "quantity": The quantity.
        - "condition": The condition.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            html: { type: Type.STRING },
            category: { type: Type.STRING },
            price: { type: Type.NUMBER },
            brand: { type: Type.STRING },
            model: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            condition: { type: Type.STRING },
          },
          required: ["title", "html"]
        }
      }
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);

    return {
      ...listing,
      ...result,
    };
  }
  
  async enhanceAutomotiveNotes(listing: AutomotiveListing): Promise<{ condition: string; features: string }> {
    const ai = this.getAi();
    const model = 'gemini-2.5-flash';
  
    const prompt = `
        You are an expert automotive copywriter.
        Based on the following vehicle data and seller notes, write an enhanced "Condition Notes" and "Special Features" section for a vehicle auction report.
        Be professional, concise, and objective.
  
        Vehicle: ${listing.Year || ''} ${listing.Make || ''} ${listing.Model || ''} ${listing.Trim || ''}
        VIN: ${listing.VIN || ''}
        Mileage: ${listing.Mileage || ''}
        Exterior Color: ${listing.ColorExterior || ''}
        Interior Color: ${listing.ColorInterior || ''}
        Engine: ${listing.Engine || ''}
        Transmission: ${listing.Transmission || ''}
        
        Seller's Condition Notes: ${listing.ConditionNotes || 'No notes provided.'}
        Seller's Special Features Notes: ${listing.SpecialFeatures || 'No notes provided.'}
  
        Return the result as a JSON object with two keys: "condition" and "features".
        - "condition": A detailed paragraph describing the vehicle's condition based on the seller's notes.
        - "features": A bulleted list (using hyphens) of key features and options.
    `;
  
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            condition: { type: Type.STRING },
            features: { type: Type.STRING },
          },
          required: ["condition", "features"]
        }
      }
    });
    
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  }
}
