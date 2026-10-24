# @archie-dev/react-native-unified-devtools

An in-app developer tools suite for React Native 0.83+ and Expo. Runs directly inside your running app with zero native iOS or Android dependencies.

---

## Why this exists

React Native debugging broke down when Flipper was deprecated, while desktop tools like Reactotron require running a separate Electron companion app. Browser-based tools like `@tanstack/react-query-devtools` crash on mobile because they depend on DOM elements (`document`, `window`, HTML `div` tags).

`@archie-dev/react-native-unified-devtools` is built entirely with React Native primitives (`View`, `Text`, `Modal`, `FlatList`, `PanResponder`). It runs on the React Native 0.83+ New Architecture (Bridgeless mode and Fabric) out of the box, with zero CocoaPods, Gradle configs, or native rebuilds.

---

## Features

### 1. Draggable Floating HUD Capsule

- **Edge-Snapping Capsule**: A persistent overlay pill that stays on screen across hot reloads. Dragging and releasing automatically springs the pill to the nearest left or right edge.
- **Live Micro-Metrics**:
  - Real-time JS thread FPS monitor (updates every second; flags drops below 55 FPS).
  - Active TanStack Query counter.
  - Live error pill that highlights red when unhandled exceptions, console errors, or failed network requests (4xx/5xx/offline) occur.
- **Touch-Safe**: Uses movement deltas to separate dragging from taps, opening the workbench on click without getting stuck.

### 2. Screen Lighthouse Performance Auditor (0–100 Score)

- **Continuous Micro-Trackers**:
  - **Mount TTI Tracker**: Automatically tracks time elapsed from component mount trigger to commit using React's Profiler API (target: `<250ms`).
  - **Live FPS & Frame Drop Sampler**: Measures true rAF display cadence and tallies frame drops during animations and scroll events (target: `>55 FPS`, `<=2 drops`).
  - **JS Event Loop Lag Monitor**: Detects thread freezing and synchronous blocking drift by tracking high-resolution interval drift (budget: `<35ms`).
  - **Component Re-render Hotspot Profiler**: Detects unmemoized re-render storms and groups components by frequency.
  - **Hermes Heap & Slow Network Sampler**: Tracks active Hermes memory allocations and delays from network requests exceeding 500ms.
- **Weighted 0–100 Scoring Model**:
  - **Mount TTI**: 30% weight
  - **FPS & Frame Drops**: 25% weight
  - **Event Loop Lag**: 20% weight
  - **Re-render Frequency**: 15% weight
  - **Memory & Slow Network**: 10% weight
- **Visual Score Gauges & Actionable Diagnostics**:
  - Color-coded ratings: Green/Fast (`90–100`), Amber/Average (`50–89`), Red/Poor (`0–49`).
  - Specific fix recommendations for every warning or critical failure (e.g. `React.memo`, `InteractionManager`, query caching, component splitting).
- **Programmatic & Negative Test Support**: Easily test negative degradation paths (scores `< 60%`) in CI or staging screens.

### 3. Network Inspector & Mock Overrides (fetch, Axios, GraphQL, XHR)

- **Universal Traffic Capture**: Non-destructively intercepts `global.fetch` and `XMLHttpRequest` calls (Axios, Apollo GraphQL, Supabase, and REST).
- **Deep Inspection**: View request headers, query parameters, response headers, request body, and auto-parsed JSON responses via the interactive tree viewer.
- **Response Manipulation & Mock Engine**:
  - Match requests by URL pattern with wildcards (`*`, e.g. `*/api/v1/users*` or `/users`) and HTTP method.
  - Return custom mock status codes (200, 201, 400, 401, 403, 404, 429, 500, 503, or custom).
  - Edit mock response body JSON inline with a 1-tap "Format JSON" beautifier.
  - Simulate offline network failures (`TypeError: Network request failed`).
  - Simulate request timeouts (`TimeoutError`).
  - Artificial latency delays (+300ms, +800ms, +1500ms, +3000ms) to test loading skeletons and spinners.
  - 1-click **"⚡ Override this Request"** shortcut directly from any captured request.
  - Master toggle switch and per-rule ON/OFF controls.
- **Export**: Copy any captured request as an executable `curl` command or copy response JSON with one tap.

### 4. TanStack Query Inspector

- **Status Badges**: Categorizes all cached queries into `fresh`, `fetching`, `stale`, `paused`, `inactive`, and `error`.
- **Cache Mutation Actions**:
  - Individual query actions: Refetch, Invalidate, Reset, Remove.
  - State simulation: Trigger Loading (`+Load`) and Trigger Error (`+Err`) to test UI fallbacks without touching your backend.
  - Global actions: Refetch All and Clear Cache.
- **Native JSON Tree**: An expandable/collapsible tree viewer built without web DOM libraries. Highlights strings, numbers, booleans, arrays, and objects with depth indentation.
- **Filter and Sort**: Search query keys by text or sort by status, query hash, and last updated timestamp.

### 5. In-App Console Logger

- **Non-Destructive Interception**: Wraps `console.log`, `console.info`, `console.warn`, `console.error`, and `console.debug` while preserving standard Metro terminal output.
- **Log Filtering**: Filter by level (`All`, `Errors`, `Warnings`, `Logs`) or search text across logged arguments.
- **Deep Argument Inspection**: Objects and arrays passed to `console.log` can be expanded inline through the JSON tree.
- **Error Traces**: Captures call stacks for `console.error` and exceptions with selectable text for copying.

### 6. Workbench Ergonomics & Theming

- **Dual Mode Blue Theme**: Switch seamlessly between Deep Midnight Navy (Dark mode) and Clean Ice Blue (Light mode) via the header toggle.
- **Bottom-Sheet Swipe to Dismiss**: Drag down from the handle or header to dismiss the workbench with spring physics.
- **One-Tap Clipboard Copying**: Easily copy query keys, JSON branches, request payloads, response payloads, URLs, and curl commands.

### 7. React Navigation v7 & v6 Inspector (`/navigation`)

- **Subpath Export**: Available via `@archie-dev/react-native-unified-devtools/navigation` with zero native dependencies.
- **Static & Dynamic API Support**: Works out of the box with React Navigation v7 `createStaticNavigation` and traditional `NavigationContainer`.
- **Live Route Tree & Params**: Recursively maps nested navigators (Stacks, Tabs, Drawers) and inspects real-time route parameters.
- **Action Timeline & Transition Profiling**: Automatically tracks navigation history (`NAVIGATE`, `GO_BACK`, `RESET`) and calculates transition latency.
- **Quick Jump Dispatcher**: Jump to any screen or dispatch test params directly from the devtools interface.
- **Complete Documentation**: See the [React Navigation Guide (NAVIGATION.md)](./NAVIGATION.md) for full setup instructions and API reference.

---

## Compatibility

- **React Native**: 0.74.0 through 0.83+ (Fabric & Bridgeless supported)
- **React**: 18.2.0 and 19.x
- **TanStack Query**: `@tanstack/react-query` v4 and v5
- **Platforms**: iOS, Android, Expo Go, Expo Prebuild, bare React Native CLI

---

## Installation

```bash
npm install @archie-dev/react-native-unified-devtools
# or
yarn add @archie-dev/react-native-unified-devtools
```

Ensure `@tanstack/react-query` is installed if you use the Query module.

---

## Quick Start

### 1. Mount DevTools at App Root

Place `<UnifiedDevTools />` at the root of your application (outside of your screen navigation tree to avoid observer profiling effects):

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedDevTools } from '@archie-dev/react-native-unified-devtools';

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
            defaultTab="lighthouse"
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

### 2. Connect React Navigation v7 / v6 (Optional)

Attach navigation state, action timeline, and route trees to the devtools with a single hook:

```tsx
import React from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { UnifiedDevTools } from '@archie-dev/react-native-unified-devtools';
import { useNavigationDevTools } from '@archie-dev/react-native-unified-devtools/navigation';

export default function App() {
  const navigationRef = useNavigationContainerRef();

  // 1 line: auto-logs route state, transitions, and action history
  useNavigationDevTools(navigationRef);

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
      {__DEV__ && <UnifiedDevTools />}
    </>
  );
}
```

---

## How to Use Lighthouse Screen Auditor

### Step 1: Wrap Your Screen with `<ScreenProfiler>`

Wrap any screen component with `<ScreenProfiler>` to measure mount TTI, re-renders, and component hotspots:

```tsx
import React from 'react';
import { ScrollView, Text } from 'react-native';
import { ScreenProfiler } from '@archie-dev/react-native-unified-devtools';

export function ProductDetailsScreen() {
  return (
    <ScreenProfiler id="ProductDetailsScreen">
      <ScrollView>
        <Text>Product Details</Text>
        {/* Your screen components */}
      </ScrollView>
    </ScreenProfiler>
  );
}
```

### Step 2: Open the Lighthouse Tab

1. Tap the floating HUD capsule at the bottom-right of your screen.
2. Select the **Lighthouse** tab (`⚡`).
3. View the live 0–100 score gauge, 6 core metrics, and actionable diagnostics for the current active screen.
4. Tap **"⚡ Run Audit"** to run a fresh 1.5-second live sampling window.

### Step 3: Programmatic Audits (Testing & CI)

You can run automated screen audits directly in code or unit/E2E test suites:

```tsx
import {
  runLighthouseAudit,
  computeLighthouseScore,
  screenPerformanceManager,
} from '@archie-dev/react-native-unified-devtools';

// Run live 2-second audit window
const result = await runLighthouseAudit('ProductDetailsScreen', {
  sampleDurationMs: 2000,
});

console.log('Score:', result.overallScore); // 0-100
console.log('Grade:', result.gradeLabel);   // EXCELLENT, NEEDS IMPROVEMENT, POOR
console.log('Sub-scores:', result.subScores);

// Or calculate score from an explicit metric snapshot
const scoreResult = computeLighthouseScore({
  screenName: 'CheckoutScreen',
  timestamp: Date.now(),
  mountDurationMs: 180,
  fps: 59.2,
  droppedFrames: 1,
  eventLoopLagMs: 18,
  reRenderCount: 2,
  reRenderHotspots: [],
  hermesHeapMb: 42.1,
  slowQueriesCount: 0,
});
```

---

## Negative Testing Guide (< 60% Score)

To verify that your app correctly flags degraded performance, test a negative scenario where the screen score drops below 60%:

```tsx
import {
  screenPerformanceManager,
  computeLighthouseScore,
} from '@archie-dev/react-native-unified-devtools';

// 1. Simulate slow screen mount (>600ms)
screenPerformanceManager.recordMount('SlowScreen', 720);

// 2. Simulate re-render storm (>10 unmemoized updates)
for (let i = 0; i < 15; i++) {
  screenPerformanceManager.recordRender('SlowScreen', 'UnmemoizedSubtree');
}

// 3. Negative snapshot yielding a score < 60%
const negativeSnapshot = {
  screenName: 'SlowScreen',
  timestamp: Date.now(),
  mountDurationMs: 720,      // Mount score: 30 pts
  fps: 38.5,                 // FPS score: 15 pts
  droppedFrames: 12,
  eventLoopLagMs: 115,       // Lag score: 10 pts
  reRenderCount: 15,         // Render score: 20 pts
  reRenderHotspots: [{ componentName: 'UnmemoizedSubtree', count: 15 }],
  hermesHeapMb: 68.4,
  slowQueriesCount: 3,       // Network score: 30 pts
};

const result = computeLighthouseScore(negativeSnapshot);
console.log(result.overallScore); // ~21 / 100 (< 60% - POOR)
console.log(result.diagnostics);  // Contains critical warnings & fixes
```

---

## Props Reference

| Prop               | Type                                                                       | Default          | Description                                                    |
| :----------------- | :------------------------------------------------------------------------- | :--------------- | :------------------------------------------------------------- |
| `queryClient`      | `QueryClient`                                                              | `undefined`      | Optional instance if wrapped in `QueryClientProvider`.         |
| `defaultTab`       | `'query' \| 'console' \| 'network' \| 'lighthouse'`                        | `'query'`        | Tab opened by default when launching the workbench.           |
| `initialIsOpen`    | `boolean`                                                                  | `false`          | Opens the workbench modal on mount.                            |
| `position`         | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'`             | `'bottom-right'` | Starting corner for the floating capsule.                      |
| `enabled`          | `boolean`                                                                  | `true`           | Controls whether the devtools render (e.g. `__DEV__`).         |
| `enableConsole`    | `boolean`                                                                  | `true`           | Enables console interception on mount.                         |
| `enableNetwork`    | `boolean`                                                                  | `true`           | Enables network interception & mock overrides (fetch/Axios).   |
| `themeMode`        | `'dark' \| 'light' \| 'auto'`                                              | `'dark'`         | Sets default theme palette mode.                               |
| `sheetHeightRatio` | `number`                                                                   | `0.82`           | Height of the bottom sheet relative to window (0.40 to 0.95).  |
| `style`            | `StyleProp<ViewStyle>`                                                     | `undefined`      | Optional style override for root overlay container.            |

---

## License

MIT
