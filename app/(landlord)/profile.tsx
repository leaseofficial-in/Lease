import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { uploadAvatar } from '../../lib/storage';
import { pickPhoto } from '../../lib/storage';
import { formatPhone } from '../../lib/formatters';
import { Avatar } from '../../components/ui/Avatar';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email').or(z.literal('')),
  pan_number: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Enter valid PAN (e.g. ABCDE1234F)')
    .or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function LandlordProfileScreen() {
  const { profile, updateProfile, signOut } = useAuthStore();
  const { showToast } = useUIStore();
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { control, handleSubmit, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      email: profile?.email ?? '',
      pan_number: profile?.pan_number ?? '',
    },
  });

  const handleSave = async (values: FormValues) => {
    setSavingProfile(true);
    try {
      await updateProfile({
        full_name: values.full_name,
        email: values.email || null,
        pan_number: values.pan_number || null,
      });
      showToast('Profile updated!', 'success');
    } catch {
      showToast('Failed to save profile', 'error');
    } finally {
      setSavingProfile(false);
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

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-primary">Profile</Text>
        </View>

        {/* Avatar */}
        <View className="items-center py-6">
          <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar}>
            <Avatar
              name={profile?.full_name ?? 'L'}
              uri={profile?.avatar_url}
              size={88}
            />
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
                  placeholder="Rajesh Kumar"
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
                  hint="Used for receipts and HRA documents"
                />
              )}
            />
            <Controller
              control={control}
              name="pan_number"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="PAN Number"
                  placeholder="ABCDE1234F"
                  value={value}
                  onChangeText={(v) => onChange(v.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={10}
                  error={errors.pan_number?.message}
                  hint="Required for rent receipts above ₹50,000/month"
                />
              )}
            />
            <Button
              title={isDirty ? 'Save Changes' : 'Saved'}
              onPress={handleSubmit(handleSave)}
              loading={savingProfile}
              disabled={!isDirty}
              fullWidth
            />
          </Card>

          <Button
            title="Sign Out"
            variant="danger"
            onPress={handleSignOut}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
