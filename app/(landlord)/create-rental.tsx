import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
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
  propertyName: z.string().min(2, 'Property name required'),
  addressLine1: z.string().min(5, 'Address required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City required'),
  state: z.string().min(2, 'State required'),
  pincode: z.string().length(6, 'Enter valid 6-digit pincode'),
  propertyType: z.enum(['apartment', 'house', 'pg', 'commercial']),
  // monthlyRent validated manually so PG (per-room rents) can skip schema check
  monthlyRent: z.string(),
  maintenanceCharges: z.string().optional(),
  lateFeePercent: z.string().refine((v) => {
    const n = Number(v);
    return n >= 0 && n <= 30;
  }, 'Enter 0–30'),
  depositMode: z.enum(['months', 'flat']),
  depositMonths: z.string(),
  flatDepositAmount: z.string().optional(),
  startDate: z.string().min(1, 'Start date required'),
  leaseDurationMonths: z.enum(['6', '11', '12', '24', 'custom']),
  endDate: z.string().optional(),
  rentDueDay: z.string().refine((v) => {
    const n = Number(v);
    return n >= 1 && n <= 28;
  }, 'Day must be 1–28'),
  noticePeriodDays: z.enum(['30', '60', '90']),
  furnishedStatus: z.enum(['furnished', 'semi_furnished', 'unfurnished']),
});

type FormValues = z.infer<typeof schema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomTenant {
  key: string;
  name: string;
  phone: string;
}

interface Room {
  key: string;
  roomNumber: string;   // e.g., "101", "A-201"
  label: string;        // e.g., "Single", "Double Sharing"
  monthlyRent: string;  // per tenant / per bed
  securityDeposit: string;
  tenants: RoomTenant[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => `${Date.now()}${Math.random().toString(36).slice(2, 5)}`;

const makeTenant = (): RoomTenant => ({ key: `t${uid()}`, name: '', phone: '' });

const makeRoom = (): Room => ({
  key: `r${uid()}`,
  roomNumber: '',
  label: '',
  monthlyRent: '',
  securityDeposit: '',
  tenants: [makeTenant()],
});

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

async function openContactPicker(): Promise<{ name: string; phone: string } | null> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') return null;
    const contact = await Contacts.presentContactPickerAsync();
    if (!contact) return null;
    const raw = contact.phoneNumbers?.[0]?.number ?? '';
    const digits = raw.replace(/[\s\-\(\)\+]/g, '');
    let phone: string;
    if (digits.startsWith('91') && digits.length === 12) {
      phone = digits;
    } else if (digits.startsWith('0') && digits.length === 11) {
      phone = `91${digits.slice(1)}`;
    } else if (digits.length === 10) {
      phone = `91${digits}`;
    } else {
      phone = digits;
    }
    return { name: contact.name ?? '', phone };
  } catch {
    return null;
  }
}

// ─── Consts ───────────────────────────────────────────────────────────────────

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

const ROOM_TYPE_CHIPS = ['Single', 'Double', 'Triple', 'Dorm'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title }: { title: string }) {
  return (
    <Text style={{ color: Colors.muted, fontFamily: Fonts.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 10 }}>
      {title}
    </Text>
  );
}

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
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 14, paddingVertical: 9,
              borderRadius: 20, borderWidth: 1.5,
              borderColor: active ? Colors.action : Colors.border,
              backgroundColor: active ? Colors.action : Colors.surface,
            }}
          >
            {opt.icon && <Ionicons name={opt.icon} size={13} color={active ? '#fff' : Colors.ink2} />}
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

function ContactPicker({
  name,
  phone,
  onPick,
  onClear,
  onNameChange,
  onPhoneChange,
}: {
  name: string;
  phone: string;
  onPick: () => void;
  onClear: () => void;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
}) {
  if (name || phone) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.actionSoft, borderRadius: 14, padding: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.action, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>{name || 'Contact'}</Text>
          <Text style={{ color: Colors.ink3, fontFamily: Fonts.mono, fontSize: 12, marginTop: 2 }}>+{phone}</Text>
        </View>
        <TouchableOpacity onPress={onClear} style={{ padding: 4 }}>
          <Ionicons name="close-circle" size={22} color={Colors.muted} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <TouchableOpacity
        onPress={onPick}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          borderWidth: 1.5, borderColor: Colors.action, borderRadius: 14,
          padding: 14, borderStyle: 'dashed',
        }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.actionSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person-add-outline" size={20} color={Colors.action} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>Pick from Contacts</Text>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>Auto-fill name & phone number</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.action} />
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
        <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11 }}>or type manually</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 12, marginBottom: 5 }}>Name</Text>
          <TextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="Tenant full name"
            placeholderTextColor={Colors.muted}
            style={{
              borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
              paddingHorizontal: 12, paddingVertical: 10,
              fontFamily: Fonts.sans, fontSize: 14, color: Colors.primary,
              backgroundColor: Colors.surface,
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 12, marginBottom: 5 }}>Phone</Text>
          <TextInput
            value={phone}
            onChangeText={onPhoneChange}
            placeholder="9876543210"
            placeholderTextColor={Colors.muted}
            keyboardType="phone-pad"
            maxLength={12}
            style={{
              borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
              paddingHorizontal: 12, paddingVertical: 10,
              fontFamily: Fonts.mono, fontSize: 14, color: Colors.primary,
              backgroundColor: Colors.surface,
            }}
          />
        </View>
      </View>
    </View>
  );
}

// ─── TenantRow — one row inside a room's tenant list ──────────────────────────
// Always shows name + phone inputs so web and iOS work without contacts access.
// On native, also shows a "Pick from Contacts" button that pre-fills the inputs.

function TenantRow({
  tenant,
  index,
  canRemove,
  onPick,
  onRemove,
  onNameChange,
  onPhoneChange,
}: {
  tenant: RoomTenant;
  index: number;
  canRemove: boolean;
  onPick: () => void;
  onRemove: () => void;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.fill, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sansSemiBold, fontSize: 10 }}>{index + 1}</Text>
        </View>
        {/* Contacts picker only available on native */}
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            onPress={onPick}
            activeOpacity={0.8}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: Colors.fill }}
          >
            <Ionicons name="person-add-outline" size={14} color={Colors.action} />
            <Text style={{ color: Colors.action, fontFamily: Fonts.sansMedium, fontSize: 12, flex: 1 }}>Pick from Contacts</Text>
          </TouchableOpacity>
        )}
        {canRemove && (
          <TouchableOpacity onPress={onRemove} style={{ padding: 4 }}>
            <Ionicons name="remove-circle-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* Manual inputs — always visible, filled by contacts picker or typed directly */}
      <View style={{ flexDirection: 'row', gap: 8, paddingLeft: 30 }}>
        <TextInput
          value={tenant.name}
          onChangeText={onNameChange}
          placeholder="Name (optional)"
          placeholderTextColor={Colors.muted}
          style={{ flex: 3, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontFamily: Fonts.sans, fontSize: 13, color: Colors.primary, backgroundColor: Colors.fill }}
        />
        <TextInput
          value={tenant.phone}
          onChangeText={onPhoneChange}
          placeholder="Phone"
          placeholderTextColor={Colors.muted}
          keyboardType="phone-pad"
          maxLength={12}
          style={{ flex: 2, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontFamily: Fonts.mono, fontSize: 13, color: Colors.primary, backgroundColor: Colors.fill }}
        />
      </View>
    </View>
  );
}

// ─── RoomCard ─────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  index,
  canRemove,
  onUpdate,
  onRemove,
  onAddTenant,
  onRemoveTenant,
  onPickContact,
  onUpdateTenant,
  showErrors,
}: {
  room: Room;
  index: number;
  canRemove: boolean;
  onUpdate: (key: string, patch: Partial<Omit<Room, 'tenants'>>) => void;
  onRemove: (key: string) => void;
  onAddTenant: (roomKey: string) => void;
  onRemoveTenant: (roomKey: string, tenantKey: string) => void;
  onPickContact: (roomKey: string, tenantKey: string) => void;
  onUpdateTenant: (roomKey: string, tenantKey: string, patch: Partial<RoomTenant>) => void;
  showErrors: boolean;
}) {
  const activeTenants = room.tenants.filter((t) => t.name || t.phone).length;
  const roomNumberError = showErrors && !room.roomNumber.trim() ? 'Room number required' : '';
  const rentError = showErrors && Number(room.monthlyRent) < 500 ? 'Minimum ₹500 per bed' : '';

  return (
    <View style={{
      backgroundColor: Colors.surface, borderRadius: 16,
      borderWidth: 1, borderColor: Colors.border,
      padding: 16, marginBottom: 12,
    }}>
      {/* Card header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          <Text style={{ color: '#fff', fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
            {room.roomNumber ? `Room ${room.roomNumber}` : `Room ${index + 1}`}
            {room.label ? ` · ${room.label}` : ''}
          </Text>
          {activeTenants > 0 && (
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11, marginTop: 1 }}>
              {activeTenants} tenant{activeTenants > 1 ? 's' : ''} assigned
            </Text>
          )}
        </View>
        {canRemove && (
          <TouchableOpacity onPress={() => onRemove(room.key)} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* Room Number + Type */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 12, marginBottom: 5 }}>
            Room No. <Text style={{ color: Colors.danger }}>*</Text>
          </Text>
          <TextInput
            value={room.roomNumber}
            onChangeText={(v) => onUpdate(room.key, { roomNumber: v })}
            placeholder="101"
            placeholderTextColor={Colors.muted}
            style={{
              borderWidth: 1,
              borderColor: roomNumberError ? Colors.danger : Colors.border,
              borderRadius: 10,
              paddingHorizontal: 12, paddingVertical: 10,
              fontFamily: Fonts.sansMedium, fontSize: 15, color: Colors.primary,
              backgroundColor: roomNumberError ? Colors.dangerSoft : Colors.fill,
            }}
          />
          {!!roomNumberError && (
            <Text style={{ color: Colors.danger, fontFamily: Fonts.sans, fontSize: 11, marginTop: 4 }}>
              {roomNumberError}
            </Text>
          )}
        </View>
        <View style={{ flex: 2 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 12, marginBottom: 5 }}>
            Room Type
          </Text>
          <TextInput
            value={room.label}
            onChangeText={(v) => onUpdate(room.key, { label: v })}
            placeholder="e.g. Double Sharing"
            placeholderTextColor={Colors.muted}
            style={{
              borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
              paddingHorizontal: 12, paddingVertical: 10,
              fontFamily: Fonts.sans, fontSize: 14, color: Colors.primary,
              backgroundColor: Colors.fill,
            }}
          />
        </View>
      </View>

      {/* Quick room-type chips */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
        {ROOM_TYPE_CHIPS.map((chip) => {
          const active = room.label === chip;
          return (
            <TouchableOpacity
              key={chip}
              onPress={() => onUpdate(room.key, { label: active ? '' : chip })}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
                borderWidth: 1,
                borderColor: active ? Colors.action : Colors.border,
                backgroundColor: active ? Colors.actionSoft : Colors.fill,
              }}
            >
              <Text style={{ fontFamily: Fonts.sansMedium, fontSize: 11, color: active ? Colors.action : Colors.muted }}>
                {chip}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rent + Deposit */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 12, marginBottom: 5 }}>
            Rent / bed <Text style={{ color: Colors.danger }}>*</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: rentError ? Colors.danger : Colors.border, borderRadius: 10, backgroundColor: rentError ? Colors.dangerSoft : Colors.fill }}>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 15, paddingLeft: 10 }}>₹</Text>
            <TextInput
              value={room.monthlyRent}
              onChangeText={(v) => onUpdate(room.key, { monthlyRent: v })}
              placeholder="8000"
              placeholderTextColor={Colors.muted}
              keyboardType="number-pad"
              style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 10, fontFamily: Fonts.sans, fontSize: 14, color: Colors.primary }}
            />
          </View>
          {!!rentError && (
            <Text style={{ color: Colors.danger, fontFamily: Fonts.sans, fontSize: 11, marginTop: 4 }}>
              {rentError}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 12, marginBottom: 5 }}>
            Deposit / bed
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 10, backgroundColor: Colors.fill }}>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 15, paddingLeft: 10 }}>₹</Text>
            <TextInput
              value={room.securityDeposit}
              onChangeText={(v) => onUpdate(room.key, { securityDeposit: v })}
              placeholder="16000"
              placeholderTextColor={Colors.muted}
              keyboardType="number-pad"
              style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 10, fontFamily: Fonts.sans, fontSize: 14, color: Colors.primary }}
            />
          </View>
        </View>
      </View>

      {/* Tenants */}
      <View style={{ borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Cap>Tenants ({room.tenants.length})</Cap>
          <TouchableOpacity
            onPress={() => onAddTenant(room.key)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            activeOpacity={0.75}
          >
            <Ionicons name="add-circle-outline" size={16} color={Colors.action} />
            <Text style={{ color: Colors.action, fontFamily: Fonts.sansMedium, fontSize: 12 }}>Add tenant</Text>
          </TouchableOpacity>
        </View>

        {room.tenants.map((tenant, i) => (
          <TenantRow
            key={tenant.key}
            tenant={tenant}
            index={i}
            canRemove={room.tenants.length > 1}
            onPick={() => onPickContact(room.key, tenant.key)}
            onNameChange={(name) => onUpdateTenant(room.key, tenant.key, { name })}
            onPhoneChange={(phone) => onUpdateTenant(room.key, tenant.key, { phone })}
            onRemove={() => onRemoveTenant(room.key, tenant.key)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function CreateRentalScreen() {
  const router = useRouter();
  const { propertyId: existingPropertyId } = useLocalSearchParams<{ propertyId?: string }>();
  const { profile } = useAuthStore();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<0 | 1 | 2>(existingPropertyId ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [rooms, setRooms] = useState<Room[]>([makeRoom()]);
  const [rentError, setRentError] = useState('');
  const [pgSubmitAttempted, setPgSubmitAttempted] = useState(false);

  const { data: existingProperty } = useQuery({
    queryKey: ['property-for-rental', existingPropertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address_line1, city, state, pincode, property_type')
        .eq('id', existingPropertyId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!existingPropertyId,
  });

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyName: existingProperty?.name ?? '',
      addressLine1: existingProperty?.address_line1 ?? '',
      city: existingProperty?.city ?? '',
      state: existingProperty?.state ?? '',
      pincode: existingProperty?.pincode ?? '',
      propertyType: (existingProperty?.property_type as FormValues['propertyType']) ?? 'apartment',
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

  const watchedMonthlyRent = useWatch({ control, name: 'monthlyRent' });
  const watchedDepositMode = useWatch({ control, name: 'depositMode' });
  const watchedDepositMonths = useWatch({ control, name: 'depositMonths' });
  const watchedStartDate = useWatch({ control, name: 'startDate' });
  const watchedLeaseDuration = useWatch({ control, name: 'leaseDurationMonths' });
  const watchedPropertyType = useWatch({ control, name: 'propertyType' });

  const isPg = watchedPropertyType === 'pg'
    || (!!existingPropertyId && existingProperty?.property_type === 'pg');

  const computedDeposit =
    watchedDepositMode === 'months' && Number(watchedDepositMonths) > 0 && Number(watchedMonthlyRent) >= 500
      ? Number(watchedDepositMonths) * Number(watchedMonthlyRent)
      : null;

  const computedEndDate =
    watchedLeaseDuration !== 'custom' && watchedStartDate?.length === 10
      ? addMonths(watchedStartDate, Number(watchedLeaseDuration))
      : null;

  // ─── Room / tenant mutators ─────────────────────────────────────────────────

  const updateRoom = (key: string, patch: Partial<Omit<Room, 'tenants'>>) =>
    setRooms((prev) => prev.map((r) => r.key === key ? { ...r, ...patch } : r));

  const removeRoom = (key: string) =>
    setRooms((prev) => prev.filter((r) => r.key !== key));

  const addRoom = () => setRooms((prev) => [...prev, makeRoom()]);

  const addTenant = (roomKey: string) =>
    setRooms((prev) => prev.map((r) =>
      r.key === roomKey ? { ...r, tenants: [...r.tenants, makeTenant()] } : r
    ));

  const removeTenant = (roomKey: string, tenantKey: string) =>
    setRooms((prev) => prev.map((r) =>
      r.key === roomKey
        ? { ...r, tenants: r.tenants.filter((t) => t.key !== tenantKey) }
        : r
    ));

  const patchTenant = (roomKey: string, tenantKey: string, patch: Partial<RoomTenant>) =>
    setRooms((prev) => prev.map((r) =>
      r.key === roomKey
        ? { ...r, tenants: r.tenants.map((t) => t.key === tenantKey ? { ...t, ...patch } : t) }
        : r
    ));

  const handlePickContactForTenant = async (roomKey: string, tenantKey: string) => {
    const result = await openContactPicker();
    if (!result) { showToast('Allow contacts access to pick a tenant', 'error'); return; }
    patchTenant(roomKey, tenantKey, { name: result.name, phone: result.phone });
  };

  const handlePickContact = async () => {
    const result = await openContactPicker();
    if (!result) { showToast('Allow contacts access to pick a tenant', 'error'); return; }
    setTenantName(result.name);
    setTenantPhone(result.phone);
  };

  // ─── Step navigation ────────────────────────────────────────────────────────

  const goNext = async () => {
    if (step === 0) {
      const valid = await trigger(['propertyName', 'addressLine1', 'city', 'state', 'pincode', 'propertyType']);
      if (valid) setStep(1);
    } else if (step === 1) {
      const sharedFields: (keyof FormValues)[] = ['startDate', 'rentDueDay', 'noticePeriodDays', 'furnishedStatus', 'lateFeePercent', 'leaseDurationMonths'];
      if (!isPg) {
        if (Number(watchedMonthlyRent) < 500) {
          setRentError('Monthly rent must be at least ₹500');
          return;
        }
        const valid = await trigger([...sharedFields, 'monthlyRent', 'depositMode', 'depositMonths']);
        if (valid) setStep(2);
      } else {
        const valid = await trigger(sharedFields);
        if (valid) setStep(2);
      }
    }
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = async (values: FormValues) => {
    if (!profile) return;

    if (!isPg && Number(values.monthlyRent) < 500) {
      setRentError('Monthly rent must be at least ₹500');
      return;
    }
    if (isPg) {
      const badRoom = rooms.find((r) => !r.roomNumber.trim() || Number(r.monthlyRent) < 500);
      if (badRoom) {
        setPgSubmitAttempted(true);
        return;
      }
    }

    setLoading(true);
    try {
      const endDate =
        values.leaseDurationMonths === 'custom'
          ? (values.endDate || undefined)
          : addMonths(values.startDate, Number(values.leaseDurationMonths));

      if (isDevAuthUserId(profile.id)) {
        const firstRoom = rooms[0];
        const securityDeposit = isPg
          ? (firstRoom?.securityDeposit || '0')
          : values.depositMode === 'months'
          ? String(Number(values.depositMonths) * Number(values.monthlyRent))
          : (values.flatDepositAmount || '0');

        const rental = await createLocalRental(
          {
            ...values,
            monthlyRent: isPg ? (firstRoom?.monthlyRent || '0') : values.monthlyRent,
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
        showToast('Rental created locally.', 'success');
        router.replace(`/(landlord)/property/${rental.property_id}`);
        return;
      }

      // Create or reuse property
      let propertyId = existingPropertyId ?? null;
      if (!propertyId) {
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
        propertyId = property.id;
      }

      const sharedTerms = {
        property_id: propertyId,
        landlord_id: profile.id,
        rent_due_day: Number(values.rentDueDay),
        start_date: values.startDate,
        end_date: endDate ?? null,
        notice_period_days: Number(values.noticePeriodDays),
        furnished_status: values.furnishedStatus,
        late_fee_percent: Number(values.lateFeePercent),
        maintenance_charges: Number(values.maintenanceCharges || 0),
        status: 'pending_tenant' as const,
      };

      let totalRentalsCreated = 0;

      if (isPg) {
        // Each tenant slot = one rental row (one invite link / one agreement)
        for (const room of rooms) {
          for (const tenant of room.tenants) {
            await supabase.from('rentals').insert({
              ...sharedTerms,
              monthly_rent: Number(room.monthlyRent),
              security_deposit: Number(room.securityDeposit) || 0,
              room_number: room.roomNumber.trim() || null,
              room_label: room.label.trim() || null,
            });
            totalRentalsCreated++;
          }
        }
        // WhatsApp invites: don't auto-open multiple; landlord shares from property page
      } else {
        const securityDeposit =
          values.depositMode === 'months'
            ? Number(values.depositMonths) * Number(values.monthlyRent)
            : Number(values.flatDepositAmount || 0);

        const { data: rental, error: rentalError } = await supabase
          .from('rentals')
          .insert({
            ...sharedTerms,
            monthly_rent: Number(values.monthlyRent),
            security_deposit: securityDeposit,
          })
          .select()
          .single();
        if (rentalError) throw rentalError;
        totalRentalsCreated = 1;

        if (tenantPhone && rental?.invite_token) {
          const inviteUrl = `flatvio://join/${rental.invite_token}`;
          const firstName = (tenantName || 'there').split(' ')[0];
          const propName = values.propertyName || existingProperty?.name || 'the property';
          const msg = `Hi ${firstName}! You've been invited to join ${propName} on Flatvio. Tap to set up your rental: ${inviteUrl}`;
          await Linking.openURL(`https://wa.me/${tenantPhone}?text=${encodeURIComponent(msg)}`);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['landlord-rentals'] });
      await queryClient.invalidateQueries({ queryKey: ['rental-by-property', propertyId] });

      const msg = isPg
        ? `${rooms.length} room${rooms.length > 1 ? 's' : ''}, ${totalRentalsCreated} beds created. Share invite links from the property page.`
        : tenantPhone
        ? 'Rental created! Invite sent via WhatsApp.'
        : 'Rental created! Share the invite link with your tenant.';
      showToast(msg, 'success');
      router.replace(`/(landlord)/property/${propertyId}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create rental', 'error');
    } finally {
      setLoading(false);
    }
  };

  const stepsForDots = existingPropertyId ? [1, 2] : [0, 1, 2];
  const totalBeds = rooms.reduce((s, r) => s + r.tenants.length, 0);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1, borderBottomColor: Colors.border,
        }}>
          <TouchableOpacity
            onPress={() => {
              if (step === 0 || (existingPropertyId && step === 1)) router.back();
              else setStep((s) => (s - 1) as 0 | 1 | 2);
            }}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Cap>{existingPropertyId ? existingProperty?.name ?? 'Property' : 'Landlord'}</Cap>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, marginTop: 1 }}>
              {existingPropertyId ? 'New Rental' : 'Create Rental'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
            {stepsForDots.map((s) => (
              <View
                key={s}
                style={{
                  height: 6, borderRadius: 3,
                  width: step === s ? 24 : 8,
                  backgroundColor: step === s ? Colors.action : step > s ? `${Colors.action}55` : Colors.border,
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
              {step === 0
                ? 'Property'
                : step === 1
                ? (isPg ? 'Shared Terms' : 'Rental Terms')
                : (isPg ? 'Rooms & Tenants' : 'Invite Tenant')}
            </Text>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13 }}>
              {step === 0
                ? 'Step 1 of 3'
                : step === 1
                ? isPg ? 'Step 2 of 3 — Applies to all rooms' : existingPropertyId ? 'Step 1 of 2' : 'Step 2 of 3'
                : isPg ? `Step 3 of 3 — ${rooms.length} room${rooms.length > 1 ? 's' : ''}, ${totalBeds} bed${totalBeds > 1 ? 's' : ''}` : existingPropertyId ? 'Step 2 of 2 — Optional' : 'Step 3 of 3 — Optional'}
            </Text>
          </View>

          {/* ─── Step 0: Property ─────────────────────────────────────────── */}
          {step === 0 && (
            <>
              <Controller
                control={control}
                name="propertyName"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Property Name"
                    placeholder="e.g. Sunshine PG, Sai Hostel"
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
                  <ChipSelect value={value} options={propertyTypes} onChange={onChange} />
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

          {/* ─── Step 1: Rental Terms ─────────────────────────────────────── */}
          {step === 1 && (
            <>
              {isPg && (
                <View style={{ backgroundColor: Colors.actionSoft, borderRadius: 14, padding: 14, marginBottom: 4, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Ionicons name="information-circle-outline" size={18} color={Colors.action} style={{ marginTop: 1 }} />
                  <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, flex: 1 }}>
                    PG mode: rent and deposit are set per room in the next step. These shared terms apply to all rooms.
                  </Text>
                </View>
              )}

              {!isPg && (
                <>
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
                            onChangeText={(v) => { onChange(v); if (rentError) setRentError(''); }}
                            keyboardType="number-pad"
                            error={rentError || errors.monthlyRent?.message}
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
                </>
              )}

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
                  <ChipSelect value={value} options={leaseDurations} onChange={onChange} />
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
                  <ChipSelect value={value} options={furnishedOptions} onChange={onChange} />
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
                title={isPg ? 'Next: Set Up Rooms' : 'Next: Invite Tenant'}
                onPress={goNext}
                fullWidth
                size="lg"
                style={{ marginTop: 8 }}
              />
            </>
          )}

          {/* ─── Step 2: Rooms (PG) ───────────────────────────────────────── */}
          {step === 2 && isPg && (
            <>
              {rooms.map((room, i) => (
                <RoomCard
                  key={room.key}
                  room={room}
                  index={i}
                  canRemove={rooms.length > 1}
                  onUpdate={updateRoom}
                  onRemove={removeRoom}
                  onAddTenant={addTenant}
                  onRemoveTenant={removeTenant}
                  onPickContact={handlePickContactForTenant}
                  onUpdateTenant={patchTenant}
                  showErrors={pgSubmitAttempted}
                />
              ))}

              <TouchableOpacity
                onPress={addRoom}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
                  borderRadius: 14, padding: 14, marginBottom: 16,
                }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="add" size={22} color={Colors.action} />
                </View>
                <View>
                  <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>Add another room</Text>
                  <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>
                    {rooms.length} room{rooms.length > 1 ? 's' : ''} · {totalBeds} bed{totalBeds > 1 ? 's' : ''} total
                  </Text>
                </View>
              </TouchableOpacity>

              {pgSubmitAttempted && rooms.some((r) => !r.roomNumber.trim() || Number(r.monthlyRent) < 500) && (
                <View style={{
                  flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                  backgroundColor: Colors.dangerSoft, borderRadius: 12,
                  padding: 12, marginBottom: 12,
                  borderWidth: 1, borderColor: '#F5B8B5',
                }}>
                  <Ionicons name="alert-circle-outline" size={17} color={Colors.danger} style={{ marginTop: 1 }} />
                  <Text style={{ color: Colors.danger, fontFamily: Fonts.sansMedium, fontSize: 13, flex: 1, lineHeight: 19 }}>
                    {rooms.filter((r) => !r.roomNumber.trim() || Number(r.monthlyRent) < 500).length === 1
                      ? 'One room is missing a room number or valid rent (min ₹500).'
                      : `${rooms.filter((r) => !r.roomNumber.trim() || Number(r.monthlyRent) < 500).length} rooms are missing a room number or valid rent (min ₹500).`}
                  </Text>
                </View>
              )}

              <Button
                title={`Create ${rooms.length} Room${rooms.length > 1 ? 's' : ''} (${totalBeds} Beds)`}
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                fullWidth
                size="lg"
              />
            </>
          )}

          {/* ─── Step 2: Invite Tenant (non-PG) ──────────────────────────── */}
          {step === 2 && !isPg && (
            <View style={{ gap: 16 }}>
              <View style={{ backgroundColor: Colors.fill, borderRadius: 14, padding: 14 }}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                  <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
                    Share invite via WhatsApp
                  </Text>
                </View>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
                  Pick your tenant from contacts and we'll open WhatsApp with their invite link right after creating the rental.
                </Text>
              </View>

              <ContactPicker
                name={tenantName}
                phone={tenantPhone}
                onPick={handlePickContact}
                onClear={() => { setTenantName(''); setTenantPhone(''); }}
                onNameChange={setTenantName}
                onPhoneChange={setTenantPhone}
              />

              <Button
                title={tenantPhone ? 'Create Rental & Send Invite' : 'Create Rental'}
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                fullWidth
                size="lg"
              />

              {!tenantPhone && (
                <TouchableOpacity
                  onPress={handleSubmit(onSubmit)}
                  style={{ alignItems: 'center', paddingVertical: 6 }}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13 }}>
                    Skip — I'll share the invite link later
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
