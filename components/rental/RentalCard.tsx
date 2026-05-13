import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Rental } from '../../types';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { getUnitVocab } from '../../lib/unitVocab';
import { StatusPill } from '../ui/StatusPill';
import { Avatar } from '../ui/Avatar';
import { Cap, Chip } from '../ui/V2';
import { Colors, Fonts, Shadow } from '../../constants/theme';

// ─── Property type design tokens ──────────────────────────────────────────────

const TYPE_CONFIG = {
  apartment: {
    icon: 'business-outline' as const,
    label: 'Apartment',
    accent: Colors.action,
    soft: Colors.actionSoft,
  },
  house: {
    icon: 'home-outline' as const,
    label: 'House',
    accent: Colors.success,
    soft: Colors.successSoft,
  },
  pg: {
    icon: 'bed-outline' as const,
    label: 'PG / Hostel',
    accent: Colors.warning,
    soft: Colors.warningSoft,
  },
  commercial: {
    icon: 'storefront-outline' as const,
    label: 'Commercial',
    accent: Colors.ink2,
    soft: Colors.fill2,
  },
} as const;

type PropertyType = keyof typeof TYPE_CONFIG;
type TypeConfig = typeof TYPE_CONFIG[PropertyType];

function getConfig(type?: string | null): TypeConfig {
  return TYPE_CONFIG[(type as PropertyType)] ?? TYPE_CONFIG.apartment;
}

function daysRemaining(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

function leaseProgress(start: string, end?: string | null): number {
  if (!end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(0, Math.min(1, (Date.now() - s) / (e - s)));
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function MetricCell({
  label,
  value,
  valueColor,
  align = 'left',
}: {
  label: string;
  value: string;
  valueColor?: string;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start' }}>
      <Text numberOfLines={1} style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 0.6, marginBottom: 3 }}>
        {label.toUpperCase()}
      </Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: valueColor ?? Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
        {value}
      </Text>
    </View>
  );
}

function SectionDivider() {
  return <View style={{ height: 1, backgroundColor: Colors.borderSoft, marginHorizontal: 16 }} />;
}

function OccupancyDots({
  activeBeds,
  totalBeds,
  accentColor,
}: {
  activeBeds: number;
  totalBeds: number;
  accentColor: string;
}) {
  if (totalBeds > 12) {
    const pct = totalBeds > 0 ? activeBeds / totalBeds : 0;
    return (
      <View>
        <View style={{ height: 6, backgroundColor: Colors.fill, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${Math.round(pct * 100)}%`, backgroundColor: accentColor, borderRadius: 3 }} />
        </View>
        <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 10, marginTop: 5 }}>
          {activeBeds} of {totalBeds} beds filled
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {Array.from({ length: totalBeds }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            backgroundColor: i < activeBeds ? accentColor : Colors.fill,
            borderWidth: i < activeBeds ? 0 : 1,
            borderColor: Colors.border,
          }}
        />
      ))}
    </View>
  );
}

// ─── Residential section (apartment + house) ──────────────────────────────────

function ResidentialSection({
  rent,
  deposit,
  startDate,
  endDate,
  daysLeft,
  progress,
  leaseUrgent,
  leaseWarning,
  accentColor,
  person,
  personLabel,
  status,
  archived,
}: {
  rent: number;
  deposit: number;
  startDate: string;
  endDate?: string | null;
  daysLeft: number | null;
  progress: number;
  leaseUrgent: boolean;
  leaseWarning: boolean;
  accentColor: string;
  person?: { full_name?: string | null; phone?: string | null; avatar_url?: string | null } | null;
  personLabel: string;
  status: string;
  archived: boolean;
}) {
  const leaseValueColor = leaseUrgent ? Colors.danger : leaseWarning ? Colors.warning : Colors.primary;
  const barColor = leaseUrgent ? Colors.danger : leaseWarning ? Colors.warning : accentColor;

  return (
    <>
      <View style={{ flexDirection: 'row', padding: 16, paddingTop: 14, paddingBottom: 12, gap: 4 }}>
        <MetricCell label="Rent" value={`${formatCurrency(rent, true)}/mo`} />
        <MetricCell label="Deposit" value={formatCurrency(deposit, true)} align="center" />
        <MetricCell
          label={daysLeft !== null ? 'Lease' : 'Since'}
          value={
            daysLeft !== null
              ? daysLeft <= 0
                ? 'Ended'
                : `${daysLeft}d left`
              : formatDate(startDate)
          }
          valueColor={daysLeft !== null ? leaseValueColor : undefined}
          align="right"
        />
      </View>

      {endDate && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <View style={{ height: 3, backgroundColor: Colors.borderSoft, borderRadius: 2, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: barColor,
                borderRadius: 2,
              }}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 10 }}>
              {formatDate(startDate)}
            </Text>
            <Text
              style={{
                color: leaseUrgent ? Colors.danger : Colors.muted,
                fontFamily: leaseUrgent ? Fonts.sansMedium : Fonts.sans,
                fontSize: 10,
              }}
            >
              {leaseUrgent ? `⚠ ${daysLeft}d left` : formatDate(endDate)}
            </Text>
          </View>
        </View>
      )}

      <SectionDivider />
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 12, gap: 10 }}>
        <Avatar name={person?.full_name ?? personLabel} uri={person?.avatar_url} size={32} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Cap>{personLabel}</Cap>
          <Text numberOfLines={1} style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13 }}>
            {person?.full_name || person?.phone || 'Not joined yet'}
          </Text>
        </View>
        {!archived && (
          <Chip tone={status === 'active' ? 'good' : 'warn'}>
            {status === 'active' ? 'Live' : status === 'pending_tenant' ? 'Pending' : 'Setup'}
          </Chip>
        )}
      </View>
    </>
  );
}

// ─── PG / multi-bed section ───────────────────────────────────────────────────

function PGSection({
  totalRent,
  activeBeds,
  totalBeds,
  perBed,
  vacantBeds,
  occupancyRate,
  unitVocab,
  accentColor,
  config,
}: {
  totalRent: number;
  activeBeds: number;
  totalBeds: number;
  perBed: number;
  vacantBeds: number;
  occupancyRate: number;
  unitVocab: ReturnType<typeof getUnitVocab>;
  accentColor: string;
  config: TypeConfig;
}) {
  const occColor =
    occupancyRate >= 1
      ? Colors.success
      : occupancyRate >= 0.7
      ? Colors.warning
      : Colors.danger;

  return (
    <>
      <View style={{ flexDirection: 'row', padding: 16, paddingTop: 14, paddingBottom: 12 }}>
        <MetricCell label="Monthly Income" value={`${formatCurrency(totalRent, true)}/mo`} />
        <MetricCell label="Per Bed" value={formatCurrency(perBed, true)} align="center" />
        <MetricCell label={unitVocab.units} value={`${activeBeds}/${totalBeds}`} align="right" />
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            Occupancy
          </Text>
          <Text style={{ color: occColor, fontFamily: Fonts.sansSemiBold, fontSize: 11 }}>
            {Math.round(occupancyRate * 100)}%
          </Text>
        </View>
        <OccupancyDots activeBeds={activeBeds} totalBeds={totalBeds} accentColor={accentColor} />
      </View>

      <SectionDivider />
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 12, gap: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: config.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="bed-outline" size={16} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Cap>Occupancy</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13 }}>
            {activeBeds} of {totalBeds} {unitVocab.units.toLowerCase()} occupied
          </Text>
        </View>
        <Chip tone={vacantBeds === 0 ? 'good' : 'warn'}>
          {vacantBeds === 0 ? 'Full' : `${vacantBeds} vacant`}
        </Chip>
      </View>
    </>
  );
}

// ─── Commercial section ───────────────────────────────────────────────────────

function CommercialSection({
  rent,
  deposit,
  daysLeft,
  endDate,
  leaseUrgent,
  leaseWarning,
  person,
  personLabel,
  status,
  archived,
}: {
  rent: number;
  deposit: number;
  daysLeft: number | null;
  endDate?: string | null;
  leaseUrgent: boolean;
  leaseWarning: boolean;
  person?: { full_name?: string | null; phone?: string | null; avatar_url?: string | null } | null;
  personLabel: string;
  status: string;
  archived: boolean;
}) {
  const leaseValueColor = leaseUrgent ? Colors.danger : leaseWarning ? Colors.warning : Colors.ink3;

  return (
    <>
      <View style={{ padding: 16, paddingTop: 14, paddingBottom: 12 }}>
        {/* Prominent rent — commercial leases are high-stakes */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginBottom: 12 }}>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 14 }}>₹</Text>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansBold, fontSize: 26, lineHeight: 30 }}>
            {formatCurrency(rent).replace('₹', '').replace(/\s/g, '')}
          </Text>
          <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 13 }}>/month</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <MetricCell label="Deposit" value={formatCurrency(deposit, true)} />
          <MetricCell
            label="Lease"
            value={
              daysLeft !== null
                ? daysLeft <= 0
                  ? 'Expired'
                  : `${daysLeft}d left`
                : endDate
                ? formatDate(endDate)
                : 'Open-ended'
            }
            valueColor={daysLeft !== null ? leaseValueColor : undefined}
            align="right"
          />
        </View>
      </View>

      {(leaseUrgent || leaseWarning) && endDate && (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            backgroundColor: leaseUrgent ? Colors.dangerSoft : Colors.warningSoft,
            borderRadius: 10,
            padding: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: leaseUrgent ? '#F5B8B5' : '#F1D39B',
          }}
        >
          <Ionicons
            name={leaseUrgent ? 'alert-circle' : 'time-outline'}
            size={14}
            color={leaseUrgent ? Colors.danger : Colors.warning}
          />
          <Text style={{ color: leaseUrgent ? Colors.danger : Colors.warning, fontFamily: Fonts.sansMedium, fontSize: 12, flex: 1 }}>
            {leaseUrgent
              ? `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — renewal needed`
              : `Lease ends in ${daysLeft} days`}
          </Text>
        </View>
      )}

      <SectionDivider />
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 12, gap: 10 }}>
        <Avatar name={person?.full_name ?? personLabel} uri={person?.avatar_url} size={32} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Cap>{personLabel}</Cap>
          <Text numberOfLines={1} style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13 }}>
            {person?.full_name || person?.phone || 'Not joined yet'}
          </Text>
        </View>
        {!archived && (
          <Chip tone={status === 'active' ? 'good' : 'warn'}>
            {status === 'active' ? 'Live' : 'Setup'}
          </Chip>
        )}
      </View>
    </>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface RentalCardProps {
  rental: Rental;
  role: 'landlord' | 'tenant';
  rentalCount?: number;
  totalRent?: number;
  totalDeposit?: number;
  activeBeds?: number;
  totalBeds?: number;
}

export const RentalCard: React.FC<RentalCardProps> = ({
  rental,
  role,
  rentalCount,
  totalRent,
  totalDeposit: _totalDeposit,
  activeBeds = 0,
  totalBeds = 0,
}) => {
  const router = useRouter();
  const person = role === 'landlord' ? rental.tenant : rental.landlord;
  const personLabel = role === 'landlord' ? 'Tenant' : 'Landlord';
  const archived = !!rental.property?.archived_at;
  const propertyType = rental.property?.property_type;
  const config = getConfig(propertyType);
  const unitVocab = getUnitVocab(propertyType);

  const isPG = totalBeds > 1 || propertyType === 'pg';
  const isCommercial = propertyType === 'commercial';

  const daysLeft = rental.end_date ? daysRemaining(rental.end_date) : null;
  const progress = leaseProgress(rental.start_date, rental.end_date);
  const leaseUrgent = daysLeft !== null && daysLeft <= 30;
  const leaseWarning = daysLeft !== null && daysLeft > 30 && daysLeft <= 60;

  const vacantBeds = totalBeds - activeBeds;
  const occupancyRate = totalBeds > 0 ? activeBeds / totalBeds : 0;
  const perBed = totalBeds > 0 ? Math.round((totalRent ?? 0) / totalBeds) : 0;

  const accentColor = archived ? Colors.muted : config.accent;
  const softColor = archived ? Colors.fill : config.soft;

  const cardBorderColor = leaseUrgent && !archived ? '#F5B8B5' : Colors.border;

  return (
    <TouchableOpacity
      onPress={() => role === 'landlord' && router.push(`/(landlord)/property/${rental.property_id}`)}
      activeOpacity={0.87}
      style={{ marginBottom: 12 }}
    >
      <View
        style={{
          backgroundColor: Colors.surface,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: cardBorderColor,
          overflow: 'hidden',
          ...Shadow.card,
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          {/* Left accent stripe — instant property type recognition */}
          <View style={{ width: 3, backgroundColor: accentColor }} />

          <View style={{ flex: 1 }}>
            {/* ── Header ── */}
            <View style={{ padding: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              {/* Property type icon badge */}
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  backgroundColor: softColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Ionicons name={config.icon} size={20} color={accentColor} />
              </View>

              {/* Name + meta */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2, flexWrap: 'wrap' }}>
                  <Text style={{ color: accentColor, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    {config.label}
                  </Text>
                  {rental.property?.city ? (
                    <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 0.8 }}>
                      · {rental.property.city.toUpperCase()}
                    </Text>
                  ) : null}
                  {rentalCount && rentalCount > 1 ? (
                    <View style={{ backgroundColor: softColor, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ color: accentColor, fontFamily: Fonts.sansMedium, fontSize: 10 }}>
                        {rentalCount} units
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={1} style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 17, lineHeight: 22 }}>
                  {rental.property?.name ?? 'Property'}
                </Text>
                <Text numberOfLines={1} style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12, marginTop: 1 }}>
                  {rental.property?.address_line1 ??
                    [rental.property?.city, rental.property?.state].filter(Boolean).join(', ')}
                </Text>
              </View>

              {/* Status */}
              {archived ? (
                <Chip tone="outline">Archived</Chip>
              ) : (
                <StatusPill kind="rental" value={rental.status} />
              )}
            </View>

            {/* ── Section divider ── */}
            <SectionDivider />

            {/* ── Type-specific content ── */}
            {isPG ? (
              <PGSection
                totalRent={totalRent ?? 0}
                activeBeds={activeBeds}
                totalBeds={totalBeds}
                perBed={perBed}
                vacantBeds={vacantBeds}
                occupancyRate={occupancyRate}
                unitVocab={unitVocab}
                accentColor={accentColor}
                config={config}
              />
            ) : isCommercial ? (
              <CommercialSection
                rent={rental.monthly_rent}
                deposit={rental.security_deposit}
                daysLeft={daysLeft}
                endDate={rental.end_date}
                leaseUrgent={leaseUrgent}
                leaseWarning={leaseWarning}
                person={person}
                personLabel={personLabel}
                status={rental.status}
                archived={archived}
              />
            ) : (
              <ResidentialSection
                rent={rental.monthly_rent}
                deposit={rental.security_deposit}
                startDate={rental.start_date}
                endDate={rental.end_date}
                daysLeft={daysLeft}
                progress={progress}
                leaseUrgent={leaseUrgent}
                leaseWarning={leaseWarning}
                accentColor={accentColor}
                person={person}
                personLabel={personLabel}
                status={rental.status}
                archived={archived}
              />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
