import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Rental } from '../../types';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { getUnitVocab } from '../../lib/unitVocab';
import { Card } from '../ui/Card';
import { StatusPill } from '../ui/StatusPill';
import { Avatar } from '../ui/Avatar';
import { Cap, Chip } from '../ui/V2';
import { Colors, Fonts } from '../../constants/theme';

interface RentalCardProps {
  rental: Rental;
  role: 'landlord' | 'tenant';
  rentalCount?: number;
  totalRent?: number;
  totalDeposit?: number;
  activeBeds?: number;
  totalBeds?: number;
}

export const RentalCard: React.FC<RentalCardProps> = ({
  rental, role, rentalCount, totalRent, totalDeposit, activeBeds, totalBeds,
}) => {
  const router = useRouter();
  const person = role === 'landlord' ? rental.tenant : rental.landlord;
  const personLabel = role === 'landlord' ? 'Tenant' : 'Landlord';
  const archived = !!rental.property?.archived_at;
  const isPgMultiBed = role === 'landlord' && (totalBeds ?? 0) > 1;
  const unitVocab = getUnitVocab(rental.property?.property_type);

  return (
    <TouchableOpacity
      onPress={() => {
        if (role === 'landlord') {
          router.push(`/(landlord)/property/${rental.property_id}`);
        }
      }}
      activeOpacity={0.86}
    >
      <Card className="mb-3">
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 pr-3">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Cap>{rental.property?.city ?? 'Rental'}</Cap>
              {rentalCount && rentalCount > 1 && (
                <View style={{ backgroundColor: Colors.fill2, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
                  <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 10 }}>
                    {rentalCount} rentals
                  </Text>
                </View>
              )}
            </View>
            <Text
              numberOfLines={1}
              style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18, marginTop: 4 }}
            >
              {rental.property?.name ?? 'Property'}
            </Text>
            <Text numberOfLines={1} style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, marginTop: 2 }}>
              {rental.property?.address_line1 ?? `${rental.property?.city ?? ''}, ${rental.property?.state ?? ''}`}
            </Text>
          </View>
          {archived ? (
            <Chip tone="outline">Archived</Chip>
          ) : isPgMultiBed ? (
            <Chip tone="outline">{rental.property?.property_type?.toUpperCase() ?? 'Multi'}</Chip>
          ) : (
            <StatusPill kind="rental" value={rental.status} />
          )}
        </View>

        <View className="flex-row justify-between">
          <Metric
            label={isPgMultiBed ? 'Total Rent' : 'Rent'}
            value={`${formatCurrency(isPgMultiBed ? (totalRent ?? 0) : rental.monthly_rent, true)}/mo`}
          />
          <Metric
            label={isPgMultiBed ? 'Total Deposit' : 'Deposit'}
            value={formatCurrency(isPgMultiBed ? (totalDeposit ?? 0) : rental.security_deposit, true)}
          />
          {isPgMultiBed ? (
            <Metric label={unitVocab.units} value={`${activeBeds ?? 0}/${totalBeds ?? 0} filled`} align="right" />
          ) : (
            <Metric label="Since" value={formatDate(rental.start_date)} align="right" />
          )}
        </View>

        <View className="mt-4 pt-4 border-t border-border flex-row items-center justify-between">
          {isPgMultiBed ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="bed-outline" size={17} color={Colors.muted} />
                </View>
                <View>
                  <Cap>Occupancy</Cap>
                  <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13 }}>
                    {activeBeds ?? 0} of {totalBeds ?? 0} {unitVocab.units.toLowerCase()} occupied
                  </Text>
                </View>
              </View>
              <Chip tone={(activeBeds ?? 0) === (totalBeds ?? 0) ? 'good' : 'warn'}>
                {(activeBeds ?? 0) === (totalBeds ?? 0) ? 'Full' : `${(totalBeds ?? 0) - (activeBeds ?? 0)} vacant`}
              </Chip>
            </>
          ) : (
            <>
              <View className="flex-row items-center flex-1 pr-3">
                <Avatar name={person?.full_name ?? personLabel} uri={person?.avatar_url} size={34} />
                <View className="ml-2 flex-1">
                  <Cap>{personLabel}</Cap>
                  <Text numberOfLines={1} style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13 }}>
                    {person?.full_name || person?.phone || 'Not joined yet'}
                  </Text>
                </View>
              </View>
              <Chip tone={archived ? 'outline' : rental.status === 'active' ? 'good' : 'warn'}>
                {archived ? 'Hidden' : rental.status === 'active' ? 'Live' : 'Setup'}
              </Chip>
            </>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

function Metric({
  label,
  value,
  align = 'left',
}: {
  label: string;
  value: string;
  align?: 'left' | 'right';
}) {
  return (
    <View style={{ flex: 1, alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Text style={{ color: Colors.muted, fontFamily: Fonts.sansMedium, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14, marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}
