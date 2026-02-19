import React from 'react';

const OverviewDashboardIcon = ({ size = 20, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width={size} height={size} className={className} aria-hidden="true">
        <path d="M348.8 32C340.7 46.1 336 62.5 336 80l0 16-272 0 0 224 272 0 0 64-272 0c-35.3 0-64-28.7-64-64L0 96C0 60.7 28.7 32 64 32l284.8 0zM336 432c0 17.5 4.7 33.9 12.8 48L120 480c-13.3 0-24-10.7-24-24s10.7-24 24-24l216 0zM432 32l96 0c26.5 0 48 21.5 48 48l0 352c0 26.5-21.5 48-48 48l-96 0c-26.5 0-48-21.5-48-48l0-352c0-26.5 21.5-48 48-48zm24 64c-13.3 0-24 10.7-24 24s10.7 24 24 24l48 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l48 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0zm56 144a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z" fill="currentColor" />
    </svg>
);

const VideoAnalyseIcon = ({ size = 20, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width={size} height={size} className={className} aria-hidden="true">
        <path d="M96 64c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64L96 64zM464 336l73.5 58.8c4.2 3.4 9.4 5.2 14.8 5.2 13.1 0 23.7-10.6 23.7-23.7l0-240.6c0-13.1-10.6-23.7-23.7-23.7-5.4 0-10.6 1.8-14.8 5.2L464 176 464 336z" fill="currentColor" />
    </svg>
);

const SuiviEuroIcon = ({ size = 20, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width={size} height={size} className={className} aria-hidden="true">
        <path d="M73.3 192C100.8 99.5 186.5 32 288 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-65.6 0-122 39.5-146.7 96L272 192c13.3 0 24 10.7 24 24s-10.7 24-24 24l-143.2 0c-.5 5.3-.8 10.6-.8 16s.3 10.7 .8 16L272 272c13.3 0 24 10.7 24 24s-10.7 24-24 24l-130.7 0c24.7 56.5 81.1 96 146.7 96l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-101.5 0-187.2-67.5-214.7-160L40 320c-13.3 0-24-10.7-24-24s10.7-24 24-24l24.6 0c-.7-10.5-.7-21.5 0-32L40 240c-13.3 0-24-10.7-24-24s10.7-24 24-24l33.3 0z" fill="currentColor" />
    </svg>
);

const PeriodizationCalendarIcon = ({ size = 20, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width={size} height={size} className={className} aria-hidden="true">
        <path d="M128 0C110.3 0 96 14.3 96 32l0 32-32 0C28.7 64 0 92.7 0 128l0 48 448 0 0-48c0-35.3-28.7-64-64-64l-32 0 0-32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 32-128 0 0-32c0-17.7-14.3-32-32-32zM0 224L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-192-448 0z" fill="currentColor" />
    </svg>
);

const PlanningDumbbellIcon = ({ size = 20, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" width={size} height={size} className={className} aria-hidden="true">
        <path d="M96 112c0-26.5 21.5-48 48-48s48 21.5 48 48l0 112 256 0 0-112c0-26.5 21.5-48 48-48s48 21.5 48 48l0 16 16 0c26.5 0 48 21.5 48 48l0 48c17.7 0 32 14.3 32 32s-14.3 32-32 32l0 48c0 26.5-21.5 48-48 48l-16 0 0 16c0 26.5-21.5 48-48 48s-48-21.5-48-48l0-112-256 0 0 112c0 26.5-21.5 48-48 48s-48-21.5-48-48l0-16-16 0c-26.5 0-48-21.5-48-48l0-48c-17.7 0-32-14.3-32-32s14.3-32 32-32l0-48c0-26.5 21.5-48 48-48l16 0 0-16z" fill="currentColor" />
    </svg>
);

const CoachStudentBottomNav = ({ activeTab, setActiveTab }) => {
    const tabs = [
        {
            id: 'overview',
            label: 'Tableau de bord',
            icon: OverviewDashboardIcon // Vue d'ensemble
        },
        {
            id: 'training',
            label: 'Planning',
            icon: PlanningDumbbellIcon // Entraînement
        },
        {
            id: 'periodization',
            label: 'Périodisation',
            icon: PeriodizationCalendarIcon // Périodisation
        },
        {
            id: 'analyse',
            label: 'Analyse',
            icon: VideoAnalyseIcon // Analyse vidéo
        },
        {
            id: 'suivi',
            label: 'Suivi',
            icon: SuiviEuroIcon // Suivi Financier
        }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-[#171717] px-4 pb-safe pt-2 md:hidden z-50">
            <div className="flex justify-between items-end pb-2">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="flex flex-col items-center gap-1 min-w-[60px]"
                        >
                            <div
                                className="p-1.5 rounded-xl transition-all duration-300 bg-transparent"
                            >
                                <Icon
                                    size={20}
                                    strokeWidth={isActive ? 2.5 : 1.5}
                                    className={`transition-all duration-300 ${isActive
                                            ? 'text-white scale-110'
                                            : 'text-white/25'
                                        }`}
                                />
                            </div>
                            <span
                                className={`text-[10px] font-medium transition-colors duration-300 ${isActive
                                        ? 'text-white'
                                        : 'text-white/25'
                                    }`}
                            >
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CoachStudentBottomNav;
