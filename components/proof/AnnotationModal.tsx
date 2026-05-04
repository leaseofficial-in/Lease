import React from 'react';
import { View, Text, TextInput, Image, TouchableOpacity } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Colors, Fonts } from '../../constants/theme';

interface AnnotationModalProps {
  visible: boolean;
  photoUri: string;
  existingAnnotation?: string;
  onSave: (annotation: string) => void;
  onClose: () => void;
}

export const AnnotationModal: React.FC<AnnotationModalProps> = ({
  visible,
  photoUri,
  existingAnnotation = '',
  onSave,
  onClose,
}) => {
  const [annotation, setAnnotation] = React.useState(existingAnnotation);

  React.useEffect(() => {
    setAnnotation(existingAnnotation);
  }, [existingAnnotation, visible]);

  const handleSave = () => {
    onSave(annotation.trim());
    onClose();
  };

  const handleRemove = () => {
    onSave('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable>
      <Text
        style={{
          color: Colors.primary,
          fontFamily: Fonts.sansSemiBold,
          fontSize: 16,
          marginBottom: 14,
          paddingTop: 4,
        }}
      >
        {existingAnnotation ? 'Edit Note' : 'Add Note'}
      </Text>

      <Image
        source={{ uri: photoUri }}
        style={{ width: '100%', height: 180, borderRadius: 14, marginBottom: 14 }}
        resizeMode="cover"
      />

      <TextInput
        value={annotation}
        onChangeText={setAnnotation}
        placeholder="Describe any damage, marks, or issues visible in this photo…"
        placeholderTextColor={Colors.muted}
        multiline
        numberOfLines={4}
        style={{
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: 12,
          padding: 12,
          fontFamily: Fonts.sans,
          fontSize: 14,
          color: Colors.primary,
          backgroundColor: Colors.fill,
          textAlignVertical: 'top',
          minHeight: 96,
          marginBottom: 6,
        }}
        maxLength={300}
      />

      <Text
        style={{
          color: Colors.muted,
          fontFamily: Fonts.sans,
          fontSize: 12,
          textAlign: 'right',
          marginBottom: existingAnnotation ? 10 : 16,
        }}
      >
        {annotation.length}/300
      </Text>

      {existingAnnotation ? (
        <TouchableOpacity onPress={handleRemove} style={{ alignSelf: 'center', marginBottom: 14 }}>
          <Text style={{ color: Colors.danger, fontFamily: Fonts.sansMedium, fontSize: 13 }}>
            Remove note
          </Text>
        </TouchableOpacity>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Save Note" onPress={handleSave} style={{ flex: 1 }} />
      </View>
    </BottomSheet>
  );
};
