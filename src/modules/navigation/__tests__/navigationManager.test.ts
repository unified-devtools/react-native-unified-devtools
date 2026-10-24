import { NavigationDevToolsManager } from '../navigationManager';

describe('NavigationDevToolsManager (React Navigation v7 & v6 support)', () => {
  let manager: NavigationDevToolsManager;

  beforeEach(() => {
    manager = NavigationDevToolsManager.getInstance();
    manager.detach();
    manager.clearHistory();
  });

  it('attaches to React Navigation v7 container ref and syncs initial state', () => {
    const mockRef = {
      isReady: jest.fn(() => true),
      getCurrentRoute: jest.fn(() => ({
        key: 'home-key-1',
        name: 'HomeScreen',
        params: { tab: 'explore' },
      })),
      getRootState: jest.fn(() => ({
        index: 0,
        routes: [
          { key: 'home-key-1', name: 'HomeScreen', params: { tab: 'explore' } },
          { key: 'profile-key-2', name: 'ProfileScreen' },
        ],
      })),
      canGoBack: jest.fn(() => false),
      addListener: jest.fn(() => jest.fn()),
      navigate: jest.fn(),
      goBack: jest.fn(),
    };

    manager.attach(mockRef);
    const snapshot = manager.getSnapshot();

    expect(snapshot.currentRoute?.name).toBe('HomeScreen');
    expect(snapshot.currentRoute?.params).toEqual({ tab: 'explore' });
    expect(snapshot.routeTree.length).toBe(2);
    expect(snapshot.routeTree[0].isActive).toBe(true);
    expect(snapshot.canGoBack).toBe(false);
  });

  it('records navigation events on state transition and calculates transition', () => {
    let stateCallback: (() => void) | null = null;
    let currentRouteState = {
      key: 'home-1',
      name: 'HomeScreen',
      params: undefined,
    };

    const mockRef = {
      isReady: () => true,
      getCurrentRoute: () => currentRouteState,
      getRootState: () => ({ index: 0, routes: [currentRouteState] }),
      canGoBack: () => true,
      addListener: jest.fn((event: string, cb: any) => {
        if (event === 'state') stateCallback = cb;
        return jest.fn();
      }),
      navigate: jest.fn(),
      goBack: jest.fn(),
    };

    const transitionSpy = jest.fn();
    manager.attach(mockRef, { onScreenTransition: transitionSpy });

    // Transition to Details
    currentRouteState = {
      key: 'details-2',
      name: 'DetailsScreen',
      params: { itemId: 42 } as any,
    };

    if (stateCallback) {
      (stateCallback as () => void)();
    }

    const snapshot = manager.getSnapshot();
    expect(snapshot.history.length).toBe(1);
    expect(snapshot.history[0].fromRoute).toBe('HomeScreen');
    expect(snapshot.history[0].toRoute).toBe('DetailsScreen');
    expect(snapshot.history[0].params).toEqual({ itemId: 42 });
    expect(transitionSpy).toHaveBeenCalledWith('HomeScreen', 'DetailsScreen', expect.any(Number));
  });

  it('dispatches navigate and goBack to the attached container ref', () => {
    const mockRef = {
      isReady: () => true,
      getCurrentRoute: () => ({ key: 'a', name: 'A' }),
      getRootState: () => ({ index: 0, routes: [] }),
      canGoBack: () => true,
      addListener: () => jest.fn(),
      navigate: jest.fn(),
      goBack: jest.fn(),
    };

    manager.attach(mockRef);
    manager.navigate('SettingsScreen', { theme: 'dark' });
    expect(mockRef.navigate).toHaveBeenCalledWith('SettingsScreen', { theme: 'dark' });

    manager.goBack();
    expect(mockRef.goBack).toHaveBeenCalledTimes(1);
  });

  it('recursively parses nested v7 navigator trees (Stack > Tab > Screen)', () => {
    const mockRef = {
      isReady: () => true,
      getCurrentRoute: () => ({ key: 'leaf-2', name: 'ChatDetail' }),
      getRootState: () => ({
        index: 0,
        routes: [
          {
            key: 'main-stack-1',
            name: 'MainTabs',
            state: {
              index: 1,
              routes: [
                { key: 'tab-1', name: 'FeedTab' },
                {
                  key: 'tab-2',
                  name: 'ChatTab',
                  state: {
                    index: 0,
                    routes: [{ key: 'leaf-2', name: 'ChatDetail', params: { roomId: 'alpha' } }],
                  },
                },
              ],
            },
          },
        ],
      }),
      addListener: () => jest.fn(),
    };

    manager.attach(mockRef);
    const snapshot = manager.getSnapshot();

    expect(snapshot.routeTree[0].name).toBe('MainTabs');
    const tabs = snapshot.routeTree[0].children!;
    expect(tabs.length).toBe(2);
    expect(tabs[1].name).toBe('ChatTab');
    expect(tabs[1].children![0].name).toBe('ChatDetail');
    expect(tabs[1].children![0].isActive).toBe(true);
  });
});
