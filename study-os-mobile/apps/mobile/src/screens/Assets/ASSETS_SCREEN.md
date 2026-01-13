# Assets Screen

## Overview

The Assets screen displays and manages all files and resources associated with a lesson. It provides a clean, organized interface for viewing, uploading, and managing different types of assets.

## Features

### Asset Types

Assets are grouped into the following categories:

1. **Notes** - Text notes and documents
2. **PDFs** - PDF documents
3. **Slides** - Presentation slides
4. **Images** - Image files
5. **Audio** - Audio recordings
6. **YouTube Links** - Linked YouTube videos

### Header

- **Back Button** - Returns to the Lesson Hub
- **Title** - "Assets"
- **Upload Icon** - Opens the upload menu

### Asset Rows

Each asset displays:
- **Icon** - Visual indicator based on asset type
- **Filename** - Name of the file or resource
- **Metadata** - File type, duration (for audio/video), and date added
- **Delete Action** - Remove the asset

### Actions

#### Upload Asset
Tap the upload icon in the header to open a bottom sheet with options:
- Upload PDF
- Upload Slides
- Upload Images
- Upload Audio
- Add YouTube Link

#### View Asset
Tap any asset row to open it (viewer not yet implemented)

#### Delete Asset
Tap the trash icon on any asset row to delete it (with confirmation)

### States

#### Empty State
When no assets exist:
- Icon: folder-open-outline
- Title: "No assets yet"
- Subtitle: "Add your first source to get started"
- Action Button: "Upload Asset"

#### Loading State
Shows a spinner while fetching assets from the database

#### Upload Progress
When uploading files, a progress indicator shows:
- Filename
- Upload progress percentage
- Status (uploading, processing, complete, error)
- Progress bar

## Design

### Theme Consistency

The Assets screen follows the app's premium gray theme:
- **Background**: `#1F1F1F` (flat, no elevation)
- **Surface**: `#1F1F1F` (same as background)
- **Borders**: `#2A2A2A` (subtle, almost invisible)
- **Text Primary**: `#C5C5C5` (muted gray)
- **Text Secondary**: `#8A8A8A` (darker gray)
- **Text Tertiary**: `#5A5A5A` (very dark gray)

### Layout

- **Screen padding**: 24px horizontal
- **Section spacing**: 24px between groups
- **Asset row spacing**: 8px between rows
- **Border radius**: 12px for cards

### Typography

- **Title**: 24px, weight 700, letter-spacing -0.5
- **Section labels**: 11px, weight 600, uppercase, letter-spacing 0.8
- **Filename**: 15px, weight 500
- **Metadata**: 13px, tertiary color

## Database Schema

### lesson_assets Table

```sql
CREATE TABLE lesson_assets (
  id uuid PRIMARY KEY,
  lesson_id uuid NOT NULL REFERENCES lessons(id),
  user_id uuid NOT NULL,
  kind text NOT NULL, -- 'pdf', 'slides', 'notes', 'audio', 'image', 'other'
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  duration_ms int NULL,
  created_at timestamptz NOT NULL
);
```

### youtube_lesson_resources Table

```sql
CREATE TABLE youtube_lesson_resources (
  lesson_id uuid NOT NULL REFERENCES lessons(id),
  video_id text NOT NULL REFERENCES youtube_videos(video_id),
  is_primary boolean NOT NULL DEFAULT false,
  added_at timestamptz NOT NULL
);
```

## Implementation Status

### ✅ Completed
- [x] Screen layout and structure
- [x] Header with back button and upload icon
- [x] Asset row component with icons and metadata
- [x] Empty state
- [x] Loading state
- [x] Upload menu (bottom sheet)
- [x] Upload progress indicator component
- [x] Navigation integration
- [x] Theme consistency

### 🚧 TODO
- [ ] Connect to Supabase to fetch assets
- [ ] Implement file picker for uploads
- [ ] Implement file upload to Supabase Storage
- [ ] Implement YouTube link input dialog
- [ ] Implement asset viewer/player
- [ ] Implement delete confirmation dialog
- [ ] Add error handling and retry logic
- [ ] Add pull-to-refresh

## Usage

### Navigation

From the Lesson Hub screen:
```typescript
navigation.navigate('Assets', {
  lessonId: 'uuid',
  lessonTitle: 'Lesson Name',
});
```

### Fetching Assets

```typescript
// Fetch lesson_assets
const { data: assets } = await supabase
  .from('lesson_assets')
  .select('*')
  .eq('lesson_id', lessonId)
  .order('created_at', { ascending: false });

// Fetch YouTube resources
const { data: youtube } = await supabase
  .from('youtube_lesson_resources')
  .select('*, youtube_videos(*)')
  .eq('lesson_id', lessonId)
  .order('added_at', { ascending: false });
```

### Uploading Assets

```typescript
// 1. Pick file
const result = await DocumentPicker.getDocumentAsync({
  type: 'application/pdf', // or other mime types
});

// 2. Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('lesson-assets')
  .upload(`${userId}/${lessonId}/${filename}`, file);

// 3. Create database record
await supabase
  .from('lesson_assets')
  .insert({
    lesson_id: lessonId,
    user_id: userId,
    kind: 'pdf',
    storage_bucket: 'lesson-assets',
    storage_path: data.path,
    mime_type: 'application/pdf',
  });
```

## Components Used

- `AssetRow` - Individual asset display
- `EmptyState` - No assets state
- `BottomSheet` - Upload menu
- `UploadProgress` - Upload progress indicator
- `Ionicons` - Icons throughout

## Files

- `src/screens/Assets/AssetsScreen.tsx` - Main screen component
- `src/components/AssetRow/AssetRow.tsx` - Asset row component
- `src/components/UploadProgress/UploadProgress.tsx` - Upload progress component
- `src/screens/Assets/ASSETS_SCREEN.md` - This documentation
