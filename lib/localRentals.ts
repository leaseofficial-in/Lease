import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile, Property, Rental } from '../types';

const LOCAL_RENTALS_KEY = 'flatvio.local.rentals';

type CreateLocalRentalInput = {
  propertyName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  propertyType: Property['property_type'];
  monthlyRent: string;
  securityDeposit: string;
  rentDueDay: string;
  startDate: string;
  endDate?: string;
  noticePeriodDays?: string;
  furnishedStatus?: string;
  lateFeePercent?: string;
  maintenanceCharges?: string;
};

const readLocalRentals = async (): Promise<Rental[]> => {
  const raw = await AsyncStorage.getItem(LOCAL_RENTALS_KEY);
  return raw ? (JSON.parse(raw) as Rental[]) : [];
};

const writeLocalRentals = async (rentals: Rental[]): Promise<void> => {
  await AsyncStorage.setItem(LOCAL_RENTALS_KEY, JSON.stringify(rentals));
};

export const listLocalRentals = async (landlordId: string): Promise<Rental[]> => {
  const rentals = await readLocalRentals();
  return rentals
    .filter((rental) => rental.landlord_id === landlordId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
};

export const listLocalRentalsByPropertyId = async (propertyId: string): Promise<Rental[]> => {
  const rentals = await readLocalRentals();
  return rentals
    .filter((rental) => rental.property_id === propertyId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
};

export const getLocalRentalByPropertyId = async (
  propertyId: string,
  landlordId: string,
): Promise<Rental | null> => {
  const rentals = await listLocalRentals(landlordId);
  return rentals.find((rental) => rental.property_id === propertyId) ?? null;
};

export const createLocalRental = async (
  values: CreateLocalRentalInput,
  landlord: Profile,
): Promise<Rental> => {
  const now = new Date().toISOString();
  const idBase = `${Date.now()}`;
  const propertyId = `local-property-${idBase}`;

  const property: Property = {
    id: propertyId,
    landlord_id: landlord.id,
    name: values.propertyName,
    address_line1: values.addressLine1,
    address_line2: values.addressLine2 || null,
    city: values.city,
    state: values.state,
    pincode: values.pincode,
    property_type: values.propertyType,
    created_at: now,
  };

  const rental: Rental = {
    id: `local-rental-${idBase}`,
    property_id: property.id,
    landlord_id: landlord.id,
    tenant_id: null,
    status: 'pending_tenant',
    monthly_rent: Number(values.monthlyRent),
    security_deposit: Number(values.securityDeposit || 0),
    rent_due_day: Number(values.rentDueDay),
    start_date: values.startDate,
    end_date: values.endDate ?? null,
    notice_period_days: Number(values.noticePeriodDays ?? 30),
    furnished_status: (values.furnishedStatus as Rental['furnished_status']) ?? 'unfurnished',
    late_fee_percent: Number(values.lateFeePercent ?? 5),
    maintenance_charges: Number(values.maintenanceCharges ?? 0),
    invite_token: `local-${idBase}`,
    invite_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    agreement_url: null,
    agreement_signed_at: null,
    created_at: now,
    updated_at: now,
    property,
    landlord,
  };

  const rentals = await readLocalRentals();
  await writeLocalRentals([rental, ...rentals]);
  return rental;
};

export const activateLocalRental = async (rentalId: string): Promise<void> => {
  const rentals = await readLocalRentals();
  await writeLocalRentals(
    rentals.map((rental) =>
      rental.id === rentalId
        ? { ...rental, status: 'active', updated_at: new Date().toISOString() }
        : rental,
    ),
  );
};

export const updateLocalRentalTerms = async (
  rentalId: string,
  terms: Pick<Rental, 'monthly_rent' | 'security_deposit' | 'rent_due_day' | 'start_date' | 'end_date' | 'notice_period_days' | 'furnished_status' | 'late_fee_percent' | 'maintenance_charges'>,
): Promise<void> => {
  const rentals = await readLocalRentals();
  await writeLocalRentals(
    rentals.map((rental) =>
      rental.id === rentalId
        ? { ...rental, ...terms, updated_at: new Date().toISOString() }
        : rental,
    ),
  );
};

export const deleteLocalProperty = async (propertyId: string): Promise<void> => {
  const rentals = await readLocalRentals();
  await writeLocalRentals(rentals.filter((rental) => rental.property_id !== propertyId));
};
