import { useState, useEffect } from 'react';
import { useIpc } from '@context/IPCContext';
import { useSettingsStore } from '@store/store';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Badge from '@components/common/Badge';
import { AlertTriangle, CheckCircle, Database, Clock, GitMerge, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ConflictList = ({ onAllResolved }) => {
  const { invoke } = useIpc();
  const { theme } = useSettingsStore();
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const loadConflicts = async () => {
    setLoading(true);
    try {
      const result = await invoke('mymusicplayer:database:detectConflicts');
      setConflicts(result.conflicts || []);
    } catch (error) {
      console.error('Failed to load conflicts:', error);
      toast.error('Failed to load conflicts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConflicts();
  }, []);

  const handleResolve = async (conflictId, strategy) => {
    setResolvingId(conflictId);
    try {
      const result = await invoke('mymusicplayer:database:resolveConflict', conflictId, strategy, null);
      if (result.success) {
        toast.success(`Conflict resolved: ${strategy}`);
        // Reload conflicts
        loadConflicts();
        if (onAllResolved && conflicts.length === 1) {
          onAllResolved();
        }
      }
    } catch (error) {
      toast.error(`Failed to resolve conflict: ${error.message}`);
    } finally {
      setResolvingId(null);
    }
  };

  const handleDismiss = (conflictId) => {
    setConflicts(conflicts.filter((c) => c.id !== conflictId));
  };

  const resolveSingleConflict = (conflict) => {
    setSelectedConflict(conflict);
    setShowModal(true);
  };

  const handleModalResolve = (resolution, data) => {
    if (selectedConflict) {
      handleResolve(selectedConflict.id, resolution);
    }
    setShowModal(false);
    setSelectedConflict(null);
  };

  const getConflictIcon = (type) => {
    switch (type) {
      case 'song': return <Database className="w-4 h-4" />;
      case 'playlist': return <Database className="w-4 h-4" />;
      case 'settings': return <GitMerge className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return <div className="p-4 flex flex-col items-center justify-center space-2">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
      <span className="text-sm text-text-secondary">Loading conflicts...</span>
    </div>;
  }

  if (conflicts.length === 0) {
    return <div className="p-6 text-center text-text-secondary">
      <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
      <p className="text-sm font-medium">No conflicts detected</p>
      <p className="text-xs text-text-secondary">All data is synchronized</p>
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Conflict Resolution</h2>
          <p className="text-xs text-text-secondary">{conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} require attention</p>
        </div>
        <Button size="sm" onClick={loadConflicts} className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {conflicts.map((conflict) => (
          <Card key={conflict.id} className="p-3 hover:bg-bg-tertiary cursor-pointer transition-colors" onClick={() => resolveSingleConflict(conflict)}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getConflictIcon(conflict.type)}
                <span className="text-xs font-medium text-text-primary">{conflict.type || 'unknown'} conflict</span>
                <Badge variant={conflict.resolved ? 'success' : 'warning'} className="">
                  {conflict.resolved ? 'Resolved' : 'Pending'}
                </Badge>
              </div>
              <X className="w-3 h-3 text-text-secondary opacity-50 hover:text-text-primary transition-opacity"
                 onClick={(e) => { e.stopPropagation(); handleDismiss(conflict.id); }} />
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-text-secondary">{conflict.description || 'Data conflict detected'}</div>
              <span className="text-xs text-text-secondary">{conflict.conflictId || conflict.id}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-text-secondary">
              {conflict.localVersion && (
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3 opacity-50" />
                  v{conflict.localVersion}
                </span>
              )}
              {conflict.remoteVersion && (
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 opacity-50" />
                  v{conflict.remoteVersion}
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" onClick={(e) => { e.stopPropagation(); handleResolve(conflict.id, 'local_wins'); }} disabled={resolvingId === conflict.id}>
                <Database className="w-3 h-3 mr-1" />
                Keep Local
              </Button>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleResolve(conflict.id, 'remote_wins'); }} disabled={resolvingId === conflict.id}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Remote
              </Button>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); resolveSingleConflict(conflict); }} disabled={resolvingId === conflict.id}>
                Merge
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Button
        onClick={() => {
          const pending = conflicts.filter((c) => !c.resolved);
          if (pending.length === 0) {
            if (onAllResolved) onAllResolved();
          }
          loadConflicts();
        }}
        className="w-full text-sm"
      >
        Refresh Conflicts
      </Button>
    </div>
  );
};

export default ConflictList;
