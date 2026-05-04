# SmartSCAD Mobile — screens & features inventory

Source of truth for navigation: `src/app/navigation/AuthNavigator.tsx` and `MainTabNavigator.tsx`.  
Screen files live under `src/features/<area>/screens/*Screen.tsx` unless noted.

---

## Auth (unauthenticated)

| Screen | File | Purpose |
|--------|------|--------|
| **Login** | `features/auth/screens/LoginScreen.tsx` | AD sign-in, optional dev “login as”, web SSO |

---

## Tab: Home (`Home` stack)

| Route | Screen | File | Features |
|-------|--------|------|----------|
| `HomeScreen` | Home | `features/tasks/screens/HomeScreen.tsx` | Configurable home layouts (SCAD / Gov), hero, quick actions, performance/donut, waiting-for-action, raise-a-request / services, news/announcements/events/offers/videos/SCAD Star, attendance & leave summary, deep links |
| `Notifications` | Notifications | `features/notifications/screens/NotificationsScreen.tsx` | In-app notification list |

---

## Tab: Tasks (`Tasks` stack)

| Route | Screen | File | Features |
|-------|--------|------|----------|
| `TaskList` | Task list | `features/tasks/screens/TaskListScreen.tsx` | Task hub: filters, sort, status, open detail |
| `TaskDetail` | Task detail | `features/tasks/screens/TaskDetailScreen.tsx` | Detail, history, actions; may redirect to ticket for Sanadkom workflow |
| `CreateTask` | Create task | `features/tasks/screens/CreateTaskScreen.tsx` | Create task, assign / on-behalf when allowed |

**Note:** `features/tasks/screens/home/*` = home layout variants and model (used only by `HomeScreen`).

---

## Tab: Approvals (`Approvals` stack)

| Route | Screen | File | Features |
|-------|--------|------|----------|
| `ApprovalsInbox` | Inbox | `features/approvals/screens/ApprovalsInboxScreen.tsx` | Universal approvals list |
| `ApprovalDetail` | Review | `features/approvals/screens/ApprovalDetailScreen.tsx` | Approve / reject / return |

---

## Tab: Sanadkom (`Sanadkom` stack)

| Route | Screen | File | Features |
|-------|--------|------|----------|
| `TicketList` | Requests | `features/tickets/screens/TicketListScreen.tsx` | SmartHelp request list, views, search |
| `TicketDetail` | Detail | `features/tickets/screens/TicketDetailScreen.tsx` | Info, fields, workflow, timeline |
| `ServiceCatalog` | Catalog | `features/tickets/screens/ServiceCatalogScreen.tsx` | Choose service before submit |
| `SubmitTicket` | Submit | `features/tickets/screens/SubmitTicketScreen.tsx` | Dynamic form, create request |

---

## Tab: More (`More` stack)

### Settings

| Route | Screen | File | Features |
|-------|--------|------|----------|
| `MoreMenu` | More | `features/portal/screens/MoreScreen.tsx` | Master app menu (rights-driven) |
| `DesignSettings` | Design | `features/settings/screens/DesignSettingsScreen.tsx` | Theme / layout preferences |

### Leave

| Route | Screen | File | Features |
|-------|--------|------|----------|
| `LeaveBalance` | Balance | `features/leave/screens/LeaveBalanceScreen.tsx` | Balances by type |
| `LeaveHistory` | History | `features/leave/screens/LeaveHistoryScreen.tsx` | List |
| `LeaveDetail` | Detail | `features/leave/screens/LeaveDetailScreen.tsx` | Single request, workflow + timeline |
| `LeaveRequest` | New request | `features/leave/screens/LeaveRequestScreen.tsx` | Submit leave |
| `TeamLeave` | Team leave | `features/leave/screens/TeamLeaveScreen.tsx` | Team view |

### Attendance

| Route | Screen | File | Features |
|-------|--------|------|----------|
| `Attendance` | Attendance | `features/attendance/screens/AttendanceScreen.tsx` | Daily / clock context |
| `MonthlyCard` | Monthly card | `features/attendance/screens/MonthlyCardScreen.tsx` | Month summary |

### HR

| Route | Screen | File | Features |
|-------|--------|------|----------|
| `Profile` | Profile | `features/hr/screens/ProfileScreen.tsx` | My profile, tabs |
| `Directory` | Directory | `features/hr/screens/DirectoryScreen.tsx` | Employee search / list |
| `EmployeeDetail` | Employee | `features/hr/screens/EmployeeDetailScreen.tsx` | Person details |
| `OrgChart` | Org chart | `features/hr/screens/OrgChartScreen.tsx` | Hierarchy |
| `Recognition` | SCAD Star | `features/hr/screens/RecognitionScreen.tsx` | Awards feed |
| `WinnerDetail` | Winner | `features/hr/screens/WinnerDetailScreen.tsx` | Winner / award detail |

### EPM

| Route | Screen | File | Features |
|-------|--------|------|----------|
| `ProjectList` | Projects | `features/epm/screens/ProjectListScreen.tsx` | List / filters |
| `ProjectDetail` | Project | `features/epm/screens/ProjectDetailScreen.tsx` | Detail |

### PMS

| Route | Screen | File | Features |
|-------|--------|------|----------|
| `Objectives` | Objectives | `features/pms/screens/ObjectivesScreen.tsx` | Strategy / objectives |
| `KPIs` | KPIs | `features/pms/screens/KPIScreen.tsx` | KPIs |

### Portal (content)

| Route | Screen | File | Features |
|-------|--------|------|----------|
| `News` | News | `features/portal/screens/NewsScreen.tsx` | List, sort |
| `NewsDetail` | Article | `features/portal/screens/NewsDetailScreen.tsx` | Article body |
| `Events` | Events | `features/portal/screens/EventsScreen.tsx` | List |
| `EventDetail` | Event | `features/portal/screens/EventDetailScreen.tsx` | Detail |
| `Announcements` | Announcements | `features/portal/screens/AnnouncementsScreen.tsx` | List |
| `AnnouncementDetail` | Announcement | `features/portal/screens/AnnouncementDetailScreen.tsx` | Body |
| `Surveys` | Surveys | `features/portal/screens/SurveysScreen.tsx` | Surveys |
| `Circulars` | Circulars | `features/portal/screens/CircularsScreen.tsx` | Circulars |
| `FAQs` | FAQs | `features/portal/screens/FAQsScreen.tsx` | FAQs |
| `Offers` | Offers | `features/portal/screens/OffersScreen.tsx` | Offers list |
| `OfferDetail` | Offer | `features/portal/screens/OfferDetailScreen.tsx` | Detail |
| `Gallery` | Gallery | `features/portal/screens/GalleryScreen.tsx` | Media gallery |
| `VideoDetail` | Video | `features/portal/screens/VideoDetailScreen.tsx` | Video / player |

### Appraisal & training

| Route | Screen | File | Features |
|-------|--------|------|----------|
| `Appraisal` | Appraisal | `features/appraisal/screens/AppraisalScreen.tsx` | Period, objectives, competencies |
| `Training` | Training | `features/appraisal/screens/TrainingScreen.tsx` | Courses & training requests |

### Innovation & AI

| Route | Screen | File | Features |
|-------|--------|------|----------|
| `Ideas` | IBDAA | `features/ibdaa/screens/IdeasScreen.tsx` | Ideas, stats, voting |
| `AIChat` | AI | `features/ai/screens/AIChatScreen.tsx` | Assistant chat |

### Notifications (also from Home stack)

| Route | Screen | File | Features |
|-------|--------|------|----------|
| `Notifications` | (same) | `features/notifications/screens/NotificationsScreen.tsx` | Same list as Home → Notifications |

---

## Summary

| Count | Item |
|------|------|
| **~48** | `*Screen.tsx` files under `src/features` |
| **5** | Bottom tabs: Home, Tasks, Approvals, Sanadkom, More |
| **1** | Unauthenticated screen: Login |

---

## Suggested review order (one-by-one)

1. Auth: `LoginScreen`  
2. Home shell: `HomeScreen` → `TaskList` → `TaskDetail` → `CreateTask`  
3. Approvals: `ApprovalsInbox` → `ApprovalDetail`  
4. Sanadkom: `TicketList` → `TicketDetail` / `ServiceCatalog` → `SubmitTicket`  
5. More: `MoreScreen` then by module (Leave → Attendance → HR → EPM → PMS → Portal → Appraisal/Training → Ideas/AI)  

---

*Last updated from `MainTabNavigator.tsx` — adjust this file if routes change.*
