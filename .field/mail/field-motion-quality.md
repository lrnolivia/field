---
field_mailbox: 1
id: field-motion-quality
assignment: field-motion-quality
---

# field-motion-quality mailbox

## 2026-09-29 — activation

Activated from main `a445ee8e7acd484603fb97204ac96c5db186ed60`.

Research conclusion:
- keep Motion 12 + field.MOTION
- consolidate ad-hoc chrome transitions into the existing architecture
- fix frame pacing before adding optical blur
- reuse the existing directional shell blur language
- treat editor-entrance.ts as read-only because an active dashboard handoff assignment owns it

Planned sequence:
0. observatory
1. motion policy
2. structural chrome morphs
3. direct manipulation
4. optical polish
5. toolbar-panel pilot
6. certification
