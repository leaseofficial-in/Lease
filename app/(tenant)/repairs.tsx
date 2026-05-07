import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { RepairRequest, RepairPriority } from '../../types';
import { formatRelativeTime, repairPriorityLabel } from '../../lib/formatters';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusPill } from '../../components/ui/StatusPill';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { EmptyState } from '../../components/ui/EmptyState';
import { Colors, Fonts } from '../../constants/theme';
import { isDevAuthUserId } from '../../lib/devAuth';
import { notifyUser } from '../../lib/sendPush';
import { writeRentalEvent } from '../../lib/events';
import { sendEmail } from '../../lib/email';

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Please describe the issue in more detail'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type FormValues = z.infer<typeof schema>;
type RepairFilter = 'all' | 'open' | 'in_progress' | 'done';

const PRIORITY_BORDER: Record<RepairPriority, string> = {
  low:    Colors.border,
  medium: Colors.warning,
  high:   Colors.danger,
  urgent: '#C2362F',
};

const PRIORITY_CONFIG: Record<RepairPriority, { color: string; bg: string }> = {
  low:    { color: Colors.ink3,    bg: Colors.fill },
  medium: { color: Colors.warning, bg: Colors.warningSoft },
  high:   { color: Colors.danger,  bg: Colors.dangerSoft },
  urgent: { color: '#C2362F',      bg: '#FBE2E0' },
};

const PRIORITIES: { value: RepairPriority; label: string }[] = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function RepairsScreen() {
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<RepairFilter>('all');
  const isLocalDevUser = isDevAuthUserId(profile?.id);

  const { data: rental, isLoading: isRentalLoading, error: rentalError, refetch: refetchRental } = useQuery({
    queryKey: ['tenant-rental', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select('id, landlord_id')
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

  const counts = useMemo(() => ({
    all:         repairs?.length ?? 0,
    open:        repairs?.filter((r) => r.status === 'open').length ?? 0,
    in_progress: repairs?.filter((r) => r.status === 'in_progress').length ?? 0,
    done:        repairs?.filter((r) => r.status === 'resolved' || r.status === 'closed').length ?? 0,
  }), [repairs]);

  const filtered = useMemo(() => {
    if (!repairs) return [];
    if (filter === 'done') return repairs.filter((r) => r.status === 'resolved' || r.status === 'closed');
    if (filter === 'all') return repairs;
    return repairs.filter((r) => r.status === filter);
  }, [repairs, filter]);

  const FILTERS: { key: RepairFilter; label: string }[] = [
    { key: 'all',         label: 'All' },
    { key: 'open',        label: 'Open' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'done',        label: 'Done' },
  ];

  const onSubmit = async (values: FormValues) => {
    if (!rental || !profile) {
      showToast('Join a rental before creating a repair request', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { data: newRepair, error } = await supabase.from('repair_requests').insert({
        rental_id: rental.id,
        raised_by: profile.id,
        title: values.title,
        description: values.description,
        priority: values.priority,
        status: 'open',
      }).select('id').single();
      if (error) throw error;
      void writeRentalEvent({
        rentalId: rental.id,
        actorType: 'tenant',
        actorId: profile.id,
        eventType: 'repair_request_created',
        payload: { repair_id: newRepair?.id, title: values.title, priority: values.priority },
        idempotencyKey: newRepair?.id ? `repair_created_${newRepair.id}` : undefined,
      });
      if (rental.landlord_id && newRepair?.id) {
        sendEmail({
          type: 'repair_created',
          recipientId: rental.landlord_id,
          referenceId: newRepair.id,
          variables: {
            tenantName: profile.full_name || 'Your tenant',
            propertyName: '',
            title: values.title,
            priority: values.priority,
            description: values.description,
          },
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['repairs', rental.id] });
      if (rental.landlord_id) {
        void notifyUser({
          recipientId: rental.landlord_id,
          title: 'New repair request',
          body: `"${values.title}" — ${values.priority} priority. Your tenant needs maintenance help.`,
          type: 'repair_update',
          data: { rental_id: rental.id },
        });
      }
      showToast('Repair request sent to your landlord', 'success');
      setShowForm(false);
      reset();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isPageLoading = isRentalLoading || isLoading;
  const pageError = rentalError ?? repairsError;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.action} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Header ── */}
        <View style={{
          paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <View>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>
              Tenant
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 26 }}>
                Repairs
              </Text>
              {counts.all > 0 && (
                <View style={{ backgroundColor: counts.open > 0 ? Colors.dangerSoft : Colors.fill, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: counts.open > 0 ? Colors.danger : Colors.muted, fontFamily: Fonts.sansSemiBold, fontSize: 12 }}>
                    {counts.all}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowForm(true)}
            activeOpacity={0.82}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
              backgroundColor: Colors.action,
            }}
          >
            <Ionicons name="add" size={17} color="#fff" />
            <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>New Request</Text>
          </TouchableOpacity>
        </View>

        {/* ── Filter tabs ── */}
        {!isPageLoading && !pageError && (repairs?.length ?? 0) > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}
          >
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const count = counts[f.key];
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: active ? Colors.primary : Colors.border,
                    backgroundColor: active ? Colors.primary : Colors.surface,
                  }}
                >
                  <Text style={{
                    color: active ? Colors.surface : Colors.ink2,
                    fontFamily: Fonts.sansMedium, fontSize: 13,
                  }}>
                    {f.label}
                  </Text>
                  {count > 0 && (
                    <View style={{
                      backgroundColor: active ? 'rgba(255,255,255,0.2)' : Colors.fill2,
                      borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1,
                      minWidth: 18, alignItems: 'center',
                    }}>
                      <Text style={{
                        color: active ? Colors.surface : Colors.ink3,
                        fontFamily: Fonts.sansBold, fontSize: 11,
                      }}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Content ── */}
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {isPageLoading ? (
            <View style={{ gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ height: 120, backgroundColor: Colors.surface, borderRadius: 18, borderWidth: 1, borderColor: Colors.border }} />
              ))}
            </View>
          ) : pageError ? (
            <EmptyState
              title="Could not load repairs"
              subtitle={(pageError) instanceof Error ? pageError.message : 'Please try again.'}
              actionLabel="Retry"
              onAction={() => {
                void refetchRental();
                if (rental?.id) void refetch();
              }}
              icon={<Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />}
            />
          ) : !rental ? (
            <EmptyState
              title="No rental yet"
              subtitle="Join a rental before raising repair requests."
              icon={<Ionicons name="home-outline" size={48} color={Colors.muted} />}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={filter === 'all' ? 'No repairs yet' : `No ${filter === 'in_progress' ? 'in-progress' : filter} repairs`}
              subtitle={
                filter === 'all'
                  ? (isLocalDevUser ? 'Local demo mode.' : 'Tap New Request to log a maintenance issue for your landlord.')
                  : 'No repairs match this filter.'
              }
              actionLabel={filter === 'all' ? 'New Request' : undefined}
              onAction={filter === 'all' ? () => setShowForm(true) : undefined}
              icon={<Ionicons name="construct-outline" size={48} color={Colors.muted} />}
            />
          ) : (
            filtered.map((r) => <RepairCard key={r.id} repair={r} />)
          )}
        </View>
      </ScrollView>

      {/* ── New Request Sheet ── */}
      <BottomSheet visible={showForm} onClose={() => { setShowForm(false); reset(); }} scrollable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <View style={{
            width: 44, height: 44, borderRadius: 14,
            backgroundColor: Colors.actionSoft, alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="construct-outline" size={22} color={Colors.action} />
          </View>
          <View>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 20 }}>
              New Repair Request
            </Text>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13, marginTop: 1 }}>
              Your landlord will be notified
            </Text>
          </View>
        </View>

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
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 6 }}>
                Description <Text style={{ color: Colors.danger }}>*</Text>
              </Text>
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Describe the problem in detail — when did it start, how bad is it?"
                placeholderTextColor={Colors.muted}
                multiline
                numberOfLines={4}
                style={{
                  borderWidth: 1, borderColor: errors.description ? Colors.danger : Colors.border,
                  borderRadius: 14, padding: 12,
                  fontFamily: Fonts.sans, fontSize: 14,
                  color: Colors.primary, backgroundColor: Colors.fill,
                  textAlignVertical: 'top', minHeight: 100,
                }}
              />
              {errors.description && (
                <Text style={{ color: Colors.danger, fontFamily: Fonts.sans, fontSize: 12, marginTop: 4 }}>
                  {errors.description.message}
                </Text>
              )}
            </View>
          )}
        />

        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 10 }}>
            Priority
          </Text>
          <Controller
            control={control}
            name="priority"
            render={({ field: { onChange, value } }) => (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {PRIORITIES.map((p) => {
                  const { color, bg } = PRIORITY_CONFIG[p.value];
                  const active = value === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => onChange(p.value)}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22,
                        borderWidth: 1.5,
                        borderColor: active ? color : Colors.border,
                        backgroundColor: active ? bg : Colors.surface,
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                      }}
                    >
                      {active && (
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
                      )}
                      <Text style={{
                        fontFamily: active ? Fonts.sansSemiBold : Fonts.sans,
                        fontSize: 13,
                        color: active ? color : Colors.ink3,
                      }}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />
        </View>

        <Button
          title="Submit to Landlord"
          onPress={handleSubmit(onSubmit)}
          loading={submitting}
          loadingText="Submitting…"
          fullWidth
          size="lg"
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

function RepairCard({ repair: r }: { repair: RepairRequest }) {
  const priorityColor = PRIORITY_BORDER[r.priority];
  const { color: pColor, bg: pBg } = PRIORITY_CONFIG[r.priority];
  const isDone = r.status === 'resolved' || r.status === 'closed';

  return (
    <View style={{
      backgroundColor: Colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: Colors.border,
      overflow: 'hidden',
      opacity: isDone ? 0.72 : 1,
    }}>
      {/* Priority accent stripe */}
      <View style={{ height: 3, backgroundColor: priorityColor }} />

      <View style={{ padding: 16 }}>
        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
          <Text style={{
            color: Colors.primary, fontFamily: Fonts.sansSemiBold,
            fontSize: 15, lineHeight: 21, flex: 1,
          }}>
            {r.title}
          </Text>
          <StatusPill kind="repair" value={r.status} />
        </View>

        {/* Description */}
        <Text
          numberOfLines={2}
          style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: 10 }}
        >
          {r.description}
        </Text>

        {/* Landlord note */}
        {r.landlord_note ? (
          <View style={{
            backgroundColor: Colors.actionSoft,
            borderRadius: 10,
            paddingHorizontal: 12, paddingVertical: 10,
            marginBottom: 10,
            borderLeftWidth: 3, borderLeftColor: Colors.action,
          }}>
            <Text style={{
              color: Colors.action, fontFamily: Fonts.sansMedium,
              fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3,
            }}>
              Landlord's Update
            </Text>
            <Text style={{ color: Colors.ink2, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18 }}>
              {r.landlord_note}
            </Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20,
            backgroundColor: pBg,
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pColor }} />
            <Text style={{ color: pColor, fontFamily: Fonts.sansMedium, fontSize: 11 }}>
              {repairPriorityLabel[r.priority]}
            </Text>
          </View>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
            {formatRelativeTime(r.created_at)}
          </Text>
        </View>
      </View>
    </View>
  );
}
