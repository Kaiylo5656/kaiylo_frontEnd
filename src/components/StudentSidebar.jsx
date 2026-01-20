import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const StudentSidebar = ({ 
  students = [], 
  currentStudentId, 
  onStudentSelect,
  isCollapsed = false,
  onToggleCollapse,
  studentVideoCounts = {},
  studentMessageCounts = {},
  studentNextSessions = {},
  onFeedbackBadgeClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterPendingFeedback, setFilterPendingFeedback] = useState(false);
  const [filterPendingMessages, setFilterPendingMessages] = useState(false);
  const [filterNoUpcomingSessions, setFilterNoUpcomingSessions] = useState(false);

  const filteredStudents = useMemo(() => {
    let filtered = students;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = students.filter(student => {
        const name = (student.name || student.full_name || student.email || '').toLowerCase();
        const email = (student.email || '').toLowerCase();
        return name.includes(term) || email.includes(term);
      });
    }
    
    // Apply pending feedback filter
    if (filterPendingFeedback) {
      filtered = filtered.filter(student => 
        studentVideoCounts[student.id] && Number(studentVideoCounts[student.id]) > 0
      );
    }
    
    // Apply pending messages filter
    if (filterPendingMessages) {
      filtered = filtered.filter(student => 
        studentMessageCounts[student.id] && Number(studentMessageCounts[student.id]) > 0
      );
    }
    
    // Apply no upcoming sessions filter
    if (filterNoUpcomingSessions) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(student => {
        const nextSessionDate = studentNextSessions[student.id];
        if (!nextSessionDate) {
          // No session date means no upcoming session
          return true;
        }
        
        // Check if the session date is still in the future
        // Handle both ISO string dates and Date objects
        const sessionDate = new Date(nextSessionDate);
        if (isNaN(sessionDate.getTime())) {
          // Invalid date, treat as no upcoming session
          return true;
        }
        sessionDate.setHours(0, 0, 0, 0);
        
        // Only show students with no upcoming sessions (date is in the past, not today or future)
        // If sessionDate >= today, it's an upcoming session, so exclude the student
        // We use < instead of <= because a session today is still "upcoming"
        const hasNoUpcomingSession = sessionDate < today;
        return hasNoUpcomingSession;
      });
    }
    
    // Sort: students with pending feedback first
    filtered.sort((a, b) => {
      const aHasPendingFeedback = studentVideoCounts[a.id] && Number(studentVideoCounts[a.id]) > 0;
      const bHasPendingFeedback = studentVideoCounts[b.id] && Number(studentVideoCounts[b.id]) > 0;
      
      if (aHasPendingFeedback && !bHasPendingFeedback) return -1;
      if (!aHasPendingFeedback && bHasPendingFeedback) return 1;
      return 0;
    });
    
    return filtered;
  }, [students, searchTerm, filterPendingFeedback, filterPendingMessages, filterNoUpcomingSessions, studentVideoCounts, studentMessageCounts, studentNextSessions]);

  return (
    <div 
      className={`relative bg-[rgba(255,255,255,0.05)] transition-all duration-300 ease-in-out rounded-2xl ${
        isCollapsed ? 'w-0' : 'w-80 border border-white/10'
      } flex flex-col overflow-hidden h-full`}
    >
      {!isCollapsed && (
        <>
          {/* Search Bar */}
          <div className="p-4">
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/75 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher un client"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-[50px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-extralight"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                />
              </div>
              
              {/* Filter Button */}
              <DropdownMenu open={isFilterDropdownOpen} onOpenChange={setIsFilterDropdownOpen} modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="bg-primary hover:bg-primary/90 font-extralight h-[42px] w-[42px] rounded-full transition-colors flex items-center justify-center text-primary-foreground"
                    style={{
                      backgroundColor: isFilterDropdownOpen || filterPendingFeedback || filterPendingMessages || filterNoUpcomingSessions ? 'rgba(212, 132, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: isFilterDropdownOpen || filterPendingFeedback || filterPendingMessages || filterNoUpcomingSessions ? '#D48459' : 'rgba(250, 250, 250, 0.75)'
                    }}
                    title="Filtres"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5">
                      <path fill="currentColor" d="M96 128C83.1 128 71.4 135.8 66.4 147.8C61.4 159.8 64.2 173.5 73.4 182.6L256 365.3L256 480C256 488.5 259.4 496.6 265.4 502.6L329.4 566.6C338.6 575.8 352.3 578.5 364.3 573.5C376.3 568.5 384 556.9 384 544L384 365.3L566.6 182.7C575.8 173.5 578.5 159.8 573.5 147.8C568.5 135.8 556.9 128 544 128L96 128z"/>
                    </svg>
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
                  <div 
                    className={`px-2.5 py-2 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer rounded-md ${
                      filterPendingFeedback 
                        ? 'bg-primary/20 text-primary font-normal' 
                        : 'font-light'
                    }`}
                    onMouseEnter={(e) => {
                      if (!filterPendingFeedback) {
                        e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.color = '#D48459';
                          span.style.fontWeight = '400';
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!filterPendingFeedback) {
                        e.currentTarget.style.backgroundColor = '';
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.color = '';
                          span.style.fontWeight = '';
                        }
                      }
                    }}
                    onClick={() => setFilterPendingFeedback(!filterPendingFeedback)}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      filterPendingFeedback 
                        ? 'bg-[#d4845a] border-[#d4845a]' 
                        : 'bg-transparent border-white/20'
                    }`}>
                      {filterPendingFeedback && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className={filterPendingFeedback ? 'text-primary' : 'text-foreground'}>Feedback en attente</span>
                  </div>
                  
                  <div 
                    className={`px-2.5 py-2 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer rounded-md ${
                      filterPendingMessages 
                        ? 'bg-primary/20 text-primary font-normal' 
                        : 'font-light'
                    }`}
                    onMouseEnter={(e) => {
                      if (!filterPendingMessages) {
                        e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.color = '#D48459';
                          span.style.fontWeight = '400';
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!filterPendingMessages) {
                        e.currentTarget.style.backgroundColor = '';
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.color = '';
                          span.style.fontWeight = '';
                        }
                      }
                    }}
                    onClick={() => setFilterPendingMessages(!filterPendingMessages)}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      filterPendingMessages 
                        ? 'bg-[#d4845a] border-[#d4845a]' 
                        : 'bg-transparent border-white/20'
                    }`}>
                      {filterPendingMessages && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className={filterPendingMessages ? 'text-primary' : 'text-foreground'}>Messages en attente</span>
                  </div>
                  
                  <div 
                    className={`px-2.5 py-2 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer rounded-md ${
                      filterNoUpcomingSessions 
                        ? 'bg-primary/20 text-primary font-normal' 
                        : 'font-light'
                    }`}
                    onMouseEnter={(e) => {
                      if (!filterNoUpcomingSessions) {
                        e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.color = '#D48459';
                          span.style.fontWeight = '400';
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!filterNoUpcomingSessions) {
                        e.currentTarget.style.backgroundColor = '';
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.color = '';
                          span.style.fontWeight = '';
                        }
                      }
                    }}
                    onClick={() => setFilterNoUpcomingSessions(!filterNoUpcomingSessions)}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      filterNoUpcomingSessions 
                        ? 'bg-[#d4845a] border-[#d4845a]' 
                        : 'bg-transparent border-white/20'
                    }`}>
                      {filterNoUpcomingSessions && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className={filterNoUpcomingSessions ? 'text-primary' : 'text-foreground'}>Aucune séance à venir</span>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Students List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-white/50 text-sm font-extralight">
                {searchTerm ? 'Aucun client trouvé' : 'Aucun client'}
              </div>
            ) : (
              <div className="p-2">
                {filteredStudents.map((student) => {
                  const isActive = student.id === currentStudentId;
                  const studentName = student.name || student.full_name || student.email || 'Client';
                  
                  return (
                    <button
                      key={student.id}
                      onClick={() => onStudentSelect(student)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl mb-2 transition-all ${
                        isActive
                          ? 'bg-[rgba(255,255,255,0.1)]'
                          : 'bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium text-base shrink-0">
                        {studentName.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Name */}
                      <div className="flex-1 text-left min-w-0">
                        <div className={`text-base truncate ${
                          isActive 
                            ? 'text-white font-light' 
                            : 'text-white/80 font-light'
                        }`}>
                          {studentName}
                        </div>
                      </div>
                      
                      {/* Feedback Badge */}
                      <div 
                        className={`h-[22px] min-w-[22px] px-1.5 rounded-[20px] bg-[#d4845a] flex items-center justify-center shrink-0 transition-all duration-200 mr-3 ${
                          (studentVideoCounts[student.id] || 0) === 0 
                            ? 'opacity-0 cursor-default pointer-events-none' 
                            : 'cursor-pointer hover:bg-[#d4845a]/90 hover:scale-110'
                        }`}
                        onClick={(studentVideoCounts[student.id] || 0) > 0 ? (e) => {
                          e.stopPropagation(); // Prevent triggering the button click
                          if (onFeedbackBadgeClick) {
                            onFeedbackBadgeClick(student);
                          }
                        } : undefined}
                        title="Voir les vidéos en attente de feedback"
                      >
                        <span className="text-[13px] text-white font-normal leading-none">
                          {studentVideoCounts[student.id] || 0}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentSidebar;

