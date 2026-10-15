import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { TANSTACK_QUERY_LOGO } from './tanstackLogo';

interface TanStackIconProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export const TanStackIcon: React.FC<TanStackIconProps> = ({
  size = 18,
  style,
}) => {
  return (
    <Image
      source={{ uri: TANSTACK_QUERY_LOGO }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.22),
          resizeMode: 'cover',
        },
        style,
      ]}
    />
  );
};
