import { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStore, useLibraryStore } from '@store/store';
import Card from '@components/common/Card';
import { availableWidgets } from '@components/dashboard/WidgetRegistry';

// Map widget IDs to their lazy-loaded components
const WidgetComponentMap = {};
availableWidgets.forEach((w) => {
  WidgetComponentMap[w.id] = w.component;
});

export default function Dashboard() {
  const navigate = useNavigate();
  const { widgets = [] } = useDashboardStore();
  const { songs = [], artists = [], albums = [], playlists = [], favorites = [] } = useLibraryStore();

  // Get current layout widgets
  const currentLayoutWidgets = widgets.filter((w) => w.visible !== false);

  const WidgetComponent = ({ widget }) => {
    const Component = WidgetComponentMap[widget.widgetId];
    if (!Component) return null;
    return <Component key={widget.id} config={widget.configuration} />;
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const mStr = h > 0 ? m.toString().padStart(2, '0') : m.toString();
    const sStr = s.toString().padStart(2, '0');
    return h > 0 ? `${h}:${mStr}:${sStr}` : `${mStr}:${sStr}`;
  };

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2 sm:text-3xl">Dashboard</h2>
          <p className="text-text-secondary">Your music library at a glance</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/songs')}
        >
          Add Music
        </button>
      </div>

      {/* Dynamic Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {currentLayoutWidgets.length > 0 ? (
          currentLayoutWidgets.map((widget) => (
            <Card key={widget.widgetId} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">
                  {availableWidgets.find((w) => w.id === widget.widgetId)?.name || widget.widgetId}
                </h3>
              </div>
              <Suspense fallback={<div className="h-40 flex items-center justify-center text-text-secondary">Loading...</div>}>
                <WidgetComponent widget={widget} />
              </Suspense>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 text-accent grid grid-cols-2 grid-rows-2 gap-1">
                <div className="w-full h-full bg-current" />
                <div className="w-full h-full bg-current" />
                <div className="w-full h-full bg-current" />
                <div className="w-full h-full bg-current" />
              </div>
            </div>
            <p className="text-lg font-medium text-text-primary mb-2">No widgets configured</p>
            <p className="text-text-secondary text-sm mb-6">Add widgets to customize your dashboard</p>
            <button className="btn btn-primary">Add Widget</button>
          </div>
        )}
      </div>
    </div>
  );
}
