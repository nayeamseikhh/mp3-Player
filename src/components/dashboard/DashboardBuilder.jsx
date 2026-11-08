import { useDashboardStore } from '@store/store';
import { useLibraryStore, usePlayerStore, useSettingsStore } from '@store/store';
import { Toaster } from 'react-hot-toast';
import { mediaUrl } from '@utils/media';
import { useState, useCallback, useEffect, useRef } from 'react';
import { DndContext, useDraggable, SortableContext } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { closestCenter } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';
import Card from '@components/common/Card';
import { availableWidgets } from '@components/dashboard/WidgetRegistry';
import { useWidgetRegistry } from '@components/dashboard/WidgetRegistry';
import Tooltip from '@components/common/Tooltip';
import Badge from '@components/common/Badge';
import { Plus, Minus, ChevronUp, ChevronDown, Settings, Trash2, LayoutDashboard, Save, RotateCcw, FolderOpen, Trash } from 'lucide-react';

/**
 * Configuration Modal for widget settings
 */
const ConfigurationModal = ({ isOpen, onClose, widgetId, configuration, onUpdateConfig }) => {
  const widgetInfo = availableWidgets.find((w) => w.id === widgetId);
  const schema = widgetInfo?.configSchema || {};

  // Extract current config values with defaults
  const [config, setConfig] = useState(() => {
    const defaults = {};
    Object.entries(schema).forEach(([key, definition]) => {
      defaults[key] = definition.default !== undefined ? definition.default : null;
    });
    // Merge with existing configuration
    return { ...defaults, ...configuration };
  });

  useEffect(() => {
    setConfig({ ...configuration });
  }, [configuration]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numValue = name.includes('limit') || name.includes('columns') || name.includes('rows') ? parseInt(value, 10) : value;
    setConfig({ ...config, [name]: numValue });
  };

  const submitConfig = () => {
    // Filter out undefined values (empty inputs)
    const filteredConfig = Object.fromEntries(
      Object.entries(config).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    onUpdateConfig(widgetId, filteredConfig);
    onClose();
  };

  return isOpen ? (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-tertiary border border-border-default rounded-xl w-full max-w-lg mx-8 p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-text-primary">
            {widgetInfo?.name} Configuration
          </h3>
          <button
            onClick={onClose}
            className="p-1 bg-bg-tertiary rounded border border-border-default hover:bg-accent/10 text-text-secondary"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
          </button>
        </div>

        <div className="space-y-4">
          {Object.entries(schema).map(([key, definition]) => {
            const defaultValue = definition.default;
            const currentValue = config[key] ?? defaultValue;

            if (definition.type === 'number') {
              return (
                <div key={key} className="space-y-2">
                  <label className="text-sm text-text-secondary">
                    {key}
                    {definition.label ? ` <span className="text-text-primary font-medium">(${definition.label})</span>` : ''}
                  </label>
                  <input
                    type="number"
                    name={key}
                    value={currentValue ?? ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border-default rounded focus:ring-2 focus:ring-accent/30 focus:outline-none"
                    placeholder={definition.placeholder || ''}
                    min={definition.min}
                    max={definition.max}
                  />
                  {definition.description && (
                    <p className="text-xs text-text-secondary mt-1">{definition.description}</p>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>

        <div className="flex justify-end mt-6 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-bg-tertiary rounded border border-border-default hover:bg-accent/10 text-text-secondary"
          >
            Cancel
          </button>
          <button
            onClick={submitConfig}
            className="px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent/90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  ) : null;
};

/**
 * Draggable Widget Item for Active Widgets
 */
const DraggableWidgetItem = ({ widget, index, onDragStart, onDragEnd, onDragOver, onDragEnter, onDragLeave, onDrop }) => {
  const widgetInfo = availableWidgets.find((w) => w.id === widget.widgetId);
  const canResize = widgetInfo?.resizeable ?? false;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: widget.widgetId,
    data: { widgetId: widget.widgetId, index },
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 rounded-lg hover:bg-accent/5 cursor-grab transition-colors border border-transparent hover:border-accent/30"
      {...attributes}
      {...listeners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-3 flex-1">
        <span className="text-accent cursor-grab p-1">
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M7 20h10M12 7l5 5-5 5" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
        </span>
        <span className="text-sm font-medium text-text-primary">{widget.widgetId}</span>
      </div>

      <div className="flex gap-2">
        <button
          className="p-1 bg-bg-tertiary rounded border border-border-default hover:bg-accent/10 text-text-secondary"
          title="Move up"
          onClick={() => window.dispatchEvent(new CustomEvent('dashboard-move-up', { detail: widget.widgetId }))}
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          className="p-1 bg-bg-tertiary rounded border border-border-default hover:bg-accent/10 text-text-secondary"
          title="Move down"
          onClick={() => window.dispatchEvent(new CustomEvent('dashboard-move-down', { detail: widget.widgetId }))}
        >
          <ChevronDown className="w-3 h-3" />
        </button>
        <button
          className="p-1 bg-bg-tertiary rounded border border-border-default hover:bg-accent/10 text-text-secondary"
          title="Configure"
          onClick={() => window.dispatchEvent(new CustomEvent('dashboard-edit-widget', { detail: widget.widgetId }))}
        >
          <Settings className="w-3 h-3" />
        </button>
        <Badge variant={widget.visible ? 'success' : 'danger'}>
          {widget.visible ? 'Visible' : 'Hidden'}
        </Badge>
        <button
          className="p-1 bg-bg-tertiary rounded border border-border-default hover:bg-accent/10 text-text-secondary"
          title="Remove"
          onClick={() => window.dispatchEvent(new CustomEvent('dashboard-remove-widget', { detail: widget.widgetId }))}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

/**
 * Widget Library Component with @dnd-kit
 */
const WidgetLibrary = ({ onAddWidget }) => {
  const [draggingOver, setDraggingOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      className="space-y-3 p-4"
      onDragOver={(e) => {
        e.preventDefault();
        setDraggingOver(true);
      }}
      onDragLeave={() => setDraggingOver(false)}
    >
      {[
        { id: 'stats', name: 'Music Statistics', description: 'Total songs, albums, artists, duration, playlists' },
        { id: 'recentlyPlayed', name: 'Recently Played', description: 'Recently played tracks with artwork' },
        { id: 'recentlyAdded', name: 'Recently Added', description: 'Most recently imported tracks' },
        { id: 'favorites', name: 'Favorites', description: 'Your favorite songs' },
        { id: 'quickPlaylists', name: 'Quick Playlists', description: 'Your favorite playlists' },
        { id: 'mostPlayed', name: 'Most Played', description: 'Tracks played most frequently' },
        { id: 'topArtists', name: 'Top Artists', description: 'Your most played artists' },
        { id: 'collectionOverview', name: 'Collection Overview', description: 'Summary statistics of your library' },
      ].map((widget) => (
        <div
          key={widget.id}
          className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/5 cursor-pointer transition-colors border border-transparent hover:border-accent/30"
          style={{ opacity: isDragging ? 0.5 : 1 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
            </div>
            <div>
              <div className="text-sm font-medium text-text-primary">{widget.name}</div>
              <div className="text-xs text-text-secondary">{widget.description}</div>
            </div>
          </div>
          <Tooltip text={`Add ${widget.name} widget`}>
            <button
              onClick={() => onAddWidget(widget.id)}
              className="p-1.5 text-accent hover:bg-accent/10 rounded-lg"
              title={`Add ${widget.name}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      ))}
    </div>
  );
};

/**
 * Active Widgets Component with drag-and-drop, resize, and configuration
 */
const ActiveWidgets = ({ widgets, onReorder, onRemoveWidget, onEditWidget, onToggleVisible }) => {
  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = widgets.findIndex((w) => w.widgetId === active.id);
      const newIndex = widgets.findIndex((w) => w.widgetId === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newWidgets = arrayMove(widgets, oldIndex, newIndex);
        onReorder(newWidgets);
      }
    },
    [widgets, onReorder]
  );

  return (
    <div>
      <Card>
        <div className="p-5 border-b border-border-default">
          <h3 className="font-semibold text-text-primary mb-4">
            Dashboard Widgets <Badge variant="accent">{widgets.length}</Badge>
          </h3>
          <p className="text-xs text-text-secondary mb-4">
            Drag widgets to reorder them on your dashboard
          </p>
        </div>

        <SortableContext
          items={widgets.map((w) => w.widgetId)}
          strategy="rect"
          collisionDetection={closestCenter}
        >
          {widgets.map((widget, index) => (
            <DraggableWidgetItem
              key={widget.id}
              widget={widget}
              index={index}
              onDragEnd={handleDragEnd}
            />
          ))}
          {widgets.length === 0 && (
            <div className="text-center py-8">
              <p className="text-text-secondary">No widgets configured</p>
              <p className="text-xs text-text-secondary mt-2">Add widgets from the library on the left</p>
            </div>
          )}
        </SortableContext>
      </Card>
    </div>
  );
};

/**
 * DashboardBuilder - Enhanced with drag-and-drop, configuration, and layout persistence
 */
export default function DashboardBuilder() {
  const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore();
  const {
    widgets = [],
    currentLayoutId,
    setWidgets,
    removeWidget,
    updateWidget,
    reorderWidgets,
    resetToDefault,
    layouts = [],
    setLayouts,
    setCurrentLayout,
  } = useDashboardStore();
  const { songs = [], artists = [], albums = [], playlists = [], favorites = [] } = useLibraryStore();
  const { defaultMusicFolder, setDefaultMusicFolder } = useSettingsStore();
  const navigate = require('react-router-dom').useNavigate?.();
  const toast = require('react-hot-toast').toast;

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

  const statCards = [
    { label: 'Total Songs', value: songs.length, icon: 'music', color: 'text-accent', bgColor: 'bg-accent/10' },
    { label: 'Total Albums', value: albums.length, icon: 'disc', color: 'text-accent-secondary', bgColor: 'bg-accent-secondary/10' },
    { label: 'Total Artists', value: artists.length, icon: 'user', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    { label: 'Total Duration', value: formatDuration(totalDuration), icon: 'clock', color: 'text-green-400', bgColor: 'bg-green-500/10' },
    { label: 'Playlists', value: playlists.length, icon: 'listMusic', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    { label: 'Favorites', value: favorites.length, icon: 'heart', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  ];

  // Track which widget is being configured
  const [openModal, setOpenModal] = useState(false);
  const [configuringWidgetId, setConfiguringWidgetId] = useState(null);
  const [configuringWidgetConfig, setConfiguringWidgetConfig] = useState({});

  // Layout management state
  const [savedLayouts, setSavedLayouts] = useState(layouts);
  const [layoutName, setLayoutName] = useState('');

  // Initialize saved layouts from store
  useEffect(() => {
    setSavedLayouts(layouts);
  }, [layouts]);

  // Handle custom events from draggable items
  useEffect(() => {
    const handleMoveUp = (e) => {
      const widgetId = e.detail;
      const index = widgets.findIndex(w => w.widgetId === widgetId);
      if (index > 0) {
        const newWidgets = [...widgets];
        const [moved] = newWidgets.splice(index, 1);
        newWidgets.splice(index - 1, 0, moved);
        setWidgets(newWidgets);
      }
    };

    const handleMoveDown = (e) => {
      const widgetId = e.detail;
      const index = widgets.findIndex(w => w.widgetId === widgetId);
      if (index < widgets.length - 1) {
        const newWidgets = [...widgets];
        const [moved] = newWidgets.splice(index, 1);
        newWidgets.splice(index + 1, 0, moved);
        setWidgets(newWidgets);
      }
    };

    const handleEditWidget = (e) => {
      const widgetId = e.detail;
      setConfiguringWidgetId(widgetId);
      const widget = widgets.find((w) => w.widgetId === widgetId);
      setConfiguringWidgetConfig(widget ? widget.configuration : {});
      setOpenModal(true);
    };

    const handleRemoveWidget = (e) => {
      const widgetId = e.detail;
      removeWidget(widgetId);
      toast.success('Widget removed from dashboard');
    };

    window.addEventListener('dashboard-move-up', handleMoveUp);
    window.addEventListener('dashboard-move-down', handleMoveDown);
    window.addEventListener('dashboard-edit-widget', handleEditWidget);
    window.addEventListener('dashboard-remove-widget', handleRemoveWidget);

    return () => {
      window.removeEventListener('dashboard-move-up', handleMoveUp);
      window.removeEventListener('dashboard-move-down', handleMoveDown);
      window.removeEventListener('dashboard-edit-widget', handleEditWidget);
      window.removeEventListener('dashboard-remove-widget', handleRemoveWidget);
    };
  }, [widgets, setWidgets, removeWidget, toast]);

  // Widget Components Map
  const WidgetComponentMap = {};
  require.context('@components/dashboard/widgets', true, /\.jsx?$/).keys().forEach((key) => {
    const component = require.context('@components/dashboard/widgets', true, /\.jsx?$/).key(key).default || null;
    if (component) {
      const match = key.match(/\/([^/]+)\.jsx$/);
      if (match) {
        WidgetComponentMap[match[1]] = component;
      }
    }
  });

  const WidgetComponent = ({ widget }) => {
    const Component = WidgetComponentMap[widget.widgetId];
    if (!Component) return null;
    return <Component key={widget.id} config={widget.configuration} />;
  };

  // Open configuration modal
  const openConfigModal = (widgetId) => {
    setConfiguringWidgetId(widgetId);
    // Get current config for this widget
    const widget = widgets.find((w) => w.widgetId === widgetId);
    setConfiguringWidgetConfig(widget ? widget.configuration : {});
    setOpenModal(true);
  };

  // Handle configuration update
  const handleConfigUpdate = (widgetId, newConfig) => {
    updateWidget(widgetId, { configuration: newConfig });
    setOpenModal(false);
    toast.success('Widget configuration updated');
  };

  // Handle widget visibility toggle
  const handleToggleVisible = (widgetId) => {
    updateWidget(widgetId, { visible: !widgets.find((w) => w.widgetId === widgetId)?.visible });
  };

  // Remove widget
  const handleRemoveWidget = (widgetId) => {
    removeWidget(widgetId);
    toast.success('Widget removed from dashboard');
  };

  // Reorder widgets
  const handleReorder = (oldIndex, newIndex) => {
    const newWidgets = [...widgets];
    const [moved] = newWidgets.splice(oldIndex, 1);
    newWidgets.splice(newIndex, 0, moved);
    setWidgets(newWidgets);
  };

  // Save current layout
  const handleSaveLayout = () => {
    const layoutNameValue = layoutName || `Layout ${savedLayouts.length + 1}`;
    const newLayout = {
      id: uuidv4(),
      name: layoutNameValue,
      widgets: widgets.map((w) => ({
        widgetId: w.widgetId,
        position: widgets.indexOf(w),
        configuration: w.configuration,
        visible: w.visible,
      })),
      is_default: savedLayouts.length === 0, // First layout becomes default
    };
    setLayouts([...savedLayouts, newLayout]);
    setCurrentLayout(newLayout.id);
    setLayoutName('');
    toast.success(`Layout "${layoutNameValue}" saved`);
  };

  // Load a saved layout
  const handleLoadLayout = (layoutId) => {
    const layout = savedLayouts.find((l) => l.id === layoutId);
    if (layout) {
      const widgetPromises = layout.widgets.map(async (w) => {
        // Find the widget template to get default config
        const template = availableWidgets.find((aw) => aw.id === w.widgetId);
        const config = { ...(template?.configSchema || {}), ...w.configuration };
        return {
          widgetId: w.widgetId,
          configuration: config,
          visible: w.visible,
        };
      });

      const resolvedWidgets = await Promise.all(widgetPromises);
      setWidgets(resolvedWidgets);
      setCurrentLayout(layout.id);
      toast.success(`Layout "${layout.name}" loaded`);
    }
  };

  // Delete a saved layout
  const handleDeleteLayout = (layoutId) => {
    setLayouts(savedLayouts.filter((l) => l.id !== layoutId));
    if (currentLayoutId === layoutId) {
      setCurrentLayout(null);
    }
    toast.success('Layout deleted');
  };

  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-text-primary mb-2">Dashboard Builder</h2>
          <p className="text-text-secondary">Customize your dashboard widgets</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        </button>
      </div>

      {/* Widget Library */}
      <div className="lg:col-span-1 mb-8">
        <Card>
          <div className="p-5 border-b border-border-default">
            <h3 className="font-semibold text-text-primary mb-4">Available Widgets</h3>
            <p className="text-xs text-text-secondary mb-4">
              Drag widgets from the library to add them to your dashboard
            </p>
          </div>
          <div className="space-y-3 p-4">
            <WidgetLibrary onAddWidget={(widgetId) => {
              const template = availableWidgets.find((w) => w.id === widgetId);
              if (!template) return;

              const defaultConfig = { ...template.configSchema, ...template.defaultConfig };

              // Need to use the registerWidget function from widget registry
              // For now, we'll add directly to the store
              const newWidget = {
                id: uuidv4(),
                widgetId: template.id,
                position: widgets.length,
                configuration: defaultConfig,
                visible: true,
                width: template.minW || 200,
                height: template.minH || 150,
              };
              setWidgets([...widgets, newWidget]);
              toast.success(`Added ${template.name} widget`);
            }}>
              {[
                { id: 'stats', name: 'Music Statistics', description: 'Total songs, albums, artists, duration, playlists' },
                { id: 'recentlyPlayed', name: 'Recently Played', description: 'Recently played tracks with artwork' },
                { id: 'recentlyAdded', name: 'Recently Added', description: 'Most recently imported tracks' },
                { id: 'favorites', name: 'Favorites', description: 'Your favorite songs' },
                { id: 'quickPlaylists', name: 'Quick Playlists', description: 'Your favorite playlists' },
                { id: 'mostPlayed', name: 'Most Played', description: 'Tracks played most frequently' },
                { id: 'topArtists', name: 'Top Artists', description: 'Your most played artists' },
                { id: 'collectionOverview', name: 'Collection Overview', description: 'Summary statistics of your library' },
              ].map((widget) => (
                <div
                  key={widget.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/5 cursor-pointer transition-colors border border-transparent hover:border-accent/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-bg-primary rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">{widget.name}</div>
                      <div className="text-xs text-text-secondary">{widget.description}</div>
                    </div>
                  </div>
                  <Tooltip text={`Add ${widget.name} widget`}>
                    <button
                      onClick={() => onAddWidget(widget.id)}
                      className="p-1.5 text-accent hover:bg-accent/10 rounded-lg"
                      title={`Add ${widget.name}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
              ))}
            </WidgetLibrary>
          </div>
        </Card>
      </div>

      {/* Active Widgets */}
      <div className="lg:col-span-2 mb-8">
        <ActiveWidgets
          widgets={widgets}
          onReorder={handleReorder}
          onRemoveWidget={handleRemoveWidget}
          onEditWidget={openConfigModal}
          onToggleVisible={handleToggleVisible}
        />
      </div>

      {/* Widget Preview / Configuration */}
      <div className="lg:col-span-1">
        <Card>
          <div className="p-5 border-b border-border-default">
            <h3 className="font-semibold text-text-primary mb-4">Widget Preview</h3>
          </div>
          <div className="p-8 flex items-center justify-center h-64 bg-bg-tertiary rounded-lg border border-border-default">
            {widgets.length > 0 ? (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-accent" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                </div>
                <div className="text-lg font-medium text-text-primary">Widget Preview</div>
                <p className="text-text-secondary text-sm">Select a widget to preview</p>
                {configuringWidgetId && (
                  <ConfigurationModal
                    isOpen={openModal}
                    onClose={() => setOpenModal(false)}
                    widgetId={configuringWidgetId}
                    configuration={configuringWidgetConfig}
                    onUpdateConfig={handleConfigUpdate}
                  />
                )}
              </div>
            ) : (
              <div className="text-center text-text-secondary">
                <p className="text-sm">Select a widget to preview</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Saved Layouts Manager */}
      <div className="lg:col-span-1 mt-8">
        <Card>
          <div className="p-5 border-b border-border-default">
            <h3 className="font-semibold text-text-primary mb-4">Saved Layouts</h3>
          </div>
          <div className="p-4">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="Layout name..."
                className="flex-1 px-3 py-2 bg-bg-tertiary border border-border-default rounded focus:outline-none focus:border-accent"
              />
              <button
            className="px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent/90"
                onClick={handleSaveLayout}
              >
                Save
              </button>
            </div>
            {savedLayouts.length === 0 ? (
              <p className="text-text-secondary">No saved layouts yet</p>
              <p className="text-xs text-text-secondary mt-1">Click 'Save Layout' to save your current widget arrangement</p>
            ) : (
              <div className="space-y-2">
                {savedLayouts.map((layout) => (
                  <div
                    key={layout.id}
                    className="p-3 rounded-lg border border-border-default hover:bg-accent/5 transition-colors"
                    style={{ background: currentLayoutId === layout.id ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text-primary">{layout.name}</span>
                      <div className="flex gap-1">
                        <button
                          className="p-1 bg-bg-tertiary rounded border border-border-default hover:bg-accent/10 text-xs text-text-secondary"
                          onClick={() => handleLoadLayout(layout.id)}
                        >
                          Load
                        </button>
                        <button
                          className="p-1 bg-bg-tertiary rounded border border-border-default hover:bg-accent/10 text-xs text-red-400"
                          onClick={() => handleDeleteLayout(layout.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Configuration Modal */}
      <ConfigurationModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        widgetId={configuringWidgetId}
        configuration={configuringWidgetConfig}
        onUpdateConfig={handleConfigUpdate}
      />
    </div>
  );
}
