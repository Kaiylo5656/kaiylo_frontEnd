import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  History, 
  ChevronDown, 
  ChevronUp, 
  Weight,
  Info,
  ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import useExerciseHistory from '../hooks/useExerciseHistory';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const ExerciseHistory = ({ exerciseId, className = '' }) => {
  const [showMore, setShowMore] = useState(false);
  const [dateRange] = useState('all');
  const [selectedAthleteIds, setSelectedAthleteIds] = useState([]);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  
  const getAthleteName = (item) => {
    // Debug: log the item structure to understand the data format
    if (process.env.NODE_ENV === 'development' && !item?.athlete?.name && !item?.athleteName && !item?.user?.name && !item?.student?.name) {
      console.log('ExerciseHistory - Item structure:', item);
    }
    
    // Try multiple possible paths for athlete name
    return item?.athlete?.name || 
           item?.athleteName || 
           item?.user?.name || 
           item?.student?.name ||
           (item?.athlete?.firstName ? `${item.athlete.firstName} ${item.athlete.lastName || ''}`.trim() : null) ||
           item?.session?.athlete?.name ||
           item?.session?.student?.name ||
           item?.session?.user?.name ||
           '—';
  };

  const getAthleteId = (item) => {
    return item?.athlete?.id || 
           item?.athleteId || 
           item?.user?.id || 
           item?.student?.id ||
           item?.session?.athlete?.id ||
           item?.session?.student?.id ||
           item?.session?.user?.id ||
           null;
  };

  // Fetch all history items to get the list of athletes and all data
  const {
    data: allHistoryItems,
    loading,
    error,
    hasMore,
    loadMore,
    isEmpty
  } = useExerciseHistory(exerciseId, {
    limit: showMore ? 100 : 50,
    range: dateRange,
    enabled: !!exerciseId
  });
  
  // Filter history items client-side based on selected athlete IDs
  const historyItems = useMemo(() => {
    if (selectedAthleteIds.length === 0) {
      return allHistoryItems;
    }
    return allHistoryItems.filter(item => {
      const athleteId = getAthleteId(item);
      return athleteId && selectedAthleteIds.includes(athleteId);
    });
  }, [allHistoryItems, selectedAthleteIds]);

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

  const formatSetsAndWeight = (setsSummary, weight) => {
    if (!setsSummary) return '—';
    
    // Translate "No sets" to French
    if (setsSummary.toLowerCase().includes('no sets')) {
      return <span className="text-white/80" style={{ fontWeight: 200 }}>Aucune série</span>;
    }
    
    // Extract sets/reps information (e.g., "2×5", "3×8", "1×10")
    // Handle various formats: "2×5", "2 x 5", "2X5", "2, 5", etc.
    const setsRepsMatch = setsSummary.match(/(\d+)\s*[×xX,]\s*(\d+)/);
    
    // Extract weight from setsSummary if present (e.g., "58kg", "70 kg", "@ 70kg")
    const weightInSummary = setsSummary.match(/(\d+(?:\.\d+)?)\s*kg/gi);
    
    // Use provided weight parameter, or extract from summary, or use from summary match
    let finalWeight = null;
    if (weight && weight > 0) {
      finalWeight = weight;
    } else if (weightInSummary && weightInSummary.length > 0) {
      // Take the last weight mentioned (most likely the main weight)
      const lastWeight = weightInSummary[weightInSummary.length - 1];
      finalWeight = parseFloat(lastWeight.replace(/kg/gi, '').trim());
    }
    
    // Build clean sets/reps display
    let setsRepsText = setsSummary;
    
    // If we found a clean sets×reps pattern, use it
    if (setsRepsMatch) {
      const sets = setsRepsMatch[1];
      const reps = setsRepsMatch[2];
      setsRepsText = `${sets}×${reps}`;
    } else {
      // Otherwise, try to clean up the setsSummary by removing weight references
      setsRepsText = setsSummary
        .replace(/\s*@\s*\d+(?:\.\d+)?\s*kg/gi, '') // Remove "@ 70kg"
        .replace(/\s*,\s*\d+(?:\.\d+)?\s*kg\s*x\s*\d+/gi, '') // Remove ", 58kg x 5"
        .replace(/\s*\d+(?:\.\d+)?\s*kg\s*x\s*\d+/gi, '') // Remove "58kg x 5"
        .replace(/\s*\d+(?:\.\d+)?\s*kg/gi, '') // Remove any remaining "58kg"
        .trim();
      
      // If nothing left, use original
      if (!setsRepsText) {
        setsRepsText = setsSummary;
      }
    }
    
    // Format the display
    if (finalWeight && finalWeight > 0) {
      return (
        <>
          <span className="text-white/80" style={{ fontWeight: 200 }}>{setsRepsText}</span>
          <span className="text-[#d4845a]"> @{finalWeight}kg</span>
        </>
      );
    }
    return <span className="text-white/80" style={{ fontWeight: 200 }}>{setsRepsText}</span>;
  };

  // Extract unique athletes from all history items
  const uniqueAthletes = useMemo(() => {
    const athletesMap = new Map();
    
    allHistoryItems.forEach(item => {
      const athleteId = getAthleteId(item);
      const athleteName = getAthleteName(item);
      
      if (athleteId && athleteName && !athletesMap.has(athleteId)) {
        athletesMap.set(athleteId, athleteName);
      }
    });
    
    return Array.from(athletesMap.entries()).map(([id, name]) => ({ id, name }));
  }, [allHistoryItems]);

  const handleFilterToggle = (athleteId) => {
    setSelectedAthleteIds(prev => {
      if (prev.includes(athleteId)) {
        return prev.filter(id => id !== athleteId);
      } else {
        return [...prev, athleteId];
      }
    });
  };

  const getSelectedAthletesText = () => {
    if (selectedAthleteIds.length === 0) {
      return 'Filtrer par élève';
    }
    if (selectedAthleteIds.length === 1) {
      const athlete = uniqueAthletes.find(a => a.id === selectedAthleteIds[0]);
      return athlete?.name || 'Filtrer par élève';
    }
    return `${selectedAthleteIds.length} élèves`;
  };

  const handleLoadMore = () => {
    if (hasMore) {
      loadMore();
    }
  };



  if (isEmpty && !loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-white/60" />
            <h3 className="text-[14px] font-[200] text-[rgba(255,255,255,0.5)]">Historique de l'exercice</h3>
            <div className="group relative">
              <Info className="h-4 w-4 text-white/40 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-black/90 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                Dernières utilisations de cet exercice
              </div>
            </div>
          </div>
          
          {/* Filter by Student Button */}
          {uniqueAthletes.length > 0 && (
            <DropdownMenu open={isFilterDropdownOpen} onOpenChange={setIsFilterDropdownOpen} modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`bg-primary hover:bg-primary/90 font-extralight py-2 px-[15px] rounded-[50px] transition-colors flex items-center gap-2 text-primary-foreground ${
                    isFilterDropdownOpen || selectedAthleteIds.length > 0 ? 'bg-primary/90' : ''
                  }`}
                  style={{
                    backgroundColor: isFilterDropdownOpen || selectedAthleteIds.length > 0 ? 'rgba(212, 132, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: isFilterDropdownOpen || selectedAthleteIds.length > 0 ? '#D48459' : 'rgba(250, 250, 250, 0.75)'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4">
                    <path fill="currentColor" d="M96 128C83.1 128 71.4 135.8 66.4 147.8C61.4 159.8 64.2 173.5 73.4 182.6L256 365.3L256 480C256 488.5 259.4 496.6 265.4 502.6L329.4 566.6C338.6 575.8 352.3 578.5 364.3 573.5C376.3 568.5 384 556.9 384 544L384 365.3L566.6 182.7C575.8 173.5 578.5 159.8 573.5 147.8C568.5 135.8 556.9 128 544 128L96 128z"/>
                  </svg>
                  <span style={{ fontSize: '14px' }}>{getSelectedAthletesText()}</span>
                  {selectedAthleteIds.length > 0 && (
                    <span className="ml-1 bg-primary-foreground/20 text-primary-foreground px-2 py-0.5 rounded-full text-xs font-normal">
                      {selectedAthleteIds.length}
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="end"
                sideOffset={8}
                disablePortal={true}
                className="w-56 rounded-xl p-1"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(10px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}
              >
                {uniqueAthletes.map((athlete) => {
                  const isSelected = selectedAthleteIds.includes(athlete.id);
                  return (
                    <div 
                      key={athlete.id}
                      className={`px-2.5 py-2 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer rounded ${
                        isSelected 
                          ? 'bg-primary/20 text-primary font-normal' 
                          : 'font-light'
                      }`}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                          const span = e.currentTarget.querySelector('span');
                          if (span) {
                            span.style.color = '#D48459';
                            span.style.fontWeight = '400';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '';
                          const span = e.currentTarget.querySelector('span');
                          if (span) {
                            span.style.color = '';
                            span.style.fontWeight = '';
                          }
                        }
                      }}
                      onClick={() => handleFilterToggle(athlete.id)}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-[#d4845a] border-[#d4845a]' 
                          : 'bg-transparent border-white/20'
                      }`}>
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className={isSelected ? 'text-primary' : 'text-foreground'}>{athlete.name}</span>
                    </div>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <div className="bg-black/50 rounded-[10px] p-6 flex items-center justify-center">
          <div className="text-white/25 text-sm mb-0" style={{ fontWeight: 200 }}>Aucun historique pour cet exercice</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-white/60" />
          <h3 className="text-[14px] font-[200] text-[rgba(255,255,255,0.5)]">Historique de l'exercice</h3>
          <div className="group relative">
            <Info className="h-4 w-4 text-white/40 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-black/90 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              Dernières utilisations de cet exercice
            </div>
          </div>
        </div>
        
        {/* Filter by Student Button */}
        {uniqueAthletes.length > 0 && (
          <DropdownMenu open={isFilterDropdownOpen} onOpenChange={setIsFilterDropdownOpen} modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                className={`bg-primary hover:bg-primary/90 font-extralight py-2 px-[15px] rounded-[50px] transition-colors flex items-center gap-2 text-primary-foreground ${
                  isFilterDropdownOpen || selectedAthleteIds.length > 0 ? 'bg-primary/90' : ''
                }`}
                style={{
                  backgroundColor: isFilterDropdownOpen || selectedAthleteIds.length > 0 ? 'rgba(212, 132, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: isFilterDropdownOpen || selectedAthleteIds.length > 0 ? '#D48459' : 'rgba(250, 250, 250, 0.75)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4">
                  <path fill="currentColor" d="M96 128C83.1 128 71.4 135.8 66.4 147.8C61.4 159.8 64.2 173.5 73.4 182.6L256 365.3L256 480C256 488.5 259.4 496.6 265.4 502.6L329.4 566.6C338.6 575.8 352.3 578.5 364.3 573.5C376.3 568.5 384 556.9 384 544L384 365.3L566.6 182.7C575.8 173.5 578.5 159.8 573.5 147.8C568.5 135.8 556.9 128 544 128L96 128z"/>
                </svg>
                <span style={{ fontSize: '14px' }}>{getSelectedAthletesText()}</span>
                {selectedAthleteIds.length > 0 && (
                  <span className="ml-1 bg-primary-foreground/20 text-primary-foreground px-2 py-0.5 rounded-full text-xs font-normal">
                    {selectedAthleteIds.length}
                  </span>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="bottom"
              align="end"
              sideOffset={8}
              disablePortal={true}
              className="w-56 rounded-xl p-1"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(10px)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
            >
              {uniqueAthletes.map((athlete) => {
                const isSelected = selectedAthleteIds.includes(athlete.id);
                return (
                  <div 
                    key={athlete.id}
                    className={`px-2.5 py-2 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer rounded ${
                      isSelected 
                        ? 'bg-primary/20 text-primary font-normal' 
                        : 'font-light'
                    }`}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.color = '#D48459';
                          span.style.fontWeight = '400';
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '';
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.color = '';
                          span.style.fontWeight = '';
                        }
                      }
                    }}
                    onClick={() => handleFilterToggle(athlete.id)}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected 
                        ? 'bg-[#d4845a] border-[#d4845a]' 
                        : 'bg-transparent border-white/20'
                    }`}>
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className={isSelected ? 'text-primary' : 'text-foreground'}>{athlete.name}</span>
                  </div>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      )}

      <div className="space-y-3">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <div className="rounded-xl overflow-hidden border border-white/10" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div className="grid grid-cols-3 gap-4 px-4 py-3 bg-white/5 font-light">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4 text-white/80" fill="currentColor">
                  <path d="M224 64C206.3 64 192 78.3 192 96L192 128L160 128C124.7 128 96 156.7 96 192L96 240L544 240L544 192C544 156.7 515.3 128 480 128L448 128L448 96C448 78.3 433.7 64 416 64C398.3 64 384 78.3 384 96L384 128L256 128L256 96C256 78.3 241.7 64 224 64zM96 288L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 288L96 288z"/>
                </svg>
                <span className="text-sm font-extralight text-white/80">Date</span>
              </div>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4 text-white" fill="currentColor">
                  <path d="M320 312C386.3 312 440 258.3 440 192C440 125.7 386.3 72 320 72C253.7 72 200 125.7 200 192C200 258.3 253.7 312 320 312zM290.3 368C191.8 368 112 447.8 112 546.3C112 562.7 125.3 576 141.7 576L498.3 576C514.7 576 528 562.7 528 546.3C528 447.8 448.2 368 349.7 368L290.3 368z"/>
                </svg>
                <span className="text-sm font-extralight text-white">Nom de l'athlète</span>
              </div>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4 text-white/80" fill="currentColor">
                  <path d="M288 160C288 142.3 302.3 128 320 128C337.7 128 352 142.3 352 160C352 177.7 337.7 192 320 192C302.3 192 288 177.7 288 160zM410.5 192C414 182 416 171.2 416 160C416 107 373 64 320 64C267 64 224 107 224 160C224 171.2 225.9 182 229.5 192L207.7 192C179.4 192 154.5 210.5 146.4 237.6L66.4 504.2C64.8 509.4 64 514.8 64 520.2C64 551 89 576 119.8 576L520.2 576C551 576 576 551 576 520.2C576 514.8 575.2 509.4 573.6 504.2L493.6 237.7C485.5 210.6 460.6 192.1 432.3 192.1L410.5 192.1z"/>
                </svg>
                <span className="text-sm font-extralight text-white/80">Format + Charge</span>
              </div>
            </div>
            
            <div className="divide-y divide-white/10">
              {historyItems.map((item, index) => {
                const dateInfo = formatDate(item.performedAt, item.isScheduled);
                return (
                  <div 
                    key={`${item.sessionId}-${index}`}
                    className="grid grid-cols-3 gap-4 px-4 py-3 transition-colors cursor-pointer items-center hover:bg-white/5"
                    onClick={(e) => {
                      // Prevent closing dropdown when clicking on history row
                      e.stopPropagation();
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
                      <div className="text-[11px] text-white/50 font-extralight">
                        {dateInfo.relative}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-white/80 truncate" title={getAthleteName(item)}>
                        {getAthleteName(item)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm">
                        {formatSetsAndWeight(item.setsSummary, item.maxWeight)}
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
                onClick={(e) => {
                  // Prevent closing dropdown when clicking on history row
                  e.stopPropagation();
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
                      {item.setsSummary?.toLowerCase().includes('no sets') ? 'Aucune série' : item.setsSummary}
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
          <div className="text-center pt-1">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-4 py-2 hover:bg-white/20 text-white/50 hover:text-white hover:font-normal rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              style={{ fontWeight: 200, backgroundColor: 'unset', background: 'unset' }}
            >
              {loading ? 'Chargement...' : 'Afficher plus'}
            </button>
          </div>
        )}

        {/* End of History */}
        {!hasMore && historyItems.length > 0 && (
          <div className="text-center pt-4">
            <div className="text-white/50 text-xs" style={{ fontWeight: 200 }}>Fin de l'historique</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseHistory;
