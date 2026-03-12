# Event Creator AI - MVP "Demo Pack v0"

**Goal:** Complete end-to-end flow - 3-step wizard → generate DNA + assets → preview A/B → select → finalize → download ZIP

**MVP Constraints:**
- 3-step wizard (not 8)
- 3 asset types only: IG Post, IG Story, Ticket Banner
- 4 archetypes with defaults
- Polling-based progress (not real-time)

## Phase 1: Stabilize Job Queue & Fix TypeScript Errors
- [x] Fix job queue TypeScript errors (retries, error field, getPendingJobs)
- [x] Add missing database helpers (getPendingJobs, updateJob with error field)
- [x] Test job queue worker for GENERATE_DNA
- [x] Test job queue worker for GENERATE_COPY
- [x] Test job queue worker for GENERATE_ASSET_OPTIONS
- [x] Ensure jobs run without manual DB edits

## Phase 2: Frontend Routing Skeleton
- [x] Create /app/campaigns route (campaign list)
- [x] Create /app/campaigns/new route (wizard entry)
- [x] Create /app/campaigns/:id/v/:vid/generate route (generation progress)
- [x] Create /app/campaigns/:id/v/:vid/assets route (asset preview/selection)
- [ ] Create /app/campaigns/:id/v/:vid/export route (finalize & download)
- [x] Update App.tsx with new routes
- [ ] Create navigation component

## Phase 3: 3-Step Wizard + Archetype Builder
- [x] Create archetype selection screen (Club Night, Festival, Show, Conference)
- [x] Implement Step 1: Event Essence (name, date, city, genre, 3 vibe chips)
- [x] Implement Step 2: Branding Inputs (3-color palette, logo upload)
- [x] Implement Step 3: Asset Pack (checkboxes for IG Post/Story + Ticket Banner)
- [x] Add progress indicator and step navigation
- [x] Implement form validation with React Hook Form
- [x] Save campaign and version to database on completion
- [x] Redirect to generation screen after wizard completion

## Phase 4: Generation UI with Polling
- [x] Create generation progress screen
- [x] Add "Generate DNA" button that enqueues jobs via tRPC
- [x] Implement polling system (trpc.jobs.list with refetch interval)
- [x] Display job progress panel with status badges
- [x] Show DNA generation progress
- [x] Show copy generation progress
- [x] Show asset option generation progress (3 asset types)
- [x] Add "View Assets" link when all jobs complete
- [x] Handle job failures with retry option

## Phase 5: Asset Preview & Selection
- [x] Create asset preview screen with tabs for each asset type
- [x] Display side-by-side comparison (Option A vs Option B)
- [x] Add zoom/fullscreen preview functionality
- [x] Implement "Select A" / "Select B" buttons
- [x] Add "Regenerate B" option
- [x] Show selected assets summary
- [x] Add "Finalize Pack" button
- [x] Save selections to database

## Phase 6: Finalize & ZIP Export
- [ ] Create finalize endpoint that marks selections as final
- [ ] Implement ZIP export job (EXPORT_ZIP)
- [ ] Create ZIP from selected assets with folder structure
- [ ] Upload ZIP to S3 and return download URL
- [ ] Build export UI with progress indicator
- [ ] Display download link when ZIP is ready
- [ ] Add "Download ZIP" button

## Phase 7: Playwright Testing
- [ ] Install Playwright MCP
- [ ] Test: Complete 3-step wizard and create campaign
- [ ] Test: Generation progress reaches "assets ready"
- [ ] Test: Select options for all 3 asset types
- [ ] Test: Finalize pack
- [ ] Test: Export produces downloadable ZIP URL
- [ ] Test: Download ZIP and verify contents

## Phase 8: Polish & Delivery
- [ ] Fix any remaining TypeScript errors
- [ ] Add loading states and error handling
- [ ] Improve UI polish and animations
- [ ] Add empty states and helpful messages
- [ ] Test complete flow end-to-end manually
- [ ] Create checkpoint
- [ ] Deliver MVP to user

---

## Postponed to Post-MVP
- Full 8-step wizard with deep configuration
- Real-time WebSocket subscriptions
- Advanced dashboard features (duplication, history, compare)
- Full platform matrix (all asset types and sizes)
- Comprehensive test suite coverage
- Copy variant selection UI
- Advanced archetype customization


## Phase 7: Bug Fixes
- [x] Fix authentication login loop issue (no issue found - working correctly)
- [x] Investigate and resolve redirect/cookie issues

## Phase 8: Job Worker Implementation
- [x] Create job worker startup script
- [x] Integrate worker with dev server
- [x] Test DNA generation job execution
- [x] Test copy generation job execution
- [x] Test asset generation job execution

## Phase 9: ZIP Export
- [x] Create export endpoint in routers
- [x] Implement ZIP generation with selected assets
- [x] Add download functionality to frontend
- [x] Test ZIP export with multiple asset types

## Phase 10: Logo Upload
- [ ] Implement S3 upload in wizard
- [ ] Add file validation and size checks
- [ ] Store upload metadata in database
- [ ] Pass logo URL to asset generation

## Phase 11: End-to-End Testing
- [x] Test complete campaign creation flow
- [x] Test generation workflow with real jobs
- [x] Test asset selection and export
- [x] Fix any discovered issues


## Critical Bug Fix
- [x] Fix login loop issue preventing user access
- [x] Investigate authentication redirect logic
- [x] Check useAuth hook implementation
- [x] Verify cookie handling and session persistence
- [ ] Test login flow end-to-end


## Job Queue Race Condition Fix
- [x] Fix race condition where Copy/Asset jobs fail with "Campaign DNA not found"
- [x] Add proper job sequencing so DNA is saved before dependent jobs start
- [x] Implement job dependencies or delays between workflow steps
- [ ] Test complete workflow end-to-end


## Figma API Integration
- [x] Request Figma API access token from user
- [x] Validate Figma API credentials
- [x] Integrate Figma REST API for template rendering
- [x] Update asset generation to use Figma as Engine A (with HTML fallback)
- [ ] Configure Figma template file IDs for each asset type
- [ ] Test Figma integration with real campaign generation


## Figma Make Designs AI Integration (SKIPPED)
- [x] Research Figma Make Designs API endpoints and capabilities
- [x] Confirmed: Figma AI not available via REST API
- [x] Decision: Skip Figma integration, use HTML templates for Engine A


## OpenRouter Multi-Model Image Generation Integration
- [x] Research OpenRouter image generation API and available models (FLUX.2, GPT-5 Image, etc.)
- [x] Create openRouterImageGen.ts for image generation
- [x] Implement intelligent model routing (Nano Banana Pro primary, FLUX.2 secondary, GPT-5 Image tertiary)
- [x] Update assetGeneration.ts to use OpenRouter for Engine B
- [x] Add model selection logic based on asset type and quality requirements
- [ ] Test image generation with multiple models
- [ ] Compare quality and performance across models


## Login Loop Issue (Recurring)
- [x] Investigate why login loop is happening again (server was crashing due to stale esbuild cache)
- [x] Check cookie configuration and session persistence (missing session cookie)
- [x] Verify OAuth callback is working correctly (server restarted successfully)
- [ ] Test authentication flow end-to-end


## Database Insertion Error Fix
- [x] Fix campaignDNAVersions insert error (tokens field not properly serialized)
- [x] Ensure all JSON fields are properly stringified before database insertion
- [ ] Test DNA generation workflow end-to-end


## Persistent Login Loop Fix (Critical)
- [x] Deep investigation of auth.me endpoint and session cookie handling
- [x] Check if OAuth callback is properly setting session cookies
- [x] Verify cookie domain, path, and SameSite attributes are correct
- [x] Test if cookies are being sent with requests (found: no cookies set)
- [x] Check if session is being properly stored and retrieved
- [x] Implement permanent fix for session persistence (changed sameSite to "none" for secure requests)
- [ ] Test authentication flow with Playwright MCP


## Remove Authentication (Temporary)
- [x] Remove useAuth checks from all frontend pages
- [x] Update backend routers to allow anonymous access (remove protectedProcedure)
- [x] Test all pages work without login
- [x] Save checkpoint for publishing


## Fix Application Issues and Deploy
- [x] Investigate what's not working (check browser console, server logs, network requests)
- [x] Fix any runtime errors or broken functionality (OpenRouter API integration fixed)
- [x] Test complete campaign creation workflow
- [x] Test generation workflow with job queue
- [x] Test asset preview and export
- [ ] Save checkpoint after fixes
- [ ] Deploy application
- [ ] Test deployed version thoroughly
