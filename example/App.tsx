import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { UnifiedDevTools } from '../src';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 15,
    },
  },
});

function FeedQuery() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['feed', { category: 'react-native-0.83' }],
    queryFn: async () => {
      console.log('[App] Fetching feed query data...');
      await new Promise((r) => setTimeout(r, 600));
      return [
        { id: 1, title: 'React Native 0.83 Bridgeless Architecture', stars: 1204 },
        { id: 2, title: 'Hermes Engine Memory & TurboModules', stars: 840 },
        { id: 3, title: 'Native Unified DevTools Suite Launched', stars: 3100 },
      ];
    },
  });

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Feed Query (staleTime: 15s)</Text>
      {isLoading ? (
        <Text style={styles.dimText}>Loading feed items...</Text>
      ) : (
        data?.map((item) => (
          <Text key={item.id} style={styles.itemText}>
            ★ {item.title} ({item.stars} stars)
          </Text>
        ))
      )}
      <TouchableOpacity style={styles.actionBtn} onPress={() => refetch()}>
        <Text style={styles.actionBtnText}>Refetch Feed</Text>
      </TouchableOpacity>
    </View>
  );
}

function UserQuery() {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['user', { id: 101 }],
    queryFn: async () => {
      console.log('[App] Fetching user profile...');
      await new Promise((r) => setTimeout(r, 800));
      return {
        id: 101,
        username: 'engineer_083',
        settings: {
          darkMode: true,
          notifications: {
            push: true,
            email: false,
          },
        },
      };
    },
  });

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>User Query (Nested Object)</Text>
      <Text style={styles.itemText}>User: {data?.username ?? 'Loading...'}</Text>
      <TouchableOpacity
        style={styles.actionBtn}
        disabled={isFetching}
        onPress={() => refetch()}
      >
        <Text style={styles.actionBtnText}>
          {isFetching ? 'Refetching...' : 'Refetch User'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ConsoleLoggerSection() {
  const triggerLog = () => {
    console.log('[Demo] Structured Log:', {
      timestamp: Date.now(),
      target: 'React Native 0.83+',
      architecture: 'Bridgeless / Fabric',
      payload: { valid: true, count: 42 },
    });
  };

  const triggerWarn = () => {
    console.warn('[Demo] Warning: Cache TTL expiring soon for session token');
  };

  const triggerError = () => {
    console.error('[Demo] Unhandled Error: Simulated API 500 Network Exception');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Console Interceptor Triggers</Text>
      <Text style={styles.dimText}>
        Tap these buttons to generate logs. Notice the Floating Capsule error counter update in real-time!
      </Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.logBtn} onPress={triggerLog}>
          <Text style={styles.btnText}>console.log</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.warnBtn} onPress={triggerWarn}>
          <Text style={styles.btnText}>console.warn</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.errBtn} onPress={triggerError}>
          <Text style={styles.btnText}>console.error</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.header}>Unified DevTools Demo</Text>
          <Text style={styles.subtitle}>
            React Native 0.83+ & Expo Native Developer Workbench.
            Tap the floating capsule at the bottom to inspect queries and logs!
          </Text>

          <FeedQuery />
          <UserQuery />
          <ConsoleLoggerSection />
        </ScrollView>

        {/* Unified In-App DevTools Component */}
        <UnifiedDevTools
          queryClient={queryClient}
          defaultTab="query"
          initialIsOpen={false}
          position="bottom-right"
        />
      </SafeAreaView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  container: {
    padding: 16,
    gap: 16,
  },
  header: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 12,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  dimText: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  itemText: {
    color: '#e2e8f0',
    fontSize: 13,
    marginVertical: 2,
  },
  actionBtn: {
    backgroundColor: '#ff4154',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  logBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  warnBtn: {
    flex: 1,
    backgroundColor: '#78350f',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b45309',
  },
  errBtn: {
    flex: 1,
    backgroundColor: '#7f1d1d',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
