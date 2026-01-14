# Assets Screen - Component Structure

## Visual Layout

```
┌─────────────────────────────────────────┐
│  ← Back    Assets    [Upload Icon]      │  ← Header
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ UPLOADING                         │ │  ← Section Label
│  ├───────────────────────────────────┤ │
│  │ [○] biology-notes.pdf             │ │
│  │     Uploading... 45%              │ │
│  │ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░  │ │  ← Upload Progress
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ NOTES                             │ │  ← Section Label
│  ├───────────────────────────────────┤ │
│  │ [📄] lecture-notes.txt            │ │
│  │      TXT • Jan 11                [🗑]│  ← Asset Row
│  ├───────────────────────────────────┤ │
│  │ [📄] chapter-3-summary.md         │ │
│  │      MD • Jan 10                 [🗑]│
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ PDFS                              │ │
│  ├───────────────────────────────────┤ │
│  │ [📄] textbook-ch3.pdf             │ │
│  │      PDF • Jan 9                 [🗑]│
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ AUDIO                             │ │
│  ├───────────────────────────────────┤ │
│  │ [🎵] lecture-recording.m4a        │ │
│  │      45:23 • Jan 8               [🗑]│
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ YOUTUBE LINKS                     │ │
│  ├───────────────────────────────────┤ │
│  │ [▶] Cell Biology Explained        │ │
│  │      15m • Khan Academy          [🗑]│
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

## Empty State

```
┌─────────────────────────────────────────┐
│  ← Back    Assets    [Upload Icon]      │
├─────────────────────────────────────────┤
│                                         │
│                                         │
│                                         │
│              [📁]                       │
│                                         │
│         No assets yet                   │
│    Add your first source to get started │
│                                         │
│        ┌─────────────────┐             │
│        │  Upload Asset   │             │
│        └─────────────────┘             │
│                                         │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

## Upload Menu (Bottom Sheet)

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│  ╭─────────────────────────────────╮   │
│  │         ───                     │   │  ← Handle
│  │                                 │   │
│  │  [📄] Upload PDF                │   │
│  │  ─────────────────────────────  │   │
│  │  [📊] Upload Slides             │   │
│  │  ─────────────────────────────  │   │
│  │  [🖼] Upload Images              │   │
│  │  ─────────────────────────────  │   │
│  │  [🎤] Upload Audio               │   │
│  │  ─────────────────────────────  │   │
│  │  [▶] Add YouTube Link           │   │
│  │                                 │   │
│  │  ┌─────────────────────────┐   │   │
│  │  │       Cancel            │   │   │
│  │  └─────────────────────────┘   │   │
│  ╰─────────────────────────────────╯   │
└─────────────────────────────────────────┘
```

## Component Hierarchy

```
AssetsScreen
├── SafeAreaView
│   └── View (container)
│       ├── View (header)
│       │   ├── TouchableOpacity (back button)
│       │   │   └── Ionicons (arrow-back)
│       │   ├── Text (title: "Assets")
│       │   └── TouchableOpacity (upload button)
│       │       └── Ionicons (cloud-upload-outline)
│       │
│       ├── [Loading State]
│       │   └── ActivityIndicator
│       │
│       ├── [Empty State]
│       │   └── EmptyState
│       │       ├── Ionicons (icon)
│       │       ├── Text (title)
│       │       ├── Text (subtitle)
│       │       └── TouchableOpacity (action button)
│       │
│       ├── [Content]
│       │   └── ScrollView
│       │       ├── [Upload Progress Section]
│       │       │   ├── Text (section label: "UPLOADING")
│       │       │   └── UploadProgress (x N)
│       │       │       ├── View (content)
│       │       │       │   ├── ActivityIndicator / Ionicons
│       │       │       │   ├── Text (filename)
│       │       │       │   └── Text (status)
│       │       │       └── View (progress bar)
│       │       │
│       │       ├── [Notes Section]
│       │       │   ├── Text (section label: "NOTES")
│       │       │   └── AssetRow (x N)
│       │       │
│       │       ├── [PDFs Section]
│       │       │   ├── Text (section label: "PDFS")
│       │       │   └── AssetRow (x N)
│       │       │
│       │       ├── [Slides Section]
│       │       │   ├── Text (section label: "SLIDES")
│       │       │   └── AssetRow (x N)
│       │       │
│       │       ├── [Images Section]
│       │       │   ├── Text (section label: "IMAGES")
│       │       │   └── AssetRow (x N)
│       │       │
│       │       ├── [Audio Section]
│       │       │   ├── Text (section label: "AUDIO")
│       │       │   └── AssetRow (x N)
│       │       │
│       │       └── [YouTube Section]
│       │           ├── Text (section label: "YOUTUBE LINKS")
│       │           └── AssetRow (x N)
│       │
│       └── BottomSheet (upload menu)
│           ├── View (overlay)
│           └── View (sheet)
│               ├── View (handle)
│               ├── TouchableOpacity (action) x 5
│               │   ├── Ionicons (icon)
│               │   └── Text (label)
│               └── TouchableOpacity (cancel)
│                   └── Text ("Cancel")
```

## AssetRow Component Structure

```
AssetRow
└── TouchableOpacity (container)
    └── View (content)
        ├── View (icon container)
        │   └── Ionicons (asset type icon)
        ├── View (info)
        │   ├── Text (filename)
        │   └── Text (metadata)
        └── TouchableOpacity (delete button)
            └── Ionicons (trash-outline)
```

## UploadProgress Component Structure

```
UploadProgress
└── View (container)
    ├── View (content)
    │   ├── View (icon container)
    │   │   └── ActivityIndicator / Ionicons
    │   └── View (info)
    │       ├── Text (filename)
    │       └── Text (status)
    └── View (progress bar container)
        └── View (progress bar - animated width)
```

## State Flow

```
Initial Load
    ↓
[Loading State]
    ↓
Fetch Assets from DB
    ↓
    ├─→ No Assets → [Empty State]
    │                     ↓
    │               Tap "Upload Asset"
    │                     ↓
    └─→ Has Assets → [Content State]
                          ↓
                    Tap Upload Icon
                          ↓
                    [Upload Menu]
                          ↓
                    Select Upload Type
                          ↓
                    Pick File
                          ↓
                    [Upload Progress]
                          ↓
                    Upload Complete
                          ↓
                    Refresh Assets
                          ↓
                    [Content State]
```

## Data Flow

```
AssetsScreen
    ↓ (fetch)
Supabase
    ↓ (query lesson_assets)
    ↓ (query youtube_lesson_resources)
    ↓
Raw Data
    ↓ (transform)
GroupedAssets
    ↓ (render)
Asset Sections
    ↓ (map)
AssetRow Components
```

## Interaction Flow

### View Asset
```
User taps AssetRow
    ↓
handleAssetPress(asset)
    ↓
[TODO: Open Asset Viewer]
```

### Delete Asset
```
User taps Delete Icon
    ↓
handleAssetDelete(assetId)
    ↓
[TODO: Show Confirmation]
    ↓
Delete from Supabase
    ↓
Refresh Assets
```

### Upload Asset
```
User taps Upload Icon
    ↓
setUploadMenuVisible(true)
    ↓
User selects Upload Type
    ↓
handleUpload(kind)
    ↓
[TODO: Pick File]
    ↓
Add to uploads state
    ↓
Show UploadProgress
    ↓
Upload to Supabase Storage
    ↓
Update progress
    ↓
Create DB record
    ↓
Remove from uploads
    ↓
Refresh assets
```

## Styling Patterns

### Header
```typescript
{
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: spacing.lg,  // 24px
  paddingTop: spacing.lg,         // 24px
  paddingBottom: spacing.md,      // 16px
}
```

### Section Label
```typescript
{
  fontSize: 11,
  fontWeight: '600',
  color: colors.textTertiary,     // #5A5A5A
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  marginBottom: spacing.md,       // 16px
}
```

### Asset Row
```typescript
{
  backgroundColor: colors.surface, // #1F1F1F
  borderRadius: borderRadius.md,   // 12px
  borderWidth: 1,
  borderColor: colors.border,      // #2A2A2A
  marginBottom: spacing.sm,        // 8px
  padding: spacing.md,             // 16px
}
```

### Icon Container
```typescript
{
  width: 40,
  height: 40,
  borderRadius: borderRadius.sm,   // 8px
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: colors.surface,
}
```

## Color Usage

### Text
- **Primary** (`#C5C5C5`): Filenames, titles
- **Secondary** (`#8A8A8A`): Metadata, labels
- **Tertiary** (`#5A5A5A`): Section labels, placeholders

### Icons
- **Default** (`#8A8A8A`): Most icons
- **Audio** (`#A78BFA`): Purple accent
- **Image** (`#F472B6`): Pink accent
- **YouTube** (`#FF0000`): YouTube red
- **Success** (`#4ADE80`): Upload complete
- **Error** (`#F87171`): Upload failed

### Backgrounds
- **Background** (`#1F1F1F`): Screen background
- **Surface** (`#1F1F1F`): Cards, rows (same as background)
- **Border** (`#2A2A2A`): Subtle borders

## Responsive Behavior

- All sections are scrollable
- Asset rows wrap text if too long
- Upload progress shows inline
- Bottom sheet slides up from bottom
- Empty state centers vertically
- Loading spinner centers in screen
