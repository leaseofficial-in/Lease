import React from 'react';
import {
  Modal,
  View,
  Image,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ProofPhoto } from '../../types';
import { Colors, Fonts } from '../../constants/theme';

interface PhotoViewerProps {
  photos: ProofPhoto[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
  onEditNote?: (photo: ProofPhoto) => void;
  onDelete?: (photo: ProofPhoto) => void;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photos,
  initialIndex,
  visible,
  onClose,
  onEditNote,
  onDelete,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    if (visible && photos.length > 0) {
      setCurrentIndex(Math.min(initialIndex, photos.length - 1));
      const t = setTimeout(() => {
        scrollRef.current?.scrollTo({
          x: Math.min(initialIndex, photos.length - 1) * width,
          animated: false,
        });
      }, 40);
      return () => clearTimeout(t);
    }
  }, [visible, initialIndex, width, photos.length]);

  const photo = photos[currentIndex];
  if (!photo && !visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Top bar */}
        <View
          style={{
            position: 'absolute',
            top: insets.top + 6,
            left: 0,
            right: 0,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            zIndex: 10,
          }}
        >
          {onDelete ? (
            <TouchableOpacity
              onPress={() => photo && onDelete(photo)}
              style={{
                width: 38, height: 38, borderRadius: 19,
                backgroundColor: 'rgba(0,0,0,0.55)',
                alignItems: 'center', justifyContent: 'center',
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={17} color="#FF6B6B" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}

          <Text
            style={{
              flex: 1, textAlign: 'center',
              color: 'rgba(255,255,255,0.65)',
              fontFamily: Fonts.sansMedium, fontSize: 13,
            }}
          >
            {photos.length > 1 ? `${currentIndex + 1} / ${photos.length}` : ''}
          </Text>

          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center', justifyContent: 'center',
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Paged images */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(Math.min(Math.max(index, 0), photos.length - 1));
          }}
          style={{ flex: 1 }}
        >
          {photos.map((p) => (
            <View key={p.id} style={{ width, height, justifyContent: 'center' }}>
              <Image
                source={{ uri: p.public_url }}
                style={{ width, height }}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Bottom — annotation + edit button */}
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 16,
            left: 16,
            right: 16,
            gap: 8,
          }}
        >
          {photo?.annotation ? (
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.72)',
                borderRadius: 14,
                padding: 14,
              }}
            >
              <Text
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: Fonts.sansMedium,
                  fontSize: 10,
                  letterSpacing: 0.6,
                  marginBottom: 4,
                }}
              >
                NOTE
              </Text>
              <Text style={{ color: '#fff', fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 }}>
                {photo.annotation}
              </Text>
            </View>
          ) : null}

          {onEditNote && (
            <TouchableOpacity
              onPress={() => photo && onEditNote(photo)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-end',
                backgroundColor: 'rgba(0,0,0,0.55)',
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 999,
                gap: 6,
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={15} color="#fff" />
              <Text style={{ color: '#fff', fontFamily: Fonts.sansMedium, fontSize: 13 }}>
                {photo?.annotation ? 'Edit note' : 'Add note'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};
