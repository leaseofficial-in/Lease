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
import { Colors } from '../../constants/theme';

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Please describe the issue in more detail'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type FormValues = z.infer<typeof schema>;

const priorities: { value: RepairPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'border-gray-300' },
  { value: 'medium', label: 'Medium', color: 'border-warning' },
  { value: 'high', label: 'High', color: 'border-danger' },
  { value: 'urgent', label: 'Urgent 🚨', color: 'border-red-600' },
];

export default function RepairsScreen() {
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: rental } = useQuery({
    queryKey: ['tenant-rental', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select('id')
        .eq('tenant_id', profile!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: repairs, isLoading, refetch, isRefetching } = useQuery({
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
    enabled: !!rental?.id,
  });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  });

  const onSubmit = async (values: FormValues) => {
    if (!rental || !profile) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('repair_requests').insert({
        rental_id: rental.id,
        raised_by: profile.id,
        title: values.title,
        description: values.description,
        priority: values.priority,
        status: 'open',
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['repairs', rental.id] });
      showToast('Repair request sent to your landlord', 'success');
      setShowForm(false);
      reset();
    } catch {
      showToast('Failed to submit request', 'error');
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
          {isLoading ? (
            <Text className="text-sm text-muted text-center mt-8">Loading…</Text>
          ) : repairs?.length === 0 ? (
            <EmptyState
              title="No repair requests"
              subtitle="Tap 'Request' to log a maintenance issue for your landlord."
              icon={<Text style={{ fontSize: 48 }}>🔧</Text>}
            />
          ) : (
            repairs?.map((r) => (
              <Card key={r.id} className="mb-3">
                <View className="flex-row items-start justify-between mb-2">
                  <Text className="text-base font-semibold text-primary flex-1 mr-3">{r.title}</Text>
                  <StatusPill kind="repair" value={r.status} />
                </View>
                <Text className="text-sm text-muted mb-3 leading-5" numberOfLines={2}>
                  {r.description}
                </Text>
                <View className="flex-row items-center justify-between">
                  <View className={`px-2 py-0.5 rounded-full ${
                    r.priority === 'urgent' ? 'bg-red-100' :
                    r.priority === 'high' ? 'bg-red-50' :
                    r.priority === 'medium' ? 'bg-amber-50' : 'bg-gray-100'
                  }`}>
                    <Text className={`text-xs font-medium ${
                      r.priority === 'urgent' ? 'text-red-700' :
                      r.priority === 'high' ? 'text-danger' :
                      r.priority === 'medium' ? 'text-warning' : 'text-muted'
                    }`}>
                      {repairPriorityLabel[r.priority]}
                    </Text>
                  </View>
                  <Text className="text-xs text-muted">{formatRelativeTime(r.created_at)}</Text>
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
                placeholder="Describe the problem in detail…"
                placeholderTextColor={Colors.muted}
                multiline
                numberOfLines={4}
                className="border border-border rounded-xl p-3 text-sm text-primary"
                style={{ textAlignVertical: 'top', minHeight: 96 }}
              />
              {errors.description && (
                <Text className="text-xs text-danger mt-1">{errors.description.message}</Text>
              )}
            </View>
          )}
        />

        <Text className="text-sm font-medium text-primary mb-2">Priority</Text>
        <Controller
          control={control}
          name="priority"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row gap-2 mb-4 flex-wrap">
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => onChange(p.value)}
                  className={`px-3 py-2 rounded-full border-2 ${
                    value === p.value ? `${p.color} bg-red-50` : 'border-border bg-white'
                  }`}
                >
                  <Text className={`text-sm font-medium ${value === p.value ? 'text-danger' : 'text-primary'}`}>
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
