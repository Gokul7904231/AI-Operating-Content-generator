# ShortFactory OS — Open Knowledge Format (OKF)
## Operational Memory & System Index

Welcome to the ShortFactory AI Memory Layer. This directory serves as the structured, AI-readable operational context for all agents.

### Directory Structure

- **[`index.md`](file:///c:/Users/ASUS/OneDrive/Desktop/123/aishorts/apps/web/.okf/index.md)**: This overview.
- **[`architecture.md`](file:///c:/Users/ASUS/OneDrive/Desktop/123/aishorts/apps/web/.okf/architecture.md)**: Full design schematic of the AI Factory OS.
- **[`workflows.md`](file:///c:/Users/ASUS/OneDrive/Desktop/123/aishorts/apps/web/.okf/workflows.md)**: Specifications for the dynamic generation pipelines.
- **[`style-guide.md`](file:///c:/Users/ASUS/OneDrive/Desktop/123/aishorts/apps/web/.okf/style-guide.md)**: Color palettes, UI component structures, typography tokens.
- **[`decisions/001-sqlite-queue-persistence.md`](file:///c:/Users/ASUS/OneDrive/Desktop/123/aishorts/apps/web/.okf/decisions/001-sqlite-queue-persistence.md)**: Architectural Decision Record (ADR) on queue persistence.

---

### System Core State

- **Primary Storage**: Google Drive (with hot-key rotation credentials swap)
- **Primary Publisher**: YouTube Data API (OAuth2 refresh tokens)
- **AI Capabilities Router**: Decoupled routing of SCRIPT / IMAGE / VISION tasks
- **Persistency Queue Engine**: SQLite (WAL mode enabled) + EventBus dispatching
