import { create } from 'zustand';
import { Rental } from '../types';

interface RentalState {
  activeRental: Rental | null;
  landlordRentals: Rental[];
  setActiveRental: (rental: Rental | null) => void;
  setLandlordRentals: (rentals: Rental[]) => void;
  updateRentalInList: (updated: Rental) => void;
}

export const useRentalStore = create<RentalState>((set) => ({
  activeRental: null,
  landlordRentals: [],

  setActiveRental: (activeRental) => set({ activeRental }),

  setLandlordRentals: (landlordRentals) => set({ landlordRentals }),

  updateRentalInList: (updated) =>
    set((state) => ({
      landlordRentals: state.landlordRentals.map((r) =>
        r.id === updated.id ? updated : r,
      ),
      activeRental: state.activeRental?.id === updated.id ? updated : state.activeRental,
    })),
}));
