import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { REACT_LOGO_URI } from './reactLogo';

interface ReactIconProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export const ReactIcon: React.FC<ReactIconProps> = ({
  size = 20,
  style,
}) => {
  return (
    <Image
      source={{ uri: REACT_LOGO_URI }}
      style={[
        {
          width: size,
          height: size,
          resizeMode: 'contain',
        },
        style,
      ]}
    />
  );
};
