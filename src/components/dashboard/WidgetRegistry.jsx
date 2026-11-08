import { lazy } from 'react';
import { useDashboardStore } from '@store/store';

// Lazy load widget components for code splitting
const StatsWidget = lazy(() => import('./widgets/StatsWidget'));
const RecentlyPlayedWidget = lazy(() => import('./widgets/RecentlyPlayedWidget'));
const RecentlyAddedWidget = lazy(() => import('./widgets/RecentlyAddedWidget'));
const FavoritesWidget = lazy(() => import('./widgets/FavoritesWidget'));
const QuickPlaylistsWidget = lazy(() => import('./widgets/QuickPlaylistsWidget'));
const MostPlayedWidget = lazy(() => import('./widgets/MostPlayedWidget'));
const TopArtistsWidget = lazy(() => import('./widgets/TopArtistsWidget'));
const CollectionOverviewWidget = lazy(() => import('./widgets/CollectionOverviewWidget'));

// Widget registry - maps widget IDs to their component definitions
const availableWidgets = [
  {
    id: 'stats',
    name: 'Music Statistics',
    description: 'Total songs, albums, artists, duration, playlists',
    component: StatsWidget,
    resizeable: false,
    minW: 240,
    minH: 200,
    configSchema: {
      columns: { type: 'number', default: 2 },
      rows: { type: 'number', default: 3 },
    },
  },
  {
    id: 'recentlyPlayed',
    name: 'Recently Played',
    description: 'Recently played tracks with artwork',
    component: RecentlyPlayedWidget,
    resizeable: true,
    minW: 200,
    minH: 150,
    configSchema: {
      limit: { type: 'number', default: 5 },
    },
  },
  {
    id: 'recentlyAdded',
    name: 'Recently Added',
    description: 'Most recently imported tracks',
    component: RecentlyAddedWidget,
    resizeable: true,
    minW: 200,
    minH: 150,
    configSchema: {
      limit: { type: 'number', default: 5 },
    },
  },
  {
    id: 'favorites',
    name: 'Favorites',
    description: 'Your favorite songs',
    component: FavoritesWidget,
    resizeable: true,
    minW: 200,
    minH: 150,
    configSchema: {
      limit: { type: 'number', default: 5 },
    },
  },
  {
    id: 'quickPlaylists',
    name: 'Quick Playlists',
    description: 'Your favorite playlists',
    component: QuickPlaylistsWidget,
    resizeable: true,
    minW: 200,
    minH: 150,
    configSchema: {
      limit: { type: 'number', default: 5 },
    },
  },
  {
    id: 'mostPlayed',
    name: 'Most Played',
    description: 'Tracks played most frequently',
    component: MostPlayedWidget,
    resizeable: true,
    minW: 200,
    minH: 150,
    configSchema: {
      limit: { type: 'number', default: 5 },
    },
  },
  {
    id: 'topArtists',
    name: 'Top Artists',
    description: 'Your most played artists',
    component: TopArtistsWidget,
    resizeable: true,
    minW: 180,
    minH: 150,
    configSchema: {
      limit: { type: 'number', default: 6 },
    },
  },
  {
    id: 'collectionOverview',
    name: 'Collection Overview',
    description: 'Summary statistics of your library',
    component: CollectionOverviewWidget,
    resizeable: false,
    minW: 180,
    minH: 120,
    configSchema: {},
  },
];

export { availableWidgets };

export function useWidgetRegistry() {
  const { widgets, setWidgets, addWidget, removeWidget, updateWidget } = useDashboardStore();

  const getAvailable = () => availableWidgets;
  const getWidgetById = (id) => availableWidgets.find(w => w.id === id);
  const canResize = (id) => availableWidgets.find(w => w.id === id)?.resizeable === true;
  const getMinDimensions = (id) => {
    const widget = availableWidgets.find(w => w.id === id);
    return { minW: widget?.minW || 180, minH: widget?.minH || 150 };
  };

  const registerWidget = (widgetConfig) => {
    const { widgetId, position, configuration = {} } = widgetConfig || {};
    const template = availableWidgets.find(w => w.id === widgetId);

    if (!template) return null;

    const config = { ...template.configSchema, ...configuration };

    addWidget({
      widgetId: template.id,
      position,
      config,
      visible: true,
      width: template.minW || 200,
      height: template.minH || 150,
    });

    return template;
  };

  return {
    availableWidgets,
    getAvailable,
    getWidgetById,
    canResize,
    getMinDimensions,
    registerWidget,
  };
}