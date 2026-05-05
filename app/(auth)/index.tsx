import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/brand/Logo';
import { HeroLoop } from '../../components/brand/HeroLoop';
import { AppIcon, type AppIconName } from '../../components/ui/Icon';
import { Cap, Chip, DisplayText } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';

const EXAMPLE_INPUT = '2BHK in Indiranagar, Rs 32,000 rent, tenant Priya, rent due on 5th, deposit Rs 64,000';

export default function WelcomeScreen() {
  const router = useRouter();
  const { role, ref } = useLocalSearchParams<{ role?: string; ref?: string }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const contentWidth = Math.max(280, Math.min(480, width - 48));
  const [exampleInput, setExampleInput] = useState(EXAMPLE_INPUT);
  const [isTryingExample, setIsTryingExample] = useState(false);
  const [demoResult, setDemoResult] = useState(buildDemoResult(EXAMPLE_INPUT));
  const [recentResults, setRecentResults] = useState<string[]>(['Agreement draft, rent ledger, and HRA receipt checklist prepared for Priya.']);
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    if (role === 'landlord' || role === 'tenant') {
      void AsyncStorage.setItem('flatvio.pending_role', role);
    }
    if (typeof ref === 'string' && ref.trim()) {
      void AsyncStorage.setItem('flatvio.pending_referrer_tenant', ref.trim());
    }
  }, [ref, role]);

  const resultText = useMemo(() => demoResult.summary, [demoResult.summary]);

  const handleTryExample = () => {
    setIsTryingExample(true);
    setDemoResult({
      title: 'Preparing rental workspace...',
      summary: 'Reading rent terms, deposit, due date, tenant name, and document needs.',
      items: ['Creating agreement checklist', 'Setting rent due reminder', 'Preparing receipt-ready ledger'],
    });

    setTimeout(() => {
      const result = buildDemoResult(exampleInput);
      setDemoResult(result);
      setRecentResults((current) => [result.summary, ...current.filter((item) => item !== result.summary)].slice(0, 3));
      setIsTryingExample(false);
    }, 850);
  };

  const handleCopyResult = async () => {
    await Clipboard.setStringAsync(resultText);
    setCopyFeedback('Copied');
    setTimeout(() => setCopyFeedback(''), 1800);
  };

  const handleShareResult = async () => {
    const message = `${resultText}\n\nTry Flatvio: ${Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'https://flatvio.vercel.app'}`;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: 'Flatvio rental workspace', text: message });
      return;
    }
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(message);
      setCopyFeedback('Share text copied');
      setTimeout(() => setCopyFeedback(''), 1800);
      return;
    }
    await Share.share({ message });
  };

  return (
    <SafeAreaView className="flex-1" edges={['top']} style={{ flex: 1, backgroundColor: Colors.canvas }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 pt-4 pb-3">
          <Logo variant="full" size={42} />
        </View>

        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: isWide ? 28 : 10,
            gap: isWide ? 34 : 22,
            flexDirection: isWide ? 'row' : 'column',
            alignItems: isWide ? 'center' : 'stretch',
          }}
        >
          <View style={{ flex: 1, maxWidth: 680 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <Chip tone="good">No data stored in demo</Chip>
              <Chip tone="outline">Built by Flatvio</Chip>
            </View>

            <Cap style={{ marginBottom: 12 }}>Rentals / Proof / Receipts</Cap>
            <DisplayText style={{ fontSize: isWide ? 62 : 44, lineHeight: isWide ? 64 : 46 }}>
              Flatvio helps you manage rentals in minutes without paperwork chaos.
            </DisplayText>
            <Text
              style={{
                color: Colors.ink3,
                fontFamily: Fonts.sans,
                fontSize: 16,
                lineHeight: 24,
                marginTop: 16,
                maxWidth: 580,
              }}
            >
              Create a shared rental record for agreements, rent collection, HRA receipts, deposits, proof photos, and repairs.
            </Text>

            <View style={{ marginTop: 22, width: contentWidth }}>
              <Button
                title="Start free"
                onPress={() => router.push('/(auth)/login')}
                fullWidth
                size="lg"
              />
            </View>

            <View style={{ marginTop: 24, gap: 10 }}>
              <Cap>How it works</Cap>
              <View style={{ gap: 10 }}>
                <HowItWorksStep icon="home-outline" title="Add a rental" text="Enter property, rent, deposit, due date, and tenant details." />
                <HowItWorksStep icon="document-text-outline" title="Generate records" text="Keep agreement, receipts, proof, and deposit ledger in one place." />
                <HowItWorksStep icon="checkmark-circle-outline" title="Track every month" text="Know what is paid, pending, ending soon, or ready to download." />
              </View>
            </View>
          </View>

          <View style={{ flex: 1, width: '100%', maxWidth: 560, gap: 14 }}>
            <HeroLoop />
            <ExampleWorkspace
              value={exampleInput}
              onChangeText={setExampleInput}
              loading={isTryingExample}
              result={demoResult}
              recentResults={recentResults}
              copyFeedback={copyFeedback}
              onTryExample={handleTryExample}
              onCopyResult={() => void handleCopyResult()}
              onShareResult={() => void handleShareResult()}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ExampleWorkspace({
  value,
  onChangeText,
  loading,
  result,
  recentResults,
  copyFeedback,
  onTryExample,
  onCopyResult,
  onShareResult,
}: {
  value: string;
  onChangeText: (value: string) => void;
  loading: boolean;
  result: DemoResult;
  recentResults: string[];
  copyFeedback: string;
  onTryExample: () => void;
  onCopyResult: () => void;
  onShareResult: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        padding: 16,
        gap: 14,
      }}
    >
      <View>
        <Cap>Try an example</Cap>
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 18, marginTop: 5 }}>
          See a rental workspace instantly
        </Text>
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline
        placeholder="Describe a rental..."
        placeholderTextColor={Colors.muted}
        style={{
          minHeight: 92,
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: 8,
          padding: 12,
          color: Colors.primary,
          fontFamily: Fonts.sans,
          fontSize: 14,
          lineHeight: 20,
          backgroundColor: Colors.fill,
          textAlignVertical: 'top',
        }}
      />

      <TouchableOpacity
        onPress={onTryExample}
        disabled={loading}
        activeOpacity={0.78}
        style={{
          minHeight: 48,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: Colors.action,
          backgroundColor: loading ? Colors.fill2 : Colors.actionSoft,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        }}
      >
        {loading ? <ActivityIndicator size="small" color={Colors.action} /> : <AppIcon name="flash-outline" size={18} color={Colors.action} />}
        <Text style={{ color: Colors.action, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
          {loading ? 'Building example...' : 'Try Example'}
        </Text>
      </TouchableOpacity>

      <View
        style={{
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: 8,
          padding: 14,
          backgroundColor: '#FBFCFE',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>{result.title}</Text>
            <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginTop: 5 }}>
              {result.summary}
            </Text>
          </View>
          {loading ? <ActivityIndicator color={Colors.action} /> : <AppIcon name="checkmark-circle" color={Colors.success} size={24} />}
        </View>

        <View style={{ gap: 8, marginTop: 12 }}>
          {result.items.map((item) => (
            <ResultLine key={item} text={item} />
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <SmallAction icon="copy-outline" label={copyFeedback || 'Copy'} onPress={onCopyResult} />
          <SmallAction icon="share-social-outline" label="Share result" onPress={onShareResult} />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Cap>Recent results</Cap>
        {recentResults.map((item) => (
          <Text key={item} numberOfLines={2} style={{ color: Colors.muted, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17 }}>
            {item}
          </Text>
        ))}
      </View>
    </View>
  );
}

function HowItWorksStep({ icon, title, text }: { icon: AppIconName; title: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <AppIcon name={icon} size={17} color={Colors.action} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>{title}</Text>
        <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, marginTop: 2 }}>{text}</Text>
      </View>
    </View>
  );
}

function ResultLine({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppIcon name="checkmark" size={14} color={Colors.success} />
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansMedium, fontSize: 13, flex: 1 }}>{text}</Text>
    </View>
  );
}

function SmallAction({ icon, label, onPress }: { icon: AppIconName; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={{
        minHeight: 38,
        flex: 1,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 7,
      }}
    >
      <AppIcon name={icon} size={15} color={Colors.action} />
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  );
}

type DemoResult = {
  title: string;
  summary: string;
  items: string[];
};

function buildDemoResult(input: string): DemoResult {
  const amount = input.match(/Rs\s?[\d,]+/i)?.[0] ?? 'Rs 32,000';
  return {
    title: 'Rental workspace ready',
    summary: `Flatvio prepared a shared rental record with ${amount} rent, agreement steps, deposit tracking, proof checklist, and receipt workflow.`,
    items: [
      'Agreement checklist ready for landlord and tenant',
      'Rent ledger prepared with due-date tracking',
      'HRA receipt and deposit records grouped in Documents',
    ],
  };
}
