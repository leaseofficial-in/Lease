import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { Colors, Fonts } from '../../constants/theme';

const FRAME_COUNT = 3;

export function HeroLoop() {
  const [frame, setFrame] = useState(0);
  const opacities = useRef(
    Array.from({ length: FRAME_COUNT }, (_, i) => new Animated.Value(i === 0 ? 1 : 0)),
  ).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((current) => (current + 1) % FRAME_COUNT);
    }, 1700);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    opacities.forEach((opacity, i) => {
      Animated.timing(opacity, {
        toValue: i === frame ? 1 : 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });
  }, [frame, opacities]);

  return (
    <View
      className="overflow-hidden"
      style={{
        height: 280,
        borderRadius: 24,
        backgroundColor: '#F8F6F1',
        borderColor: Colors.border,
        borderWidth: 1,
      }}
    >
      <Frame opacity={opacities[0]} label="01 / Move in">
        <MoveInFrame />
      </Frame>
      <Frame opacity={opacities[1]} label="02 / Capture proof">
        <ProofFrame />
      </Frame>
      <Frame opacity={opacities[2]} label="03 / Rent on time">
        <RentFrame />
      </Frame>

      <View className="absolute left-0 right-0 bottom-4 items-center">
        <Text
          style={{
            color: Colors.muted,
            fontFamily: Fonts.mono,
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {frame === 0 ? '01 / Move in' : frame === 1 ? '02 / Capture proof' : '03 / Rent on time'}
        </Text>
      </View>
    </View>
  );
}

function Frame({
  opacity,
  children,
}: {
  opacity: Animated.Value;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Animated.View className="absolute inset-0" style={{ opacity }}>
      {children}
    </Animated.View>
  );
}

function MoveInFrame() {
  return (
    <Svg viewBox="0 0 380 280" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <Defs>
        <LinearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={Colors.canvas} />
          <Stop offset="100%" stopColor="#E4E0D6" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={380} height={280} fill="#F8F6F1" />
      <Rect x={0} y={200} width={380} height={80} fill="url(#floor)" />
      <Path d="M120 200 V100 L190 50 L260 100 V200" stroke={Colors.primary} strokeWidth={3} fill="none" strokeLinejoin="round" />
      <Path d="M150 200 V130 a40 40 0 0 1 80 0 V200" stroke={Colors.primary} strokeWidth={3} fill="none" strokeLinejoin="round" />
      <Path d="M150 200 L130 260 L250 260 L230 200 Z" fill="rgba(255,200,80,0.18)" />
      <G transform="translate(190 130)">
        <Circle r={6} fill={Colors.primary} />
        <Line x1={0} y1={6} x2={0} y2={22} stroke={Colors.primary} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={0} y1={14} x2={6} y2={14} stroke={Colors.primary} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={0} y1={20} x2={4} y2={20} stroke={Colors.primary} strokeWidth={2.5} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

function ProofFrame() {
  return (
    <Svg viewBox="0 0 380 280" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <Rect x={0} y={0} width={380} height={280} fill="#F8F6F1" />
      <G transform="translate(90 60)">
        <Rect x={-4} y={6} width={200} height={140} rx={14} fill={Colors.surface} stroke={Colors.border} strokeWidth={1} rotation={-4} />
        <Rect x={2} y={3} width={200} height={140} rx={14} fill={Colors.surface} stroke={Colors.border} strokeWidth={1} rotation={2} />
        <Rect x={0} y={0} width={200} height={140} rx={14} fill={Colors.surface} stroke={Colors.primary} strokeWidth={1.5} />
        <Line x1={0} y1={46} x2={200} y2={46} stroke={Colors.border} />
        <Line x1={66} y1={0} x2={66} y2={140} stroke={Colors.border} />
        <Line x1={133} y1={0} x2={133} y2={140} stroke={Colors.border} />
        <Line x1={0} y1={93} x2={200} y2={93} stroke={Colors.border} />
        <Line x1={0} y1={0} x2={200} y2={140} stroke={Colors.border} />
        <Circle cx={155} cy={40} r={14} fill={Colors.danger} />
        <SvgText x={155} y={44} textAnchor="middle" fill={Colors.surface} fontSize={11} fontWeight="700">
          !
        </SvgText>
        <G transform="translate(80 175)">
          <Circle r={20} fill={Colors.primary} />
          <Path d="M-8 0 L-2 6 L8 -5" stroke={Colors.surface} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </G>
      </G>
    </Svg>
  );
}

function RentFrame() {
  return (
    <Svg viewBox="0 0 380 280" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <Rect x={0} y={0} width={380} height={280} fill="#F8F6F1" />
      <G transform="translate(40 100)">
        <Rect width={100} height={80} rx={14} fill={Colors.surface} stroke={Colors.primary} strokeWidth={1.5} />
        <Circle cx={22} cy={22} r={11} fill={Colors.fill2} />
        <SvgText x={22} y={26} textAnchor="middle" fontSize={10} fontWeight="700" fill={Colors.ink3}>
          PS
        </SvgText>
        <Line x1={40} y1={20} x2={84} y2={20} stroke={Colors.primary} strokeWidth={2} />
        <Line x1={40} y1={28} x2={74} y2={28} stroke={Colors.border} strokeWidth={1.5} />
        <SvgText x={10} y={60} fontSize={20} fill={Colors.primary}>
          Rs 32k
        </SvgText>
      </G>
      <G transform="translate(240 100)">
        <Rect width={100} height={80} rx={14} fill={Colors.primary} />
        <Circle cx={22} cy={22} r={11} fill="rgba(255,255,255,0.15)" />
        <SvgText x={22} y={26} textAnchor="middle" fontSize={10} fontWeight="700" fill={Colors.surface}>
          AK
        </SvgText>
        <Line x1={40} y1={20} x2={84} y2={20} stroke={Colors.surface} strokeWidth={2} />
        <Line x1={40} y1={28} x2={74} y2={28} stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
        <SvgText x={10} y={60} fontSize={20} fill={Colors.surface}>
          +Rs 32k
        </SvgText>
      </G>
      <Path d="M140 140 Q190 100 240 140" stroke={Colors.primary} strokeWidth={2} fill="none" strokeDasharray="6 6" />
      <Circle cx={190} cy={120} r={10} fill={Colors.primary} />
      <SvgText x={190} y={124} textAnchor="middle" fontSize={10} fontWeight="700" fill={Colors.surface}>
        Rs
      </SvgText>
      <G transform="translate(190 50)">
        <Circle r={18} fill="none" stroke={Colors.primary} strokeWidth={1.5} strokeDasharray="3 3" />
        <Path d="M-7 0 L-2 5 L7 -5" stroke={Colors.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </G>
    </Svg>
  );
}
