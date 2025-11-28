export interface Device {
  id: string;
  serialNumber: string;
  isWorking: boolean;
  issueDescription?: string;
  takenToService?: boolean;
  timestamp: number;
}

export interface InspectionData {
  clientName: string;
  clientNip: string;
  clientEmail: string;
  devices: Device[];
  servicemanSignature: string | null; // Base64 data URL
  clientSignature: string | null; // Base64 data URL
  location?: string;
  deviceModel?: string;
  inspectionType?: 'annual' | 'biennial';
}

export enum AppScreen {
  START = 'START',
  SCAN = 'SCAN',
  FINALIZE = 'FINALIZE',
  DASHBOARD = 'DASHBOARD',
}

declare global {
  interface Window {
    onScan: (serial: string) => void;
  }
}