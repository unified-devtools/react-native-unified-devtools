# react-native-unified-devtools

An in-app developer tools suite for React Native 0.83+ and Expo. Runs directly inside your running app with zero native iOS or Android dependencies.

---

## Why this exists

React Native debugging broke down when Flipper was deprecated, while desktop tools like Reactotron require running a separate Electron companion app. Browser-based tools like `@tanstack/react-query-devtools` crash on mobile because they depend on DOM elements (`document`, `window`, HTML `div` tags).

`react-native-unified-devtools` is built entirely with React Native primitives (`View`, `Text`, `Modal`, `FlatList`, `PanResponder`). It runs on the React Native 0.83+ New Architecture (Bridgeless mode and Fabric) out of the box, with zero CocoaPods, Gradle configs, or native rebuilds.

---

## Current Features (v0.1.0)

### 1. Draggable Floating HUD

- **Edge-Snapping Capsule**: A persistent overlay pill that stays on screen across hot reloads. Dragging and releasing automatically springs the pill to the nearest left or right edge.
- **Live Micro-Metrics**:
  - Real-time JS thread FPS monitor (updates every second; flags drops below 55 FPS).
  - Active TanStack Query counter.
  - Live error pill that highlights red when unhandled exceptions or console errors occur.
- **Touch-Safe**: Uses movement deltas to separate dragging from taps, opening the workbench on click without getting stuck.

### 2. TanStack Query Inspector

- **Status Badges**: Categorizes all cached queries into `fresh`, `fetching`, `stale`, `paused`, `inactive`, and `error`.
- **Cache Mutation Actions**:
  - Individual query actions: Refetch, Invalidate, Reset, Remove.
  - State simulation: Trigger Loading (`+Load`) and Trigger Error (`+Err`) to test UI fallbacks without touching your backend.
  - Global actions: Refetch All and Clear Cache.
- **Native JSON Tree**: An expandable/collapsible tree viewer built without web DOM libraries. Highlights strings, numbers, booleans, arrays, and objects with depth indentation.
- **Filter and Sort**: Search query keys by text or sort by status, query hash, and last updated timestamp.

### 3. In-App Console Logger

- **Non-Destructive Interception**: Wraps `console.log`, `console.info`, `console.warn`, `console.error`, and `console.debug` while preserving standard Metro terminal output.
- **Log Filtering**: Filter by level (`All`, `Errors`, `Warnings`, `Logs`) or search text across logged arguments.
- **Deep Argument Inspection**: Objects and arrays passed to `console.log` can be expanded inline through the JSON tree.
- **Error Traces**: Captures call stacks for `console.error` and exceptions with selectable text for copying.

---

## Roadmap & Future Releases

### Network Inspector & Mock Overrides

- **Traffic Capture**: Intercept `global.fetch` and `XMLHttpRequest` calls (Axios, Apollo GraphQL, Supabase, and REST).
- **Deep Inspection**: View request headers, query parameters, response headers, payload, and auto-parsed response JSON.
- **Response Mocking & Overrides**:
  - Return mock status codes (200, 400, 401, 404, 500) without backend changes.
  - Simulate offline failures, request timeouts, and artificial latency delays.
  - In-app response body editor to test edge cases.
- **Export**: Copy any request as a `curl` command.

### State & Storage (Zustand & AsyncStorage)

- **Zustand Inspector**: Register store hooks to view live state trees, track the last 50 state transitions with property diffs, and test state overrides in-place.
- **AsyncStorage Explorer**: Inspect all persisted keys and byte sizes, edit stored values in-app with JSON validation, delete individual keys, or wipe the cache.

### Mobile Lighthouse Performance Auditor

- **0–100 Performance Score**: Algorithmic screen health rating based on mount speed, frame stability, and thread lag.
- **Screen Mount TTI**: Track milliseconds elapsed from navigation transition to screen mount commit.
- **Thread Lag (TBT)**: Measure event loop delays and dropped frames on the JS thread.
- **Re-render Hotspot Detection**: Hook into `React.Profiler` to flag components that re-render excessively.
- **Actionable Diagnostics**: Automated warnings when screens exceed render budgets or generate memory spikes.

---

## Compatibility

- **React Native**: 0.74.0 through 0.83+ (Fabric & Bridgeless supported)
- **React**: 18.2.0 and 19.x
- **TanStack Query**: `@tanstack/react-query` v4 and v5
- **Platforms**: iOS, Android, Expo Go, Expo Prebuild, bare React Native CLI

---

## Installation

```bash
npm install react-native-unified-devtools
# or
yarn add react-native-unified-devtools
```

Ensure `@tanstack/react-query` is installed if you use the Query module.

---

## Quick Start

Place `<UnifiedDevTools />` at the root of your application:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedDevTools } from 'react-native-unified-devtools';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <View style={styles.root}>
        {/* Your application screens and navigation */}
        <RootNavigator />

        {/* In-App DevTools overlay */}
        {__DEV__ && (
          <UnifiedDevTools
            queryClient={queryClient}
            defaultTab="query"
            initialIsOpen={false}
            position="bottom-right"
          />
        )}
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
```

---

## Props

| Prop            | Type                                                           | Default          | Description                                            |
| :-------------- | :------------------------------------------------------------- | :--------------- | :----------------------------------------------------- |
| `queryClient`   | `QueryClient`                                                  | `undefined`      | Optional instance if wrapped in `QueryClientProvider`. |
| `defaultTab`    | `'query' \| 'console'`                                         | `'query'`        | Tab opened by default.                                 |
| `initialIsOpen` | `boolean`                                                      | `false`          | Opens the workbench modal on mount.                    |
| `position`      | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'bottom-right'` | Starting corner for the floating capsule.              |
| `enabled`       | `boolean`                                                      | `true`           | Controls whether the devtools render (e.g. `__DEV__`). |
| `enableConsole` | `boolean`                                                      | `true`           | Enables console interception on mount.                 |
| `style`         | `StyleProp<ViewStyle>`                                         | `undefined`      | Optional style override for root overlay container.    |

---

## License

MIT
