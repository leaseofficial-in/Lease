import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Cap } from '../../components/ui/V2';
import { Property } from '../../types';
import { Colors, Fonts } from '../../constants/theme';
import { isDevAuthUserId } from '../../lib/devAuth';
import { createLocalRental } from '../../lib/localRentals';

const schema = z.object({
  propertyName: z.string().min(2, 'Property name required'),
  addressLine1: z.string().min(5, 'Address required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City required'),
  state: z.string().min(2, 'State required'),
  pincode: z.string().length(6, 'Enter valid 6-digit pincode'),
  propertyType: z.enum(['apartment', 'house', 'pg', 'commercial']),
  monthlyRent: z.string().refine((v) => Number(v) >= 500, 'Rent must be at least ₹500'),
  securityDeposit: z.string().refine((v) => Number(v) >= 0, 'Invalid amount'),
  rentDueDay: z.string().refine((v) => {
    const n = Number(v);
    return n >= 1 && n <= 28;
  }, 'Enter a day between 1–28'),
  startDate: z.string().min(1, 'Start date required'),
});

type FormValues = z.infer<typeof schema>;

const STEPS = ['Property', 'Rental Terms'] as const;
type Step = 0 | 1;

const propertyTypes: { value: Property['property_type']; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'apartment', label: 'Apartment', icon: 'business-outline' },
  { value: 'house', label: 'House', icon: 'home-outline' },
  { value: 'pg', label: 'PG / Hostel', icon: 'bed-outline' },
  { value: 'commercial', label: 'Commercial', icon: 'storefront-outline' },
];

export default function CreateRentalScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyType: 'apartment',
      rentDueDay: '1',
      securityDeposit: '',
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  const goNext = async () => {
    const step0Fields: (keyof FormValues)[] = [
      'propertyName', 'addressLine1', 'city', 'state', 'pincode', 'propertyType',
    ];
    const valid = await trigger(step0Fields);
    if (valid) setStep(1);
  };

  const onSubmit = async (values: FormValues) => {
    if (!profile) return;
    setLoading(true);
    try {
      if (isDevAuthUserId(profile.id)) {
        const rental = await createLocalRental(values, profile);
        await queryClient.invalidateQueries({ queryKey: ['landlord-rentals'] });
        showToast('Rental created locally. Share the invite link next.', 'success');
        router.replace(`/(landlord)/property/${rental.property_id}`);
        return;
      }

      const { data: property, error: propError } = await supabase
        .from('properties')
        .insert({
          landlord_id: profile.id,
          name: values.propertyName,
          address_line1: values.addressLine1,
          address_line2: values.addressLine2 ?? null,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
          property_type: values.propertyType,
        })
        .select()
        .single();

      if (propError) throw propError;

      const { data: rental, error: rentalError } = await supabase
        .from('rentals')
        .insert({
          property_id: property.id,
          landlord_id: profile.id,
          monthly_rent: Number(values.monthlyRent),
          security_deposit: Number(values.securityDeposit || 0),
          rent_due_day: Number(values.rentDueDay),
          start_date: values.startDate,
          status: 'pending_tenant',
        })
        .select()
        .single();

      if (rentalError) throw rentalError;

      await queryClient.invalidateQueries({ queryKey: ['landlord-rentals'] });
      showToast('Rental created! Share the invite link with your tenant.', 'success');
      router.replace(`/(landlord)/property/${property.id}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create rental', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: Colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          <TouchableOpacity
            onPress={() => (step === 0 ? router.back() : setStep(0))}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: Colors.fill,
              alignItems: 'center', justifyContent: 'center',
              marginRight: 12,
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Cap>Landlord</Cap>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>
              Create Rental
            </Text>
          </View>

          {/* Step dots */}
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={{
                  height: 6,
                  borderRadius: 3,
                  width: i === step ? 24 : 12,
                  backgroundColor: i === step ? Colors.action : Colors.border,
                }}
              />
            ))}
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step title */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 22, lineHeight: 28, marginBottom: 2 }}>
              {STEPS[step]}
            </Text>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13 }}>
              Step {step + 1} of {STEPS.length}
            </Text>
          </View>

          {step === 0 && (
            <>
              <Controller
                control={control}
                name="propertyName"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Property Name"
                    placeholder="e.g. Sunshine Apartments 2B"
                    value={value}
                    onChangeText={onChange}
                    error={errors.propertyName?.message}
                    required
                  />
                )}
              />

              {/* Property type selector */}
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 8 }}>
                Property Type <Text style={{ color: Colors.danger }}>*</Text>
              </Text>
              <Controller
                control={control}
                name="propertyType"
                render={({ field: { onChange, value } }) => (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {propertyTypes.map((t) => {
                      const isActive = value === t.value;
                      return (
                        <TouchableOpacity
                          key={t.value}
                          onPress={() => onChange(t.value)}
                          activeOpacity={0.8}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 14,
                            paddingVertical: 9,
                            borderRadius: 20,
                            borderWidth: 1.5,
                            borderColor: isActive ? Colors.action : Colors.border,
                            backgroundColor: isActive ? Colors.action : Colors.surface,
                          }}
                        >
                          <Ionicons
                            name={t.icon}
                            size={14}
                            color={isActive ? '#fff' : Colors.ink2}
                          />
                          <Text
                            style={{
                              fontFamily: Fonts.sansMedium,
                              fontSize: 13,
                              color: isActive ? '#fff' : Colors.primary,
                            }}
                          >
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="addressLine1"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Address Line 1"
                    placeholder="Flat/House No, Building"
                    value={value}
                    onChangeText={onChange}
                    error={errors.addressLine1?.message}
                    required
                  />
                )}
              />
              <Controller
                control={control}
                name="addressLine2"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Address Line 2"
                    placeholder="Street, Area (optional)"
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="city"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label="City"
                        placeholder="Hyderabad"
                        value={value}
                        onChangeText={onChange}
                        error={errors.city?.message}
                        required
                      />
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
                    name="pincode"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label="Pincode"
                        placeholder="500001"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="number-pad"
                        maxLength={6}
                        error={errors.pincode?.message}
                        required
                      />
                    )}
                  />
                </View>
              </View>
              <Controller
                control={control}
                name="state"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="State"
                    placeholder="Telangana"
                    value={value}
                    onChangeText={onChange}
                    error={errors.state?.message}
                    required
                  />
                )}
              />

              <Button title="Next: Rental Terms" onPress={goNext} fullWidth size="lg" style={{ marginTop: 8 }} />
            </>
          )}

          {step === 1 && (
            <>
              <Controller
                control={control}
                name="monthlyRent"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Monthly Rent"
                    placeholder="15000"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="number-pad"
                    error={errors.monthlyRent?.message}
                    required
                    leftIcon={<Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 15 }}>₹</Text>}
                  />
                )}
              />
              <Controller
                control={control}
                name="securityDeposit"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Security Deposit"
                    placeholder="30000"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="number-pad"
                    error={errors.securityDeposit?.message}
                    leftIcon={<Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 15 }}>₹</Text>}
                    hint="Usually 1–3 months rent"
                  />
                )}
              />
              <Controller
                control={control}
                name="rentDueDay"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Rent Due Day (of each month)"
                    placeholder="1"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="number-pad"
                    maxLength={2}
                    error={errors.rentDueDay?.message}
                    hint="E.g. 1 means rent is due on the 1st of every month"
                    required
                  />
                )}
              />
              <Controller
                control={control}
                name="startDate"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Rental Start Date"
                    placeholder="YYYY-MM-DD"
                    value={value}
                    onChangeText={onChange}
                    error={errors.startDate?.message}
                    hint="Format: YYYY-MM-DD"
                    required
                  />
                )}
              />

              <Button
                title="Create Rental"
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                fullWidth
                size="lg"
                style={{ marginTop: 8 }}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
