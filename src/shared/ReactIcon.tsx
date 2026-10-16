import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ImageStyle, StyleProp } from 'react-native';
import { REACT_LOGO_URI } from './reactLogo';

interface ReactIconProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
  rotating?: boolean;
}

export const ReactIcon: React.FC<ReactIconProps> = ({
  size = 20,
  style,
  rotating = true,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!rotating || process.env.NODE_ENV === 'test') return;

    const spinAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 9000, // 9 seconds for smooth, slow continuous rotation
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    spinAnimation.start();
    return () => spinAnimation.stop();
  }, [rotating]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.Image
      source={{ uri: REACT_LOGO_URI }}
      style={[
        {
          width: size,
          height: size,
          resizeMode: 'contain',
          backgroundColor: 'transparent',
          transform: [{ rotate: spin }],
        },
        style,
      ]}
    />
  );
};
