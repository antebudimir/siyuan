> **⚠️ Fork Notice**: This is a fork of the original [SiYuan](https://github.com/siyuan-note/siyuan) project, not affiliated with or endorsed by the SiYuan team. I created this fork primarily to unlock third-party sync (S3/WebDAV) so it works fully without a paid subscription or an official SiYuan account Storage is my baggage. I also cleaned up the UI accordingly ("Account & Sync" tab is now just "Sync", subscription prompts are gone, and the in-app updater points at this fork's releases). For self-hosted use, I've made fully local AI/OCR configuration, and optional OIDC access authentication. I'll try to keep this fork in sync with the original repo and continue implementing feats I find useful for my self-hosted setup, but for full support and the most up-to-date version, please use the original repo. All credit for the core app belongs to the upstream devs. licensed under AGPL-3.0, same as upstream. Bear in mind that fficial cloud feats (AI trial, cloud assets, ld246 publish) still require a real SiYuan account, as they're hosted on upstream's servers.

<p align="center">
<img alt="SiYuan" src="https://b3log.org/images/brand/siyuan-128.png">
<br>
<em>From thought to insight, with agents</em>
<br><br>
<a title="Build Status" target="_blank" href="https://github.com/antebudimir/siyuan/actions/workflows/fork-ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/antebudimir/siyuan/fork-ci.yml?style=flat-square"></a>
<a title="Releases" target="_blank" href="https://github.com/antebudimir/siyuan/releases"><img src="https://img.shields.io/github/release/antebudimir/siyuan.svg?style=flat-square&color=9CF"></a>
<a title="Downloads" target="_blank" href="https://github.com/antebudimir/siyuan/releases"><img src="https://img.shields.io/github/downloads/antebudimir/siyuan/total.svg?style=flat-square&color=blueviolet"></a>
<br>
<a title="Docker Pulls" target="_blank" href="https://github.com/antebudimir/siyuan/pkgs/container/siyuan-fork"><img src="https://img.shields.io/badge/dynamic/json?logo=docker&url=https://ghcr.io/v2/antebudimir/siyuan-fork/tags/list&query=$.tags[0]&label=pulls&style=flat-square&color=green"></a>
<a title="AGPLv3" target="_blank" href="https://www.gnu.org/licenses/agpl-3.0.txt"><img src="http://img.shields.io/badge/license-AGPLv3-orange.svg?style=flat-square"></a>
</p>

<p align="center">
<b>English</b>
</p>

## 🔐 Authentication

This fork requires no account for sync, but **local auth is mandatory** if exposed to network. SiYuan's built-in auth mechanisms are used:

- **Access auth code (Recommended):** Start the kernel with `--accessAuthCode <secret>` or set it in Settings -> Authentication. **Always set this on a network-reachable instance.** Without it, anyone who can reach the port can read your notes.
- **OIDC:** Configure against your self-hosted IdP (Authelia/Authentik/Keycloak) in Settings -> Authentication.
- **Lock screen:** Ctrl+Lock, plus auto-lock timeout.

---

## Table of Contents

- [🔐 Authentication](#-authentication)
- [💡 Introduction](#-introduction)
- [🔮 Features](#-features)
- [🏗️ Architecture and Ecosystem](#️-architecture-and-ecosystem)
- [🗺️ Roadmap](#️-roadmap)
- [🚀 Download Setup](#-download-setup)
  - [Installation Package](#installation-package)
  - [Docker Hosting](#docker-hosting)
- [⌨️ Command-line Interface](#️-command-line-interface)
- [🏘️ Community](#️-community)
- [🛠️ Development Guide](#️-development-guide)
- [❓ FAQ](#-faq)
- [🙏 Acknowledgement](#-acknowledgement)

---

## 💡 Introduction

SiYuan is a privacy-first personal knowledge management system, supporting fine-grained block-level reference and Markdown
WYSIWYG.

![feature0.png](screenshots/feature0.png)

![feature5-1.png](screenshots/feature5-1.png)

To learn more, read the [online user guide](https://siyuan-en.b3log.org/) or join the [SiYuan English Discussion Forum](https://liuyun.io).

## 🔮 Features

Most features are free, even for commercial use.

- Content block
  - Block-level reference and two-way links
  - Custom attributes
  - SQL query embed
  - Protocol `siyuan://`
- Editor
  - Block-style
  - Markdown WYSIWYG
  - List outline
  - Block zoom-in
  - Million-word large document editing
  - Mathematical formulas, charts, flowcharts, Gantt charts, timing charts, staves, etc.
  - Web clipping
  - PDF Annotation link
- Export
  - Block ref and embed
  - Standard Markdown with assets
  - PDF, Word and HTML
  - Copy to WeChat MP, Zhihu and Yuque
- Database
  - Table view
- Flashcard spaced repetition
- AI writing and Q/A chat via OpenAI API
- Tesseract OCR
- Multi-tab, drag and drop to split screen
- Template snippet
- JavaScript/CSS snippet
- Android/iOS/HarmonyOS App
- Docker deployment
- [API](https://github.com/siyuan-note/siyuan/blob/master/docs/API.md)
- Community marketplace

## 🏗️ Architecture and Ecosystem

| Project                                                  | Description           |
|----------------------------------------------------------|-----------------------|
| [lute](https://github.com/88250/lute)                    | Editor engine         |
| [chrome](https://github.com/siyuan-note/siyuan-chrome)   | Chrome/Edge extension |
| [bazaar](https://github.com/siyuan-note/bazaar)          | Community marketplace |
| [dejavu](https://github.com/siyuan-note/dejavu)          | Data repo             |
| [petal](https://github.com/siyuan-note/petal)            | Plugin API            |
| [android](https://github.com/antebudimir/siyuan-android) | Android App (Fork)    |
| [ios](https://github.com/siyuan-note/siyuan-ios)         | iOS App               |
| [harmony](https://github.com/siyuan-note/siyuan-harmony) | HarmonyOS App         |
| [riff](https://github.com/siyuan-note/riff)              | Spaced repetition     |

## 🗺️ Roadmap

- [SiYuan development plan and progress](https://github.com/orgs/siyuan-note/projects/1)
- [SiYuan changelog](CHANGELOG.md)

## 🚀 Download Setup

### Installation Package

- [GitHub Releases](https://github.com/antebudimir/siyuan/releases)

### Docker Hosting

<details>
<summary>Docker Deployment</summary>

#### Overview

The easiest way to serve SiYuan on a server is to deploy it through Docker.

- Image name `ghcr.io/antebudimir/siyuan-fork`

#### File structure

The overall program is located under `/opt/siyuan/`, which is basically the structure under the resources folder of the Electron installation package:

- appearance: icon, theme, languages
- guide: user guide document
- stage: interface and static resources
- kernel: kernel program

#### Entrypoint

The entry point is set when building the Docker image: `ENTRYPOINT ["/opt/siyuan/entrypoint.sh"]`. This script allows changing the `PUID` and `PGID` of the user that will run inside the container. This is especially relevant to solve permission issues when mounting directories from the host. The `PUID` (User ID) and `PGID` (Group ID) can be passed as environment variables, making it easier to ensure correct permissions when accessing host-mounted directories.

Use the following parameters when running the container with `docker run ghcr.io/antebudimir/siyuan-fork`:

> **Note:** Since v3.7.0, the `serve` subcommand must be passed explicitly. Run `docker run --rm ghcr.io/antebudimir/siyuan-fork serve --help` to see all serving options.

- `--workspace`: Specifies the workspace folder path, mounted to the container via `-v` on the host
- `--accessAuthCode`: Specifies the lock screen password

More parameters can be found using `--help`. Here’s an example of a startup command with the new environment variables:

```bash
docker run -d \
  -v workspace_dir_host:workspace_dir_container \
  -p 6806:6806 \
  -e PUID=1001 -e PGID=1002 \
  ghcr.io/antebudimir/siyuan-fork \
  serve \
  --workspace=workspace_dir_container \
  --accessAuthCode=xxx
```

- `PUID`: Custom user ID (optional, defaults to `1000` if not provided)
- `PGID`: Custom group ID (optional, defaults to `1000` if not provided)
- `workspace_dir_host`: The workspace folder path on the host
- `workspace_dir_container`: The path of the workspace folder in the container, as specified in `--workspace`
  - Alternatively, it's possible to set the path via the `SIYUAN_WORKSPACE_PATH` env variable. The commandline will always have the priority, if both are set
- `accessAuthCode`: Lock screen password (please **be sure to modify**, otherwise anyone can access your data)
  - Alternatively, it's possible to set the lock screen password via the `SIYUAN_ACCESS_AUTH_CODE` env variable. The commandline will always have the priority, if both are set
  - To disable the lock screen password set the env variable `SIYUAN_ACCESS_AUTH_CODE_BYPASS=true`
- OIDC can replace the lock screen password as the required Docker access authentication. Set `SIYUAN_OIDC_ENABLED=true`, `SIYUAN_OIDC_PROVIDER` (`custom`, `google`, `microsoft`, or `github`), `SIYUAN_OIDC_CLIENT_ID`, and the provider-specific values below. GitHub uses its OAuth 2.0 user API adapter; the other providers use OpenID Connect discovery and ID Token validation. An invalid enabled configuration stops Docker startup when no lock screen password is available
  - `SIYUAN_OIDC_ISSUER_URL`: Issuer URL required by the `custom` and `microsoft` providers; Microsoft must use a tenant-specific issuer such as `https://login.microsoftonline.com/<tenant-id>/v2.0`
  - `SIYUAN_OIDC_CLIENT_SECRET`: Optional client secret for OpenID Connect providers; required by the GitHub OAuth adapter. Every authorization-code flow also uses PKCE
  - `SIYUAN_OIDC_SCOPES`: Comma- or space-separated scopes; `openid` is always included
  - `SIYUAN_OIDC_REDIRECT_URL`: Public HTTPS callback URL ending in `/api/system/oidc/callback`, required for remote browser access
  - `SIYUAN_OIDC_ALLOW_ALL`: Explicitly grant SiYuan administrator access to every identity authenticated by the provider
  - `SIYUAN_OIDC_CLAIM_RULES`: JSON array of claim rules used when allow-all is disabled, for example `[{"claim":"email","operator":"equals","values":["user@example.com"]},{"claim":"email_verified","operator":"equals","values":["true"]}]`; values within a rule use OR, while rules use AND
  - Native mobile apps use the fixed callback URI `siyuan:/oidc-callback`; register it exactly as written. Mobile configuration verification uses this callback before saving. Custom providers, Microsoft, and GitHub can be used only when their application registration accepts this callback URI. Google does not accept this private-use URI for its Android client type, so Google login is limited to browser and desktop flows
- `SIYUAN_LANG`: Interface language (optional, defaults to `en` if unset in Docker). Accepts BCP 47 tags like `zh-CN`/`zh-TW`/`en`/`ja`/`pt-BR`; legacy underscore values like `zh_CN`/`en_US` are also accepted for backward compatibility. Omit it if you want the language chosen in **Settings** to persist across restarts; if set, it is applied on every startup and overrides the saved setting
  - Alternatively, use the `--lang` command-line parameter. If both are set, the command-line takes priority

To simplify things, it is recommended to configure the workspace folder path to be consistent on the host and container, such as having both `workspace_dir_host` and `workspace_dir_container` configured as `/siyuan/workspace`. The corresponding startup command would be:

```bash
docker run -d \
  -v /siyuan/workspace:/siyuan/workspace \
  -p 6806:6806 \
  -e PUID=1001 -e PGID=1002 \
  ghcr.io/antebudimir/siyuan-fork \
  serve \
  --workspace=/siyuan/workspace/ \
  --accessAuthCode=xxx
```

#### Docker Compose

For users running SiYuan with Docker Compose, the environment variables `PUID` and `PGID` can be passed to customize the user and group IDs. Here's an example of a Docker Compose configuration:

```yaml
version: "3.9"
services:
  main:
    image: ghcr.io/antebudimir/siyuan-fork
    command: ['serve', '--workspace=/siyuan/workspace/', '--accessAuthCode=${AuthCode}']
    ports:
      - 6806:6806
    volumes:
      - /siyuan/workspace:/siyuan/workspace
    restart: unless-stopped
    environment:
      - TZ=${YOUR_TIME_ZONE}    # A list of time zone identifiers can be found at https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
      - PUID=${YOUR_USER_PUID}  # Customize user ID
      - PGID=${YOUR_USER_PGID}  # Customize group ID
```

#### User Permissions

In the image, the `entrypoint.sh` script ensures the creation of the `siyuan` user and group with the specified `PUID` and `PGID`. Therefore, when the host creates a workspace folder, pay attention to setting the user and group ownership of the folder to match the `PUID` and `PGID` you plan to use. For example:

```bash
chown -R 1001:1002 /siyuan/workspace
```

#### Hidden port

Use an NGINX reverse proxy to hide port 6806. Please note:

- Configure the WebSocket reverse proxy for `/ws`
- Preserve the original `Host` header, including the port, for both regular requests and `/ws`. In NGINX, configure `proxy_set_header Host $http_host;` in both proxy locations. Using `$host` drops non-standard ports (such as `8443`), which can cause Origin validation to fail, leaving the page stuck on the logo with repeated reloads, API responses of `401`, or failed WebSocket connections

#### Note

- Be sure to confirm the correctness of the mounted volume, otherwise the data will be lost after the container is deleted
- Do not use URL rewriting for redirection, otherwise there may be problems with authentication, it is recommended to configure a reverse proxy
- If you encounter permission issues, verify that the `PUID` and `PGID` environment variables match the ownership of the mounted directories on your host system

#### Limitations

- Does not support desktop and mobile application connections, only supports use on browsers
- Export to PDF, HTML and Word formats is not supported
- Import Markdown file is not supported

</details>

## ⌨️ Command-line Interface

The built-in CLI provides direct access to workspace data — no running server required.

### Quick Start

```bash
# List all notebooks
siyuan notebook list -w ~/SiYuan

# Full-text search with JSON output
siyuan search "keyword" -w ~/SiYuan -f json

# Search inside asset files (PDF/Word/Excel/txt etc.)
siyuan search "phrase" --asset -w ~/SiYuan
siyuan search "phrase" --asset --ext pdf --ext docx -w ~/SiYuan

# Export a document as Markdown
siyuan export md --id <block-id> -w ~/SiYuan
```

### Available Commands

| Category | Commands |
| ---------- | ---------- |
| Notebooks & Documents | `notebook`, `document`, `dailynote` — CRUD and daily notes |
| Content | `block`, `attr`, `outline` — block read/write, attributes, outline |
| Metadata | `tag`, `bookmark`, `template` — tags, bookmarks, template snippets |
| Queries | `search`, `sql` — full-text, semantic, asset-content, and SQL queries |
| References | `ref` — backlinks and mentions |
| Import/Export | `export`, `import`, `inbox` — Markdown, HTML, preview, Word, .sy.zip, Data, cloud inbox |
| Data Management | `repo`, `history`, `sync` — snapshots, versions, cloud sync |
| Utilities | `asset`, `file` — resources and file system |
| Database | `database` — attribute view management |
| Server | `serve` — start the kernel HTTP server |
| Workspace & System | `workspace`, `system` — list, inspect, system info |

Run `siyuan --help` for the full command tree. Use `-f json` (default is `-f table`) for script-friendly output. Most mutating commands also support `--dry-run` to preview changes without applying them.

### Installation

The CLI binary is `<install-dir>/resources/kernel/SiYuan-Kernel`, invoked via the `siyuan` command.

- **macOS**: create a symlink after installing:

  ```bash
  ln -s /Applications/SiYuan.app/Contents/Resources/kernel/SiYuan-Kernel /usr/local/bin/siyuan
  ```

- **Linux**: create a symlink after installing:

  ```bash
  ln -s <install-dir>/resources/kernel/SiYuan-Kernel /usr/local/bin/siyuan
  ```

## 🏘️ Community

- [English Discussion Forum](https://liuyun.io)
- [User community summary](https://liuyun.io/article/1687779743723)
- [Awesome SiYuan](https://github.com/siyuan-note/awesome)

## 🛠️ Development Guide

See [Development Guide](https://github.com/siyuan-note/siyuan/blob/master/.github/CONTRIBUTING.md).

### Building from Source

#### Kernel

```bash
cd kernel
go build -tags fts5 -o siyuan-kernel
```

#### Frontend

```bash
cd app
pnpm install
pnpm build
```

#### Running Locally

When running the kernel locally from the source directory, you must pass the working directory so it can find the appearance/langs:

```bash
./siyuan-kernel serve --wd /path/to/siyuan/app --workspace /path/to/workspace --accessAuthCode YOUR_SECRET_CODE
```

## ❓ FAQ

### How does SiYuan store data?

The data is saved in the workspace data folder:

- `assets` is used to save all inserted assets
- `emojis` is used to save emoji images
- `snippets` is used to save code snippets
- `storage` is used to save query conditions, layouts and flashcards, etc.
- `templates` is used to save template snippets
- `widgets` is used to save widgets
- `plugins` is used to save plugins
- `public` is used to save public data
- The rest of the folders are the notebook folders created by the user, files with the suffix of `.sy` in the notebook folder are used to save the document data, and the data format is JSON

### Does it support data synchronization through a third-party sync disk?

Data synchronization through third-party synchronization disks is not supported, otherwise data may be corrupted.

Although it does not support third-party sync disks, it supports connecting with third-party cloud storage. In this fork, S3 and WebDAV sync are fully unlocked without a subscription.

### Is SiYuan open source?

SiYuan is completely open source, and contributions are welcome:

- [User Interface and Kernel](https://github.com/antebudimir/siyuan)
- [Android](https://github.com/antebudimir/siyuan-android)
- [iOS](https://github.com/siyuan-note/siyuan-ios)
- [HarmonyOS](https://github.com/siyuan-note/siyuan-harmony)
- [Chrome Clipping Extension](https://github.com/siyuan-note/siyuan-chrome)

For more details, please refer to [Development Guide](https://github.com/siyuan-note/siyuan/blob/master/.github/CONTRIBUTING.md).

### How to upgrade to a new version?

- If it is installed with the desktop installation package on Windows or macOS, you can enable the option of <kbd>Settings</kbd> - <kbd>About</kbd> - <kbd>Automatically download update installation package</kbd>, so that SiYuan will automatically download the latest version of the installation package and prompt to install
- If it is installed by manual installation package, please download the installation package again to install

You can <kbd>Check update</kbd> in <kbd>Settings</kbd> - <kbd>About</kbd> - <kbd>Current Version</kbd>, or pay attention to [GitHub Releases](https://github.com/antebudimir/siyuan/releases) to get the new version. The updater in this fork checks this fork's releases.

### What if some blocks (such as paragraph blocks in list items) cannot find the block icon?

The block icon is omitted for the first sub-block under the list item. You can move the cursor into this block and trigger its block menu with <kbd>Ctrl+/</kbd> .

### What should I do if the data repo key is lost?

- If the data repo key is correctly initialized on multiple devices previously, the key is the same on all devices and can be retrieved in <kbd>Settings</kbd> - <kbd>Sync</kbd> - <kbd>Local Data Repo</kbd> - <kbd>Data repo key</kbd> - <kbd>Copy key string</kbd>
- If it has not been configured correctly before (for example, the keys on multiple devices are inconsistent) or all devices are unavailable and the key string cannot be obtained, you can reset the key by following the steps below:

  1. Manually back up the data, you can use <kbd>Export Data</kbd> or directly copy the <kbd>workspace/data/</kbd> folder on the file system
  2. <kbd>Settings</kbd> - <kbd>Sync</kbd> - <kbd>Local Data Repo</kbd> - <kbd>Data repo key</kbd> - <kbd>Reset data repo</kbd>
  3. Reinitialize the data repo key. After initializing the key on one device, other devices import the key
  4. The cloud uses the new synchronization directory, the old synchronization directory is no longer available and can be deleted
  5. The existing cloud snapshots are no longer available and can be deleted

### Do I need to pay for it?

Most features are free, even for commercial use. In this fork, third-party sync (S3/WebDAV) is completely free and requires no account. Official cloud features (AI trial, cloud assets) still require a paid SiYuan account if you choose to use them.

## 🙏 Acknowledgement

The birth of SiYuan is inseparable from many open source projects and contributors. Please refer to the project source code kernel/go.mod, app/package.json and project homepage.

The growth of SiYuan is inseparable from user feedback and promotion. Thank you, everyone, for your help with SiYuan ❤️

*This fork is based on the work of the [SiYuan contributors](https://github.com/siyuan-note/siyuan/graphs/contributors).*
