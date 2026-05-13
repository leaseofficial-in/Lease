import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Image,
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
import { RepairRequest, RepairPriority, RepairStatus } from '../../types';
import { formatRelativeTime, repairPriorityLabel, repairStatusLabel } from '../../lib/formatters';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusPill } from '../../components/ui/StatusPill';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { EmptyState } from '../../components/ui/EmptyState';
import { Colors, Fonts } from '../../constants/theme';
import { DashboardShell } from '../../components/layout/WebSidebar';
import { isDevAuthUserId } from '../../lib/devAuth';
import { pickMultiplePhotos, takePhoto, uploadRepairPhoto } from '../../lib/storage';
import { notifyUser } from '../../lib/sendPush';
import { writeRentalEvent } from '../../lib/events';
import { sendEmail } from '../../lib/email';

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Please describe the issue in more detail'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type RepairCategory = 'plumbing' | 'electric' | 'appliance' | 'other';

const CATEGORIES: { id: RepairCategory; icon: string; label: string; placeholder: string }[] = [
  { id: 'plumbing',  icon: '🚿', label: 'Plumbing',  placeholder: 'e.g. Geyser leaking near valve' },
  { id: 'electric',  icon: '⚡', label: 'Electric',  placeholder: 'e.g. Socket sparking in bedroom' },
  { id: 'appliance', icon: '❄️', label: 'Appliance', placeholder: 'e.g. AC not cooling properly' },
  { id: 'other',     icon: '🚪', label: 'Other',     placeholder: 'e.g. Wardrobe door broken' },
];

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

// Build a human-readable timeline from repair status + timestamps
function buildTimeline(r: RepairRequest) {
  const events: { label: string; sub: string; time: string; done: boolean }[] = [];
  events.push({
    label: 'Request raised',
    sub: 'Sent to your landlord',
    time: r.created_at,
    done: true,
  });
  if (r.status === 'in_progress' || r.status === 'resolved' || r.status === 'closed') {
    events.push({
      label: 'Acknowledged',
      sub: 'Landlord started work',
      time: r.updated_at,
      done: true,
    });
  }
  if (r.status === 'resolved' || r.status === 'closed') {
    events.push({
      label: 'Resolved',
      sub: r.landlord_note ? `Note: ${r.landlord_note}` : 'Issue marked resolved by landlord',
      time: r.resolved_at ?? r.updated_at,
      done: true,
    });
  }
  if (r.status === 'closed') {
    events.push({
      label: 'Closed',
      sub: 'Request closed',
      time: r.updated_at,
      done: true,
    });
  }
  // Pending steps
  if (r.status === 'open') {
    events.push({ label: 'Acknowledged', sub: 'Waiting for landlord', time: '', done: false });
    events.push({ label: 'Resolved', sub: '', time: '', done: false });
  } else if (r.status === 'in_progress') {
    events.push({ label: 'Resolved', sub: 'Work in progress', time: '', done: false });
  }
  return events;
}

export default function RepairsScreen() {
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<RepairFilter>('all');
  const [repairPhotos, setRepairPhotos] = useState<string[]>([]);
  const [selectedRepair, setSelectedRepair] = useState<RepairRequest | null>(null);
  const [category, setCategory] = useState<RepairCategory>('plumbing');
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
        photos: [],
      }).select('id').single();
      if (error) throw error;

      if (repairPhotos.length > 0 && newRepair?.id) {
        const results = await Promise.allSettled(
          repairPhotos.map((uri) => uploadRepairPhoto(uri, rental.id, newRepair.id)),
        );
        const storagePaths = results
          .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof uploadRepairPhoto>>> => r.status === 'fulfilled')
          .map((r) => r.value.storagePath);
        if (storagePaths.length > 0) {
          await supabase.from('repair_requests').update({ photos: storagePaths }).eq('id', newRepair.id);
        }
      }

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
        const photoNote = repairPhotos.length > 0 ? ` (${repairPhotos.length} photo${repairPhotos.length > 1 ? 's' : ''} attached)` : '';
        void notifyUser({
          recipientId: rental.landlord_id,
          title: 'New repair request',
          body: `"${values.title}" — ${values.priority} priority.${photoNote}`,
          type: 'repair_update',
          data: { rental_id: rental.id },
        });
      }
      showToast('Repair request sent to your landlord', 'success');
      setShowForm(false);
      reset();
      setRepairPhotos([]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isPageLoading = isRentalLoading || isLoading;
  const pageError = rentalError ?? repairsError;

  return (
  <DashboardShell role="tenant">
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
            filtered.map((r) => (
              <RepairCard
                key={r.id}
                repair={r}
                onPress={() => setSelectedRepair(r)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Repair Detail Sheet ── */}
      <BottomSheet
        visible={!!selectedRepair}
        onClose={() => setSelectedRepair(null)}
        scrollable
      >
        {selectedRepair && <RepairDetailContent repair={selectedRepair} />}
      </BottomSheet>

      {/* ── New Request Sheet ── */}
      <BottomSheet visible={showForm} onClose={() => { setShowForm(false); reset(); setRepairPhotos([]); setCategory('plumbing'); }} scrollable>
        {/* Header */}
        <View style={{ alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderSoft, marginBottom: 18 }}>
          <Text style={{ fontFamily: Fonts.serif, fontSize: 24, letterSpacing: -0.5, color: Colors.primary, lineHeight: 28 }}>
            What needs{' '}
            <Text style={{ color: Colors.action, fontStyle: 'italic' }}>fixing?</Text>
          </Text>
          <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: Colors.ink3, marginTop: 5 }}>
            Your landlord sees this the moment you submit.
          </Text>
        </View>

        {/* Category grid */}
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14, marginBottom: 10 }}>Category</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
          {CATEGORIES.map((cat) => {
            const isSel = category === cat.id;
            return (
              <TouchableOpacity key={cat.id} onPress={() => setCategory(cat.id)} activeOpacity={0.8}
                style={{ flex: 1, padding: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1.5,
                  borderColor: isSel ? Colors.accent : Colors.borderSoft,
                  backgroundColor: isSel ? Colors.accentSoft : Colors.surface }}>
                <Text style={{ fontSize: 22 }}>{cat.icon}</Text>
                <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 11, marginTop: 4,
                  color: isSel ? Colors.accent : Colors.ink3 }}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Title */}
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14, marginBottom: 8 }}>Details</Text>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Title"
              placeholder={CATEGORIES.find((c) => c.id === category)?.placeholder ?? 'e.g. Leaking tap in kitchen'}
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
                Describe what you see <Text style={{ color: Colors.danger }}>*</Text>
              </Text>
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="When did it start, how bad is it? The more detail, the faster the fix."
                placeholderTextColor={Colors.muted}
                multiline
                numberOfLines={4}
                style={{ borderWidth: 1, borderColor: errors.description ? Colors.danger : Colors.border,
                  borderRadius: 14, padding: 12, fontFamily: Fonts.sans, fontSize: 14,
                  color: Colors.primary, backgroundColor: Colors.fill,
                  textAlignVertical: 'top', minHeight: 100 }}
              />
              {errors.description && (
                <Text style={{ color: Colors.danger, fontFamily: Fonts.sans, fontSize: 12, marginTop: 4 }}>
                  {errors.description.message}
                </Text>
              )}
            </View>
          )}
        />

        {/* Photos */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>Photos</Text>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>3 max</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {repairPhotos.slice(0, 3).map((uri, i) => (
              <View key={i} style={{ flex: 1, aspectRatio: 1, position: 'relative' }}>
                <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius: 12, backgroundColor: Colors.fill }} />
                <TouchableOpacity onPress={() => setRepairPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.8}>
                  <Ionicons name="close" size={11} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {repairPhotos.length < 3 && (
              <TouchableOpacity onPress={async () => { const uri = await takePhoto(); if (uri) setRepairPhotos((prev) => [...prev, uri].slice(0, 3)); }}
                activeOpacity={0.75}
                style={{ flex: 1, aspectRatio: 1, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.fill }}>
                <Ionicons name="camera-outline" size={18} color={Colors.ink3} />
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 10, marginTop: 4 }}>Take</Text>
              </TouchableOpacity>
            )}
            {repairPhotos.length < 2 && (
              <TouchableOpacity onPress={async () => { const uris = await pickMultiplePhotos(); if (uris.length) setRepairPhotos((prev) => [...prev, ...uris].slice(0, 3)); }}
                activeOpacity={0.75}
                style={{ flex: 1, aspectRatio: 1, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.fill }}>
                <Ionicons name="images-outline" size={18} color={Colors.ink3} />
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 10, marginTop: 4 }}>Gallery</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Urgency segmented control */}
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14, marginBottom: 10 }}>Urgency</Text>
        <Controller
          control={control}
          name="priority"
          render={({ field: { onChange, value } }) => (
            <View style={{ flexDirection: 'row', backgroundColor: Colors.fill, borderRadius: 14, padding: 3, marginBottom: 16 }}>
              {([
                { value: 'low',    label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high',   label: 'High' },
                { value: 'urgent', label: 'Emergency' },
              ] as const).map((p) => {
                const active = value === p.value;
                return (
                  <TouchableOpacity key={p.value} onPress={() => onChange(p.value)} activeOpacity={0.8}
                    style={{ flex: 1, paddingVertical: 8, borderRadius: 11, alignItems: 'center',
                      backgroundColor: active ? Colors.surface : 'transparent' }}>
                    <Text style={{ fontFamily: active ? Fonts.sansSemiBold : Fonts.sans, fontSize: 12,
                      color: active ? (p.value === 'urgent' ? Colors.danger : Colors.primary) : Colors.muted }}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />

        {/* Helper tip */}
        <View style={{ flexDirection: 'row', gap: 10, backgroundColor: Colors.fill, borderRadius: 14, padding: 12, marginBottom: 20 }}>
          <Text style={{ fontSize: 16 }}>💡</Text>
          <Text style={{ flex: 1, fontFamily: Fonts.sans, fontSize: 12, color: Colors.ink3, lineHeight: 18 }}>
            Cost will be quoted by a verified vendor.{' '}
            <Text style={{ fontFamily: Fonts.sansSemiBold, color: Colors.primary }}>You won't be charged anything yet</Text>
            {' '}— both you and your landlord approve the split before work begins.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => { setShowForm(false); reset(); setRepairPhotos([]); }}
            style={{ flex: 1, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.8}>
            <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 15, color: Colors.primary }}>Save draft</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={submitting}
            style={{ flex: 2, height: 52, borderRadius: 16, backgroundColor: Colors.action, alignItems: 'center', justifyContent: 'center', opacity: submitting ? 0.6 : 1 }} activeOpacity={0.85}>
            <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 15, color: '#fff' }}>
              {submitting ? (repairPhotos.length > 0 ? 'Uploading…' : 'Sending…') : 'Send to Landlord →'}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  </DashboardShell>
  );
}

// ── Repair card (list item) ────────────────────────────────────────────────────

function RepairCard({ repair: r, onPress }: { repair: RepairRequest; onPress: () => void }) {
  const priorityColor = PRIORITY_BORDER[r.priority];
  const { color: pColor, bg: pBg } = PRIORITY_CONFIG[r.priority];
  const isDone = r.status === 'resolved' || r.status === 'closed';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={{
        backgroundColor: Colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        opacity: isDone ? 0.72 : 1,
      }}
    >
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
            <Text numberOfLines={2} style={{ color: Colors.ink2, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18 }}>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
              {formatRelativeTime(r.created_at)}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Repair detail content (shown in bottom sheet) ─────────────────────────────

function RepairDetailContent({ repair: r }: { repair: RepairRequest }) {
  const { color: pColor, bg: pBg } = PRIORITY_CONFIG[r.priority];
  const isDone = r.status === 'resolved' || r.status === 'closed';
  const timeline = buildTimeline(r);

  return (
    <View>
      {/* Header */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <View style={{
            paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20,
            backgroundColor: pBg, flexDirection: 'row', alignItems: 'center', gap: 5,
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pColor }} />
            <Text style={{ color: pColor, fontFamily: Fonts.sansMedium, fontSize: 11 }}>
              {repairPriorityLabel[r.priority]}
            </Text>
          </View>
          <StatusPill kind="repair" value={r.status} />
        </View>
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 22, lineHeight: 28, marginBottom: 4 }}>
          {r.title}
        </Text>
        <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 11 }}>
          Raised {formatRelativeTime(r.created_at)}
        </Text>
      </View>

      {/* Description */}
      <View style={{
        backgroundColor: Colors.fill, borderRadius: 14,
        padding: 14, marginBottom: 16,
      }}>
        <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          Description
        </Text>
        <Text style={{ color: Colors.ink2, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 }}>
          {r.description}
        </Text>
      </View>

      {/* Photos */}
      {(r.photos?.length ?? 0) > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Photos
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {r.photos.map((path, i) => {
              const { data } = supabase.storage.from('repair-photos').getPublicUrl(path);
              return (
                <Image
                  key={i}
                  source={{ uri: data.publicUrl }}
                  style={{ width: 100, height: 100, borderRadius: 12, marginRight: 10, backgroundColor: Colors.fill }}
                />
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Landlord note */}
      {r.landlord_note && (
        <View style={{
          backgroundColor: Colors.actionSoft,
          borderRadius: 14,
          padding: 14,
          marginBottom: 16,
          borderLeftWidth: 3, borderLeftColor: Colors.action,
        }}>
          <Text style={{
            color: Colors.action, fontFamily: Fonts.sansMedium,
            fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
          }}>
            Landlord's Update
          </Text>
          <Text style={{ color: Colors.ink2, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 }}>
            {r.landlord_note}
          </Text>
        </View>
      )}

      {/* Timeline */}
      <View style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Timeline
          </Text>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 11 }}>
            {timeline.filter((e) => e.done).length} events · append-only
          </Text>
        </View>

        {timeline.map((ev, i) => {
          const isLast = i === timeline.length - 1;
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
              {/* Dot + line */}
              <View style={{ alignItems: 'center', width: 16 }}>
                <View style={{
                  width: 14, height: 14, borderRadius: 7,
                  backgroundColor: ev.done ? Colors.action : Colors.fill2,
                  borderWidth: ev.done ? 0 : 1.5,
                  borderColor: Colors.border,
                  marginTop: 3,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {ev.done && <Ionicons name="checkmark" size={8} color="#fff" />}
                </View>
                {!isLast && (
                  <View style={{ width: 1.5, flex: 1, backgroundColor: Colors.border, marginTop: 4, marginBottom: 0 }} />
                )}
              </View>

              {/* Content */}
              <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                <Text style={{
                  color: ev.done ? Colors.primary : Colors.muted,
                  fontFamily: ev.done ? Fonts.sansSemiBold : Fonts.sans,
                  fontSize: 14, lineHeight: 20,
                }}>
                  {ev.label}
                </Text>
                {ev.sub ? (
                  <Text numberOfLines={2} style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 16, marginTop: 1 }}>
                    {ev.sub}
                  </Text>
                ) : null}
                {ev.time ? (
                  <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 11, marginTop: 3 }}>
                    {formatRelativeTime(ev.time)}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {/* Done banner */}
      {isDone && (
        <View style={{
          marginTop: 16, backgroundColor: Colors.successSoft,
          borderRadius: 14, padding: 14,
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={{ color: Colors.success, fontFamily: Fonts.sansMedium, fontSize: 13 }}>
            This request has been {r.status === 'closed' ? 'closed' : 'resolved'} by your landlord.
          </Text>
        </View>
      )}
    </View>
  );
}
