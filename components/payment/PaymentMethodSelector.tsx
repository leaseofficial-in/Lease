import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type PaymentMethod = 'upi' | 'card' | 'netbanking';

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const methods: { id: PaymentMethod; label: string; subtitle: string; emoji: string }[] = [
  { id: 'upi', label: 'UPI', subtitle: 'Google Pay, PhonePe, Paytm', emoji: '⚡' },
  { id: 'card', label: 'Debit / Credit Card', subtitle: 'Visa, Mastercard, RuPay', emoji: '💳' },
  { id: 'netbanking', label: 'Net Banking', subtitle: 'All major Indian banks', emoji: '🏦' },
];

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selected,
  onChange,
}) => {
  return (
    <View className="gap-3">
      {methods.map((method) => {
        const isSelected = selected === method.id;
        return (
          <TouchableOpacity
            key={method.id}
            onPress={() => onChange(method.id)}
            className={`flex-row items-center p-4 rounded-xl border-2 ${
              isSelected ? 'border-action bg-blue-50' : 'border-border bg-white'
            }`}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 24 }} className="mr-3">
              {method.emoji}
            </Text>
            <View className="flex-1">
              <Text
                className={`text-sm font-semibold ${
                  isSelected ? 'text-action' : 'text-primary'
                }`}
              >
                {method.label}
              </Text>
              <Text className="text-xs text-muted">{method.subtitle}</Text>
            </View>
            <View
              className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                isSelected ? 'border-action bg-action' : 'border-border'
              }`}
            >
              {isSelected && <View className="w-2 h-2 rounded-full bg-white" />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
