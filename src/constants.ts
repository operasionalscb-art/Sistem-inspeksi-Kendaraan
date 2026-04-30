/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InspectionType } from './types';

export const INSPECTION_TEMPLATES: Record<InspectionType, string[]> = {
  harian: [
    'Lampu Depan & Belakang',
    'Lampu Sein & Hazard',
    'Tekanan Ban (Visual)',
    'Rem Tangan & Kaki',
    'Spion & Kaca',
    'Air Radiator & Oli Mesin',
  ],
  mingguan: [
    'Kebersihan Interior',
    'Kebersihan Eksterior',
    'Air Wiper & Kondisi Wiper',
    'Tekanan Ban (Meteran)',
    'Kondisi Aki (Terminal)',
  ],
  bulanan: [
    'Sistem AC',
    'Kampas Rem (Visual)',
    'Suspensi & Bunyi Tidak Normal',
    'Filter Udara',
    'Jadwal Ganti Oli (History)',
  ],
};

export const VEHICLES = [
  { id: 'v1', plateNumber: 'B 1234 ABC', model: 'Avanza', brand: 'Toyota', lastOdometer: 45200 },
  { id: 'v2', plateNumber: 'B 5678 XYZ', model: 'Innova', brand: 'Toyota', lastOdometer: 120500 },
];
