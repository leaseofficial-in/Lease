import React from 'react';
import { View, Text } from 'react-native';
import { formatRelativeTime } from '../../lib/formatters';
import { Colors, Fonts } from '../../constants/theme';

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  type: 'payment' | 'proof' | 'repair' | 'agreement' | 'invite' | 'deposit';
}

const iconMap: Record<ActivityItem['type'], { label: string; bg: string; fg: string }> = {
  payment: { label: 'R', bg: Colors.successSoft, fg: Colors.success },
  proof: { label: 'P', bg: Colors.actionSoft, fg: Colors.action },
  repair: { label: 'M', bg: Colors.warningSoft, fg: Colors.warning },
  agreement: { label: 'A', bg: Colors.fill2, fg: Colors.primary },
  invite: { label: 'I', bg: Colors.fill, fg: Colors.ink3 },
  deposit: { label: 'D', bg: Colors.successSoft, fg: Colors.success },
};

interface ActivityFeedProps {
  items: ActivityItem[];
  limit?: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ items, limit }) => {
  const visibleItems = limit ? items.slice(0, limit) : items;
  if (visibleItems.length === 0) return null;

  return (
    <View>
      {visibleItems.map((item, index) => {
        const icon = iconMap[item.type];
        return (
          <View key={item.id} className="flex-row items-start py-3">
            <View className="items-center mr-3">
              <View
                className="items-center justify-center rounded-full"
                style={{ width: 36, height: 36, backgroundColor: icon.bg }}
              >
                <Text style={{ color: icon.fg, fontFamily: Fonts.sansSemiBold, fontSize: 12 }}>
                  {icon.label}
                </Text>
              </View>
              {index < visibleItems.length - 1 && (
                <View style={{ width: 1, minHeight: 18, flex: 1, backgroundColor: Colors.border, marginTop: 4 }} />
              )}
            </View>
            <View className="flex-1 pt-1">
              <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, marginTop: 2 }} numberOfLines={2}>
                {item.subtitle}
              </Text>
              <Text style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 11, marginTop: 4 }}>
                {formatRelativeTime(item.timestamp)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};
