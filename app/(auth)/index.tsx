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
const INITIAL_RESULT = buildDemoResult(EXAMPLE_INPUT);

export default function WelcomeScreen() {
  const router = useRouter();
  const { role, ref } = useLocalSearchParams<{ role?: string; ref?: string }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const contentWidth = Math.max(280, Math.min(480, width - 48));
  const [exampleInput, setExampleInput] = useState(EXAMPLE_INPUT);
  const [isTryingExample, setIsTryingExample] = useState(false);
  const [demoResult, setDemoResult] = useState(INITIAL_RESULT);
  const [recentResults, setRecentResults] = useState<string[]>([INITIAL_RESULT.recentLabel]);
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    if (role === 'landlord' || role === 'tenant') {
      void AsyncStorage.setItem('flatvio.pending_role', role);
    }
    if (typeof ref === 'string' && ref.trim()) {
      void AsyncStorage.setItem('flatvio.pending_referrer_tenant', ref.trim());
    }
  }, [ref, role]);

  const resultText = useMemo(() => formatDemoResult(demoResult), [demoResult]);

  const handleTryExample = () => {
    setIsTryingExample(true);
    setDemoResult({
      title: 'Preparing rental workspace...',
      summary: 'Reading rent terms, deposit, due date, tenant name, and document needs.',
      recentLabel: 'Preparing rental workspace preview.',
      fields: [
        { label: 'Rent', value: 'Reading' },
        { label: 'Due', value: 'Reading' },
        { label: 'Deposit', value: 'Reading' },
      ],
      items: [
        { label: 'Agreement', text: 'Creating landlord and tenant checklist.' },
        { label: 'Rent', text: 'Setting the rent ledger and reminder cadence.' },
        { label: 'Receipts', text: 'Preparing receipt-ready document grouping.' },
      ],
    });

    setTimeout(() => {
      const result = buildDemoResult(exampleInput);
      setDemoResult(result);
      setRecentResults((current) => [result.recentLabel, ...current.filter((item) => item !== result.recentLabel)].slice(0, 3));
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
              <Chip tone="solid">For owners and tenants</Chip>
              <Chip tone="good">No data stored in demo</Chip>
            </View>

            <Cap style={{ marginBottom: 12 }}>Rentals / Proof / Receipts</Cap>
            <DisplayText style={{ fontSize: isWide ? 62 : 44, lineHeight: isWide ? 64 : 46 }}>
              Flatvio helps you run rentals in minutes without chasing paperwork.
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
              A shared workspace for rent collection, HRA receipts, agreement records, deposits, proof photos, and repair updates.
            </Text>

            <View style={{ marginTop: 22, width: contentWidth }}>
              <Button
                title="Start free"
                onPress={() => router.push('/(auth)/login')}
                fullWidth
                size="lg"
              />
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
              <TrustNote icon="shield-checkmark-outline" text="Private demo" />
              <TrustNote icon="time-outline" text="Ready in under a minute" />
              <TrustNote icon="person-circle-outline" text="Built by Flatvio" />
            </View>
          </View>

          <View style={{ flex: 1, width: '100%', maxWidth: 560, gap: 14 }}>
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
            {isWide ? <HeroLoop /> : null}
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: isWide ? 26 : 22,
            gap: 18,
            flexDirection: isWide ? 'row' : 'column',
            alignItems: 'stretch',
          }}
        >
          <View style={{ flex: 1, gap: 10 }}>
            <Cap>How it works</Cap>
            <HowItWorksStep icon="home-outline" title="Add rental terms once" text="Capture rent, deposit, due date, people, documents, and property context together." />
            <HowItWorksStep icon="document-text-outline" title="Turn terms into records" text="Create receipt-ready rent history, agreement tasks, proof albums, and deposit tracking." />
            <HowItWorksStep icon="checkmark-circle-outline" title="Run the month with clarity" text="See what is paid, pending, ending soon, and ready to share before someone asks." />
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <Cap>Why it works</Cap>
            <ProofRow label="Landlords" value="less chasing for rent, repairs, and move-out evidence" />
            <ProofRow label="Tenants" value="clean HRA receipts, payment proof, and portable rental history" />
            <ProofRow label="Scale loop" value="tenants can invite the next owner when they move" />
          </View>
        </View>

        {!isWide ? (
          <View style={{ paddingHorizontal: 24, paddingTop: 18 }}>
            <HeroLoop />
          </View>
        ) : null}
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
          Turn messy rental terms into monthly actions
        </Text>
        <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginTop: 4 }}>
          Edit the sample, then generate a realistic first workspace preview.
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {result.fields.map((field) => (
            <MiniField key={field.label} label={field.label} value={field.value} />
          ))}
        </View>

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
            <ResultLine key={item.label} label={item.label} text={item.text} />
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

function TrustNote({ icon, text }: { icon: AppIconName; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <AppIcon name={icon} size={15} color={Colors.action} />
      <Text style={{ color: Colors.ink3, fontFamily: Fonts.sansMedium, fontSize: 12 }}>{text}</Text>
    </View>
  );
}

function ProofRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        padding: 12,
        backgroundColor: Colors.surface,
      }}
    >
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, marginTop: 3 }}>{value}</Text>
    </View>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        borderRadius: 8,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 8,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: Colors.muted, fontFamily: Fonts.mono, fontSize: 9, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 12, marginTop: 1 }}>{value}</Text>
    </View>
  );
}

function ResultLine({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <View style={{ marginTop: 2 }}>
        <AppIcon name="checkmark" size={14} color={Colors.success} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: Colors.primary, fontFamily: Fonts.sansSemiBold, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: Colors.ink3, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, marginTop: 1 }}>{text}</Text>
      </View>
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
  recentLabel: string;
  fields: { label: string; value: string }[];
  items: { label: string; text: string }[];
};

function buildDemoResult(input: string): DemoResult {
  const rent = input.match(/Rs\s?[\d,]+/i)?.[0] ?? 'Rs 32,000';
  const deposit = input.match(/deposit\s+Rs\s?[\d,]+/i)?.[0]?.replace(/deposit\s+/i, '') ?? 'Rs 64,000';
  const dueDay = input.match(/due\s+on\s+(\d{1,2})(st|nd|rd|th)?/i)?.[1] ?? '5';
  const dueLabel = formatOrdinal(dueDay);
  const tenant = input.match(/tenant\s+([A-Za-z]+)/i)?.[1] ?? 'Priya';
  const location = input.match(/in\s+([A-Za-z ]+?),\s*Rs/i)?.[1]?.trim() ?? 'Indiranagar';
  const home = input.match(/\b(\d+\s?BHK)\b/i)?.[1]?.toUpperCase() ?? '2BHK';

  return {
    title: `${tenant}'s ${location} rental workspace`,
    summary: `${home} rental mapped with ${rent} rent, ${deposit} deposit, due date on the ${dueLabel}, and document workflows for both sides.`,
    recentLabel: `${tenant} / ${location}: ${rent} rent plan with receipt, deposit, proof, and agreement tasks.`,
    fields: [
      { label: 'Rent', value: rent },
      { label: 'Due', value: dueLabel },
      { label: 'Deposit', value: deposit },
    ],
    items: [
      { label: 'Rent collection', text: `Monthly ledger starts with ${rent}; next reminder is scheduled before the ${dueLabel}.` },
      { label: 'Documents', text: 'Agreement, HRA receipt, deposit record, and proof checklist are grouped for quick sharing.' },
      { label: 'Move-out readiness', text: 'Deposit and proof records stay connected so closing-month disputes are easier to resolve.' },
    ],
  };
}

function formatOrdinal(value: string) {
  const day = Number(value);
  if (!Number.isFinite(day)) return value;
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th' : day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th';
  return `${day}${suffix}`;
}

function formatDemoResult(result: DemoResult) {
  const items = result.items.map((item) => `- ${item.label}: ${item.text}`).join('\n');
  return `${result.title}\n${result.summary}\n\n${items}`;
}
