import React from 'react';
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';

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
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      className="py-3"
    >
      {rooms.map((room) => {
        const isActive = room === activeRoom;
        const count = photoCounts[room] ?? 0;
        return (
          <TouchableOpacity
            key={room}
            onPress={() => onSelect(room)}
            className={`flex-row items-center rounded-full px-4 py-2 border ${
              isActive ? 'bg-action border-action' : 'bg-white border-border'
            }`}
            activeOpacity={0.75}
          >
            <Text
              className={`text-sm font-medium ${isActive ? 'text-white' : 'text-primary'}`}
            >
              {room}
            </Text>
            {count > 0 && (
              <View
                className={`ml-1.5 rounded-full w-4 h-4 items-center justify-center ${
                  isActive ? 'bg-white/30' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-muted'}`}
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
