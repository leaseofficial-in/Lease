import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useRepairs, useUpdateRepairNote, useUpdateRepairStatus } from '../../../hooks/useRepairs';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { supabase } from '../../../lib/supabase';
import { RepairRequest, RepairStatus } from '../../../types';
import { formatRelativeTime, repairPriorityLabel, repairStatusLabel } from '../../../lib/formatters';
import { StatusPill } from '../../../components/ui/StatusPill';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingScreen } from '../../../components/ui/LoadingScreen';
import { PageHeader } from '../../../components/ui/PageHeader';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Cap, Chip } from '../../../components/ui/V2';
import { Colors, Fonts } from '../../../constants/theme';
import { isDevAuthUserId } from '../../../lib/devAuth';
import { markLandlordActionsViewed } from '../../../lib/landlordActionViews';
import { markNotificationsRead } from '../../../lib/notificationActions';
import { notifyUser } from '../../../lib/sendPush';

const NEXT_STATUS: Partial<Record<RepairStatus, RepairStatus>> = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: 'closed',
};

const NEXT_LABEL: Partial<Record<RepairStatus, string>> = {
  open: 'Start Work',
  in_progress: 'Mark Resolved',
  resolved: 'Close Request',
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  low:    { color: Colors.ink3,    bg: Colors.fill },
  medium: { color: Colors.warning, bg: Colors.warningSoft },
  high:   { color: Colors.danger,  bg: Colors.dangerSoft },
  urgent: { color: '#C2362F',      bg: '#FBE2E0' },
};

function buildTimeline(r: RepairRequest) {
  const events: { label: string; sub: string; time: string; done: boolean }[] = [];
  events.push({ label: 'Tenant raised request', sub: r.title, time: r.created_at, done: true });
  if (r.status === 'in_progress' || r.status === 'resolved' || r.status === 'closed') {
    events.push({ label: 'Work started', sub: 'Marked in progress', time: r.updated_at, done: true });
  }
  if (r.status === 'resolved' || r.status === 'closed') {
    events.push({ label: 'Marked resolved', sub: r.landlord_note || 'Issue resolved', time: r.resolved_at ?? r.updated_at, done: true });
  }
  if (r.status === 'closed') {
    events.push({ label: 'Request closed', sub: 'No further action needed', time: r.updated_at, done: true });
  }
  if (r.status === 'open') {
    events.push({ label: 'Start work', sub: 'Tap "Start Work" when handling', time: '', done: false });
    events.push({ label: 'Mark resolved', sub: '', time: '', done: false });
  } else if (r.status === 'in_progress') {
    events.push({ label: 'Mark resolved', sub: 'Tap when issue is fixed', time: '', done: false });
  }
  return events;
}

export default function LandlordRepairsScreen() {
  const { rentalId } = useLocalSearchParams<{ rentalId: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [selectedRepair, setSelectedRepair] = useState<RepairRequest | null>(null);
  const isLocalDevUser = isDevAuthUserId(profile?.id);
  const { data, isLoading, refetch, isRefetching } = useRepairs(isLocalDevUser ? undefined : rentalId);
  const updateStatus = useUpdateRepairStatus();
  const updateNote = useUpdateRepairNote();
  const repairs = isLocalDevUser ? [] : data ?? [];

  useEffect(() => {
    const ids = repairs.map((repair) => repair.id);
    if (!profile?.id || !ids.length) return;

    markLandlordActionsViewed(profile.id, 'repairs', ids).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-viewed-actions', profile.id, 'repairs'] });
    });
  }, [profile?.id, queryClient, repairs]);

  useEffect(() => {
    if (!profile?.id || !rentalId) return;

    supabase
      .from('notifications')
      .select('id')
      .eq('user_id', profile.id)
      .eq('read', false)
      .eq('type', 'repair_update')
      .contains('data', { rental_id: rentalId })
      .then(({ data }) => {
        const ids = data?.map((item) => item.id) ?? [];
        if (!ids.length) return;
        markNotificationsRead(ids).then(() => {
          void queryClient.invalidateQueries({ queryKey: ['landlord-unread-notifications', profile.id] });
          void queryClient.invalidateQueries({ queryKey: ['landlord-notifications', profile.id] });
        });
      });
  }, [profile?.id, queryClient, rentalId]);

  const handleSaveNote = async (repair: RepairRequest, note: string) => {
    try {
      await updateNote.mutateAsync({ repairId: repair.id, note, rentalId });
      void notifyUser({
        recipientId: repair.raised_by,
        title: 'Landlord left a note',
        body: `Update on "${repair.title}": ${note.trim()}`,
        type: 'repair_update',
        data: { rental_id: rentalId },
      });
      showToast('Note saved & tenant notified', 'success');
      // Refresh selected repair if it matches
      if (selectedRepair?.id === repair.id) {
        setSelectedRepair({ ...selectedRepair, landlord_note: note });
      }
    } catch {
      showToast('Failed to save note', 'error');
    }
  };

  const handleAdvance = async (repair: RepairRequest) => {
    const next = NEXT_STATUS[repair.status];
    if (!next) return;
    setActioningId(repair.id);
    try {
      await updateStatus.mutateAsync({ repairId: repair.id, status: next, rentalId });
      void notifyUser({
        recipientId: repair.raised_by,
        title: `Repair ${repairStatusLabel[next].toLowerCase()}`,
        body: `"${repair.title}" has been marked as ${repairStatusLabel[next].toLowerCase()} by your landlord.`,
        type: 'repair_update',
        data: { rental_id: rentalId },
      });
      showToast(`Marked as ${repairStatusLabel[next]}`, 'success');
      if (selectedRepair?.id === repair.id) {
        setSelectedRepair({ ...selectedRepair, status: next, updated_at: new Date().toISOString() });
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update status', 'error');
    } finally {
      setActioningId(null);
    }
  };

  if (isLoading) return <LoadingScreen />;

  const needsAction = repairs.filter((r) => r.status === 'open');
  const inProgress = repairs.filter((r) => r.status === 'in_progress');
  const closed = repairs.filter((r) => r.status === 'resolved' || r.status === 'closed');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader
        title="Repair Requests"
        caption="Maintenance"
        onBack={() => router.back()}
        right={repairs.length > 0 ? (
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
            {needsAction.length} new
          </Text>
        ) : undefined}
      />

      {!repairs.length ? (
        <EmptyState
          title="No repair requests"
          subtitle={
            isLocalDevUser
              ? 'Local demo mode skips live maintenance records.'
              : "Your tenant hasn't raised any maintenance issues yet."
          }
          icon={<Ionicons name="construct-outline" size={32} color={Colors.muted} />}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}>
            {/* Stats row */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <StatTile label="New" value={String(needsAction.length)} color={Colors.danger} bg={Colors.dangerSoft} />
              <StatTile label="In work" value={String(inProgress.length)} color={Colors.warning} bg={Colors.warningSoft} />
              <StatTile label="Closed" value={String(closed.length)} color={Colors.success} bg={Colors.successSoft} />
            </View>

            {needsAction.length > 0 && (
              <>
                <Cap style={{ marginBottom: 12 }}>Needs review ({needsAction.length})</Cap>
                {needsAction.map((r) => (
                  <RepairCard
                    key={r.id}
                    repair={r}
                    onPress={() => setSelectedRepair(r)}
                    onAdvance={handleAdvance}
                    advancing={actioningId === r.id}
                  />
                ))}
              </>
            )}

            {inProgress.length > 0 && (
              <>
                <Cap style={{ marginTop: needsAction.length ? 20 : 0, marginBottom: 12 }}>
                  In progress ({inProgress.length})
                </Cap>
                {inProgress.map((r) => (
                  <RepairCard
                    key={r.id}
                    repair={r}
                    onPress={() => setSelectedRepair(r)}
                    onAdvance={handleAdvance}
                    advancing={actioningId === r.id}
                  />
                ))}
              </>
            )}

            {closed.length > 0 && (
              <>
                <Cap style={{ marginTop: 20, marginBottom: 12 }}>Closed ({closed.length})</Cap>
                {closed.map((r) => (
                  <RepairCard
                    key={r.id}
                    repair={r}
                    onPress={() => setSelectedRepair(r)}
                    onAdvance={handleAdvance}
                    advancing={actioningId === r.id}
                  />
                ))}
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Detail Sheet ── */}
      <BottomSheet
        visible={!!selectedRepair}
        onClose={() => setSelectedRepair(null)}
        scrollable
      >
        {selectedRepair && (
          <RepairDetailContent
            repair={selectedRepair}
            onAdvance={handleAdvance}
            advancing={actioningId === selectedRepair.id}
            onSaveNote={handleSaveNote}
          />
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: bg }}>
      <Text style={{ color, fontFamily: Fonts.sansSemiBold, fontSize: 22 }}>{value}</Text>
      <Text style={{ color, fontFamily: Fonts.sansMedium, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

// ── Compact repair card (list) ────────────────────────────────────────────────

function RepairCard({
  repair,
  onPress,
  onAdvance,
  advancing,
}: {
  repair: RepairRequest;
  onPress: () => void;
  onAdvance: (r: RepairRequest) => void;
  advancing: boolean;
}) {
  const isClosed = repair.status === 'closed' || repair.status === 'resolved';
  const { color: pColor, bg: pBg } = PRIORITY_CONFIG[repair.priority] ?? PRIORITY_CONFIG.low;
  const priorityTone = repair.priority === 'urgent' || repair.priority === 'high'
    ? 'bad' : repair.priority === 'medium' ? 'warn' : 'default';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={{
        backgroundColor: Colors.surface, borderRadius: 18,
        borderWidth: 1, borderColor: Colors.border,
        marginBottom: 12, overflow: 'hidden',
        opacity: isClosed ? 0.65 : 1,
      }}
    >
      {/* Priority stripe */}
      <View style={{ height: 3, backgroundColor: PRIORITY_CONFIG[repair.priority]?.color ?? Colors.border }} />

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15, flex: 1, lineHeight: 21 }}>
            {repair.title}
          </Text>
          <StatusPill kind="repair" value={repair.status} />
        </View>

        <Text numberOfLines={2} style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginBottom: 10 }}>
          {repair.description}
        </Text>

        {/* Photos thumbnail strip */}
        {(repair.photos?.length ?? 0) > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {repair.photos.slice(0, 4).map((path, i) => {
              const { data } = supabase.storage.from('repair-photos').getPublicUrl(path);
              return (
                <Image key={i} source={{ uri: data.publicUrl }}
                  style={{ width: 56, height: 56, borderRadius: 8, marginRight: 6, backgroundColor: Colors.fill }} />
              );
            })}
            {repair.photos.length > 4 && (
              <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: Colors.fill2, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansSemiBold, fontSize: 12 }}>+{repair.photos.length - 4}</Text>
              </View>
            )}
          </ScrollView>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Chip tone={priorityTone}>{repairPriorityLabel[repair.priority]}</Chip>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>
              {formatRelativeTime(repair.created_at)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {NEXT_STATUS[repair.status] && (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); onAdvance(repair); }}
                disabled={advancing}
                style={{ backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 }}
                activeOpacity={0.75}
              >
                <Text style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 12 }}>
                  {advancing ? '...' : NEXT_LABEL[repair.status]}
                </Text>
              </TouchableOpacity>
            )}
            <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Full detail content (bottom sheet) ───────────────────────────────────────

function RepairDetailContent({
  repair,
  onAdvance,
  advancing,
  onSaveNote,
}: {
  repair: RepairRequest;
  onAdvance: (r: RepairRequest) => void;
  advancing: boolean;
  onSaveNote: (r: RepairRequest, note: string) => Promise<void>;
}) {
  const [note, setNote] = React.useState(repair.landlord_note ?? '');
  const [savingNote, setSavingNote] = React.useState(false);
  const [noteExpanded, setNoteExpanded] = React.useState(false);
  const isClosed = repair.status === 'closed';
  const { color: pColor, bg: pBg } = PRIORITY_CONFIG[repair.priority] ?? PRIORITY_CONFIG.low;
  const timeline = buildTimeline(repair);

  const handleSave = async () => {
    setSavingNote(true);
    await onSaveNote(repair, note);
    setSavingNote(false);
    setNoteExpanded(false);
  };

  return (
    <View>
      {/* Header */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: pBg, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pColor }} />
            <Text style={{ color: pColor, fontFamily: Fonts.sansMedium, fontSize: 11 }}>
              {repairPriorityLabel[repair.priority]}
            </Text>
          </View>
          <StatusPill kind="repair" value={repair.status} />
        </View>
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 22, lineHeight: 28, marginBottom: 4 }}>
          {repair.title}
        </Text>
        <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 11 }}>
          Raised {formatRelativeTime(repair.created_at)} by tenant
        </Text>
      </View>

      {/* Description */}
      <View style={{ backgroundColor: Colors.fill, borderRadius: 14, padding: 14, marginBottom: 16 }}>
        <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          Description
        </Text>
        <Text style={{ color: Colors.ink2, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 }}>
          {repair.description}
        </Text>
      </View>

      {/* Photos */}
      {(repair.photos?.length ?? 0) > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Tenant Photos ({repair.photos.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {repair.photos.map((path, i) => {
              const { data } = supabase.storage.from('repair-photos').getPublicUrl(path);
              return (
                <Image key={i} source={{ uri: data.publicUrl }}
                  style={{ width: 100, height: 100, borderRadius: 12, marginRight: 10, backgroundColor: Colors.fill }} />
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Note to tenant */}
      {!isClosed && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Note to Tenant
          </Text>
          {noteExpanded ? (
            <View style={{ backgroundColor: Colors.fill, borderRadius: 14, padding: 12 }}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Plumber visiting Thursday 3–5pm"
                placeholderTextColor={Colors.muted}
                multiline
                numberOfLines={3}
                style={{
                  borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
                  padding: 10, fontFamily: Fonts.sans, fontSize: 13,
                  color: Colors.primary, backgroundColor: Colors.surface,
                  minHeight: 72, textAlignVertical: 'top', marginBottom: 10,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={savingNote}
                  style={{ flex: 1, backgroundColor: Colors.action, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>
                    {savingNote ? 'Saving…' : 'Save & Notify Tenant'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setNote(repair.landlord_note ?? ''); setNoteExpanded(false); }}
                  style={{ paddingHorizontal: 16, borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setNoteExpanded(true)}
              activeOpacity={0.78}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: repair.landlord_note ? Colors.actionSoft : Colors.fill,
                borderRadius: 14, padding: 14,
                borderLeftWidth: repair.landlord_note ? 3 : 0,
                borderLeftColor: Colors.action,
              }}
            >
              <Ionicons
                name={repair.landlord_note ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                size={18}
                color={repair.landlord_note ? Colors.action : Colors.muted}
              />
              <Text style={{ color: repair.landlord_note ? Colors.ink2 : Colors.muted, fontFamily: Fonts.sans, fontSize: 14, flex: 1 }} numberOfLines={2}>
                {repair.landlord_note || 'Tap to add an update for your tenant…'}
              </Text>
              <Ionicons name="pencil-outline" size={14} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Existing note (closed tickets) */}
      {isClosed && repair.landlord_note && (
        <View style={{ backgroundColor: Colors.actionSoft, borderRadius: 14, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: Colors.action }}>
          <Text style={{ color: Colors.action, fontFamily: Fonts.sansMedium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
            Your Note
          </Text>
          <Text style={{ color: Colors.ink2, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 }}>
            {repair.landlord_note}
          </Text>
        </View>
      )}

      {/* Timeline */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Timeline
          </Text>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 11 }}>
            {timeline.filter((e) => e.done).length} events · sealed
          </Text>
        </View>

        {timeline.map((ev, i) => {
          const isLast = i === timeline.length - 1;
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
              <View style={{ alignItems: 'center', width: 16 }}>
                <View style={{
                  width: 14, height: 14, borderRadius: 7, marginTop: 3,
                  backgroundColor: ev.done ? Colors.action : Colors.fill2,
                  borderWidth: ev.done ? 0 : 1.5, borderColor: Colors.border,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {ev.done && <Ionicons name="checkmark" size={8} color="#fff" />}
                </View>
                {!isLast && (
                  <View style={{ width: 1.5, flex: 1, backgroundColor: Colors.border, marginTop: 4 }} />
                )}
              </View>
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

      {/* Action buttons */}
      {NEXT_STATUS[repair.status] && (
        <TouchableOpacity
          onPress={() => onAdvance(repair)}
          disabled={advancing}
          style={{
            backgroundColor: Colors.primary, borderRadius: 14,
            paddingVertical: 14, alignItems: 'center', marginTop: 4,
          }}
          activeOpacity={0.78}
        >
          <Text style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
            {advancing ? 'Saving...' : NEXT_LABEL[repair.status]}
          </Text>
        </TouchableOpacity>
      )}

      {isClosed && (
        <View style={{
          marginTop: 12, backgroundColor: Colors.successSoft,
          borderRadius: 14, padding: 14,
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={{ color: Colors.success, fontFamily: Fonts.sansMedium, fontSize: 13 }}>
            This request is closed. No further action needed.
          </Text>
        </View>
      )}
    </View>
  );
}

function statusHint(status: RepairStatus) {
  switch (status) {
    case 'open': return 'New tenant request.';
    case 'in_progress': return 'Work has started.';
    case 'resolved': return 'Resolved. Close when done.';
    case 'closed': return 'Closed.';
    default: return '';
  }
}
