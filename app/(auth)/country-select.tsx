import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Keyboard,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useRegionStore } from '../../stores/regionStore';
import { useUIStore } from '../../stores/uiStore';
import { Button } from '../../components/ui/Button';
import { Colors, Fonts, Shadow } from '../../constants/theme';
import {
  COUNTRY_PICKER_ORDER,
  CountryCode,
  REGIONS,
  RegionConfig,
} from '../../lib/i18n/regions';
import { detectCountryWithConfidence } from '../../lib/i18n/detection';
import { supabase } from '../../lib/supabase';

// ─── Search sheet sub-component ───────────────────────────────────────────────

function CountrySearchSheet({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: CountryCode;
  onSelect: (code: CountryCode) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      tension: 60,
      friction: 11,
      useNativeDriver: true,
    }).start();
    if (!visible) setQuery('');
  }, [visible, slideAnim]);

  const countries = useMemo(() => {
    const q = query.toLowerCase().trim();
    const all = COUNTRY_PICKER_ORDER.map((c) => REGIONS[c]);
    if (!q) return all;
    return all.filter(
      (r) => r.name.toLowerCase().includes(q) || r.countryCode.toLowerCase().includes(q),
    );
  }, [query]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        opacity: slideAnim,
      }}
    >
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={1}
        onPress={() => { Keyboard.dismiss(); onClose(); }}
      />
      <Animated.View
        style={{
          backgroundColor: Colors.surface,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 16,
          maxHeight: '78%',
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1], outputRange: [400, 0],
            }),
          }],
        }}
      >
        {/* Handle */}
        <View style={{
          width: 40, height: 4, borderRadius: 2,
          backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16,
        }} />

        <Text style={{
          fontFamily: Fonts.sansSemiBold, fontSize: 18,
          color: Colors.primary, paddingHorizontal: 20, marginBottom: 14,
        }}>
          Select your country
        </Text>

        {/* Search input */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          marginHorizontal: 20, marginBottom: 12,
          borderWidth: 1.5, borderColor: Colors.border,
          borderRadius: 14, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
          backgroundColor: Colors.fill,
        }}>
          <Ionicons name="search-outline" size={18} color={Colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search countries…"
            placeholderTextColor={Colors.muted}
            style={{ flex: 1, fontFamily: Fonts.sans, fontSize: 15, color: Colors.primary }}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={countries}
          keyExtractor={(item) => item.countryCode}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => {
            const selected = item.countryCode === current;
            return (
              <TouchableOpacity
                onPress={() => { onSelect(item.countryCode); onClose(); }}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingHorizontal: 20, paddingVertical: 14,
                  backgroundColor: selected ? Colors.actionSoft : 'transparent',
                }}
              >
                <Text style={{ fontSize: 26 }}>{item.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: selected ? Fonts.sansSemiBold : Fonts.sans,
                    fontSize: 15, color: selected ? Colors.action : Colors.primary,
                  }}>
                    {item.name}
                  </Text>
                  <Text style={{
                    fontFamily: Fonts.mono, fontSize: 11,
                    color: Colors.muted, marginTop: 1,
                  }}>
                    {item.currency.symbol} {item.currency.code} · {item.phoneDialCode}
                  </Text>
                </View>
                {selected && <Ionicons name="checkmark" size={18} color={Colors.action} />}
              </TouchableOpacity>
            );
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CountrySelectScreen() {
  const router = useRouter();
  const { session, profile, updateProfile } = useAuthStore();
  const { setCountry } = useRegionStore();
  const { showToast } = useUIStore();

  const [detected] = useState(() => detectCountryWithConfidence());
  const [selected, setSelected] = useState<CountryCode>(detected.countryCode);
  const [showSearch, setShowSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fade in on mount
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 340, useNativeDriver: true,
    }).start();
  }, []);

  const selectedRegion: RegionConfig = REGIONS[selected];

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // 1. Persist to Zustand + AsyncStorage (immediate — UI updates at once)
      await setCountry(selected);

      // 2. Persist to Supabase profile so it survives re-installs
      if (session?.user.id) {
        const { error } = await supabase
          .from('profiles')
          .update({
            country_code: selected,
            currency_code: selectedRegion.currency.code,
            timezone: selectedRegion.primaryTimezone,
            locale: selectedRegion.locale,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.user.id);

        if (error) throw error;
      }

      // 3. Navigate to the correct dashboard
      const role = profile?.role;
      if (role === 'landlord') router.replace('/(landlord)');
      else if (role === 'tenant') router.replace('/(tenant)');
      else router.replace('/(auth)/role-select');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save your region.', 'error');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor: Colors.canvas }}
    >
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
        contentContainerStyle={{
          flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40,
        }}
      >
        {/* Header */}
        <Text style={{
          color: Colors.muted, fontFamily: Fonts.mono,
          fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10,
        }}>
          Where are you?
        </Text>
        <Text style={{
          color: Colors.primary, fontFamily: Fonts.sansSemiBold,
          fontSize: 34, lineHeight: 38, letterSpacing: -0.8, marginBottom: 4,
        }}>
          Set your region
        </Text>
        <Text style={{
          color: Colors.ink3, fontFamily: Fonts.serifItalic,
          fontSize: 20, lineHeight: 28, marginBottom: 10,
        }}>
          so everything just works.
        </Text>
        <Text style={{
          color: Colors.ink3, fontFamily: Fonts.sans,
          fontSize: 14, lineHeight: 21, marginBottom: 40,
        }}>
          Currency, payment methods, date formats, and address fields adapt to your location automatically. You can change this anytime in Settings.
        </Text>

        {/* Detected country card */}
        <View style={{
          borderRadius: 24, backgroundColor: Colors.surface,
          borderWidth: 2.5, borderColor: Colors.action,
          ...Shadow.card, marginBottom: 16, overflow: 'hidden',
        }}>
          {/* Color band */}
          <View style={{
            backgroundColor: Colors.actionSoft,
            paddingHorizontal: 20, paddingVertical: 20,
            flexDirection: 'row', alignItems: 'center', gap: 16,
          }}>
            <Text style={{ fontSize: 42 }}>{selectedRegion.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: Colors.action, fontFamily: Fonts.mono,
                fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 3,
              }}>
                {detected.source === 'timezone' || detected.source === 'locale'
                  ? 'Auto-detected' : 'Default'}
              </Text>
              <Text style={{
                color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 22,
              }}>
                {selectedRegion.name}
              </Text>
            </View>
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: Colors.action,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          </View>

          {/* Region details */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap: 10 }}>
            {([
              { label: 'Currency',   value: `${selectedRegion.currency.symbol} ${selectedRegion.currency.code} — ${selectedRegion.currency.name}` },
              { label: 'Payments',   value: selectedRegion.paymentMethods.map((m) => m.replace(/_/g, ' ')).join(', ') },
              { label: 'Date format', value: selectedRegion.dateFormat },
              { label: 'Phone prefix', value: selectedRegion.phoneDialCode },
            ] as const).map(({ label, value }) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Text style={{
                  fontFamily: Fonts.sans, fontSize: 13,
                  color: Colors.muted, width: 88, flexShrink: 0,
                }}>
                  {label}
                </Text>
                <Text style={{
                  fontFamily: Fonts.sansMedium, fontSize: 13,
                  color: Colors.primary, flex: 1, textTransform: 'capitalize',
                }}>
                  {value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Change link */}
        <TouchableOpacity
          onPress={() => setShowSearch(true)}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, paddingVertical: 14,
          }}
        >
          <Ionicons name="globe-outline" size={16} color={Colors.action} />
          <Text style={{
            fontFamily: Fonts.sansMedium, fontSize: 14, color: Colors.action,
          }}>
            {`Not ${selectedRegion.name}? Choose a different country`}
          </Text>
        </TouchableOpacity>
      </Animated.ScrollView>

      {/* Sticky confirm button */}
      <View style={{
        paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 8 : 20, paddingTop: 12,
        backgroundColor: Colors.canvas,
        borderTopWidth: 1, borderTopColor: Colors.border,
      }}>
        <Button
          title={saving ? 'Saving…' : `Continue with ${selectedRegion.name} →`}
          onPress={handleConfirm}
          loading={saving}
          fullWidth
          size="lg"
        />
      </View>

      {/* Country search sheet (absolute overlay) */}
      <CountrySearchSheet
        visible={showSearch}
        current={selected}
        onSelect={setSelected}
        onClose={() => setShowSearch(false)}
      />
    </SafeAreaView>
  );
}
