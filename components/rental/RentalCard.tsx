import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Rental } from '../../types';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { Card } from '../ui/Card';
import { StatusPill } from '../ui/StatusPill';
import { Avatar } from '../ui/Avatar';
import { Cap, Chip } from '../ui/V2';
import { Colors, Fonts } from '../../constants/theme';

interface RentalCardProps {
  rental: Rental;
  role: 'landlord' | 'tenant';
  rentalCount?: number;
}

export const RentalCard: React.FC<RentalCardProps> = ({ rental, role, rentalCount }) => {
  const router = useRouter();
  const person = role === 'landlord' ? rental.tenant : rental.landlord;
  const personLabel = role === 'landlord' ? 'Tenant' : 'Landlord';

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
          <StatusPill kind="rental" value={rental.status} />
        </View>

        <View className="flex-row justify-between">
          <Metric label="Rent" value={`${formatCurrency(rental.monthly_rent, true)}/mo`} />
          <Metric label="Deposit" value={formatCurrency(rental.security_deposit, true)} />
          <Metric label="Since" value={formatDate(rental.start_date)} align="right" />
        </View>

        <View className="mt-4 pt-4 border-t border-border flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 pr-3">
            <Avatar name={person?.full_name ?? personLabel} uri={person?.avatar_url} size={34} />
            <View className="ml-2 flex-1">
              <Cap>{personLabel}</Cap>
              <Text numberOfLines={1} style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13 }}>
                {person?.full_name || person?.phone || 'Not joined yet'}
              </Text>
            </View>
          </View>
          <Chip tone={rental.status === 'active' ? 'good' : 'warn'}>
            {rental.status === 'active' ? 'Live' : 'Setup'}
          </Chip>
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
