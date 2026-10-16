import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DevToolsWorkbench } from './shell/DevToolsWorkbench';
import { FloatingHud } from './shell/FloatingHud';
import { consoleManager } from './modules/console/consoleInterceptor';
import { networkManager } from './modules/network/networkInterceptor';
import { useQueryDevtools } from './modules/query/useQueryDevtools';
import { ThemeProvider } from './theme/ThemeContext';
import type { ConsoleLogItem, UnifiedDevToolsProps } from './types';

const UnifiedDevToolsContent: React.FC<UnifiedDevToolsProps> = ({
  queryClient,
  defaultTab = 'query',
  initialIsOpen = false,
  position = 'bottom-right',
  enabled = true,
  enableConsole = true,
  enableNetwork = true,
  sheetHeightRatio = 0.82,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [logs, setLogs] = useState<ConsoleLogItem[]>([]);
  const [networkErrors, setNetworkErrors] = useState<number>(0);

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

  // Initialize network interceptor & mock engine on mount
  useEffect(() => {
    if (enableNetwork) {
      networkManager.init();
      const unsubscribe = networkManager.subscribe((reqs) => {
        const errors = reqs.filter(
          (r) => (r.status !== undefined && r.status >= 400) || r.error
        ).length;
        setNetworkErrors(errors);
      });
      return unsubscribe;
    }
  }, [enableNetwork]);

  const { queries, stats, queryClient: resolvedClient } = useQueryDevtools(queryClient);

  if (!enabled) {
    return null;
  }

  const consoleErrorCount = logs.filter((l) => l.level === 'error').length;
  const totalErrorCount = consoleErrorCount + networkErrors;

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
        errorCount={totalErrorCount}
        initialPosition={position}
      />

      {/* Main Workbench Bottom Sheet */}
      <DevToolsWorkbench
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        defaultTab={defaultTab}
        queries={queries}
        queryClient={resolvedClient}
        queryStats={stats}
        logs={logs}
        sheetHeightRatio={sheetHeightRatio}
      />
    </View>
  );
};

export const UnifiedDevTools: React.FC<UnifiedDevToolsProps> = (props) => {
  return (
    <ThemeProvider initialMode={props.themeMode ?? 'dark'}>
      <UnifiedDevToolsContent {...props} />
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    zIndex: 999999,
    elevation: 999999,
  },
});
