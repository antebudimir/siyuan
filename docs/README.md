# Documentation index and writing conventions

## Documentation index

| Document |
|---|
| [Kernel API type contracts](API-CONTRACTS.md) |
| [Theme and icon synchronization](APPEARANCE-SYNC.md) |
| [On-demand asset downloads](ASSET-DOWNLOAD.md) |
| [Encrypted notebooks](ENCRYPTED-NOTEBOOK.md) |
| [Document titles and addressing (design draft)](DOCUMENT-ADDRESSING.md) |
| [Pinned documents](PINNED-DOCUMENTS.md) |
| [Tab blocks](TAB-BLOCK.md) |
| [Template manager](TEMPLATE-MANAGER.md) |
| [`.sy` file structure](SY-FORMAT.md) |
| [Workspace file layout](WORKSPACE.md) |

Public API documentation: [English](API.md).

## Documentation conventions

This fork keeps English documentation only. Do not add translated editions of `docs/` files.

## Feature design structure

Theme and icon synchronization, on-demand assets, encrypted notebooks, pinned documents, tab blocks, and template management use these second-level sections. Place topic-specific details under third-level headings within the appropriate section.

| Section | Content |
|---|---|
| Feature scope | Purpose, supported platforms, prerequisites, and unsupported use cases |
| User interaction | Entry points, operation results, state changes, and user-visible failures |
| Data and storage | Data model, persistence paths, identifiers, sync scope, and local state |
| Implementation and interfaces | Implementation rules, key entry points, permissions, concurrency, and API behavior |
| Compatibility and recovery | Existing-data support, version rules, failure preservation, interruption recovery, and security boundaries |
| Verification | Required checks for normal, error, concurrent, cross-platform, and existing-data scenarios |

API contract maintenance, file formats, and workspace layout are maintenance specifications or reference manuals. Therefore, organize them by topic rather than imposing the feature design structure.

## Style and formatting

Describe existing behavior objectively. Use “must” and “must not” for requirements, distinguishing supported behavior, limitations, and verification requirements. Avoid review history, staged progress reports, promotional conclusions, and repeated emphasis. State the scope of counts, versions, and performance values; refer to source code for API coverage that it determines directly.

Use code formatting for identifiers, fields, paths, and commands; tables for operation comparisons; and numbered lists for ordered steps. Separate UI navigation levels with ` - `. Use punctuation appropriate to each language. Keep each paragraph or list item on a single line without manual wrapping.

Editorial changes must not reduce authenticated-read or recovery guarantees for existing data. For encryption formats, keys, history, and backups, documentation must preserve the compatibility baseline, failure handling, and recovery-material requirements.
