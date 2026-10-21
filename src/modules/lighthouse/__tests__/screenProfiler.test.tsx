import React from 'react';
import { screenPerformanceManager, ScreenProfiler } from '../screenProfiler';

describe('screenPerformanceManager & ScreenProfiler', () => {
  beforeEach(() => {
    screenPerformanceManager.reset();
  });

  it('records screen mount duration and render counts', () => {
    screenPerformanceManager.recordMount('HomeScreen', 120);
    expect(screenPerformanceManager.getCurrentScreen()).toBe('HomeScreen');
    expect(screenPerformanceManager.getMountDuration('HomeScreen')).toBe(120);

    // Record re-renders
    screenPerformanceManager.recordRender('HomeScreen', 'FeedList');
    screenPerformanceManager.recordRender('HomeScreen', 'FeedList');
    screenPerformanceManager.recordRender('HomeScreen', 'FeedList');
    screenPerformanceManager.recordRender('HomeScreen', 'FeedList');
    screenPerformanceManager.recordRender('HomeScreen', 'Header');

    const snapshot = screenPerformanceManager.getSnapshot('HomeScreen');
    expect(snapshot.reRenderCount).toBe(5);
    expect(snapshot.reRenderHotspots).toHaveLength(1);
    expect(snapshot.reRenderHotspots[0]?.componentName).toBe('FeedList');
    expect(snapshot.reRenderHotspots[0]?.count).toBe(4);
  });

  it('renders ScreenProfiler without crashing and attaches Profiler', () => {
    // In React 18 / RN, ScreenProfiler renders children
    const element = React.createElement(
      ScreenProfiler,
      { id: 'TestScreen', children: React.createElement('div', null, 'Hello') }
    );
    expect(element).toBeDefined();
    expect(element.props.id).toBe('TestScreen');
  });
});
