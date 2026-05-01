import React from 'react';
import { View, Text } from 'react-native';
import { formatRelativeTime } from '../../lib/formatters';

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  type: 'payment' | 'proof' | 'repair' | 'agreement' | 'invite';
}

const iconMap: Record<ActivityItem['type'], { emoji: string; bg: string }> = {
  payment:   { emoji: '💰', bg: 'bg-emerald-50' },
  proof:     { emoji: '📷', bg: 'bg-blue-50' },
  repair:    { emoji: '🔧', bg: 'bg-amber-50' },
  agreement: { emoji: '📄', bg: 'bg-purple-50' },
  invite:    { emoji: '🔗', bg: 'bg-gray-100' },
};

interface ActivityFeedProps {
  items: ActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <View>
      {items.map((item, index) => {
        const { emoji, bg } = iconMap[item.type];
        return (
          <View key={item.id} className="flex-row items-start py-3">
            {/* Icon + timeline line */}
            <View className="items-center mr-3">
              <View className={`w-9 h-9 rounded-full ${bg} items-center justify-center`}>
                <Text style={{ fontSize: 16 }}>{emoji}</Text>
              </View>
              {index < items.length - 1 && (
                <View className="w-px flex-1 bg-border mt-1" style={{ minHeight: 16 }} />
              )}
            </View>
            {/* Content */}
            <View className="flex-1 pt-1">
              <Text className="text-sm font-medium text-primary">{item.title}</Text>
              <Text className="text-xs text-muted mt-0.5">{item.subtitle}</Text>
              <Text className="text-xs text-muted mt-1">{formatRelativeTime(item.timestamp)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};
