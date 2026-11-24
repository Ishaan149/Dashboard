# Restrict Firestore sync to the dashboard owner

Use Firebase Authentication with Google sign-in. Allow only the owner's Firebase user ID (UID) to read, create, or update documents in `dashboard`. Keep the existing Firebase project, database, `dashboard/{key}` paths, and `value` payloads so the owner can pick up their existing data on every device. Keep direct document deletion blocked.

This document is an implementation handoff. Start on a branch. The current GitHub Actions workflow publishes the site on pushes to `main`, so treat merging either release and publishing Firestore rules as production actions for an authorized operator.

## 1. Prepare the owner account and rule

- Confirm the production project and database in Firebase Console. Record the active rules and check for any overlapping `allow` clauses that also cover `dashboard`. If the database serves other applications, preserve their unrelated rules.
- In Firebase Authentication, enable the Google provider and authorize the GitHub Pages hostname `ishaan149.github.io` under **Settings → Authorized domains**. Take the UID from the owner's entry under **Authentication → Users**. If the owner has no entry yet, build the sign-in screen from step 2 first and have the owner sign in through a production-mode preview on an authorized hostname. Leave the UID unset in that preview so it can create the Authentication entry while the private views and Firestore listeners stay closed. Then record the new UID and use it for both the app and the rule. [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin)
- Add the rule below as `firestore.rules`. Keep the marker in source control. Use the synthetic test UID in local renders and the verified owner UID in the production rule. Before publishing, check that the production UID in the rule matches `VITE_DASHBOARD_OWNER_UID` in the GitHub Pages build. If the live rules contain other needed sections, apply this match within them and check for overlapping access. [Firestore rule conditions](https://firebase.google.com/docs/firestore/security/rules-conditions#authentication)

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /dashboard/{document} {
      allow read, create, update: if request.auth != null
        && request.auth.uid == '__DASHBOARD_OWNER_UID__';
      allow delete: if false;
    }
  }
}
```

**Complete when** the authorized operator has the confirmed project, database, and owner UID, and the rules candidate contains a single owner-only access path for these documents. If console MFA blocks access, have the owner restore their console access before the production steps.

## 2. Build the sign-in release

1. In `src/firebase.js`, export `getAuth(app)` using the same Firebase app as Firestore. When `VITE_FIREBASE_EMULATOR=true`, connect Auth to the local Authentication emulator before any sign-in or Auth observer call. Add the Auth emulator on `127.0.0.1:9099` in `firebase.json` and make `scripts/start-firestore-emulator.mjs` start both services. Keep the synthetic project and the existing environment guard. [Authentication emulator](https://firebase.google.com/docs/emulator-suite/connect_auth)
2. In `src/App.jsx`, replace the `dashboard-unlocked` check with an `onAuthStateChanged` observer. Replace `PasswordGate` with a Google sign-in screen using `GoogleAuthProvider` and `signInWithPopup`. Show a loading state while Firebase restores the session and a clear error if sign-in fails. Render dashboard views and their cached data only after `user.uid` matches `VITE_DASHBOARD_OWNER_UID`. A missing UID setting or a different account must leave the dashboard closed. An unauthorized account needs a way to sign out and choose the correct account.
3. In `src/components/Settings.jsx`, change the lock action to **Sign out** and call Firebase `signOut(auth)` through the app. When the owner session ends, unmount the private dashboard, unsubscribe from Firestore, and cancel app-owned debounce timers. Ignore the old `dashboard-unlocked` flag when deciding access. Preserve the existing local cache keys and read them only inside the owner session.
4. In `src/hooks/useSyncedStorage.js`, keep the existing document paths, stored `value` shapes, same-tab updates, and debounced writes. Only enable initial cloud writes after a server-confirmed snapshot in the owner session. Use `includeMetadataChanges: true` so a cached snapshot can become server-confirmed even when its data is identical. Treat a missing document as seedable only after the server confirms it is missing. Permission errors and cache-only snapshots must never trigger a seed or an overwrite. Surface permission errors without suggesting that the edit synced. [Firestore snapshot listeners](https://firebase.google.com/docs/firestore/query-data/listen)
5. Set a GitHub Actions repository variable named `VITE_DASHBOARD_OWNER_UID` and pass it to the Vite build in `.github/workflows/deploy.yml`. Document the same setting in `.env.local.example` and the local setup guide. Remove `VITE_PASSWORD_HASH` from the app and build once the password UI is gone. For this release, retain the existing `_secret` property in Firestore write payloads and retain `VITE_FIRESTORE_SECRET` in the build. The old production rules still require it until step 4.

**Complete when** the owner can sign in and read/save using the current data model, a signed-out or unrelated user mounts no private views or sync listeners, and the old Firestore rules still accept the transitional write format.

## 3. Verify locally before release

- Add a separate `npm run test:rules` command with `@firebase/rules-unit-testing`. Run it against a fresh localhost Firestore emulator with a dedicated `demo-dashboard-rules` project. Load `firestore.rules` with its marker replaced by a synthetic owner UID and seed synthetic data. Keep the regular `npm test` command runnable without an emulator. [Firestore rules tests](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- For browser development, wire both emulators to the same local project and point `firebase.json` at `firestore.rules`. For a full local sign-in smoke test, create the mock Google user in the Auth emulator, copy its UID into the ignored `.env.local`, and use that UID in a temporary local render of the rules. If restarting the emulator suite for that render, export and reimport the local emulator state so the mock account keeps its UID. Keep generated config and data out of Git.
- Run the access matrix against the rules. For denied writes, test the transitional payload shape as well as `{ value }`.

| Client | Read one or list `dashboard` | Create or update | Delete |
| --- | --- | --- | --- |
| Owner UID | Allow | Allow | Deny |
| Unrelated signed-in UID | Deny | Deny | Deny |
| Signed out | Deny | Deny | Deny |

- Update the existing app and sync tests. Cover owner sign-in, signed-out and wrong-account gating even with a stale unlock flag, teardown on sign-out, no write after a permission error or a cache-only missing snapshot, and reading then editing a legacy `{ value, _secret }` document without moving it. In two independent browser profiles, sign in as the same synthetic owner and verify a test edit syncs in both directions.

**Complete when** `npm test`, `npm run test:rules`, and `npm run build` pass, and the two-browser check succeeds against the emulators.

## 4. Roll out to production in order

1. **Deploy the sign-in release.** Coordinate with the owner so open tabs finish syncing before they reload. Verify the deployed sign-in works for the owner on two devices or browser profiles, and that a harmless edit syncs while the existing rules are still in effect. The data remains publicly readable until the next step, so perform these two steps in the same release window.
2. **Publish the owner-only rules.** In Firebase's Rules Playground, simulate access for the owner, another UID, and a signed-out request. Verify the results match the access matrix for the operations available in the simulator. Publish the verified rules for the intended database. After the rules propagate, reload both owner sessions and confirm they can still read and sync a harmless edit. GitHub Pages tabs on the old build need to reload and sign in. [Firebase Rules Playground and propagation](https://firebase.google.com/docs/firestore/security/get-started#test_rules_in_the_firebase_console)
3. **Deploy the cleanup release.** Remove `_secret` from both Firestore write paths in `useSyncedStorage.js`, along with `VITE_FIRESTORE_SECRET` and stale `VITE_PASSWORD_HASH` references in the workflow, env example, and setup docs. Keep reading `value` from existing documents containing `_secret`. Regular writes replace the top-level document and drop the old field in each edited document. Leave bulk rewrites out of this change. Update the sync test to assert that both initial seeds and later updates send `{ value }`, rerun the checks from step 3, then deploy. Retire the obsolete GitHub Actions secrets after confirming the cleanup release.

**Complete when** the deployed rules deny outsiders, the owner's existing data loads in fresh browser profiles, an edit syncs across two owner sessions, and the final build writes `{ value }` without the shared secret. If the cleanup build fails, return to the working sign-in build while keeping the owner-only rules in place. If the owner is blocked after publishing, verify the project, UID, and sign-in configuration before republishing a corrected owner-only rule.
