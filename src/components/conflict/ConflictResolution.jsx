import { useState, useEffect } from 'react';
import { useIpc } from '@context/IPCContext';
import { useSettingsStore } from '@store/store';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Badge from '@components/common/Badge';
import { AlertTriangle, CheckCircle, XCircle, GitMerge, UserCheck, RefreshCw, Database, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ConflictResolution = ({ conflictId, data, onResolve, onDismiss }) => {
  const { invoke } = useIpc();
  const { theme } = useSettingsStore();
  const [conflict, setConflict] = useState(data);
  const [resolution, setResolution] = useState('local_wins');
  const [isResolving, setIsResolving] = useState(false);
  const [localVersion, setLocalVersion] = useState(null);
  const [remoteVersion, setRemoteVersion] = useState(null);
  const [mergeData, setMergeData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setConflict(data);
  }, [data]);

  useEffect(() => {
    const loadVersions = async () => {
      if (!conflictId) return;
      try {
        const result = await invoke('mymusicplayer:database:getIndexedDBState');
        setLocalVersion({ version: 1, last_modified: Date.now() - 1000 });
        setRemoteVersion({ version: 1, last_modified: Date.now() });
        setLoading(false);
      } catch (error) {
        console.error('Failed to load conflict versions:', error);
        setLoading(false);
      }
    };
    loadVersions();
  }, [conflictId, invoke]);

  const handleResolve = async (strategy) => {
    setIsResolving(true);
    try {
      const result = await invoke('mymusicplayer:database:resolveConflict', conflictId, strategy, mergeData);
      if (result.success) {
        toast.success(`Conflict resolved: ${strategy}`);
        if (onResolve) onResolve(result);
      }
    } catch (error) {
      toast.error(`Failed to resolve conflict: ${error.message}`);
    } finally {
      setIsResolving(false);
    }
  };

  const handleLocalWins = () => handleResolve('local_wins');
  const handleRemoteWins = () => handleResolve('remote_wins');
  const handleMerge = () => handleResolve('merge');

  const getResolutionButtonClass = (strategy) => {
    const base = 'p-2 rounded-lg border transition-all duration-200 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed';
    if (resolution === strategy) {
      return `${base} bg-accent/10 border-accent text-accent`;
    }
    return `${base} bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-tertiary`;
  };

  if (loading) {
    return <div className="p-4 text-center text-text-secondary">Loading conflict details...</div>;
  }

  if (!conflict) {
    return <div className="p-4 text-center text-text-secondary">No conflict detected</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400" />
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Conflict Detected</h3>
          <p className="text-xs text-text-secondary">Conflict #{conflictId || 'unknown'} requires resolution</p>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-lg p-3 text-sm">
        {conflict.type && (
          <div className="mb-2">
            <span className="text-xs text-text-secondary">Type: </span>
            <span className="text-xs font-medium text-text-primary">{conflict.type}</span>
          </div>
        )}
        {conflict.description && (
          <div className="mb-2">
            <span className="text-xs text-text-secondary">Description: </span>
            <span className="text-xs text-text-primary">{conflict.description}</span>
          </div>
        )}
        {conflict.songId && (
          <div className="mb-2">
            <span className="text-xs text-text-secondary">Song ID: </span>
            <span className="text-xs text-text-primary">#{conflict.songId}</span>
          </div>
        )}
        {conflict.playlistId && (
          <div className="mb-2">
            <span className="text-xs text-text-secondary">Playlist ID: </span>
            <span className="text-xs text-text-primary">#{conflict.playlistId}</span>
          </div>
        )}
      </div>

      {localVersion && remoteVersion && (
        <div className="bg-bg-secondary rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-text-secondary" />
            <span className="text-xs font-semibold text-text-primary">Version Comparison</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-bg-tertiary rounded p-2">
              <div className="flex items-center gap-1 text-text-secondary mb-1">
                <Clock className="w-3 h-3" />
                <span>Local Version</span>
              </div>
              <div className="text-text-primary font-medium">v{localVersion.version || 0}</div>
              {localVersion.last_modified && (
                <div className="text-text-secondary">Modified: {new Date(localVersion.last_modified).toLocaleString()}</div>
              )}
            </div>
            <div className="bg-bg-tertiary rounded p-2">
              <div className="flex items-center gap-1 text-text-secondary mb-1">
                <RefreshCw className="w-3 h-3" />
                <span>Remote Version</span>
              </div>
              <div className="text-text-primary font-medium">v{remoteVersion.version || 0}</div>
              {remoteVersion.last_modified && (
                <div className="text-text-secondary">Modified: {new Date(remoteVersion.last_modified).toLocaleString()}</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-text-primary">Resolution Strategy</p>

        <button
          onClick={() => setResolution('local_wins')}
          className={getResolutionButtonClass('local_wins')}
        >
          <Database className="w-4 h-4" />
          Keep Local Version
          <span className="text-xs opacity-70 ml-auto">Recommended</span>
        </button>

        <button
          onClick={() => setResolution('remote_wins')}
          className={getResolutionButtonClass('remote_wins')}
        >
          <RefreshCw className="w-4 h-4" />
          Accept Remote Version
        </button>

        <button
          onClick={() => setResolution('merge')}
          className={getResolutionButtonClass('merge')}
        >
          <GitMerge className="w-4 h-4" />
          Manual Merge
        </button>
      </div>

      {resolution === 'merge' && (
        <div className="bg-bg-secondary rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-text-secondary" />
            <span className="text-xs font-semibold text-text-primary">Side-by-Side Merge Editor</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-text-secondary mb-1">Local fields</p>
              <pre className="bg-bg-tertiary rounded p-2 max-h-40 overflow-y-auto text-[10px] text-text-primary whitespace-pre-wrap">
                {JSON.stringify(localVersion, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-text-secondary mb-1">Remote fields</p>
              <pre className="bg-bg-tertiary rounded p-2 max-h-40 overflow-y-auto text-[10px] text-text-primary whitespace-pre-wrap">
                {JSON.stringify(remoteVersion, null, 2)}
              </pre>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-text-secondary">Field-level merge</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(remoteVersion || {}).map((key) => (
                <div key={key} className="bg-bg-tertiary rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-text-primary">{key}</span>
                    <button
                      onClick={() => {
                        setMergeData((prev) => ({
                          ...prev,
                          [key]: remoteVersion[key],
                        }));
                      }}
                      className="text-[10px] text-accent hover:text-accent/80"
                    >
                      Use remote
                    </button>
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    Local: {String(localVersion?.[key] || 'N/A')}
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    Remote: {String(remoteVersion[key] || 'N/A')}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={handleMerge} disabled={isResolving} className="w-full">
            <GitMerge className="w-4 h-4" />
            Apply Manual Merge
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          onClick={resolution === 'local_wins' ? handleLocalWins : resolution === 'remote_wins' ? handleRemoteWins : handleMerge}
          disabled={isResolving}
          className="flex-1"
        >
          {isResolving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Resolving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Resolve Conflict
            </>
          )}
        </Button>
        {onDismiss && (
          <Button onClick={onDismiss} disabled={isResolving} variant="outline">
            <XCircle className="w-4 h-4" />
            Dismiss
          </Button>
        )}
      </div>

      {conflict.resolved && (
        <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-xs text-green-400">Conflict resolved</span>
        </div>
      )}
    </div>
  );
};

export default ConflictResolution;
