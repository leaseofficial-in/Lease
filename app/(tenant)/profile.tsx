import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
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
import { Cap, Chip, DisplayText } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';
import { confirmAction } from '../../lib/confirm';

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

  const { control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormValues>({
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
      reset(values);
      showToast('Profile updated', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save', 'error');
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
      showToast('Photo updated', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to upload photo', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pt-4 pb-2">
          <Cap>Account</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 24, marginTop: 4 }}>
            Profile
          </Text>
        </View>

        <View className="px-5 pt-4 gap-4">
          <Card>
            <View className="flex-row items-center">
              <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar} activeOpacity={0.75}>
                <Avatar name={profile?.full_name ?? 'T'} uri={profile?.avatar_url} size={72} />
                <View
                  className="absolute bottom-0 right-0 items-center justify-center border-2 border-white"
                  style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary }}
                >
                  <Text style={{ color: Colors.surface, fontFamily: Fonts.sansSemiBold, fontSize: 12 }}>
                    {uploadingAvatar ? '...' : '+'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View className="ml-4 flex-1">
                <Chip tone="outline">Tenant</Chip>
                <DisplayText style={{ fontSize: 30, lineHeight: 33, marginTop: 8 }} numberOfLines={1}>
                  {profile?.full_name || 'Your Name'}
                </DisplayText>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, marginTop: 4 }}>
                  {profile?.email || formatPhone(profile?.phone ?? '') || 'No contact added'}
                </Text>
              </View>
            </View>
          </Card>

          <Card>
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Cap>Details</Cap>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18, marginTop: 4 }}>
                  Tenant profile
                </Text>
              </View>
              <Text style={{ color: isDirty ? Colors.warning : Colors.success, fontFamily: Fonts.sansMedium, fontSize: 12 }}>
                {isDirty ? 'Unsaved' : 'Saved'}
              </Text>
            </View>

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
                  hint="Used for rent receipts and documents."
                />
              )}
            />
            <Button
              title={isDirty ? 'Save Changes' : 'Saved'}
              onPress={handleSubmit(handleSave)}
              loading={saving}
              disabled={!isDirty}
              fullWidth
              size="lg"
            />
          </Card>

          <Card>
            <Cap>Session</Cap>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 14 }}>
              Sign out of this browser when you are done using Flatvio.
            </Text>
            <Button
              title="Sign Out"
              variant="danger"
              onPress={() => confirmAction('Sign Out', 'Are you sure you want to sign out?', signOut, 'Sign Out', true)}
              fullWidth
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
