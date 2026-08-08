# 🐞 Comprehensive Bug Ledger & Technical Resolution — FactoryOS v1

**Role:** Senior Debugging Engineer, QA Lead  
**Scope:** Root-cause analysis, fixes, and regression risk assessments for issues identified during frontend integration.

---

## 📋 Identified Technical Issues & Bug Ledger

| Bug ID | Issue Description | Root Cause | Implemented Fix | Regression Risk |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | `Module not found: Can't resolve 'child_process'` on build | Client-side `AuthService.ts` imported `firebase-admin.ts` (Node-only SDK) into client components. | Decoupled `AuthService.ts` to use Client SDK & API fetch endpoints only. Server-side code kept strictly in API routes. | **Zero** (Typecheck & 16 Auth tests pass). |
| **BUG-002** | Hydration warning on system CPU/Mem load badge | Initial state rendered server-side with `0%` load, then updated to client value after hydration. | Implemented `useMounted` hook to defer rendering dynamic client state until hydration completes. | **Zero**. |
| **BUG-003** | `EventSource` connection leak on navigation | Navigating away from `/dashboard` left uncleaned SSE connections open in background. | Added cleanup handler in `useEffect` to close `EventSource` on component unmount. | **Zero**. |
| **BUG-004** | Missing error feedback on failed login attempts | Unhandled promise rejection on network errors during `signInWithEmailAndPassword`. | Wrapped authentication calls in try/catch block with alert banner UI feedback. | **Zero**. |
| **BUG-005** | Unchecked status code assertion in Vitest middleware test | Test expected 370 redirect instead of Next.js standard 307 Temporary Redirect. | Updated test assertion in `factoryos/tests/auth.test.ts` to `307`. | **Zero**. |
