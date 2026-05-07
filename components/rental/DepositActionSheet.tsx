import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Colors, Fonts } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/formatters';
import { useUIStore } from '../../stores/uiStore';
import { DepositTransaction } from '../../types';

export type DepositMode = 'received' | 'deduction' | 'settle';

type PayMethod = 'upi' | 'bank_transfer' | 'cash';
type Category = 'damage' | 'cleaning' | 'unpaid_rent' | 'other';

const PAY_METHODS: { value: PayMethod; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank' },
  { value: 'cash', label: 'Cash' },
];

const CATEGORIES: {
  value: Category;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { value: 'damage',      label: 'Damage',      icon: 'alert-circle-outline' },
  { value: 'cleaning',    label: 'Cleaning',    icon: 'sparkles-outline' },
  { value: 'unpaid_rent', label: 'Unpaid Rent', icon: 'cash-outline' },
  { value: 'other',       label: 'Other',       icon: 'ellipsis-horizontal-circle-outline' },
];

const CATEGORY_LABELS: Record<Category, string> = {
  damage: 'Damage',
  cleaning: 'Cleaning',
  unpaid_rent: 'Unpaid Rent',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<Category, { bg: string; text: string }> = {
  damage:      { bg: Colors.dangerSoft,  text: Colors.danger },
  cleaning:    { bg: Colors.actionSoft,  text: Colors.action },
  unpaid_rent: { bg: '#FEF3C7',          text: '#D97706' },
  other:       { bg: Colors.fill,        text: Colors.ink3 },
};

export function categoryLabel(cat: string | null): string {
  return cat ? CATEGORY_LABELS[cat as Category] ?? cat : '';
}

interface Props {
  visible: boolean;
  mode: DepositMode;
  rentalId: string;
  securityDeposit: number;
  currentBalance: number;
  profileId: string;
  roomLabel?: string | null;
  tenantName?: string | null;
  isLocalDevUser?: boolean;
  onLocalTransaction?: (txn: DepositTransaction) => void;
  onClose: () => void;
  onSuccess: () => void;
}

export const DepositActionSheet: React.FC<Props> = ({
  visible, mode, rentalId, securityDeposit, currentBalance,
  profileId, roomLabel, tenantName, isLocalDevUser,
  onLocalTransaction, onClose, onSuccess,
}) => {
  const { showToast } = useUIStore();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('upi');
  const [reference, setReference] = useState('');
  const [category, setCategory] = useState<Category>('damage');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setAmount('');
      setNote('');
      setReference('');
      setPayMethod('upi');
      setCategory('damage');
      return;
    }
    if (mode === 'received') setAmount(String(securityDeposit));
    if (mode === 'settle')   setAmount(String(Math.max(0, currentBalance)));
  }, [visible, mode, securityDeposit, currentBalance]);

  const refundAmt     = Math.max(0, currentBalance);
  const totalDeducted = securityDeposit - currentBalance;

  const MODES = {
    received: { title: 'Record Deposit Received', subtitle: 'Confirm you received the security deposit from your tenant', btn: 'Save' },
    deduction: { title: 'Add Deduction',          subtitle: 'Record a deduction from the security deposit',              btn: 'Save Deduction' },
    settle:   { title: 'Settle Deposit',           subtitle: 'Record the final refund to close the deposit account',     btn: 'Confirm Settlement' },
  } as const;

  const { title, subtitle, btn } = MODES[mode];

  const handleSave = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }
    if (mode === 'deduction' && !note.trim()) { showToast('Add a description for this deduction', 'error'); return; }

    setSaving(true);
    try {
      const base = { rental_id: rentalId, created_by: profileId, amount: amt };

      let payload: Record<string, unknown>;
      if (mode === 'received') {
        payload = {
          ...base, type: 'received',
          note: `Deposit received`,
          payment_method: payMethod,
          reference: reference.trim() || null,
        };
      } else if (mode === 'deduction') {
        payload = { ...base, type: 'deduction', note: note.trim(), category };
      } else {
        payload = {
          ...base, type: 'refund',
          note: `Deposit refunded`,
          payment_method: payMethod,
          reference: reference.trim() || null,
        };
      }

      if (isLocalDevUser) {
        onLocalTransaction?.({
          id: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
          rental_id: rentalId,
          type: payload.type as DepositTransaction['type'],
          amount: amt,
          note: payload.note as string,
          created_by: profileId,
          category:        (payload.category        as Category  | undefined) ?? null,
          payment_method:  (payload.payment_method  as PayMethod | undefined) ?? null,
          reference:       (payload.reference       as string    | undefined) ?? null,
        });
      } else {
        const { error } = await supabase.from('deposit_transactions').insert(payload);
        if (error) throw error;
      }

      const msg = mode === 'received' ? 'Deposit recorded' : mode === 'deduction' ? 'Deduction added' : 'Settlement confirmed';
      showToast(msg, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable maxHeight="90%">
      {/* Header */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 20 }}>
          {title}
        </Text>
        <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, marginTop: 4, lineHeight: 19 }}>
          {subtitle}
        </Text>
        {(roomLabel || tenantName) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            {roomLabel && (
              <View style={{ backgroundColor: Colors.fill, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 12 }}>{roomLabel}</Text>
              </View>
            )}
            {tenantName && (
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12 }}>{tenantName}</Text>
            )}
          </View>
        )}
      </View>

      {/* Settle: Summary card */}
      {mode === 'settle' && (
        <View style={{
          backgroundColor: Colors.fill, borderRadius: 16, padding: 16, marginBottom: 20,
          borderWidth: 1, borderColor: Colors.border,
        }}>
          <SummaryRow label="Security Deposit" value={formatCurrency(securityDeposit)} />
          {totalDeducted > 0 && (
            <SummaryRow label="Total Deductions" value={`–${formatCurrency(totalDeducted)}`} color={Colors.danger} />
          )}
          <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 10 }} />
          <SummaryRow label="Refund Amount" value={formatCurrency(refundAmt)} color={Colors.success} bold />
        </View>
      )}

      {/* Deduction: Category */}
      {mode === 'deduction' && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 10 }}>
            Category
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setCategory(cat.value)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5,
                  backgroundColor: category === cat.value ? Colors.primary : Colors.surface,
                  borderColor:     category === cat.value ? Colors.primary : Colors.border,
                }}
                activeOpacity={0.75}
              >
                <Ionicons name={cat.icon} size={14} color={category === cat.value ? '#fff' : Colors.ink3} />
                <Text style={{
                  color: category === cat.value ? '#fff' : Colors.primary,
                  fontFamily: Fonts.sansMedium, fontSize: 13,
                }}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Amount */}
      <Input
        label={mode === 'received' ? 'Deposit Amount' : mode === 'deduction' ? 'Deduction Amount' : 'Refund Amount'}
        placeholder="10000"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        required
      />

      {/* Deduction: Description */}
      {mode === 'deduction' && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 8 }}>
            Description <Text style={{ color: Colors.danger }}>*</Text>
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Describe what was damaged or the reason for this deduction..."
            placeholderTextColor={Colors.muted}
            multiline
            numberOfLines={3}
            style={{
              borderWidth: 1, borderColor: Colors.border, borderRadius: 14,
              padding: 12, minHeight: 80, textAlignVertical: 'top',
              fontFamily: Fonts.sans, fontSize: 14, color: Colors.primary,
              backgroundColor: Colors.fill,
            }}
          />
        </View>
      )}

      {/* Received / Settle: Payment Method */}
      {mode !== 'deduction' && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, marginBottom: 10 }}>
            Payment Method
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PAY_METHODS.map((pm) => (
              <TouchableOpacity
                key={pm.value}
                onPress={() => setPayMethod(pm.value)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, alignItems: 'center',
                  backgroundColor: payMethod === pm.value ? Colors.primary : Colors.surface,
                  borderColor:     payMethod === pm.value ? Colors.primary : Colors.border,
                }}
                activeOpacity={0.75}
              >
                <Text style={{
                  color: payMethod === pm.value ? '#fff' : Colors.primary,
                  fontFamily: Fonts.sansMedium, fontSize: 13,
                }}>
                  {pm.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Received / Settle: Reference */}
      {mode !== 'deduction' && (
        <Input
          label={
            payMethod === 'upi'          ? 'UPI Reference (optional)'
            : payMethod === 'bank_transfer' ? 'UTR Number (optional)'
            : 'Receipt Note (optional)'
          }
          placeholder={
            payMethod === 'upi'          ? 'e.g. 123456789012'
            : payMethod === 'bank_transfer' ? 'e.g. NEFT/IMPS UTR'
            : 'e.g. Cash collected on 1 Jan'
          }
          value={reference}
          onChangeText={setReference}
        />
      )}

      <Button title={btn} onPress={handleSave} loading={saving} fullWidth size="lg" style={{ marginTop: 8 }} />
    </BottomSheet>
  );
};

function SummaryRow({
  label, value, color, bold,
}: {
  label: string; value: string; color?: string; bold?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: color ?? Colors.primary, fontFamily: bold ? Fonts.sansSemiBold : Fonts.sansMedium, fontSize: bold ? 15 : 13 }}>
        {value}
      </Text>
    </View>
  );
}
