import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Share,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../../components/brand/Logo';
import { AppIcon, type AppIconName } from '../../components/ui/Icon';
import { Cap, Chip } from '../../components/ui/V2';
import { Colors, Fonts } from '../../constants/theme';

const EXAMPLE_INPUT = '2BHK in Indiranagar, Rs 32,000 rent, tenant Priya, rent due on 5th, deposit Rs 64,000';
const INITIAL_RESULT = buildDemoResult(EXAMPLE_INPUT);

export default function WelcomeScreen() {
  const { role, ref } = useLocalSearchParams<{ role?: string; ref?: string }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const [input, setInput] = useState(EXAMPLE_INPUT);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(INITIAL_RESULT);
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    if (role === 'landlord' || role === 'tenant') {
      void AsyncStorage.setItem('flatvio.pending_role', role);
    }
    if (typeof ref === 'string' && ref.trim()) {
      void AsyncStorage.setItem('flatvio.pending_referrer_tenant', ref.trim());
    }
  }, [ref, role]);

  const resultText = useMemo(() => formatDemoResult(result), [result]);

  const generateResult = (nextInput = input) => {
    setInput(nextInput);
    setLoading(true);
    setResult(buildLoadingResult(nextInput));

    setTimeout(() => {
      setResult(buildDemoResult(nextInput));
      setLoading(false);
    }, 850);
  };

  const copyResult = async () => {
    await Clipboard.setStringAsync(resultText);
    setCopyFeedback('Copied');
    setTimeout(() => setCopyFeedback(''), 1800);
  };

  const shareResult = async () => {
    const url = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'https://flatvio.vercel.app';
    const message = `${resultText}\n\nTry Flatvio: ${url}`;

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
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-3xl space-y-6 pt-4">
          <Logo variant="full" size={42} />
          <Hero />
          <InputCard
            value={input}
            loading={loading}
            isWide={isWide}
            onChangeText={setInput}
            onGenerate={() => generateResult()}
            onTryExample={() => generateResult(EXAMPLE_INPUT)}
          />
          <OutputCard
            result={result}
            loading={loading}
            copyFeedback={copyFeedback}
            isWide={isWide}
            onCopy={() => void copyResult()}
            onShare={() => void shareResult()}
          />
          <TrustSection />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Hero() {
  return (
    <View className="space-y-4">
      <View className="flex-row flex-wrap gap-2">
        <Chip tone="solid">For owners and tenants</Chip>
        <Chip tone="good">No data stored</Chip>
      </View>
      <View className="space-y-3">
        <Cap>Rentals / Proof / Receipts</Cap>
        <Text
          className="text-primary"
          style={{ fontFamily: Fonts.serif, fontSize: 46, lineHeight: 48, letterSpacing: 0 }}
        >
          Flatvio helps you run rentals in minutes without chasing paperwork.
        </Text>
        <Text
          className="max-w-2xl text-ink3"
          style={{ fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24 }}
        >
          Turn messy rent terms into a shared workspace for collections, HRA receipts, agreements, deposits, proof photos, and repairs.
        </Text>
      </View>
    </View>
  );
}

function InputCard({
  value,
  loading,
  isWide,
  onChangeText,
  onGenerate,
  onTryExample,
}: {
  value: string;
  loading: boolean;
  isWide: boolean;
  onChangeText: (value: string) => void;
  onGenerate: () => void;
  onTryExample: () => void;
}) {
  return (
    <View className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <View className="space-y-1">
        <Text className="text-primary" style={{ fontFamily: Fonts.sansSemiBold, fontSize: 18 }}>
          Describe one rental
        </Text>
        <Text className="text-ink3" style={{ fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
          Use the example or edit it. Keep it plain, like a WhatsApp message.
        </Text>
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline
        placeholder="Example: 2BHK in Indiranagar..."
        placeholderTextColor={Colors.muted}
        className="min-h-32 rounded-lg border border-border bg-fill p-3 text-primary"
        style={{ fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' }}
      />

      <View className={isWide ? 'flex-row gap-3' : 'space-y-3'}>
        <PrimaryAction loading={loading} onPress={onGenerate} />
        <SecondaryAction disabled={loading} icon="flash-outline" label="Try Example" onPress={onTryExample} />
      </View>
    </View>
  );
}

function OutputCard({
  result,
  loading,
  copyFeedback,
  isWide,
  onCopy,
  onShare,
}: {
  result: DemoResult;
  loading: boolean;
  copyFeedback: string;
  isWide: boolean;
  onCopy: () => void;
  onShare: () => void;
}) {
  return (
    <View className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 space-y-1">
          <Cap>Output</Cap>
          <Text className="text-primary" style={{ fontFamily: Fonts.sansSemiBold, fontSize: 18, lineHeight: 24 }}>
            {result.title}
          </Text>
          <Text className="text-ink3" style={{ fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 }}>
            {result.summary}
          </Text>
        </View>
        <View className="pt-1">
          {loading ? <ActivityIndicator color={Colors.action} /> : <AppIcon name="checkmark-circle" color={Colors.success} size={24} />}
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {result.fields.map((field) => (
          <MiniField key={field.label} label={field.label} value={field.value} />
        ))}
      </View>

      <View className="space-y-3">
        {result.items.map((item) => (
          <ResultLine key={item.label} label={item.label} text={item.text} />
        ))}
      </View>

      <View className={isWide ? 'flex-row gap-3' : 'space-y-3'}>
        <SecondaryAction icon="copy-outline" label={copyFeedback || 'Copy result'} onPress={onCopy} />
        <SecondaryAction icon="share-social-outline" label="Share" onPress={onShare} />
      </View>
    </View>
  );
}

function TrustSection() {
  return (
    <View className="space-y-4 pb-2">
      <View className="flex-row flex-wrap gap-3">
        <TrustPill icon="person-circle-outline" label="Built by Flatvio" />
        <TrustPill icon="shield-checkmark-outline" label="No data stored" />
      </View>

      <View className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <View className="space-y-1">
          <Cap>How it works</Cap>
          <Text className="text-primary" style={{ fontFamily: Fonts.sansSemiBold, fontSize: 16 }}>
            From rental terms to monthly clarity
          </Text>
        </View>
        <HowItWorksStep
          icon="home-outline"
          title="Add rental terms"
          text="Capture property, rent, deposit, due date, and people in one clean record."
        />
        <HowItWorksStep
          icon="document-text-outline"
          title="Generate records"
          text="Prepare agreement tasks, receipt-ready rent history, proof folders, and deposit tracking."
        />
        <HowItWorksStep
          icon="checkmark-circle-outline"
          title="Run the month"
          text="See what is paid, pending, ending soon, and ready to share before anyone has to chase."
        />
      </View>
    </View>
  );
}

function PrimaryAction({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.82}
      className="min-h-12 flex-1 flex-row items-center justify-center rounded-lg bg-primary px-4"
    >
      {loading ? (
        <ActivityIndicator size="small" color={Colors.surface} />
      ) : (
        <>
          <AppIcon name="sparkles-outline" size={18} color={Colors.surface} />
          <Text className="ml-2 text-surface" style={{ fontFamily: Fonts.sansSemiBold, fontSize: 15 }}>
            Generate
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function SecondaryAction({
  icon,
  label,
  disabled = false,
  onPress,
}: {
  icon: AppIconName;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.78}
      className={`min-h-12 flex-1 flex-row items-center justify-center rounded-lg border border-border bg-surface px-4 ${disabled ? 'opacity-50' : ''}`}
    >
      <AppIcon name={icon} size={16} color={Colors.action} />
      <Text className="ml-2 text-primary" style={{ fontFamily: Fonts.sansSemiBold, fontSize: 14 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-24 flex-1 rounded-lg border border-border bg-fill px-3 py-2">
      <Text className="text-muted" style={{ fontFamily: Fonts.mono, fontSize: 9, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text className="text-primary" style={{ fontFamily: Fonts.sansSemiBold, fontSize: 13, lineHeight: 18 }}>
        {value}
      </Text>
    </View>
  );
}

function ResultLine({ label, text }: { label: string; text: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="mt-1 h-5 w-5 items-center justify-center rounded-full bg-successSoft">
        <AppIcon name="checkmark" size={13} color={Colors.success} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-primary" style={{ fontFamily: Fonts.sansSemiBold, fontSize: 13, lineHeight: 18 }}>
          {label}
        </Text>
        <Text className="text-ink3" style={{ fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17 }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function TrustPill({ icon, label }: { icon: AppIconName; label: string }) {
  return (
    <View className="flex-row items-center rounded-full border border-border bg-surface px-3 py-2">
      <AppIcon name={icon} size={15} color={Colors.action} />
      <Text className="ml-2 text-ink3" style={{ fontFamily: Fonts.sansMedium, fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}

function HowItWorksStep({ icon, title, text }: { icon: AppIconName; title: string; text: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-full border border-border bg-fill">
        <AppIcon name={icon} size={17} color={Colors.action} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-primary" style={{ fontFamily: Fonts.sansSemiBold, fontSize: 14, lineHeight: 19 }}>
          {title}
        </Text>
        <Text className="text-ink3" style={{ fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18 }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

type DemoResult = {
  title: string;
  summary: string;
  fields: { label: string; value: string }[];
  items: { label: string; text: string }[];
};

function buildLoadingResult(input: string): DemoResult {
  const parsed = buildDemoResult(input);
  return {
    title: 'Generating rental workspace...',
    summary: 'Reading rent, deposit, due date, tenant, and document needs.',
    fields: parsed.fields.map((field) => ({ label: field.label, value: 'Reading' })),
    items: [
      { label: 'Rent collection', text: 'Preparing ledger, reminder, and monthly status.' },
      { label: 'Documents', text: 'Grouping agreement, HRA receipt, proof, and deposit records.' },
      { label: 'Move-out readiness', text: 'Connecting proof and deposit records for closing month.' },
    ],
  };
}

function buildDemoResult(input: string): DemoResult {
  const rent = input.match(/Rs\s?[\d,]+/i)?.[0] ?? 'Rs 32,000';
  const deposit = input.match(/deposit\s+Rs\s?[\d,]+/i)?.[0]?.replace(/deposit\s+/i, '') ?? 'Rs 64,000';
  const dueDay = input.match(/due\s+on\s+(\d{1,2})(st|nd|rd|th)?/i)?.[1] ?? '5';
  const dueLabel = formatOrdinal(dueDay);
  const tenant = input.match(/tenant\s+([A-Za-z]+)/i)?.[1] ?? 'Priya';
  const location = input.match(/in\s+([A-Za-z ]+?),\s*Rs/i)?.[1]?.trim() ?? 'Indiranagar';
  const home = input.match(/\b(\d+\s?BHK)\b/i)?.[1]?.toUpperCase() ?? '2BHK';

  return {
    title: `${tenant}'s ${location} workspace`,
    summary: `${home} rental mapped with ${rent} rent, ${deposit} deposit, due date on the ${dueLabel}, and document workflows for both sides.`,
    fields: [
      { label: 'Rent', value: rent },
      { label: 'Due', value: dueLabel },
      { label: 'Deposit', value: deposit },
    ],
    items: [
      { label: 'Rent collection', text: `Monthly ledger starts with ${rent}; reminder is scheduled before the ${dueLabel}.` },
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
