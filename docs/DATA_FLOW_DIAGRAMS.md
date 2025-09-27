# PDM Data Flow Diagrams

## 🔄 Core Data Flows

### **1. User Onboarding & Identity Setup**

```mermaid
graph TD
    A[User Installs Extension] --> B[First Launch]
    B --> C{Has Nillion Wallet?}
    C -->|No| D[Create Nillion Wallet]
    C -->|Yes| E[Connect Existing Wallet]
    D --> F[Get Testnet NIL Tokens]
    E --> G[Validate Wallet Connection]
    F --> H[Subscribe to nilDB Service]
    G --> H
    H --> I[Store API Key Securely]
    I --> J[Generate DID & Keypair]
    J --> K[Initialize Multi-Node Config]
    K --> L[User Ready to Create Documents]

    style D fill:#ff9999
    style H fill:#ffcc99
    style J fill:#99ff99
    style K fill:#99ccff
```

### **2. Document Creation Flow**

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Popup UI
    participant BG as Background Script
    participant IM as Identity Manager
    participant NM as Nillion Manager
    participant N1 as nilDB Node 1
    participant N2 as nilDB Node 2
    participant N3 as nilDB Node 3

    U->>UI: Create New Document
    UI->>U: Show Document Form
    U->>UI: Enter Name & Content
    UI->>BG: Create Document Request
    BG->>IM: Get User Identity
    IM->>BG: Return DID & Keys
    BG->>BG: Validate Input Data
    BG->>BG: Generate Document ID
    BG->>BG: Encrypt Content (AES-256)
    BG->>NM: Store Document Request
    NM->>NM: Select Optimal Nodes

    par Store to Multiple Nodes
        NM->>N1: Store Primary Copy
        NM->>N2: Store Backup Copy
        NM->>N3: Store Redundant Copy
    end

    N1->>NM: Confirm Storage
    N2->>NM: Confirm Storage
    N3->>NM: Confirm Storage
    NM->>BG: Storage Complete
    BG->>UI: Document Created
    UI->>U: Show Success Message
```

### **3. Permission Grant Flow**

```mermaid
graph TD
    A[Web App Requests Access] --> B[Content Script Receives Request]
    B --> C[Forward to Background Script]
    C --> D[Validate App Origin]
    D --> E{Valid Origin?}
    E -->|No| F[Reject Request]
    E -->|Yes| G[Check Existing Permission]
    G --> H{Permission Exists?}
    H -->|Yes| I[Return Existing Permission]
    H -->|No| J[Show Permission Prompt]
    J --> K[User Reviews Request]
    K --> L{User Decision?}
    L -->|Deny| M[Send Denial Response]
    L -->|Grant| N[Create Permission Record]
    N --> O[Encrypt & Store Permission]
    O --> P[Store Across Multiple Nodes]
    P --> Q[Send Grant Response]
    Q --> R[App Receives Access]

    style F fill:#ff9999
    style M fill:#ff9999
    style R fill:#99ff99
```

### **4. Data Retrieval Flow**

```mermaid
sequenceDiagram
    participant App as Web Application
    participant CS as Content Script
    participant BG as Background Script
    participant PM as Permission Manager
    participant DM as Data Manager
    participant NM as Nillion Manager
    participant Nodes as nilDB Nodes

    App->>CS: Request Document Data
    CS->>BG: Forward Request + Origin
    BG->>PM: Check App Permissions
    PM->>PM: Validate Access Level

    alt Permission Granted
        PM->>BG: Permission Approved
        BG->>DM: Get Document Request
        DM->>NM: Retrieve from Storage
        NM->>Nodes: Query Primary Node

        alt Primary Node Available
            Nodes->>NM: Return Encrypted Data
        else Primary Node Down
            NM->>Nodes: Query Backup Nodes
            Nodes->>NM: Return from Backup
        end

        NM->>DM: Encrypted Document
        DM->>DM: Decrypt Document
        DM->>BG: Decrypted Data
        BG->>CS: Filtered Data (based on permission level)
        CS->>App: Return Requested Data
    else Permission Denied
        PM->>BG: Access Denied
        BG->>CS: Permission Error
        CS->>App: Access Denied Response
    end
```

### **5. Multi-Node Failover Flow**

```mermaid
graph TD
    A[Data Request] --> B[Query Primary Node]
    B --> C{Primary Node Healthy?}
    C -->|Yes| D[Return Data from Primary]
    C -->|No| E[Mark Primary as Down]
    E --> F[Query Backup Node 1]
    F --> G{Backup 1 Healthy?}
    G -->|Yes| H[Return Data from Backup 1]
    G -->|No| I[Mark Backup 1 as Down]
    I --> J[Query Backup Node 2]
    J --> K{Backup 2 Healthy?}
    K -->|Yes| L[Return Data from Backup 2]
    K -->|No| M[All Nodes Down - Error]

    H --> N[Update Node Health Status]
    L --> N
    N --> O[Schedule Health Check]
    O --> P[Attempt Primary Recovery]

    style M fill:#ff9999
    style D fill:#99ff99
    style H fill:#ffcc99
    style L fill:#ffcc99
```

## 🔒 Security Data Flows

### **6. Encryption & Key Management Flow**

```mermaid
graph TD
    A[User Data Input] --> B[Generate Random Salt]
    B --> C[Derive Encryption Key from Master Key]
    C --> D[Encrypt Data with AES-256-GCM]
    D --> E[Generate Data Integrity Hash]
    E --> F[Create Encrypted Package]
    F --> G[Split Package Across Nodes]
    G --> H[Store Metadata Locally]

    I[Data Retrieval Request] --> J[Get Metadata from Local Storage]
    J --> K[Query Nodes for Data Chunks]
    K --> L[Reassemble Encrypted Package]
    L --> M[Verify Integrity Hash]
    M --> N{Hash Valid?}
    N -->|Yes| O[Decrypt with User Key]
    N -->|No| P[Data Corruption Error]
    O --> Q[Return Decrypted Data]

    style P fill:#ff9999
    style Q fill:#99ff99
```

### **7. Permission Validation Flow**

```mermaid
sequenceDiagram
    participant App as Web App
    participant CS as Content Script
    participant BG as Background Script
    participant PM as Permission Manager
    participant Storage as Encrypted Storage

    App->>CS: API Call with Origin
    CS->>BG: Request + App Origin
    BG->>PM: Check Permission(origin, documentId)
    PM->>Storage: Query Permission Record
    Storage->>PM: Encrypted Permission Data
    PM->>PM: Decrypt Permission
    PM->>PM: Validate Expiry & Status

    alt Permission Valid
        PM->>BG: Access Granted + Level
        BG->>BG: Apply Access Level Filter
        Note over BG: Read-only vs Full access
        BG->>CS: Filtered Response
        CS->>App: Authorized Data
    else Permission Invalid/Expired
        PM->>BG: Access Denied + Reason
        BG->>CS: Error Response
        CS->>App: Permission Denied
    end
```

## 🌐 Cross-Component Communication

### **8. Extension Internal Communication Flow**

```mermaid
graph LR
    subgraph "Web Page"
        A[Web App]
    end

    subgraph "Extension"
        B[Content Script]
        C[Background Script]
        D[Popup UI]
        E[Options Page]
    end

    subgraph "Storage"
        F[chrome.storage.local]
        G[Encrypted User Data]
    end

    subgraph "Nillion Network"
        H[nilDB Node 1]
        I[nilDB Node 2]
        J[nilDB Node 3]
    end

    A -.->|postMessage| B
    B <-->|chrome.runtime| C
    C <-->|chrome.storage| F
    C <-->|chrome.storage| G
    D <-->|chrome.runtime| C
    E <-->|chrome.runtime| C
    C <-->|HTTPS API| H
    C <-->|HTTPS API| I
    C <-->|HTTPS API| J
```

### **9. Real-Time Permission Management**

```mermaid
graph TD
    A[Permission Change Event] --> B{Event Type?}
    B -->|Grant| C[Create Permission Record]
    B -->|Revoke| D[Mark Permission as Inactive]
    B -->|Update| E[Modify Permission Settings]

    C --> F[Encrypt Permission Data]
    D --> F
    E --> F

    F --> G[Store Across Multiple Nodes]
    G --> H[Update Local Cache]
    H --> I[Notify All Extension Contexts]

    I --> J[Update Popup UI]
    I --> K[Update Content Scripts]
    I --> L[Log Audit Event]

    L --> M[Store Audit Trail]
    M --> N[Trigger UI Refresh]
```

## 📊 Data Consistency Flows

### **10. Data Synchronization Across Nodes**

```mermaid
sequenceDiagram
    participant Client as PDM Extension
    participant N1 as Primary Node
    participant N2 as Backup Node 1
    participant N3 as Backup Node 2
    participant Sync as Sync Manager

    Client->>N1: Store Document
    N1->>Client: Confirm Primary Storage

    par Async Replication
        Client->>N2: Replicate to Backup 1
        Client->>N3: Replicate to Backup 2
    end

    N2->>Client: Confirm Backup 1
    N3->>Client: Confirm Backup 2

    Note over Sync: Periodic Consistency Check
    Sync->>N1: Get Document Hash
    Sync->>N2: Get Document Hash
    Sync->>N3: Get Document Hash

    alt Hashes Match
        Note over Sync: Data Consistent
    else Hash Mismatch
        Sync->>Sync: Initiate Reconciliation
        Sync->>N1: Get Full Document
        Sync->>N2: Update with Correct Version
        Sync->>N3: Update with Correct Version
    end
```

### **11. Error Handling & Recovery Flow**

```mermaid
graph TD
    A[Operation Request] --> B[Execute Operation]
    B --> C{Success?}
    C -->|Yes| D[Return Success Response]
    C -->|No| E[Determine Error Type]

    E --> F{Error Type?}
    F -->|Network| G[Retry with Exponential Backoff]
    F -->|Node Down| H[Switch to Backup Node]
    F -->|Auth Error| I[Refresh API Key]
    F -->|Data Corruption| J[Attempt Recovery from Backup]
    F -->|Permission Error| K[Show Permission Prompt]

    G --> L{Retry Successful?}
    L -->|Yes| D
    L -->|No| M[Log Error & Notify User]

    H --> N[Update Node Health Status]
    N --> B

    I --> O[Re-authenticate with Nillion]
    O --> B

    J --> P{Recovery Successful?}
    P -->|Yes| D
    P -->|No| M

    K --> Q[Handle User Decision]
    Q --> B

    M --> R[Show User-Friendly Error Message]

    style D fill:#99ff99
    style M fill:#ff9999
    style R fill:#ff9999
```

## 🔄 State Management Flow

### **12. Extension State Synchronization**

```mermaid
stateDiagram-v2
    [*] --> Uninitialized
    Uninitialized --> Initializing: Extension Startup
    Initializing --> WalletSetup: First Time User
    Initializing --> Ready: Existing User

    WalletSetup --> APIKeySetup: Wallet Connected
    APIKeySetup --> NodeConfiguration: API Key Obtained
    NodeConfiguration --> Ready: Nodes Configured

    Ready --> DocumentOperations: User Action
    Ready --> PermissionManagement: App Request
    Ready --> Settings: User Settings

    DocumentOperations --> Ready: Operation Complete
    PermissionManagement --> Ready: Permission Handled
    Settings --> Ready: Settings Saved

    Ready --> Error: Operation Failed
    Error --> Recovery: Retry/Fallback
    Recovery --> Ready: Recovery Successful
    Recovery --> Error: Recovery Failed

    Ready --> Offline: Network Lost
    Offline --> Ready: Network Restored
```

---

## 📋 Implementation Notes

### **Key Design Principles:**
1. **Multi-Node Redundancy**: All critical data stored across 3+ nodes
2. **Graceful Degradation**: System continues operating with reduced functionality
3. **Security First**: All sensitive data encrypted before storage
4. **Real-Time Updates**: Permission changes propagate immediately
5. **User Control**: Clear consent flows for all data operations

### **Performance Optimizations:**
- **Async Operations**: Non-blocking UI during network operations
- **Local Caching**: Frequently accessed data cached locally
- **Lazy Loading**: Load data only when needed
- **Connection Pooling**: Reuse connections to Nillion nodes

### **Error Recovery Strategies:**
- **Exponential Backoff**: For transient network errors
- **Circuit Breaker**: Prevent cascading failures
- **Fallback Nodes**: Automatic failover to healthy nodes
- **Data Recovery**: Reconstruct from multiple sources if needed

These data flow diagrams provide a comprehensive blueprint for implementing the PDM extension with production-grade reliability and security.