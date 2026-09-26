# Installer contract

Assignment installers are transactional migration artifacts.

A production installer should resolve package root, discover the field repo, fetch current main, rehydrate the current kit/tracker, check active Owned collisions, validate target dirt/resume state, construct and validate the postimage in an isolated worktree, run focused tests + TypeScript + build:all + diff/scope checks, reconcile moving main, perform final ownership/reservation, commit only allowlisted paths, push without force, verify deployed production HEAD, run required Firecrawl packets, perform authenticated/manual QA when noauth cannot prove the requirement, record evidence, and release ownership.

Prohibited: `reset --hard`, `git clean` on unrelated files, force-push, stash roulette, broad staging such as `git add -A`, weakening failed guards, treating Protected as ownership, using stale attached kit copies as canonical, claiming deployment success before checking production, or classifying a harness limitation as a field defect.
