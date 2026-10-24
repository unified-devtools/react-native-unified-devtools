# React Navigation Inspector (`/navigation`)

Companion module for `@archie-dev/react-native-unified-devtools` providing deep in-app inspection, route tree visualization, action timelines, and performance profiling for **React Navigation v7** and **v6**.

---

## Table of Contents

1. [Features](#features)
2. [Supported Versions](#supported-versions)
3. [Quick Start](#quick-start)
   - [React Navigation v7 Static API](#1-react-navigation-v7-static-api-recommended)
   - [React Navigation v7 / v6 Dynamic JSX API](#2-react-navigation-v7--v6-dynamic-jsx-api)
4. [Tab Capabilities](#tab-capabilities)
   - [1. Route Tree Inspector](#1-route-tree-inspector)
   - [2. Params Inspector](#2-params-inspector)
   - [3. Action Timeline & Transition Latency](#3-action-timeline--transition-latency)
   - [4. Quick Jump Dispatcher](#4-quick-jump-dispatcher)
5. [Standalone Component Usage](#standalone-component-usage)
6. [API & Types Reference](#api--types-reference)
7. [TypeScript Subpath Resolution](#typescript-subpath-resolution)

---

## Features

- **Zero Native Dependencies**: Pure React Native primitives (`View`, `Text`, `FlatList`, `ScrollView`). Compatible with Fabric and Bridgeless mode.
- **v7 Static & Dynamic API Support**: Native support for React Navigation v7's `createStaticNavigation` and traditional `NavigationContainer`.
- **Live Route Hierarchy**: Recursively maps nested navigators (`Stack > Tabs > Drawer`) and tags the currently active screen.
- **Continuous Transition Profiler**: Automatically records screen transition latency (mount-to-commit) and logs it for the Lighthouse Screen Auditor.
- **Interactive Action Logger**: Intercepts `NAVIGATE`, `PUSH`, `POP`, `GO_BACK`, `RESET`, and `SET_PARAMS` with timestamps.
- **Quick Jump Simulator**: Jump to any target screen or test route parameters directly from the devtools overlay.

---

## Supported Versions

| Package | Supported Versions |
| :--- | :--- |
| `@react-navigation/native` | `^7.0.0` (Full support including Static config), `^6.0.0` |
| `react-native` | `>=0.74.0` through `0.83+` (New Architecture ready) |
| `react` | `>=18.2.0` and `19.x` |

---

## Quick Start

### 1. React Navigation v7 Static API (Recommended)

In React Navigation v7, attach devtools to the static container ref in one line:

```tsx
import React from 'react';
import { createStaticNavigation, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UnifiedDevTools } from '@archie-dev/react-native-unified-devtools';
import { useNavigationDevTools } from '@archie-dev/react-native-unified-devtools/navigation';

// 1. Define Static Navigation
const RootStack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
    Settings: SettingsScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  const navigationRef = useNavigationContainerRef();

  // 2. Attach DevTools to container ref
  useNavigationDevTools(navigationRef);

  return (
    <>
      <Navigation ref={navigationRef} />
      {__DEV__ && <UnifiedDevTools />}
    </>
  );
}
```

---

### 2. React Navigation v7 / v6 Dynamic JSX API

```tsx
import React from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UnifiedDevTools } from '@archie-dev/react-native-unified-devtools';
import { useNavigationDevTools } from '@archie-dev/react-native-unified-devtools/navigation';

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useNavigationContainerRef();

  // Attach DevTools
  useNavigationDevTools(navigationRef);

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Details" component={DetailsScreen} />
        </Stack.Navigator>
      </NavigationContainer>

      {__DEV__ && <UnifiedDevTools />}
    </>
  );
}
```

---

## Tab Capabilities

When `useNavigationDevTools` is attached, the **🧭 Navigation** tab in the Unified DevTools workbench exposes four sub-views:

### 1. Route Tree Inspector
- Visualizes the full navigator hierarchy in real-time.
- Nested stacks and bottom tabs are indented with tree indicators.
- The currently focused screen displays a green `🟢 ACTIVE` badge with its internal route key.

### 2. Params Inspector
- Inspects `route.params` passed to the currently active screen.
- Formatted JSON syntax tree with selectable text for copying payloads.

### 3. Action Timeline & Transition Latency
- Records every navigation transition with:
  - Action type (`NAVIGATE`, `GO_BACK`, `RESET`).
  - Origin route and destination route (`HomeScreen → DetailsScreen`).
  - Transition duration in milliseconds (`42ms`).
  - Full payload and route params.
- Includes a **Clear** button to reset history during benchmarking.

### 4. Quick Jump Dispatcher
- Test screens without navigating through complex user flows:
  - Input: Screen route name (e.g. `DetailsScreen`).
  - Input: Optional mock JSON parameters (e.g. `{"id": "usr_99", "preview": true}`).
  - Action: Dispatches navigation directly through the container ref.

---

## Standalone Component Usage

You can embed the navigation inspector inside custom debug sheets or internal screens:

```tsx
import React from 'react';
import { Modal, View } from 'react-native';
import { NavigationTab } from '@archie-dev/react-native-unified-devtools/navigation';

export function CustomDebugModal({ visible, onClose }) {
  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <NavigationTab />
      </View>
    </Modal>
  );
}
```

---

## API & Types Reference

### Hook: `useNavigationDevTools`

```ts
function useNavigationDevTools(
  navigationRef: any,
  options?: UseNavigationDevToolsOptions
): NavigationStateSnapshot & {
  navigate: (name: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
  clearHistory: () => void;
};
```

#### Hook Options: `UseNavigationDevToolsOptions`

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `maxHistorySize` | `number` | `50` | Maximum number of timeline events to retain in memory. |
| `enableActionLogging` | `boolean` | `true` | Enables logging of navigation actions. |
| `onScreenTransition` | `(from: string, to: string, durationMs: number) => void` | `undefined` | Callback invoked after screen transitions finish. |

#### State Snapshot: `NavigationStateSnapshot`

```ts
export interface NavigationStateSnapshot {
  currentRoute: {
    key: string;
    name: string;
    params?: Record<string, unknown>;
    path?: string;
  } | null;
  routeTree: NavigationRouteNode[];
  history: NavigationEventItem[];
  canGoBack: boolean;
  totalNavigations: number;
}
```

---

## TypeScript Subpath Resolution

`@archie-dev/react-native-unified-devtools` supports modern `package.json` `"exports"` and includes root proxy files for older TypeScript configurations:

```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler" // or "node16" / "node"
  }
}
```

Import path:
```ts
import { useNavigationDevTools, NavigationTab } from '@archie-dev/react-native-unified-devtools/navigation';
```

---

## License

GNU Lesser General Public License v3.0 or later ([LGPL-3.0-or-later](./LICENSE)).  
Copyright (C) 2026 archi3monde.
