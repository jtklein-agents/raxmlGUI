# Release job and notarizing on electron-builder 26

Ticket: #359. Question: what `samuelmeuli/action-electron-builder@v1` does in
`.github/workflows/build.yaml`, which plain steps and env vars reproduce it on
electron-builder 26 with tag-only release, and whether built-in `mac.notarize`
can keep the Developer ID + team `9VR92ZCXA8` guard from `scripts/notarize.js`.

Sources read (all primary):

- [AEB] `samuelmeuli/action-electron-builder` at tag `v1` (commit `92327c6`):
  `action.yml`, `index.js`.
- [EB26] `electron-userland/electron-builder` at tag `electron-builder@26.18.1`
  (latest 26.x on 2026-11-24): `packages/app-builder-lib/src/macPackager.ts`,
  `mac/MacTargetHelper.ts`, `options/macOptions.ts`, `codeSign/macCodeSign.ts`,
  `codeSign/codesign.ts`, `platformPackager.ts`, `publish/PublishManager.ts`,
  `packages/electron-publish/src/publisher.ts`, `gitHubPublisher.ts`,
  `packages/app-builder-lib/package.json`.
- [EB24] same repo at tag `v24.13.3` (the version in `yarn.lock` today):
  `PublishManager.ts`, `macPackager.ts`.
- [NOT] `@electron/notarize` 3.1.2 as installed: `lib/check-signature.js`,
  `lib/validate-args.js`.
- This repo: `.github/workflows/build.yaml`, `scripts/notarize.js`,
  `package.json` `build` block.

## 1. What the action does

From [AEB] `index.js` `runAction()`:

1. Picks the platform from `process.platform` (`mac` / `windows` / `linux`).
2. Uses npm if `package-lock.json` exists, else Yarn. This repo has only
   `yarn.lock`, so Yarn.
3. `GH_TOKEN = inputs.github_token`.
4. On macOS only: `CSC_LINK = mac_certs`, `CSC_KEY_PASSWORD = mac_certs_password`.
   On Windows: the same two vars from `windows_certs*` (not set in this repo, so
   Windows gets nothing). Linux gets neither. `setEnv` skips empty values.
5. `ADBLOCK=true`, then runs `yarn` (a second install; the workflow already ran
   one).
6. Runs `yarn run build` if the script exists (`build` is the default
   `build_script_name`; here it is `electron-vite build`).
7. Runs `yarn run electron-builder --<platform> [--publish always] <args>`.
   `--publish always` is appended only when `release` is `"true"`; otherwise
   **no `--publish` flag at all**. `max_attempts` defaults to 1.

`action.yml` declares `runs.using: node12`. Node 12 is long past end of life;
GitHub runs such actions on a newer Node it forces. (Not verified against a
GitHub changelog for this note.)

The workflow sets `release: ${{ startsWith(github.ref, 'refs/tags/v') }}` and
passes `APPLEID`, `APPLEIDPASS`, `APPLEIDTEAM` and four `SENTRY_*` vars as step
`env`. The action itself does nothing with the notarize or Sentry vars; they
reach electron-builder (and so the `afterSign` hook) by inheritance.

## 2. Publish decision: a trap when there is no `--publish` flag

[EB26] `PublishManager` constructor, when `publish` is undefined and the build
is not a PR:

- `npm_lifecycle_event === "release"` → `always`;
- else a CI tag is present → `onTag`;
- else `isCI` → `onTagOrDraft`.

Each branch logs "Implicit publishing … will be disabled in electron-builder
v27. Please use --publish explicitly." `getCiTag()` ([EB26] `publisher.ts`)
reads `GITHUB_REF_NAME` when `GITHUB_REF_TYPE === "tag"`.

`onTagOrDraft` skips non-tag uploads for every provider **except `github`
and `bitbucket`** (`PublishManager.ts` line ~177). With `GH_TOKEN` set the
provider resolves to `github`, and [EB26] `gitHubPublisher.ts` defaults
`releaseType` to `"draft"` and creates a draft release for `v<version>` if none
exists. [EB24] has the same `onTagOrDraft` inference (`PublishManager.ts`
lines 77–86, 166).

Consequence: because the action omits `--publish` on non-tag builds, **every
branch push today can upload artifacts to a draft GitHub release** for the
current `package.json` version. A plain-step replacement must pass
`--publish never` explicitly on non-tag builds to be truly tag-only.

On tags, `--publish always` with the default draft type finds or creates the
draft `v<version>` release; `version` must not start with `v` (the publisher
throws).

## 3. Signing inputs on electron-builder 26

- `CSC_LINK` accepts an `https://` URL, a base64 string, or a file path
  ([EB26] `codeSign/codesign.ts` `importCertificate`). The existing
  `secrets.mac_certs` (base64 .p12) works unchanged.
- `CSC_KEY_PASSWORD` is the .p12 password. `CSC_NAME` can name the identity;
  `mac.identity` in config takes precedence (`macCodeSign.ts` line ~329).
- Signing is skipped on non-macOS hosts and on PR builds unless
  `CSC_FOR_PULL_REQUEST=true` (`isSignAllowed`).
- Distribution mac builds look for `Developer ID Application` certs only
  (`MacTargetHelper.getCertificateTypes`). **But** if none is found and
  `mac.type` is not set to `"distribution"`, `findSigningIdentity` falls back
  to a `Mac Developer` cert with a warning (line ~44). If still nothing is
  found, `reportError` only warns and the build continues unsigned, unless
  `forceCodeSigning` is true (then it throws).
- `platformPackager.doSignAfterPack`: when signing did not happen, the
  `afterSign` hook is **skipped** with a warning. So today a tag build whose
  cert import silently failed would ship an unsigned, un-notarized mac app and
  the guard in `scripts/notarize.js` would never run.

## 4. Built-in notarize vs. the `afterSign` hook

[EB26] `MacPackager.sign()` calls `helper.notarizeIfProvided(appPath)` right
after `doSign`, inside `signApp`. `afterSign` runs after `signApp` returns. So
built-in notarize happens **before** any `afterSign` hook; an `afterSign`
guard cannot gate it.

`notarizeIfProvided` ([EB26] `mac/MacTargetHelper.ts`):

- `mac.notarize === false` → skip.
- Otherwise build options from env, first match wins:
  `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID` (throws if
  only some are set); `APPLE_API_KEY` + `APPLE_API_KEY_ID` +
  `APPLE_API_ISSUER`; `APPLE_KEYCHAIN_PROFILE` (+ `APPLE_KEYCHAIN`).
- No env → warn and skip. Then calls `@electron/notarize` (pinned 2.5.0 in
  [EB26] `app-builder-lib/package.json`) with `tool: "notarytool"`.
- `mac.notarize` is now just `boolean` (`options/macOptions.ts`); there is no
  options object, no team check, and no identity check. The docs comment
  recommends the API-key option for security (issue #7859).

[NOT] `checkSignatures` runs `codesign -vvv --deep --strict` and
`codesign -dv`, and fails only if the signature is invalid. It does not check
`Authority` or `TeamIdentifier`. `validate-args` only requires `teamId` to be
present.

So built-in notarize **cannot** reproduce the guard in `scripts/notarize.js`:

| Guard in the hook | Built-in on EB26 |
|---|---|
| `APPLEIDTEAM === 9VR92ZCXA8` else throw | no; any `APPLE_TEAM_ID` is passed through |
| app `Authority=Developer ID Application` | partly: `mac.identity` + distribution cert types restrict the signer, but a `Mac Developer` fallback exists unless `mac.type: "distribution"` |
| app `TeamIdentifier=9VR92ZCXA8` | no post-sign check |
| skip with a message when creds are missing | yes (warn and skip) |

The closest config-only approximation is `mac.identity: "Johannes Klein
(9VR92ZCXA8)"` (substring match on the `security find-identity` line) +
`mac.type: "distribution"` + `forceCodeSigning: true`. That constrains which
cert signs, but nothing verifies the team on the signed bundle or the team ID
sent to Apple. The hard requirement therefore means **the `afterSign` hook
stays**.

Interaction to watch: the hook reads `APPLEID` / `APPLEIDPASS` / `APPLEIDTEAM`,
which EB26 ignores. If anyone renames them to `APPLE_ID` /
`APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID`, EB26 would notarize once
built-in (unguarded) and again in the hook. Set `mac.notarize: false` in
`package.json` so only the hook notarizes, whatever the env names. (EB24 has
the same env-driven `notarizeIfProvided`, `macPackager.ts` line ~499, so this
is not new, just unguarded today.)

The hook imports `@electron/notarize` from the repo root (3.1.2, ESM-only,
loaded via `await import`), independent of the 2.5.0 copy EB26 bundles.

## 5. Plain steps that reproduce the action, tag-only

Replaces the `Build/release Electron app` step; the earlier `yarn` and
`download-binaries` steps stay.

```yaml
      - name: Build renderer/main
        run: yarn build

      - name: Package (publish only on v* tags)
        shell: bash
        run: >
          yarn electron-builder
          --${{ runner.os == 'macOS' && 'mac' || runner.os == 'Windows' && 'win' || 'linux' }}
          --publish ${{ startsWith(github.ref, 'refs/tags/v') && 'always' || 'never' }}
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # mac only, like the action; an empty value must not reach Windows signing
          CSC_LINK: ${{ runner.os == 'macOS' && secrets.mac_certs || '' }}
          CSC_KEY_PASSWORD: ${{ runner.os == 'macOS' && secrets.mac_certs_password || '' }}
          APPLEID: ${{ secrets.apple_id }}
          APPLEIDPASS: ${{ secrets.apple_id_pass }}
          APPLEIDTEAM: ${{ secrets.apple_id_team }}
          SENTRY_URL: ${{ secrets.sentry_url }}
          SENTRY_ORG: ${{ secrets.sentry_org }}
          SENTRY_PROJECT: ${{ secrets.sentry_project }}
          SENTRY_AUTH_TOKEN: ${{ secrets.sentry_auth_token }}
```

Plus, in `package.json` `build`:

- `mac.notarize: false` (only the hook notarizes);
- `mac.type: "distribution"` (no `Mac Developer` fallback).

And on mac tag builds, `-c.forceCodeSigning=true` (or a top-level
`forceCodeSigning` if every platform is signed) so a missing cert fails the
release instead of silently skipping signing and the `afterSign` guard.
Leaving it off branch builds keeps fork/branch CI green without secrets.

Dropped from the action on purpose: the second `yarn` install, `ADBLOCK`,
`max_attempts` retries.

Not verified here, check in the first CI run:

- that an empty `CSC_LINK` on Windows/Linux is treated as unset;
- that `GITHUB_TOKEN` has `contents: write` (the workflow has no
  `permissions:` block, so it depends on the repo default);
- the `Implicit publishing` warning no longer appears in logs.
