import { Platform, View } from 'react-native';
import type { PropsWithChildren } from 'react';

// On desktop web: centers the app in a phone-width column with a neutral background.
// On mobile/tablet: renders children directly (full screen).
export function WebContainer({ children }: PropsWithChildren) {
  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#E8EAED' }}>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: 430,
            backgroundColor: '#ffffff',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
          }}
        >
          {children}
        </View>
      </View>
    </View>
  );
}
