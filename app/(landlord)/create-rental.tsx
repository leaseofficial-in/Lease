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
import { useForm, Controller, useWatch } from 'react-hook-form';
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
import { formatCurrency } from '../../lib/formatters';
import { Colors, Fonts } from '../../constants/theme';
import { isDevAuthUserId } from '../../lib/devAuth';
import { createLocalRental } from '../../lib/localRentals';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  // Step 1
  propertyName: z.string().min(2, 'Property name required'),
  addressLine1: z.string().min(5, 'Address required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City required'),
  state: z.string().min(2, 'State required'),
  pincode: z.string().length(6, 'Enter valid 6-digit pincode'),
  propertyType: z.enum(['apartment', 'house', 'pg', 'commercial']),
  // Step 2 — Rent
  monthlyRent: z.string().refine((v) => Number(v) >= 500, 'Rent must be at least ₹500'),
  maintenanceCharges: z.string().optional(),
  lateFeePercent: z.string().refine((v) => {
    const n = Number(v);
    return n >= 0 && n <= 30;
  }, 'Enter 0–30'),
  // Step 2 — Deposit
  depositMode: z.enum(['months', 'flat']),
  depositMonths: z.string(),
  flatDepositAmount: z.string().optional(),
  // Step 2 — Lease period
  startDate: z.string().min(1, 'Start date required'),
  leaseDurationMonths: z.enum(['6', '11', '12', '24', 'custom']),
  endDate: z.string().optional(),
  rentDueDay: z.string().refine((v) => {
    const n = Number(v);
    return n >= 1 && n <= 28;
  }, 'Day must be 1–28'),
  // Step 2 — Terms
  noticePeriodDays: z.enum(['30', '60', '90']),
  furnishedStatus: z.enum(['furnished', 'semi_furnished', 'unfurnished']),
});

type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const addMonths = (dateStr: string, months: number): string => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

const formatDateShort = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// ─── Consts ───────────────────────────────────────────────────────────────────

const STEPS = ['Property', 'Rental Terms'] as const;
type Step = 0 | 1;

const propertyTypes: { value: Property['property_type']; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'apartment', label: 'Apartment', icon: 'business-outline' },
  { value: 'house', label: 'House', icon: 'home-outline' },
  { value: 'pg', label: 'PG / Hostel', icon: 'bed-outline' },
  { value: 'commercial', label: 'Commercial', icon: 'storefront-outline' },
];

const leaseDurations: { value: FormValues['leaseDurationMonths']; label: string; hint?: string }[] = [
  { value: '6', label: '6 months' },
  { value: '11', label: '11 months', hint: 'Most common' },
  { value: '12', label: '1 year' },
  { value: '24', label: '2 years' },
  { value: 'custom', label: 'Custom' },
];

const furnishedOptions: { value: FormValues['furnishedStatus']; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'unfurnished', label: 'Unfurnished', icon: 'cube-outline' },
  { value: 'semi_furnished', label: 'Semi', icon: 'layers-outline' },
  { value: 'furnished', label: 'Furnished', icon: 'bed-outline' },
];

// ─── Section header ────────────────────────────────────────────────────────────

function Section({ title }: { title: string }) {
  return (
    <Text style={{ color: Colors.muted, fontFamily: Fonts.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 10 }}>
      {title}
    </Text>
  );
}

// ─── Chip selector ─────────────────────────────────────────────────────────────

function ChipSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; hint?: string; icon?: React.ComponentProps<typeof Ionicons>['name'] }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: active ? Colors.action : Colors.border,
              backgroundColor: active ? Colors.action : Colors.surface,
            }}
          >
            {opt.icon && (
              <Ionicons name={opt.icon} size={13} color={active ? '#fff' : Colors.ink2} />
            )}
            <Text style={{ fontFamily: Fonts.sansMedium, fontSize: 13, color: active ? '#fff' : Colors.primary }}>
              {opt.label}
            </Text>
            {opt.hint && !active && (
              <View style={{ backgroundColor: Colors.actionSoft, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontFamily: Fonts.sans, fontSize: 10, color: Colors.action }}>{opt.hint}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

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
      monthlyRent: '',
      maintenanceCharges: '',
      lateFeePercent: '5',
      depositMode: 'months',
      depositMonths: '2',
      flatDepositAmount: '',
      startDate: new Date().toISOString().split('T')[0],
      leaseDurationMonths: '11',
      endDate: '',
      rentDueDay: '1',
      noticePeriodDays: '30',
      furnishedStatus: 'semi_furnished',
    },
  });

  // Live-watched values for computed previews
  const watchedMonthlyRent = useWatch({ control, name: 'monthlyRent' });
  const watchedDepositMode = useWatch({ control, name: 'depositMode' });
  const watchedDepositMonths = useWatch({ control, name: 'depositMonths' });
  const watchedStartDate = useWatch({ control, name: 'startDate' });
  const watchedLeaseDuration = useWatch({ control, name: 'leaseDurationMonths' });

  const computedDeposit =
    watchedDepositMode === 'months' && Number(watchedDepositMonths) > 0 && Number(watchedMonthlyRent) >= 500
      ? Number(watchedDepositMonths) * Number(watchedMonthlyRent)
      : null;

  const computedEndDate =
    watchedLeaseDuration !== 'custom' && watchedStartDate?.length === 10
      ? addMonths(watchedStartDate, Number(watchedLeaseDuration))
      : null;

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
      // Compute derived values
      const securityDeposit =
        values.depositMode === 'months'
          ? String(Number(values.depositMonths) * Number(values.monthlyRent))
          : (values.flatDepositAmount || '0');

      const endDate =
        values.leaseDurationMonths === 'custom'
          ? (values.endDate || undefined)
          : addMonths(values.startDate, Number(values.leaseDurationMonths));

      if (isDevAuthUserId(profile.id)) {
        const rental = await createLocalRental(
          {
            ...values,
            securityDeposit,
            endDate,
            noticePeriodDays: values.noticePeriodDays,
            furnishedStatus: values.furnishedStatus,
            lateFeePercent: values.lateFeePercent,
            maintenanceCharges: values.maintenanceCharges || '0',
          },
          profile,
        );
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
          security_deposit: Number(securityDeposit),
          rent_due_day: Number(values.rentDueDay),
          start_date: values.startDate,
          end_date: endDate ?? null,
          notice_period_days: Number(values.noticePeriodDays),
          furnished_status: values.furnishedStatus,
          late_fee_percent: Number(values.lateFeePercent),
          maintenance_charges: Number(values.maintenanceCharges || 0),
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 22, lineHeight: 28, marginBottom: 2 }}>
              {STEPS[step]}
            </Text>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13 }}>
              Step {step + 1} of {STEPS.length}
            </Text>
          </View>

          {/* ─── Step 1: Property ─────────────────────────────────────────── */}
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

              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 8 }}>
                Property Type <Text style={{ color: Colors.danger }}>*</Text>
              </Text>
              <Controller
                control={control}
                name="propertyType"
                render={({ field: { onChange, value } }) => (
                  <ChipSelect
                    value={value}
                    options={propertyTypes}
                    onChange={onChange}
                  />
                )}
              />

              <View style={{ height: 8 }} />

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

          {/* ─── Step 2: Rental Terms ─────────────────────────────────────── */}
          {step === 1 && (
            <>
              {/* Rent */}
              <Section title="Rent" />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 3 }}>
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
                </View>
                <View style={{ flex: 2 }}>
                  <Controller
                    control={control}
                    name="maintenanceCharges"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label="Maintenance"
                        placeholder="2000"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="number-pad"
                        hint="Monthly extras"
                        leftIcon={<Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 15 }}>₹</Text>}
                      />
                    )}
                  />
                </View>
              </View>

              {/* Deposit */}
              <Section title="Security Deposit" />
              <Controller
                control={control}
                name="depositMode"
                render={({ field: { onChange, value } }) => (
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    {(['months', 'flat'] as const).map((mode) => {
                      const active = value === mode;
                      return (
                        <TouchableOpacity
                          key={mode}
                          onPress={() => onChange(mode)}
                          activeOpacity={0.8}
                          style={{
                            flex: 1, paddingVertical: 10, borderRadius: 14,
                            borderWidth: 1.5,
                            borderColor: active ? Colors.action : Colors.border,
                            backgroundColor: active ? Colors.actionSoft : Colors.surface,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 13, color: active ? Colors.action : Colors.primary }}>
                            {mode === 'months' ? 'By Months' : 'Flat Amount'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />

              {watchedDepositMode === 'months' ? (
                <>
                  <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 8 }}>
                    Months of deposit
                  </Text>
                  <Controller
                    control={control}
                    name="depositMonths"
                    render={({ field: { onChange, value } }) => (
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                        {(['1', '2', '3', '4', '6'] as const).map((m) => {
                          const active = value === m;
                          return (
                            <TouchableOpacity
                              key={m}
                              onPress={() => onChange(m)}
                              activeOpacity={0.8}
                              style={{
                                flex: 1, paddingVertical: 10, borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: active ? Colors.action : Colors.border,
                                backgroundColor: active ? Colors.action : Colors.surface,
                                alignItems: 'center',
                              }}
                            >
                              <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 14, color: active ? '#fff' : Colors.primary }}>
                                {m}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  />
                  {computedDeposit !== null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 8 }}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                      <Text style={{ color: Colors.success, fontFamily: Fonts.sansMedium, fontSize: 13 }}>
                        Deposit = {formatCurrency(computedDeposit, true)}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Controller
                  control={control}
                  name="flatDepositAmount"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Deposit Amount"
                      placeholder="30000"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="number-pad"
                      leftIcon={<Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 15 }}>₹</Text>}
                    />
                  )}
                />
              )}

              {/* Lease Period */}
              <Section title="Lease Period" />
              <Controller
                control={control}
                name="startDate"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Start Date"
                    placeholder="YYYY-MM-DD"
                    value={value}
                    onChangeText={onChange}
                    error={errors.startDate?.message}
                    hint="Format: YYYY-MM-DD"
                    required
                  />
                )}
              />

              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 8 }}>
                Lease Duration <Text style={{ color: Colors.danger }}>*</Text>
              </Text>
              <Controller
                control={control}
                name="leaseDurationMonths"
                render={({ field: { onChange, value } }) => (
                  <ChipSelect
                    value={value}
                    options={leaseDurations}
                    onChange={onChange}
                  />
                )}
              />

              {watchedLeaseDuration === 'custom' ? (
                <Controller
                  control={control}
                  name="endDate"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="End Date"
                      placeholder="YYYY-MM-DD"
                      value={value}
                      onChangeText={onChange}
                      hint="Move-out / lease end date"
                    />
                  )}
                />
              ) : computedEndDate ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 8 }}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.action} />
                  <Text style={{ color: Colors.action, fontFamily: Fonts.sansMedium, fontSize: 13 }}>
                    Lease ends {formatDateShort(computedEndDate)}
                  </Text>
                </View>
              ) : null}

              <View style={{ marginTop: 8 }}>
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
                      hint="E.g. 5 means rent is due on the 5th of every month (max 28)"
                      required
                    />
                  )}
                />
              </View>

              {/* Additional Terms */}
              <Section title="Additional Terms" />

              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 8 }}>
                Notice Period
              </Text>
              <Controller
                control={control}
                name="noticePeriodDays"
                render={({ field: { onChange, value } }) => (
                  <ChipSelect
                    value={value}
                    options={[
                      { value: '30', label: '1 month', hint: 'Standard' },
                      { value: '60', label: '2 months' },
                      { value: '90', label: '3 months' },
                    ]}
                    onChange={onChange}
                  />
                )}
              />

              <View style={{ height: 12 }} />

              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 8 }}>
                Furnished Status
              </Text>
              <Controller
                control={control}
                name="furnishedStatus"
                render={({ field: { onChange, value } }) => (
                  <ChipSelect
                    value={value}
                    options={furnishedOptions}
                    onChange={onChange}
                  />
                )}
              />

              <View style={{ height: 12 }} />

              <Controller
                control={control}
                name="lateFeePercent"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Late Fee (%)"
                    placeholder="5"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="number-pad"
                    maxLength={2}
                    error={errors.lateFeePercent?.message}
                    hint="Applied on unpaid rent after due date (0 to disable)"
                    rightIcon={<Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 15 }}>%</Text>}
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
