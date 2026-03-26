# Atlas — Frontend

> HR management platform frontend built with Next.js 16, TypeScript, and Tailwind CSS v4.

**Live App:** `https://zoho-app-sigma.vercel.app`
**Backend API:** `https://zoho-backend-rho.vercel.app`

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Pages & Features](#pages--features)
- [Design System](#design-system)
- [Authentication](#authentication)
- [Role-Based Access Control](#role-based-access-control)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Deployment](#deployment)

---

## Overview

Atlas is a professional HR self-service portal. Employees, managers, HR, and admins each get a tailored experience based on their role. Every feature is accessible from a clean, responsive sidebar.

**Supported roles:**
| Role | What they can do |
|---|---|
| **Employee** | Track attendance, apply leaves, view profile, upload KRA, see announcements |
| **Manager** | All employee features + approve/reject leaves & regularizations, view team attendance, manage onboarding |
| **HR** | All manager features + manage users, holidays, assets, IT provisioning, post announcements |
| **Admin** | Full access — all HR features + delete users + system configuration |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| State | React Context API (AuthContext) |
| HTTP Client | Native fetch with JWT auto-refresh |
| Font | Geist Sans + Geist Mono |
| Deployment | Vercel |

---

## Project Structure

```
zoho-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (fonts, metadata)
│   │   ├── globals.css                 # Design system (tokens, animations, utilities)
│   │   ├── login/
│   │   │   └── page.tsx                # OTP login page
│   │   └── dashboard/
│   │       ├── layout.tsx              # Dashboard shell (Sidebar + TopBar + AuthGuard)
│   │       ├── page.tsx                # Dashboard home
│   │       ├── attendance/page.tsx     # Attendance management
│   │       ├── leaves/page.tsx         # Leave management
│   │       ├── announcements/page.tsx  # Announcements & celebrations
│   │       ├── directory/page.tsx      # Employee directory
│   │       ├── profile/page.tsx        # My profile
│   │       ├── onboarding/page.tsx     # Onboarding tracker
│   │       ├── approvals/page.tsx      # Leave/regularization approvals
│   │       ├── documents/page.tsx      # Document management
│   │       └── users/page.tsx          # User management (Admin only)
│   ├── components/
│   │   ├── Sidebar.tsx                 # Grouped nav, collapsible, role badge
│   │   ├── TopBar.tsx                  # Page title, user menu, scroll-aware
│   │   └── AuthGuard.tsx               # Redirects unauthenticated users
│   ├── contexts/
│   │   └── AuthContext.tsx             # Auth state, login/logout, canAccess(module)
│   └── lib/
│       └── api.ts                      # Full API client with auto token refresh
```

---

## Pages & Features

### 🔐 Login (`/login`)
- Two-step OTP flow: enter work email → receive code → enter 6-digit code
- Auto-redirect to dashboard on success
- Spam folder hint, resend code option
- Decorative left panel with feature highlights (desktop)

---

### ⊞ Dashboard (`/dashboard`)
- **Time-aware greeting** — Good morning ☀️ / afternoon ⛅ / evening 🌙
- **Role-specific KPI cards** with gradient backgrounds and trend labels:
  - Employee: leaves used, pending requests
  - Manager: team size, present today, on leave, pending approvals
  - HR/Admin: total employees, present/on-leave/absent, pending approvals
- **Quick Actions grid** — color-coded cards for fast navigation
- **Recent Activity** — leave and attendance events with status badges
- **Skeleton loading** while fetching data

---

### 🕐 Attendance (`/dashboard/attendance`)
Four tabs:

**History** — Personal attendance log with check-in/out times, location, WFH badge, work hours

**Calendar** — Monthly heatmap with color-coded days:
- Green = Present, Yellow = WFH, Red = Absent, Gray = Weekend/Holiday
- Navigate months, click day for details
- Check-in card with:
  - GPS auto-location via browser Geolocation API + OpenStreetMap reverse geocoding
  - WFH toggle (blue gradient when active)
  - Real-time work hours and overtime display

**Regularize** — Submit correction requests for missed/wrong check-in/out
- Form: date, reason, requested times
- Managers see all team requests with approve/reject buttons

**Team** *(Manager/HR/Admin only)* — Team attendance for any date with status badges

---

### 🌿 Leaves (`/dashboard/leaves`)
Five tabs:

**Balance** — Progress bars per leave type (used/total), comp-off balance card

**Apply** — Leave application form:
- Leave type selector (populated from API)
- Date range picker with live duration preview
- Reason text area
- Duplicate/overlap detection

**History** — Personal leave list with status badges, cancel button for pending leaves, CSV export button

**Holidays** — 2026 national holiday calendar with type badges (National/Optional/Company)
- Admin controls: Add custom holiday, Delete, Seed 15 national holidays for 2026

**Comp-off** — Request compensatory off for worked holidays
- Form: date worked, reason
- List with status; managers see all team requests with approve/reject

---

### 📢 Announcements (`/dashboard/announcements`)
Three tabs:

**Feed** — Announcements visible to the user:
- Pinned announcements first (📌 badge)
- Priority stripe (HIGH = red top border)
- Type badge: 🌐 Company-wide or 🏢 Dept
- Expandable long content ("Read more")
- "Today's celebrations" banner when someone has a birthday or anniversary today

**Celebrations** — Upcoming birthdays 🎂 and work anniversaries 🏅 in the next 7 days
- Cards show name, role, department, days until
- "Today 🎉" badge for current-day events
- Years of service displayed for anniversaries

**Manage** *(Manager/HR/Admin)* — Compose and manage announcements:
- Audience: Company-wide or specific department
- Priority: High / Normal / Low
- Optional expiry date
- Pin toggle
- Edit and delete existing announcements

> **Note:** Birthdays are populated from the DOB field in My Profile. Work anniversaries are computed from the employee's joining date.

---

### 👥 Directory (`/dashboard/directory`)
- Full employee directory with search and filters (role, department, status)
- Employee cards with initials avatar, designation, contact info
- Department grouping view

---

### 👤 My Profile (`/dashboard/profile`)
Four tabs:

**Personal** — Self-service profile editing:
- Profile photo upload (resized to 300×300 via canvas API, stored as base64)
- Phone number, designation, bio
- Full address (street, city, state, pincode)
- Emergency contact (name, phone, relationship)
- Date of birth (used for birthday celebrations)

**Skills** — Add skills with proficiency levels:
- Levels: Beginner → Intermediate → Advanced → Expert
- Color-coded chips, hover to remove

**Certifications** — Professional certifications tracker:
- Name, issuing organization, issue/expiry dates, credential ID
- Automatic "Expiring soon" (within 30 days) and "Expired" badges

**KRA** *(Key Result Areas)* — Document upload:
- Upload PDF, Word, Excel, or PowerPoint files (max 10 MB)
- Title and period fields (e.g. "Q1 2026", "FY 2025-26")
- File stored as base64 in database
- Download button to retrieve files
- HR/Admin/Manager see a table of all employees' KRA submissions

---

### 🚀 Onboarding (`/dashboard/onboarding`)
Three tabs:

**Checklist** — 30-day onboarding task tracker:
- Progress bar showing overall completion %
- Tasks grouped by time bands: Day 1 / Days 2–3 / Week 1 / Week 2 / Week 3–4
- Category badges: HR, IT, Manager, Finance, General
- Click checkbox or use dropdown to update status (Pending / In Progress / Completed / Skipped)
- HR/Admin: select any employee, click "Initialize Onboarding" to seed 15 default tasks + 8 IT items
- Add custom tasks, delete tasks

**Assets** — Hardware and access tracking:
- Employee view: cards showing assigned laptop, access card, etc.
- HR/Admin view: full asset registry table with assign / return workflow
  - Assign any available asset to any employee
  - "Return" button marks asset as available
  - Asset types: Laptop, Access Card, Monitor, Keyboard, Mouse, Phone, Other

**IT Provisioning** — Software/access setup tracker:
- Employee view: their IT setup items with status indicators
- HR/Admin view: all employees × all IT items; update any status via dropdown
- Summary stats: Pending / In Progress / Done / Blocked counts
- Default items: Email, Slack, VPN, GitHub, Jira, Google Workspace, HR Portal, Cloud Console

---

### ✅ Approvals (`/dashboard/approvals`)
*(Manager/HR/Admin only)*

- Pending leave requests with employee details, dates, reason
- Approve / Reject with optional rejection reason
- Pending regularization requests
- Filter by type and status

---

### 📁 Documents (`/dashboard/documents`)
- Document upload and management
- Category-based organization

---

### ⚙️ User Management (`/dashboard/users`)
*(Admin only)*

- Full employee list with search, role filter, department filter
- Create new user form:
  - Auto-generates employee ID
  - Sends welcome email with login instructions
  - Assign role, department, manager, joining date
- Edit user details
- Deactivate user account

---

## Design System

The app uses a custom design system defined in `globals.css`:

### Colors
- **Brand gradient:** `rgb(220,38,38)` → `rgb(249,115,22)` (red to orange)
- **Surface:** white / `#f8fafc` background
- **Borders:** `#e2e8f0`

### Component Classes

| Class | Usage |
|---|---|
| `.card` | White card with border and shadow |
| `.card-interactive` | Card that lifts on hover |
| `.glass-card` | Frosted glass effect |
| `.gradient-btn` | Brand gradient button with hover lift |
| `.gradient-text` | Transparent gradient text fill |
| `.input` | Consistent form input with red focus ring |
| `.badge-pending/approved/rejected/info` | Semantic status pill badges |
| `.stat-blue/green/orange/red/purple` | Gradient stat card backgrounds |
| `.skeleton` | Shimmer loading placeholder |
| `.toast-success/error/info` | Notification toasts |
| `.table-base` | Consistent table with hover rows |

### Animations

| Class | Effect |
|---|---|
| `.animate-fade-in-up` | Fade + rise from below |
| `.animate-scale-in` | Scale from 95% to 100% |
| `.animate-float` | Gentle vertical floating |
| `.animate-pulse-soft` | Soft opacity pulse |
| `.animate-blob` | Organic shape movement |
| `.skeleton` | Horizontal shimmer sweep |
| `.delay-100` to `.delay-500` | Stagger delays |

---

## Authentication

Handled by `AuthContext` + `api.ts`:

1. **Login** — `api.sendOtp(email)` then `api.verifyOtp(email, otp)`
2. **Tokens stored** in `localStorage` (`accessToken`, `refreshToken`, `user`)
3. **Every API request** — `Authorization: Bearer <accessToken>` header added automatically
4. **On 401** — `api.ts` auto-retries after refreshing the token pair
5. **On refresh failure** — clears tokens and redirects to `/login`
6. **AuthGuard component** — wraps all dashboard routes; redirects unauthenticated users

---

## Role-Based Access Control

Defined in `AuthContext.tsx`:

```typescript
const MODULE_ACCESS = {
  dashboard:     ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  attendance:    ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  leaves:        ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  announcements: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  directory:     ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  profile:       ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  onboarding:    ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  approvals:     ['MANAGER', 'HR', 'ADMIN'],
  documents:     ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  users:         ['ADMIN'],
};
```

- `canAccess(module)` — used in Sidebar to show/hide nav items
- `isRole(...roles)` — used in pages to show/hide sections and actions

---

## Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_API_URL=https://zoho-backend-rho.vercel.app
# For local development:
# NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Local Development

```bash
# Install dependencies
npm install

# Set environment
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local

# Start dev server (Turbopack)
npm run dev
# → http://localhost:3001

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

Make sure the backend is running at `http://localhost:3000` (or update `NEXT_PUBLIC_API_URL`).

---

## Deployment

**Platform:** Vercel

```bash
# Deploy via CLI
npx vercel --prod

# Or push to master branch — Vercel auto-deploys
git push origin master
```

**Vercel environment variable** (set in project settings):
```
NEXT_PUBLIC_API_URL = https://zoho-backend-rho.vercel.app
```

---

## Key Files Reference

| File | Purpose |
|---|---|
| `src/lib/api.ts` | All API calls; handles auth headers, token refresh, error throwing |
| `src/contexts/AuthContext.tsx` | Global auth state, login/logout, `isRole()`, `canAccess()` |
| `src/components/AuthGuard.tsx` | Protects all dashboard routes from unauthenticated access |
| `src/components/Sidebar.tsx` | Navigation with role-based item filtering and collapsible mode |
| `src/components/TopBar.tsx` | Page title, user avatar dropdown, scroll-aware shadow |
| `src/app/globals.css` | Entire design system — tokens, utility classes, animations |

---

## Troubleshooting

**Can't log in?**
- Check the backend is live: `https://zoho-backend-rho.vercel.app/api/health`
- Check `NEXT_PUBLIC_API_URL` is set correctly in Vercel
- Check that your email exists in the `User` table in Supabase

**OTP not received?**
- Check spam/junk folder
- Verify `SMTP_USER` and `SMTP_PASS` are set in backend Vercel env
- OTP expires in 10 minutes — request a fresh one

**User management list is empty?**
- The error banner will show the reason (e.g. unauthorized)
- Only ADMIN role can access this page
