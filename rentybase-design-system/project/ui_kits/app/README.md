# RentyBase app UI kit

High-fidelity recreation of the React Native app — landlord home, tenant pay-rent flow, payment success, move-in proof, and auth.

Open `index.html` to play with the click-thru. Components live in:

- `components.jsx` — `Icon`, `LogoMark`, `Pill`, `Button`, `Card`, `Eyebrow` (all on `window.RB`).
- `screens.jsx` — `TabBar`, `LandlordHome`, `TenantPayRent`, `TenantPaid`, `ProofScreen`, `Auth` (all on `window.RBScreens`).
- `app.jsx` — wires everything together inside an iOS frame.
- `ios-frame.jsx` — device bezel.

Visual sources: `Lease/components/ui/*` and `Lease/components/rental/*` were the originals these are based on.
