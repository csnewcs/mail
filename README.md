# ✉️ mail

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

The next webmail client

## Live demo

Try it now: https://maildemo.pmh.codes/

The demo runs with preloaded data and resets automatically, so you can explore the full UI without configuring PostgreSQL, mail servers, or authentication.

## Screenshots

> Click to zoom in

![](./docs/view1.png)
![](./docs/view2.png)
![](./docs/compose2.png)
![](./docs/compose1.png)

## Focused on

- Single user only
- Password, passkey, GitHub, Discord, and OpenID Connect authentication
- Simple and Modern design
- Fast, SSR-first

## Inspired by

- [Proton Mail](https://proton.me/mail)
- [Bulwark](https://bulwarkmail.org/)
- [shadcn/ui](https://v3.shadcn.com/examples/mail)

## How to run

> You need running PostgreSQL instance.

Want to try it first without local setup? Use the live demo: https://maildemo.pmh.codes/

1. Clone this repository
2. Copy `.env.example` to `.env` and replace placeholders
3. Run `pnpm i` to download dependencies
4. Run `pnpm dev` to start

## How to deploy

You can use prebuilt container image for deployment.

```sh
docker -itp 3000:3000 --env-file=.env \
  ghcr.io/pmh-only/mail:latest
```

Run the background worker as a separate container. The worker handles IMAP actions,
SMTP sends, and periodic mailbox sync.

```sh
docker run --name worker --env-file=.env \
  ghcr.io/pmh-only/mail:latest node build-worker/worker.js
```

For local container deployment, `docker compose up --build` starts both `web` and
`worker` services. It also publishes port `993` on all host interfaces and transparently
forwards authenticated IMAP connections to the primary IMAP server configured in the app.
Set `IMAP_PUBLIC_PORT` to publish a different port or `IMAP_PUBLIC_CONFIG_ID` to select a
different configured IMAP account. Host firewall and cloud security-group rules must allow
the selected TCP port.

`.env` template is [here](./.env.example)

## Authentication

The app remains single-user. During first-time setup, configure a password, GitHub,
Discord, manual OpenID Connect, or any combination of them. The first successful
external-provider login claims the installation when no password owner was created.
After ownership is established, additional providers must be explicitly linked from Settings.

Register these callback URLs when enabling providers:

- GitHub: `<ORIGIN>/api/auth/callback/github`
- Discord: `<ORIGIN>/api/auth/callback/discord`
- OpenID Connect: `<ORIGIN>/api/auth/oauth2/callback/oidc`

OpenID Connect uses explicit issuer, authorization, token, and user-info URLs. A
discovery URL is not needed. Existing `OIDC_DISCOVERY_URL` deployments remain supported
as a migration fallback, but new installations should use the manual endpoint variables
shown in `.env.example` or the setup UI. Passkeys can be enrolled under Settings after
the first sign-in. Authenticated users can also explicitly link a configured external
provider from Settings, including providers that use a different account email.
Authentication credentials and provider endpoints are intentionally excluded from settings backups.

## Secret storage

Set `MAIL_SECRET_KEY` in both the web and worker environments to encrypt mail passwords
and authentication provider client secrets saved from the settings UI. Existing plaintext
database secrets remain readable without the key, and migrate to `enc:v1` encrypted values
after the key is configured and settings are loaded.

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://lth.so"><img src="https://avatars.githubusercontent.com/u/44047052?v=4?s=100" width="100px;" alt="Taehyun Lim"/><br /><sub><b>Taehyun Lim</b></sub></a><br /><a href="https://github.com/pmh-only/mail/commits?author=noeulnight" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://csnewcs.dev"><img src="https://avatars.githubusercontent.com/u/43161373?v=4?s=100" width="100px;" alt="Jae-Hyeon Bae"/><br /><sub><b>Jae-Hyeon Bae</b></sub></a><br /><a href="https://github.com/pmh-only/mail/commits?author=csnewcs" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## License / Contribution Rules

This is a copyleft software. and there's no rules for contribution.
