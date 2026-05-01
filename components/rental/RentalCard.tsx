import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Rental } from '../../types';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { Card } from '../ui/Card';
import { StatusPill } from '../ui/StatusPill';
import { Avatar } from '../ui/Avatar';

interface RentalCardProps {
  rental: Rental;
  role: 'landlord' | 'tenant';
}

export const RentalCard: React.FC<RentalCardProps> = ({ rental, role }) => {
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
      activeOpacity={0.85}
    >
      <Card className="mb-3">
        {/* Header */}
        <View className="flex-row items-center mb-3">
          <Avatar
            name={person?.full_name ?? personLabel}
            uri={person?.avatar_url}
            size={44}
          />
          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-primary" numberOfLines={1}>
              {rental.property?.name ?? 'Property'}
            </Text>
            <Text className="text-sm text-muted" numberOfLines={1}>
              {rental.property?.city}, {rental.property?.state}
            </Text>
          </View>
          <StatusPill kind="rental" value={rental.status} />
        </View>

        <View className="h-px bg-border mb-3" />

        {/* Stats row */}
        <View className="flex-row justify-between">
          <View>
            <Text className="text-xs text-muted mb-0.5">Rent</Text>
            <Text className="text-sm font-semibold text-primary">
              {formatCurrency(rental.monthly_rent, true)}/mo
            </Text>
          </View>
          <View>
            <Text className="text-xs text-muted mb-0.5">Deposit</Text>
            <Text className="text-sm font-semibold text-primary">
              {formatCurrency(rental.security_deposit, true)}
            </Text>
          </View>
          <View>
            <Text className="text-xs text-muted mb-0.5">Since</Text>
            <Text className="text-sm font-semibold text-primary">
              {formatDate(rental.start_date)}
            </Text>
          </View>
        </View>

        {/* Tenant name row if landlord view */}
        {role === 'landlord' && person && (
          <View className="mt-3 pt-3 border-t border-border flex-row items-center">
            <Text className="text-xs text-muted">{personLabel}:</Text>
            <Text className="text-xs font-medium text-primary ml-1">
              {person.full_name || person.phone}
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
};
