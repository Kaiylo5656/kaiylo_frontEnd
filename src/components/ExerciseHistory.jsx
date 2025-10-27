import React, { useState } from 'react';
import { 
  History, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Activity, 
  Weight,
  Info,
  ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import useExerciseHistory from '../hooks/useExerciseHistory';

const ExerciseHistory = ({ exerciseId, className = '' }) => {
  const [showMore, setShowMore] = useState(false);
  const [dateRange, setDateRange] = useState('90');
  
  const {
    data: historyItems,
    loading,
    error,
    hasMore,
    loadMore,
    isEmpty
  } = useExerciseHistory(exerciseId, {
    limit: showMore ? 20 : 5,
    range: dateRange,
    enabled: !!exerciseId
  });

  const formatDate = (dateString, isScheduled = false) => {
    try {
      const date = new Date(dateString);
      return {
        relative: formatDistanceToNow(date, { addSuffix: true, locale: fr }),
        absolute: format(date, 'PPP p', { locale: fr }),
        calendar: format(date, 'd MMM yyyy', { locale: fr }),
        isScheduled
      };
    } catch (error) {
      return { relative: 'Unknown', absolute: 'Unknown', calendar: 'Unknown', isScheduled };
    }
  };

  const formatLoad = (weight) => {
    if (!weight || weight === 0) return '—';
    return `${weight} kg`;
  };

  const handleLoadMore = () => {
    if (hasMore) {
      loadMore();
    }
  };

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    setShowMore(false);
  };

  if (isEmpty && !loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-white/60" />
          <h3 className="text-lg font-medium text-white">Historique de l'exercice</h3>
          <div className="group relative">
            <Info className="h-4 w-4 text-white/40 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-black/90 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              Dernières utilisations de cet exercice
            </div>
          </div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-6 text-center">
          <div className="text-white/60 mb-2">Aucun historique pour cet exercice</div>
          <div className="text-white/40 text-sm">
            Cet exercice n'a pas encore été utilisé dans des séances
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-white/60" />
          <h3 className="text-lg font-medium text-white">Historique de l'exercice</h3>
          <div className="group relative">
            <Info className="h-4 w-4 text-white/40 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-black/90 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              Dernières utilisations de cet exercice
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
            <option value="365">1 an</option>
            <option value="all">Tout</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      )}

      <div className="space-y-3">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <div className="bg-white/5 rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 gap-4 px-4 py-3 bg-white/10 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-white/60" />
                <span className="text-sm font-medium text-white/80">Date</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-white/60" />
                <span className="text-sm font-medium text-white/80">Séries + reps</span>
              </div>
              <div className="flex items-center gap-2">
                <Weight className="h-4 w-4 text-white/60" />
                <span className="text-sm font-medium text-white/80">Charge</span>
              </div>
            </div>
            
            <div className="divide-y divide-white/10">
              {historyItems.map((item, index) => {
                const dateInfo = formatDate(item.performedAt, item.isScheduled);
                return (
                  <div 
                    key={`${item.sessionId}-${index}`}
                    className="grid grid-cols-3 gap-4 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => {
                      // Optional: Open session details in new tab
                      console.log('Open session:', item.sessionId);
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-white" title={dateInfo.absolute}>
                        {dateInfo.calendar}
                        {dateInfo.isScheduled && (
                          <span className="ml-1 text-xs text-white/60">(prévu)</span>
                        )}
                      </div>
                      <div className="text-xs text-white/60">
                        {dateInfo.relative}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-white/80 truncate" title={item.setsSummary}>
                        {item.setsSummary}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-white/80">
                        {formatLoad(item.maxWeight)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {historyItems.map((item, index) => {
            const dateInfo = formatDate(item.performedAt, item.isScheduled);
            return (
              <div 
                key={`${item.sessionId}-${index}`}
                className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => {
                  // Optional: Open session details
                  console.log('Open session:', item.sessionId);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-white/80" title={dateInfo.absolute}>
                    {dateInfo.calendar}
                    {dateInfo.isScheduled && (
                      <span className="ml-1 text-xs text-white/60">(prévu)</span>
                    )}
                  </div>
                  <ExternalLink className="h-4 w-4 text-white/40" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-white/60 mb-1">Séries + reps</div>
                    <div className="text-white truncate" title={item.setsSummary}>
                      {item.setsSummary}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/60 mb-1">Charge</div>
                    <div className="text-white">
                      {formatLoad(item.maxWeight)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="text-xs text-white/60">{dateInfo.relative}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="text-center pt-4">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Chargement...' : 'Afficher plus'}
            </button>
          </div>
        )}

        {/* End of History */}
        {!hasMore && historyItems.length > 0 && (
          <div className="text-center pt-4">
            <div className="text-white/40 text-sm">Fin de l'historique</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseHistory;
