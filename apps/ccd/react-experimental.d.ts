// Next 14 pulls in React's experimental types (form actions with functions, useFormStatus) from its own
// copy of @types/react. In this pnpm workspace that copy can be React 19's, so the augmentation would not
// reach this app's React 18 types. Referencing them from here makes the /ops server-action forms type-check
// the same way on Vercel as locally.
/// <reference types="react/experimental" />
/// <reference types="react-dom/experimental" />
