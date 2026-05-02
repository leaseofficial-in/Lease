import { Platform, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { usePathname } from 'expo-router';
import { Colors } from '../../constants/theme';

// On desktop web: centers the app in a phone-width column with a neutral background.
// On mobile/tablet: renders children directly (full screen).
export function WebContainer({ children }: PropsWithChildren) {
  const pathname = usePathname();
  if (Platform.OS !== 'web') return <>{children}</>;

  const isDocumentView = pathname?.startsWith('/agreement/');

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: Colors.canvas }}>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: isDocumentView ? 1040 : 430,
            backgroundColor: Colors.surface,
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
