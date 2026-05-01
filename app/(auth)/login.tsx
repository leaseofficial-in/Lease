import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { normalizePhone } from '../../lib/formatters';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Colors } from '../../constants/theme';
import { Config } from '../../constants/config';
import { useAuthStore } from '../../stores/authStore';
import {
  DEV_AUTH_INPUT_PHONE,
  DEV_AUTH_OTP,
  isDevAuthEnabled,
} from '../../lib/devAuth';

type Step = 'phone' | 'otp';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithDevOtp } = useAuthStore();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef<Array<TextInput | null>>([]);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(Config.otpResendCooldownSeconds);
    cooldownTimer.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    setError('');
    const normalized = normalizePhone(phone);
    if (normalized.length < 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      if (isDevAuthEnabled() && phone.replace(/\D/g, '') === DEV_AUTH_INPUT_PHONE) {
        setStep('otp');
        startCooldown();
        return;
      }

      const { error: authError } = await supabase.auth.signInWithOtp({
        phone: normalized,
      });
      if (authError) throw authError;
      setStep('otp');
      startCooldown();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError('Enter the complete 6-digit code');
      return;
    }

    setError('');
    setLoading(true);
    try {
      if (isDevAuthEnabled() && phone.replace(/\D/g, '') === DEV_AUTH_INPUT_PHONE) {
        await signInWithDevOtp(phone, code);
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: normalizePhone(phone),
        token: code,
        type: 'sms',
      });
      if (verifyError) throw verifyError;
      // AuthGate in _layout.tsx handles navigation after sign-in
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (!digit && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-4">
            {/* Back button */}
            <TouchableOpacity
              onPress={() => (step === 'otp' ? setStep('phone') : router.back())}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mb-8"
            >
              <Text className="text-primary text-xl">←</Text>
            </TouchableOpacity>

            {step === 'phone' ? (
              <>
                <Text className="text-3xl font-bold text-primary mb-2">Enter your{'\n'}mobile number</Text>
                <Text className="text-base text-muted mb-8">
                  We'll send a one-time password to verify your identity.
                </Text>
                {isDevAuthEnabled() && (
                  <Text className="text-sm text-action mb-4">
                    Local test: use {DEV_AUTH_INPUT_PHONE} with OTP {DEV_AUTH_OTP}.
                  </Text>
                )}

                <Input
                  label="Mobile Number"
                  placeholder="98765 43210"
                  value={phone}
                  onChangeText={(v) => { setPhone(v); setError(''); }}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus
                  error={error}
                  required
                  leftIcon={<Text className="text-primary font-medium">+91</Text>}
                />

                <Button
                  title="Send OTP"
                  onPress={handleSendOtp}
                  loading={loading}
                  fullWidth
                  size="lg"
                  style={{ marginTop: 8 }}
                />
              </>
            ) : (
              <>
                <Text className="text-3xl font-bold text-primary mb-2">Enter OTP</Text>
                <Text className="text-base text-muted mb-8">
                  We sent a 6-digit code to{' '}
                  <Text className="font-semibold text-primary">+91 {phone}</Text>
                </Text>

                {/* OTP boxes */}
                <View className="flex-row justify-between mb-6">
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={(ref) => { otpRefs.current[i] = ref; }}
                      value={digit}
                      onChangeText={(v) => handleOtpChange(v, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      className={`border-2 rounded-xl text-center text-xl font-bold text-primary ${
                        digit ? 'border-action bg-blue-50' : 'border-border bg-white'
                      }`}
                      style={{ width: 48, height: 56 }}
                      placeholderTextColor={Colors.border}
                    />
                  ))}
                </View>

                {error ? (
                  <Text className="text-sm text-danger text-center mb-4">{error}</Text>
                ) : null}

                <Button
                  title="Verify OTP"
                  onPress={handleVerifyOtp}
                  loading={loading}
                  fullWidth
                  size="lg"
                />

                <TouchableOpacity
                  onPress={cooldown === 0 ? handleSendOtp : undefined}
                  className="mt-4 items-center"
                  disabled={cooldown > 0}
                >
                  <Text className={`text-sm ${cooldown > 0 ? 'text-muted' : 'text-action font-medium'}`}>
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
