export interface UnitVocab {
  unit: string;          // singular: Flat, Room, Unit
  units: string;         // plural: Flats, Rooms, Units
  numberLabel: string;   // field label: "Flat No."
  numberPlaceholder: string;
  typeLabel: string;     // field label: "Configuration"
  typePlaceholder: string;
  chips: readonly string[];
  rentLabel: string;     // "Rent / flat"
}

const VOCAB: Record<string, UnitVocab> = {
  pg: {
    unit: 'Room', units: 'Rooms',
    numberLabel: 'Room No.', numberPlaceholder: '101',
    typeLabel: 'Room Type', typePlaceholder: 'e.g. Double Sharing',
    chips: ['Single', 'Double', 'Triple', 'Dorm'],
    rentLabel: 'Rent / bed',
  },
  apartment: {
    unit: 'Flat', units: 'Flats',
    numberLabel: 'Flat No.', numberPlaceholder: '201',
    typeLabel: 'Configuration', typePlaceholder: '1BHK / 2BHK',
    chips: ['1BHK', '2BHK', '3BHK', 'Studio', '4BHK+'],
    rentLabel: 'Rent / flat',
  },
  house: {
    unit: 'Unit', units: 'Units',
    numberLabel: 'Unit No.', numberPlaceholder: 'A',
    typeLabel: 'Type', typePlaceholder: 'Ground Floor / 1st Floor',
    chips: ['Ground Floor', '1st Floor', '2nd Floor', 'Basement'],
    rentLabel: 'Rent / unit',
  },
  commercial: {
    unit: 'Unit', units: 'Units',
    numberLabel: 'Unit / Shop No.', numberPlaceholder: 'Shop 3',
    typeLabel: 'Use', typePlaceholder: 'Retail / Office / Restaurant',
    chips: ['Retail', 'Office', 'Restaurant', 'Warehouse', 'Storage'],
    rentLabel: 'Rent / unit',
  },
};

export function getUnitVocab(propertyType: string | null | undefined): UnitVocab {
  return VOCAB[propertyType ?? ''] ?? VOCAB.pg;
}
