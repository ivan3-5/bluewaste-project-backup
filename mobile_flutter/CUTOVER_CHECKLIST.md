# BlueWaste Mobile Cutover Checklist

This runbook is for production cutover from the legacy React Native mobile app to the Flutter mobile app.

## Objective

- Replace only the mobile frontend implementation.
- Keep backend API, database schema, and web admin dashboard unchanged.

## Non-Negotiable Rules

- Do not change existing backend endpoints for cutover.
- Do not change database schema for cutover.
- Do not modify web admin dashboard behavior for cutover.

## Roles and Ownership

- Release owner: approves go or no-go.
- Mobile lead: executes Flutter release tasks.
- QA lead: signs off UAT and regression.
- Backend on-call: monitors API health and error rates.
- Support lead: monitors incident reports and user feedback during rollout.

## Pre-Cutover Readiness Gates

Mark all as complete before go-live.

- [ ] Flutter app has platform folders generated and committed if this repo will build mobile binaries directly.
  - Current repository check: android and ios directories are not present under mobile_flutter.
  - If needed, run in mobile_flutter: flutter create .
- [ ] Flutter dependencies install cleanly.
  - flutter pub get
- [ ] Static checks pass.
  - flutter analyze
- [ ] Backend health endpoint is stable.
  - GET /api/health returns status ok
- [ ] Auth flow verified on real devices.
  - login
  - register
  - session restore
  - logout
- [ ] Citizen report flow verified on real devices.
  - create report
  - upload report images
  - capture location
  - list own reports
- [ ] Worker flow verified on real devices.
  - list assigned reports
  - update report status
  - upload cleanup image
- [ ] Notifications verified.
  - list notifications
  - mark one read
  - mark all read
- [ ] Profile update verified.
  - update first name, last name, phone
- [ ] API contract parity validated versus legacy app payloads.
- [ ] Release artifacts prepared for Flutter app.
- [ ] Legacy React Native release artifact retained for rollback.

## UAT Sign-Off Checklist

- [ ] Citizen UAT passed
- [ ] Worker UAT passed
- [ ] Regression tests passed for core flows
- [ ] Acceptance criteria in migration plan fully satisfied
- [ ] Stakeholder sign-off captured

## Rollout Strategy

Recommended: staged rollout.

- Phase 1: internal testers only
- Phase 2: limited pilot users
- Phase 3: full rollout

## Go-Live Day Checklist

### T-24 hours

- [ ] Create release branch and tag baseline before cutover.
- [ ] Confirm backend metrics dashboard and alerts are active.
- [ ] Confirm support and on-call contacts are available.

### T-2 hours

- [ ] Publish Flutter build to selected channel.
- [ ] Verify app points to production API base URL.
- [ ] Execute smoke tests on production environment.

### T-0

- [ ] Open rollout to target cohort.
- [ ] Track critical metrics every 15 minutes for first 2 hours.
  - login success rate
  - report creation success rate
  - image upload success rate
  - status update success rate
  - 401 and 5xx API error rates

### T+2 hours

- [ ] Review incident queue and crash reports.
- [ ] Decide continue, pause, or rollback.

## Rollback Criteria

Rollback if any critical condition is met and cannot be mitigated quickly.

- Login failure rate exceeds agreed threshold.
- Report creation or image upload failure exceeds agreed threshold.
- Worker status updates fail at critical rate.
- Severe data integrity or authorization issues detected.

## Rollback Procedure

- [ ] Pause Flutter rollout in release channel.
- [ ] Re-enable distribution of last known stable React Native build.
- [ ] Communicate rollback status and user guidance.
- [ ] Keep backend unchanged unless unrelated incidents require action.
- [ ] Open post-incident review within 24 hours.

## Stabilization Window After Go-Live

Recommended: 7 to 14 days before retiring legacy source tree.

During stabilization:

- [ ] Keep legacy React Native source and build config intact.
- [ ] Keep release notes for both tracks.
- [ ] Monitor production metrics and support tickets daily.

## Legacy React Native Retirement Checklist

Execute only after stabilization completes and no rollback risk remains.

- [ ] Create archive tag for last React Native state.
- [ ] Announce retirement decision and effective date.
- [ ] Remove legacy mobile workspace entry from root package workspaces.
- [ ] Remove legacy mobile scripts from root package scripts.
- [ ] Archive or remove mobile directory using approved change process.
- [ ] Update root README to point only to Flutter mobile path.
- [ ] Update CI pipeline to build and test Flutter mobile only.
- [ ] Verify no references to old mobile path remain in docs and tasks.

## Post-Cutover Audit

- [ ] Confirm all mobile traffic now comes from Flutter release versions.
- [ ] Confirm no critical incidents remain open.
- [ ] Confirm documentation is updated and accurate.
- [ ] Capture lessons learned and final migration sign-off.
