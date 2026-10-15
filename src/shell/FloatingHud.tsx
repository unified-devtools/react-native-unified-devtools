import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { THEME } from '../theme/colors';
import { TanStackIcon } from '../shared/TanStackIcon';
import type { QueryStats } from '../types';

interface FloatingHudProps {
  onPress: () => void;
  queryStats: QueryStats;
  errorCount: number;
  initialPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const HUD_WIDTH = 180;
const HUD_HEIGHT = 44;

export const FloatingHud: React.FC<FloatingHudProps> = ({
  onPress,
  queryStats,
  errorCount,
  initialPosition = 'bottom-right',
}) => {
  const window = Dimensions.get('window');

  // Measure live FPS
  const [fps, setFps] = useState<number>(60);
  const frameCount = useRef(0);
  const lastTime = useRef(Date.now());

  useEffect(() => {
    let animId: number;

    const loop = () => {
      frameCount.current += 1;
      const now = Date.now();
      const delta = now - lastTime.current;

      if (delta >= 1000) {
        const currentFps = Math.round((frameCount.current * 1000) / delta);
        setFps(Math.min(60, currentFps));
        frameCount.current = 0;
        lastTime.current = now;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Initial coordinates
  const getInitialCoords = () => {
    const isTop = initialPosition.startsWith('top');
    const isLeft = initialPosition.endsWith('left');
    return {
      x: isLeft ? 16 : Math.max(16, window.width - HUD_WIDTH - 16),
      y: isTop ? 70 : Math.max(70, window.height - HUD_HEIGHT - 90),
    };
  };

  const initial = getInitialCoords();
  const pan = useRef(new Animated.ValueXY({ x: initial.x, y: initial.y })).current;

  // Track position for edge snapping
  const currentPos = useRef({ x: initial.x, y: initial.y });
  useEffect(() => {
    const listenerId = pan.addListener((value) => {
      currentPos.current = value;
    });
    return () => {
      pan.removeListener(listenerId);
    };
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      // Allow children (TouchableOpacity) to receive tap touches first
      onStartShouldSetPanResponder: () => false,
      // Only capture touch when dragging movement exceeds 3px
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();

        // Edge snap animation (snap to nearest left or right edge like iOS AssistiveTouch / Buoy)
        const targetX =
          currentPos.current.x < window.width / 2
            ? 16
            : window.width - HUD_WIDTH - 16;

        // Clamp Y inside screen bounds
        const minY = 60;
        const maxY = window.height - HUD_HEIGHT - 60;
        const targetY = Math.min(Math.max(currentPos.current.y, minY), maxY);

        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          friction: 6,
          tension: 40,
        }).start();
      },
    })
  ).current;

  const fpsColor =
    fps >= 50
      ? THEME.colors.status.fresh
      : fps >= 35
      ? THEME.colors.status.stale
      : THEME.colors.status.error;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={styles.capsule}
      >
        {/* TanStack Brand / Queries Dot */}
        <View style={styles.pillItem}>
          <TanStackIcon size={16} />
          <Text style={styles.queryCountText}>{queryStats.all}</Text>
        </View>

        <View style={styles.divider} />

        {/* Live FPS */}
        <View style={styles.pillItem}>
          <View style={[styles.fpsDot, { backgroundColor: fpsColor }]} />
          <Text style={styles.fpsText}>{fps} FPS</Text>
        </View>

        {/* Errors badge (if any) */}
        {errorCount > 0 && (
          <>
            <View style={styles.divider} />
            <View style={[styles.pillItem, styles.errorPill]}>
              <Text style={styles.errorText}>🔴 {errorCount}</Text>
            </View>
          </>
        )}

        <View style={styles.divider} />

        {/* Menu 3-dots */}
        <Text style={styles.moreIcon}>⋯</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 999999,
    elevation: 999999,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 17, 32, 0.96)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
    gap: 6,
    minWidth: HUD_WIDTH,
    justifyContent: 'center',
  },
  pillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  atomIcon: {
    color: THEME.colors.accent,
    fontSize: 14,
    fontWeight: 'bold',
  },
  queryCountText: {
    color: THEME.colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  fpsDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  fpsText: {
    color: THEME.colors.textDim,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Courier',
  },
  errorPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  errorText: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '700',
  },
  moreIcon: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    marginLeft: 2,
  },
});
