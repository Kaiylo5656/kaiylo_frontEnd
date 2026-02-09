/**
 * Tri des élèves identique à la page d'accueil (CoachDashboard).
 * Priorité 1: feedback en attente
 * Priorité 2: aucune séance à venir
 * Puis tri par critère choisi (nom, date d'arrivée)
 */
export const sortStudents = (studentsList, sortBy, direction, studentVideoCounts = {}, studentNextSessions = {}) => {
  if (!studentsList || studentsList.length === 0) return studentsList;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...studentsList].sort((a, b) => {
    // Priorité 1: élèves avec feedback en attente
    const feedbackCountA = studentVideoCounts[a.id] ? Number(studentVideoCounts[a.id]) : 0;
    const feedbackCountB = studentVideoCounts[b.id] ? Number(studentVideoCounts[b.id]) : 0;
    const hasPendingFeedbackA = feedbackCountA > 0;
    const hasPendingFeedbackB = feedbackCountB > 0;

    // Priorité 2: élèves sans séance à venir
    const nextSessionDateA = studentNextSessions[a.id];
    const nextSessionDateB = studentNextSessions[b.id];

    let hasNoUpcomingSessionA = false;
    if (!nextSessionDateA) {
      hasNoUpcomingSessionA = true;
    } else {
      const sessionDateA = new Date(nextSessionDateA);
      sessionDateA.setHours(0, 0, 0, 0);
      hasNoUpcomingSessionA = sessionDateA < today;
    }

    let hasNoUpcomingSessionB = false;
    if (!nextSessionDateB) {
      hasNoUpcomingSessionB = true;
    } else {
      const sessionDateB = new Date(nextSessionDateB);
      sessionDateB.setHours(0, 0, 0, 0);
      hasNoUpcomingSessionB = sessionDateB < today;
    }

    if (hasPendingFeedbackA !== hasPendingFeedbackB) {
      return hasPendingFeedbackB ? 1 : -1;
    }

    if (hasNoUpcomingSessionA !== hasNoUpcomingSessionB) {
      return hasNoUpcomingSessionB ? 1 : -1;
    }

    if (hasPendingFeedbackA && hasPendingFeedbackB && feedbackCountA !== feedbackCountB) {
      return feedbackCountB - feedbackCountA;
    }

    let comparison = 0;

    if (sortBy === 'createdAt' || sortBy === 'joinedAt') {
      const dateA = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
      const dateB = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;

      if (!a.joinedAt && !b.joinedAt) return 0;
      if (!a.joinedAt) return 1;
      if (!b.joinedAt) return -1;

      comparison = dateA - dateB;
    } else {
      const nameA = (a.name || a.full_name || '').trim();
      const nameB = (b.name || b.full_name || '').trim();

      if (!nameA && !nameB) return 0;
      if (!nameA) return 1;
      if (!nameB) return -1;

      comparison = nameA.localeCompare(nameB, undefined, {
        sensitivity: 'base',
        numeric: true
      });
    }

    return direction === 'desc' ? -comparison : comparison;
  });
};
