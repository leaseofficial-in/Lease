import React, { useState } from 'react';
import { View, Text, TextInput, Image } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Colors } from '../../constants/theme';

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
  const [annotation, setAnnotation] = useState(existingAnnotation);

  const handleSave = () => {
    onSave(annotation.trim());
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable>
      <Text className="text-lg font-semibold text-primary mb-4 pt-2">Add Note</Text>
      <Image
        source={{ uri: photoUri }}
        className="w-full rounded-xl mb-4"
        style={{ height: 200 }}
        resizeMode="cover"
      />
      <TextInput
        value={annotation}
        onChangeText={setAnnotation}
        placeholder="Describe any damage, stains, or issues visible in this photo…"
        placeholderTextColor={Colors.muted}
        multiline
        numberOfLines={4}
        className="border border-border rounded-xl p-3 text-sm text-primary mb-4"
        style={{ textAlignVertical: 'top', minHeight: 96 }}
        maxLength={300}
      />
      <Text className="text-xs text-muted text-right mb-4">{annotation.length}/300</Text>
      <View className="flex-row gap-3">
        <Button title="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Save Note" onPress={handleSave} style={{ flex: 1 }} />
      </View>
    </BottomSheet>
  );
};
