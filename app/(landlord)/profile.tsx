import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { DashboardShell } from '../../components/layout/WebSidebar';
import { confirmAction } from '../../lib/confirm';

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email').or(z.literal('')),
  pan_number: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Enter valid PAN (e.g. ABCDE1234F)')
    .or(z.literal('')),
  upi_id: z
    .string()
    .regex(/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/, 'Enter valid UPI ID (e.g. 9876543210@ybl)')
    .or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function LandlordProfileScreen() {
  const { profile, updateProfile, signOut } = useAuthStore();
  const { showToast } = useUIStore();
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      email: profile?.email ?? '',
      pan_number: profile?.pan_number ?? '',
      upi_id: profile?.upi_id ?? '',
    },
  });

  const handleSave = async (values: FormValues) => {
    setSavingProfile(true);
    try {
      await updateProfile({
        full_name: values.full_name,
        email: values.email || null,
        pan_number: values.pan_number || null,
        upi_id: values.upi_id || null,
      });
      reset(values);
      showToast('Profile updated', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save profile', 'error');
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
      showToast('Photo updated', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to upload photo', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = () => {
    confirmAction('Sign Out', 'Are you sure you want to sign out?', signOut, 'Sign Out', true);
  };

  return (
  <DashboardShell role="landlord">
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Cap>Account</Cap>
          <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 24, marginTop: 4 }}>
            Profile
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 16 }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar} activeOpacity={0.75}>
                <Avatar name={profile?.full_name ?? 'L'} uri={profile?.avatar_url} size={72} />
                <View
                  style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 26, height: 26, borderRadius: 13,
                    backgroundColor: Colors.primary,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2, borderColor: Colors.surface,
                  }}
                >
                  {uploadingAvatar
                    ? <ActivityIndicator size="small" color={Colors.surface} />
                    : <Ionicons name="camera" size={13} color={Colors.surface} />
                  }
                </View>
              </TouchableOpacity>

              <View style={{ marginLeft: 16, flex: 1 }}>
                <Chip tone="outline">Landlord</Chip>
                <DisplayText style={{ fontSize: 30, lineHeight: 33, marginTop: 8 }} numberOfLines={1}>
                  {profile?.full_name || 'Your Name'}
                </DisplayText>
                <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, marginTop: 4 }}>
                  {profile?.email || (profile?.phone ? formatPhone(profile.phone) : null) || 'No contact added'}
                </Text>
              </View>
            </View>
          </Card>

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Cap>Details</Cap>
                <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18, marginTop: 4 }}>
                  Landlord profile
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
                  hint="Used for receipts and documents."
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
                  hint="Used for rent receipts above Rs 50,000/month."
                />
              )}
            />
            <Controller
              control={control}
              name="upi_id"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="UPI ID"
                  placeholder="9876543210@ybl"
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  error={errors.upi_id?.message}
                  hint="Tenants will pay rent directly to this UPI ID. No commission charged."
                />
              )}
            />
            <Button
              title={isDirty ? 'Save Changes' : 'Saved'}
              onPress={handleSubmit(handleSave)}
              loading={savingProfile}
              disabled={!isDirty}
              fullWidth
              size="lg"
            />
          </Card>

          <Card>
            <Cap>Session</Cap>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 14 }}>
              Sign out of this browser when you are done managing rentals.
            </Text>
            <Button
              title="Sign Out"
              variant="danger"
              onPress={handleSignOut}
              fullWidth
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  </DashboardShell>
  );
}
