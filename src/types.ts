/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type InspectionType = 'harian' | 'mingguan' | 'bulanan';

export interface InspectionItem {
  id: string;
  label: string;
  status: 'ok' | 'issue' | 'n/a';
  comment?: string;
}

export interface InspectionReport {
  id: string;
  userId: string;
  vehicleId: string;
  type: InspectionType;
  date: string;
  items: InspectionItem[];
  odometer: number;
  signature: string; // Base64 image
  summary: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  brand: string;
  lastOdometer: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  date: string;
  read: boolean;
}
