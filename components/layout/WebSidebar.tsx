import React from 'react';
import { View, Text, TouchableOpacity, Platform, ScrollView, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Fonts } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  icon: string;
  label: string;
  href: string;
  badge?: number;
}

const LANDLORD_NAV: NavItem[] = [
  { icon: '⌂', label: 'Overview',   href: '/(landlord)' },
  { icon: '▦', label: 'Properties', href: '/(landlord)/properties' },
  { icon: '≡', label: 'Ledger',     href: '/(landlord)/ledger' },
  { icon: '₹', label: 'Receipts',   href: '/(landlord)/payments' },
  { icon: '⚙', label: 'Repairs',    href: '/(landlord)/repairs' },
  { icon: '👤', label: 'Profile',   href: '/(landlord)/profile' },
];

const TENANT_NAV: NavItem[] = [
  { icon: '⌂', label: 'My place',      href: '/(tenant)' },
  { icon: '₹', label: 'Pay rent',      href: '/(tenant)/pay-rent' },
  { icon: '📄', label: 'HRA receipts', href: '/(tenant)/rent-history' },
  { icon: '📷', label: 'Move-in proof', href: '/(tenant)/proof/upload' },
  { icon: '⚙', label: 'Repairs',       href: '/(tenant)/repairs' },
  { icon: '👤', label: 'Profile',       href: '/(tenant)/profile' },
];

// ── Logo mark SVG (inline) ────────────────────────────────────────────────────

function LogoMark({ size = 28 }: { size?: number }) {
  // Use the Logo component if available, otherwise fallback square
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: Colors.accent, fontSize: size * 0.5, fontFamily: Fonts.sansBold }}>R</Text>
    </View>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface WebSidebarProps {
  role: 'landlord' | 'tenant';
  openRepairCount?: number;
}

export function WebSidebar({ role, openRepairCount = 0 }: WebSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, signOut } = useAuthStore();

  const items = role === 'landlord' ? LANDLORD_NAV : TENANT_NAV;
  const name = profile?.full_name ?? 'User';
  const firstName = name.split(' ')[0];
  const initial = firstName.charAt(0).toUpperCase();
  const meta = role === 'landlord' ? 'Landlord' : 'Tenant';

  // Determine active route
  const isActive = (href: string) => {
    const base = href.replace('/(landlord)', '').replace('/(tenant)', '');
    const current = pathname.replace('/(landlord)', '').replace('/(tenant)', '');
    if (base === '' || base === '/') return current === '' || current === '/';
    return current.startsWith(base);
  };

  const navigate = (href: string) => {
    router.push(href as never);
  };

  return (
    <View
      style={{
        width: 240,
        backgroundColor: Colors.canvas,
        borderRightWidth: 1,
        borderRightColor: Colors.border,
        paddingHorizontal: 18,
        paddingVertical: 28,
        height: '100%',
        display: 'flex' as never,
        flexDirection: 'column',
        gap: 28,
        // Stick to top on web
        position: 'sticky' as never,
        top: 0,
      }}
    >
      {/* Logo */}
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 }}
        onPress={() => navigate(role === 'landlord' ? '/(landlord)' : '/(tenant)')}
        activeOpacity={0.8}
      >
        <LogoMark size={28} />
        <Text style={{ fontFamily: Fonts.serifItalic, fontSize: 20, color: Colors.primary }}>
          Renty<Text style={{ color: Colors.accent }}>Base</Text>
        </Text>
      </TouchableOpacity>

      {/* Nav */}
      <View style={{ flex: 1, gap: 2 }}>
        {items.map((item) => {
          const active = isActive(item.href);
          const repairsBadge = item.label === 'Repairs' && openRepairCount > 0;
          return (
            <TouchableOpacity
              key={item.href}
              onPress={() => navigate(item.href)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: active ? Colors.primary : 'transparent',
              }}
            >
              <Text style={{ width: 22, textAlign: 'center', fontSize: 15, color: active ? Colors.canvas : Colors.ink3 }}>
                {item.icon}
              </Text>
              <Text
                style={{
                  fontFamily: active ? Fonts.sansSemiBold : Fonts.sans,
                  fontSize: 14,
                  color: active ? Colors.canvas : Colors.ink2,
                  flex: 1,
                }}
              >
                {item.label}
              </Text>
              {repairsBadge && (
                <View style={{ backgroundColor: Colors.accent, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 }}>
                  <Text style={{ fontFamily: Fonts.mono, fontSize: 10, fontWeight: '700', color: '#fff' }}>
                    {openRepairCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* User + signout */}
      <View style={{ paddingTop: 18, borderTopWidth: 1, borderTopColor: Colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, paddingBottom: 12 }}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={{ width: 34, height: 34, borderRadius: 17 }}
            />
          ) : (
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: role === 'landlord'
                  ? Colors.action
                  : Colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontFamily: Fonts.sansBold, fontSize: 15 }}>{initial}</Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: Fonts.sansSemiBold, fontSize: 13, color: Colors.primary }}>
              {name}
            </Text>
            <Text style={{ fontFamily: Fonts.sans, fontSize: 11, color: Colors.ink3 }}>{meta}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => signOut()}
          style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
          activeOpacity={0.75}
        >
          <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: Colors.ink3 }}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── DashboardShell ────────────────────────────────────────────────────────────
// Wrap each screen's main content with this on web to include the sidebar.

interface DashboardShellProps {
  role: 'landlord' | 'tenant';
  children: React.ReactNode;
}

export function DashboardShell({ role, children }: DashboardShellProps) {
  const { profile } = useAuthStore();

  const { data: openRepairCount = 0 } = useQuery({
    queryKey: ['sidebar-open-repairs', role, profile?.id],
    queryFn: async () => {
      if (role === 'landlord') {
        const { data } = await supabase
          .from('repair_requests')
          .select('id, rental:rentals!inner(landlord_id)')
          .eq('rental.landlord_id', profile!.id)
          .in('status', ['open', 'in_progress']);
        return data?.length ?? 0;
      }
      const { count } = await supabase
        .from('repair_requests')
        .select('id, rental:rentals!inner(tenant_id)', { count: 'exact', head: true })
        .eq('rental.tenant_id', profile!.id)
        .in('status', ['open', 'in_progress']);
      return count ?? 0;
    },
    enabled: Platform.OS === 'web' && !!profile?.id,
    refetchInterval: 60_000,
  });

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }
  return (
    <View style={{ flexDirection: 'row', flex: 1, backgroundColor: Colors.background, minHeight: '100vh' as never }}>
      <WebSidebar role={role} openRepairCount={openRepairCount} />
      <View style={{ flex: 1, minWidth: 0, overflow: 'auto' as never }}>
        {children}
      </View>
    </View>
  );
}
