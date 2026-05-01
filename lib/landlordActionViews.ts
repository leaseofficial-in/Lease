import AsyncStorage from '@react-native-async-storage/async-storage';

export type LandlordActionKind = 'repairs' | 'payments';

const keyFor = (landlordId: string, kind: LandlordActionKind) =>
  `flatvio.landlord.viewed-actions.${landlordId}.${kind}`;

export const getViewedLandlordActionIds = async (
  landlordId: string,
  kind: LandlordActionKind,
): Promise<string[]> => {
  const raw = await AsyncStorage.getItem(keyFor(landlordId, kind));
  return raw ? (JSON.parse(raw) as string[]) : [];
};

export const markLandlordActionsViewed = async (
  landlordId: string,
  kind: LandlordActionKind,
  ids: string[],
): Promise<void> => {
  if (!ids.length) return;
  const current = await getViewedLandlordActionIds(landlordId, kind);
  const next = Array.from(new Set([...current, ...ids]));
  await AsyncStorage.setItem(keyFor(landlordId, kind), JSON.stringify(next));
};
