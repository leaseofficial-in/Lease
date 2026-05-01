import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { uploadAvatar, pickPhoto } from '../../lib/storage';
import { formatPhone } from '../../lib/formatters';
import { Avatar } from '../../components/ui/Avatar';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email').or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function TenantProfileScreen() {
  const { profile, updateProfile, signOut } = useAuthStore();
  const { showToast } = useUIStore();
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { control, handleSubmit, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      email: profile?.email ?? '',
    },
  });

  const handleSave = async (values: FormValues) => {
    setSaving(true);
    try {
      await updateProfile({ full_name: values.full_name, email: values.email || null });
      showToast('Profile updated!', 'success');
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    const uri = await pickPhoto();
    if (!uri || !profile) return;
    setUploadingAvatar(true);
    try {
      const { publicUrl } = await uploadAvatar(uri, profile.id);
      await updateProfile({ avatar_url: publicUrl });
      showToast('Photo updated!', 'success');
    } catch {
      showToast('Failed to upload photo', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-primary">Profile</Text>
        </View>

        <View className="items-center py-6">
          <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar}>
            <Avatar name={profile?.full_name ?? 'T'} uri={profile?.avatar_url} size={88} />
            <View className="absolute bottom-0 right-0 w-7 h-7 bg-action rounded-full items-center justify-center border-2 border-white">
              <Text className="text-white text-xs">✎</Text>
            </View>
          </TouchableOpacity>
          <Text className="text-base font-semibold text-primary mt-3">
            {profile?.full_name || 'Your Name'}
          </Text>
          <Text className="text-sm text-muted">{formatPhone(profile?.phone ?? '')}</Text>
        </View>

        <View className="px-5 gap-4 pb-8">
          <Card>
            <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
              Personal Details
            </Text>
            <Controller
              control={control}
              name="full_name"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Full Name"
                  placeholder="Priya Sharma"
                  value={value}
                  onChangeText={onChange}
                  error={errors.full_name?.message}
                  required
                />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                  hint="Used for rent receipts and HRA documents"
                />
              )}
            />
            <Button
              title={isDirty ? 'Save Changes' : 'Saved'}
              onPress={handleSubmit(handleSave)}
              loading={saving}
              disabled={!isDirty}
              fullWidth
            />
          </Card>

          <Button
            title="Sign Out"
            variant="danger"
            onPress={() =>
              Alert.alert('Sign Out', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut },
              ])
            }
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
