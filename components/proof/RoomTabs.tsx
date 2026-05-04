import React from 'react';
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { Colors, Fonts } from '../../constants/theme';

interface RoomTabsProps {
  rooms: string[];
  activeRoom: string;
  onSelect: (room: string) => void;
  photoCounts?: Record<string, number>;
}

export const RoomTabs: React.FC<RoomTabsProps> = ({
  rooms,
  activeRoom,
  onSelect,
  photoCounts = {},
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 12 }}
    >
      {rooms.map((room) => {
        const isActive = room === activeRoom;
        const count = photoCounts[room] ?? 0;

        return (
          <TouchableOpacity
            key={room}
            onPress={() => onSelect(room)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: isActive ? Colors.action : Colors.border,
              backgroundColor: isActive ? Colors.action : Colors.surface,
            }}
            activeOpacity={0.75}
          >
            <Text
              style={{
                fontFamily: isActive ? Fonts.sansSemiBold : Fonts.sansMedium,
                fontSize: 13,
                color: isActive ? '#fff' : Colors.primary,
              }}
            >
              {room}
            </Text>

            {count > 0 && (
              <View
                style={{
                  marginLeft: 6,
                  minWidth: 18, height: 18, borderRadius: 9,
                  paddingHorizontal: 4,
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : Colors.fill2,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: Fonts.sansSemiBold,
                    color: isActive ? '#fff' : Colors.muted,
                  }}
                >
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};
