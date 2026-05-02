import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { RepairRequest, RepairPriority } from '../../types';
import { formatRelativeTime, repairPriorityLabel, repairStatusLabel } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusPill } from '../../components/ui/StatusPill';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Colors, Fonts } from '../../constants/theme';
import { isDevAuthUserId } from '../../lib/devAuth';

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Please describe the issue in more detail'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type FormValues = z.infer<typeof schema>;

const priorities: { value: RepairPriority; label: string; activeColor: string; activeBg: string }[] = [
  { value: 'low',    label: 'Low',    activeColor: Colors.ink3,    activeBg: Colors.fill },
  { value: 'medium', label: 'Medium', activeColor: Colors.warning, activeBg: Colors.warningSoft },
  { value: 'high',   label: 'High',   activeColor: Colors.danger,  activeBg: Colors.dangerSoft },
  { value: 'urgent', label: 'Urgent', activeColor: '#C2362F',      activeBg: '#FBE2E0' },
];

export default function RepairsScreen() {
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isLocalDevUser = isDevAuthUserId(profile?.id);

  const { data: rental, isLoading: isRentalLoading, error: rentalError, refetch: refetchRental } = useQuery({
    queryKey: ['tenant-rental', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select('id')
        .eq('tenant_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && !isLocalDevUser,
  });

  const { data: repairs, isLoading, refetch, isRefetching, error: repairsError } = useQuery({
    queryKey: ['repairs', rental?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_requests')
        .select('*')
        .eq('rental_id', rental!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RepairRequest[];
    },
    enabled: !!rental?.id && !isLocalDevUser,
  });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  });

  const onSubmit = async (values: FormValues) => {
    if (!rental || !profile) {
      showToast('Join a rental before creating a repair request', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('repair_requests').insert({
        rental_id: rental.id,
        raised_by: profile.id,
        title: values.title,
        description: values.description,
        priority: values.priority,
        status: 'open',
      }).select('id').single();
      if (error) throw error;
      void queryClient.invalidateQueries({ queryKey: ['repairs', rental.id] });
      showToast('Repair request sent to your landlord', 'success');
      setShowForm(false);
      reset();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-primary">Repairs</Text>
          <Button title="+ Request" onPress={() => setShowForm(true)} size="sm" />
        </View>

        <View className="px-5 pb-8">
          {isRentalLoading || isLoading ? (
            <LoadingScreen />
          ) : rentalError || repairsError ? (
            <EmptyState
              title="Could not load repairs"
              subtitle={(rentalError ?? repairsError) instanceof Error ? (rentalError ?? repairsError)!.message : 'Please try again.'}
              actionLabel="Retry"
              onAction={() => {
                void refetchRental();
                if (rental?.id) void refetch();
              }}
              icon={<Text style={{ color: Colors.primary, fontFamily: Fonts.sansBold, fontSize: 32 }}>!</Text>}
            />
          ) : !rental || repairs?.length === 0 ? (
            <EmptyState
              title="No repair requests"
              subtitle={
                isLocalDevUser
                  ? 'Local demo mode skips live repair records.'
                  : "Tap 'Request' to log a maintenance issue for your landlord."
              }
              icon={<Text style={{ color: Colors.primary, fontFamily: Fonts.sansBold, fontSize: 32 }}>M</Text>}
            />
          ) : (
            repairs?.map((r) => (
              <Card key={r.id} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15, flex: 1, marginRight: 12 }}>
                    {r.title}
                  </Text>
                  <StatusPill kind="repair" value={r.status} />
                </View>
                <Text numberOfLines={2} style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>
                  {r.description}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <PriorityBadge priority={r.priority} />
                  <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>
                    {formatRelativeTime(r.created_at)}
                  </Text>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* New request bottom sheet */}
      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} scrollable>
        <Text className="text-lg font-semibold text-primary mb-4 pt-2">New Repair Request</Text>

        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Issue Title"
              placeholder="e.g. Leaking tap in kitchen"
              value={value}
              onChangeText={onChange}
              error={errors.title?.message}
              required
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <View className="mb-4">
              <Text className="text-sm font-medium text-primary mb-1.5">
                Description <Text className="text-danger">*</Text>
              </Text>
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Describe the problem in detail..."
                placeholderTextColor={Colors.muted}
                multiline
                numberOfLines={4}
                style={{
                  borderWidth: 1,
                  borderColor: Colors.border,
                  borderRadius: 12,
                  padding: 12,
                  fontFamily: Fonts.sans,
                  fontSize: 14,
                  color: Colors.primary,
                  backgroundColor: Colors.fill,
                  textAlignVertical: 'top',
                  minHeight: 96,
                }}
              />
              {errors.description && (
                <Text className="text-xs text-danger mt-1">{errors.description.message}</Text>
              )}
            </View>
          )}
        />

        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 8 }}>Priority</Text>
        <Controller
          control={control}
          name="priority"
          render={({ field: { onChange, value } }) => (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => onChange(p.value)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: value === p.value ? p.activeColor : Colors.border,
                    backgroundColor: value === p.value ? p.activeBg : Colors.surface,
                  }}
                >
                  <Text style={{
                    fontFamily: Fonts.sansMedium,
                    fontSize: 13,
                    color: value === p.value ? p.activeColor : Colors.ink3,
                  }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />

        <Button
          title="Submit Request"
          onPress={handleSubmit(onSubmit)}
          loading={submitting}
          fullWidth
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

function PriorityBadge({ priority }: { priority: RepairPriority }) {
  const map: Record<RepairPriority, { color: string; bg: string }> = {
    low:    { color: Colors.ink3,    bg: Colors.fill },
    medium: { color: Colors.warning, bg: Colors.warningSoft },
    high:   { color: Colors.danger,  bg: Colors.dangerSoft },
    urgent: { color: '#C2362F',      bg: '#FBE2E0' },
  };
  const { color, bg } = map[priority];
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: bg }}>
      <Text style={{ color, fontFamily: Fonts.sansMedium, fontSize: 11 }}>
        {repairPriorityLabel[priority]}
      </Text>
    </View>
  );
}
