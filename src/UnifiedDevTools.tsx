import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DevToolsWorkbench } from './shell/DevToolsWorkbench';
import { FloatingHud } from './shell/FloatingHud';
import { consoleManager } from './modules/console/consoleInterceptor';
import { useQueryDevtools } from './modules/query/useQueryDevtools';
import type { ConsoleLogItem, UnifiedDevToolsProps } from './types';

export const UnifiedDevTools: React.FC<UnifiedDevToolsProps> = ({
  queryClient,
  defaultTab = 'query',
  initialIsOpen = false,
  position = 'bottom-right',
  enabled = true,
  enableConsole = true,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [logs, setLogs] = useState<ConsoleLogItem[]>([]);

  // Initialize console interceptor on mount
  useEffect(() => {
    if (enableConsole) {
      consoleManager.init();
      const unsubscribe = consoleManager.subscribe((newLogs) => {
        setLogs(newLogs);
      });
      return unsubscribe;
    }
  }, [enableConsole]);

  const { queries, stats, queryClient: resolvedClient } = useQueryDevtools(queryClient);

  if (!enabled) {
    return null;
  }

  const errorCount = logs.filter((l) => l.level === 'error').length;

  return (
    <View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFillObject,
        styles.overlay,
        style,
      ]}
    >
      {/* Floating HUD Trigger */}
      <FloatingHud
        onPress={() => setIsOpen(true)}
        queryStats={stats}
        errorCount={errorCount}
        initialPosition={position}
      />

      {/* Main Workbench Modal */}
      <DevToolsWorkbench
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        defaultTab={defaultTab}
        queries={queries}
        queryClient={resolvedClient}
        queryStats={stats}
        logs={logs}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    zIndex: 999999,
    elevation: 999999,
  },
});
