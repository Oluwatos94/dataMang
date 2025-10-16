# Popup UI Structure

## 📁 Professional Architecture

```
src/popup/
├── popup.tsx                 # Entry point (bootstrap only)
├── App.tsx                   # Main application component
├── types/
│   └── index.ts             # Shared TypeScript types
├── hooks/                   # Custom React hooks
│   ├── useIdentity.ts       # Identity management hook
│   ├── useDocuments.ts      # Document CRUD operations hook
│   └── usePermissions.ts    # Permissions management hook
└── components/
    ├── Header.tsx           # Application header
    ├── Navigation.tsx       # Tab navigation
    ├── common/              # Reusable UI components
    │   ├── LoadingSpinner.tsx
    │   ├── ErrorBanner.tsx
    │   └── EmptyState.tsx
    ├── documents/           # Document management features
    │   ├── DocumentsView.tsx
    │   ├── DocumentItem.tsx
    │   └── CreateDocumentForm.tsx
    ├── permissions/         # Permission management features
    │   ├── PermissionsView.tsx
    │   ├── PermissionItem.tsx
    │   └── PermissionRequestItem.tsx
    ├── identity/            # Identity display features
    │   └── IdentityView.tsx
    └── settings/            # Settings features
        └── SettingsView.tsx
```

## 🎯 Design Principles

### 1. **Separation of Concerns**
- **Entry Point** (`popup.tsx`): Minimal bootstrap code
- **App Component** (`App.tsx`): Main logic and routing
- **Feature Modules**: Grouped by domain (documents, permissions, identity, settings)

### 2. **Custom Hooks Pattern**
- **useIdentity**: Manages user identity state and operations
- **useDocuments**: Handles document CRUD operations
- **usePermissions**: Manages permissions and requests

### 3. **Component Organization**
- **Common**: Reusable UI components (LoadingSpinner, ErrorBanner, EmptyState)
- **Feature-Specific**: Components grouped by feature domain
- **Single Responsibility**: Each component has one clear purpose

### 4. **Type Safety**
- Centralized types in `types/index.ts`
- Proper TypeScript interfaces for all props
- Type imports for better tree-shaking

## 🚀 Benefits

1. **Maintainability**: Easy to locate and update specific features
2. **Scalability**: Simple to add new features without conflicts
3. **Reusability**: Common components can be used across views
4. **Testing**: Each component/hook can be tested independently
5. **Code Review**: Clear structure makes reviews easier
6. **Onboarding**: New developers can quickly understand the codebase

## 📦 Build Output

- **Development**: ~950KB with source maps
- **Production**: Optimized and minified
- **Modules**: 32 properly organized modules

## 🔄 Data Flow

1. **Hooks** fetch data from utility managers
2. **App** component orchestrates state
3. **View Components** receive data via props
4. **Common Components** provide reusable UI elements

This structure follows React best practices and enterprise-grade patterns.
