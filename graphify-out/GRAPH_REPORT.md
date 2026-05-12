# Graph Report - frontend  (2026-05-12)

## Corpus Check
- 213 files · ~552,770 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 746 nodes · 903 edges · 24 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 150 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 50 edges
2. `useModalManager()` - 18 edges
3. `a` - 15 edges
4. `k()` - 14 edges
5. `y()` - 13 edges
6. `ConnectionManager` - 13 edges
7. `M` - 11 edges
8. `useOverlayModal()` - 10 edges
9. `useSocket()` - 10 edges
10. `x()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `AuthProvider()` --calls--> `getApiBaseUrlWithApi()`  [INFERRED]
  src\contexts\AuthContext.jsx → src\config\api.js
- `BackgroundUploadProvider()` --calls--> `useAuth()`  [INFERRED]
  src\contexts\BackgroundUploadContext.jsx → src\contexts\AuthContext.jsx
- `ProtectedRoute()` --calls--> `useAuth()`  [INFERRED]
  src\App.jsx → src\contexts\AuthContext.jsx
- `ChatRouteWrapper()` --calls--> `useAuth()`  [INFERRED]
  src\App.jsx → src\contexts\AuthContext.jsx
- `AddExerciseModal()` --calls--> `useModalManager()`  [INFERRED]
  src\components\AddExerciseModal.jsx → src\components\ui\modal\ModalManager.jsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (50): ClientLimitModal(), makeBenefits(), UpgradeConfirmationModal(), BottomNavBar(), ChatList(), ChatWindow(), CoachResourceModal(), ExerciseInfoModal() (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (24): $(), a, c(), d(), deleteCacheAndMetadata(), e(), f(), G (+16 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (27): AddExerciseModal(), DeleteExerciseModal(), DeleteMessageModal(), DeleteSessionModal(), DeleteStudentModal(), DeleteVideoModal(), ExerciseDetailModal(), ExerciseYoutubeEmbed() (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (13): CoachSessionReviewModal(), CreateWorkoutSessionModal(), exerciseHasPreviousRpeOrCharge(), exerciseShowPreviousColumn(), FeedbackModal(), InviteStudentModal(), PendingInvitationsModal(), StudentProfileModal() (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (21): buildBlockPeriodOptionsForLabel(), computeBlockIntervals(), computePerformanceAggregation(), computePeriodRange(), findBlockIntervalForDate(), formatPerformancePeriodPreferenceLabel(), getBucketForSetDate(), getKgFromSet() (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (20): AuthProvider(), getStoredSupabaseSession(), persistSessionTokens(), appendCachedMessage(), clearAllChatCache(), conversationsKey(), getCachedConversations(), getCachedMessages() (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.1
Nodes (13): formatMetricValue(), formatNumber(), getMetricLabel(), PerformanceAnalysisModal(), formatExerciseCardRepsSegment(), formatHoldRepsSegmentForCard(), formatMetricValue(), getExerciseCardRows() (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (16): buildSummaryPlainText(), coalesceReps(), coalesceWeight(), formatRepsAfterNx(), formatRepsCompactValue(), formatRepsStandalone(), getSetRepType(), seriesLabelFr() (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (8): buildApiUrl(), ConnectionManager, getApiBaseUrl(), getApiBaseUrlWithApiEnhanced(), getSocketBaseUrl(), getSocketBaseUrlEnhanced(), getWorkingApiUrl(), testApiConnectivity()

### Community 9 - "Community 9"
Cohesion: 0.21
Nodes (11): buildBridgedLinePoints(), buildMonotoneXPath(), emitMonotoneBezier(), getAxisScaleMax(), getBucketCenterX(), getNiceStep(), isFiniteNumber(), PerformanceTrendChart() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.27
Nodes (11): addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns(), loadData() (+3 more)

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (10): a(), B(), D(), g(), i(), k(), Q(), y() (+2 more)

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (10): CreateBlockModal(), TagColorPicker(), buildPeriodizationTagColorMap(), buildTagColorMapFromAllTags(), getAvailableColors(), getFallbackTagHexByName(), getTagColor(), getTagColorMap() (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.2
Nodes (5): formatDate(), formatWeight(), OneRmModal(), ProgressAnalytics(), FacturationPage()

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (5): cn(), Badge(), DialogFooter(), DialogHeader(), DropdownMenuShortcut()

### Community 17 - "Community 17"
Cohesion: 0.25
Nodes (4): BackgroundUploadIndicator(), WorkoutVideoUploadModal(), BackgroundUploadProvider(), useBackgroundUpload()

### Community 21 - "Community 21"
Cohesion: 0.48
Nodes (5): areTagsEquivalent(), findExistingTag(), isTagSelected(), normalizeTagName(), removeDuplicateTags()

### Community 22 - "Community 22"
Cohesion: 0.7
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (2): PWAProvider(), usePWA()

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (2): ExerciseHistory(), useExerciseHistory()

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (2): VideoTrimEditor(), useVideoTrim()

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (2): createIcon(), createSVGIcon()

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (2): n(), r()

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (2): getFigmaUrl(), openFigmaDesign()

## Knowledge Gaps
- **Thin community `Community 24`** (5 nodes): `PWAProvider()`, `usePWAContext()`, `usePWA()`, `PWAProvider.jsx`, `usePWA.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (4 nodes): `ExerciseHistory()`, `useExerciseHistory()`, `ExerciseHistory.jsx`, `useExerciseHistory.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (4 nodes): `VideoTrimEditor()`, `useVideoTrim()`, `VideoTrimEditor.jsx`, `useVideoTrim.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (3 nodes): `createIcon()`, `createSVGIcon()`, `generate-pwa-icons.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (3 nodes): `sw.js`, `n()`, `r()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (3 nodes): `getFigmaUrl()`, `openFigmaDesign()`, `figma-references.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 0` to `Community 2`, `Community 3`, `Community 5`, `Community 7`, `Community 13`, `Community 17`?**
  _High betweenness centrality (0.249) - this node is a cross-community bridge._
- **Why does `getApiBaseUrlWithApi()` connect `Community 0` to `Community 8`, `Community 5`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **Why does `testApiConnectivity()` connect `Community 8` to `Community 1`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Are the 49 inferred relationships involving `useAuth()` (e.g. with `ProtectedRoute()` and `ChatRouteWrapper()`) actually correct?**
  _`useAuth()` has 49 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `useModalManager()` (e.g. with `AddExerciseModal()` and `CreateWorkoutSessionModal()`) actually correct?**
  _`useModalManager()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._