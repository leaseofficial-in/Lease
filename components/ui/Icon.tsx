import React from 'react';
import { TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export type AppIconName = React.ComponentProps<typeof Ionicons>['name'];

export function AppIcon({
  name,
  size = 20,
  color = Colors.primary,
}: {
  name: AppIconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

export function IconButton({
  icon,
  size = 38,
  iconSize = 20,
  iconColor = Colors.primary,
  style,
  ...props
}: TouchableOpacityProps & {
  icon: AppIconName;
  size?: number;
  iconSize?: number;
  iconColor?: string;
}) {
  return (
    <TouchableOpacity
      {...props}
      activeOpacity={props.activeOpacity ?? 0.75}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: Colors.fill,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <AppIcon name={icon} size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
}

export function BackButton(props: Omit<TouchableOpacityProps, 'children'>) {
  return <IconButton {...props} icon="chevron-back" size={36} iconSize={20} iconColor={Colors.primary} />;
}
