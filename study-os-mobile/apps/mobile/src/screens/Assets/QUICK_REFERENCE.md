# Assets Screen - Quick Reference

## Files Created

```
src/screens/Assets/
├── AssetsScreen.tsx              # Main screen component
├── ASSETS_SCREEN.md              # Detailed documentation
├── COMPONENT_STRUCTURE.md        # Visual structure guide
└── QUICK_REFERENCE.md            # This file

src/components/
├── AssetRow/
│   └── AssetRow.tsx              # Asset row component
├── UploadProgress/
│   └── UploadProgress.tsx        # Upload progress indicator
├── EmptyState/
│   └── EmptyState.tsx            # Enhanced with icon support
├── BottomSheet/
│   └── BottomSheet.tsx           # Enhanced with icon support
└── index.ts                      # Updated exports

src/navigation/
└── AppNavigator.tsx              # Added Assets screen route

apps/mobile/
└── ASSETS_SCREEN_IMPLEMENTATION.md  # Implementation summary
```

## Navigation

```typescript
// From Lesson Hub
navigation.navigate('Assets', {
  lessonId: 'uuid',
  lessonTitle: 'Lesson Name',
});
```

## Key Features

### ✅ Implemented
- Header with back button and upload icon
- Grouped asset sections (6 types)
- Asset rows with icons and metadata
- Empty state with CTA
- Loading state
- Upload menu (bottom sheet)
- Upload progress indicator
- Theme consistency

### 🚧 TODO (Backend)
- Fetch assets from Supabase
- File picker integration
- Upload to Supabase Storage
- YouTube link input
- Asset viewer/player
- Delete confirmation
- Error handling

## Asset Types

| Type | Icon | Color | Database Kind |
|------|------|-------|---------------|
| Notes | document-text-outline | Gray | `notes` |
| PDFs | document-outline | Gray | `pdf` |
| Slides | albums-outline | Gray | `slides` |
| Images | image-outline | Pink | `image` |
| Audio | musical-note-outline | Purple | `audio` |
| YouTube | logo-youtube | Red | N/A (separate table) |

## Database Schema

### lesson_assets
```typescript
{
  id: uuid
  lesson_id: uuid
  user_id: uuid
  kind: 'notes' | 'pdf' | 'slides' | 'image' | 'audio' | 'other'
  storage_bucket: string
  storage_path: string
  mime_type: string
  duration_ms?: number
  created_at: timestamp
}
```

### youtube_lesson_resources
```typescript
{
  lesson_id: uuid
  video_id: string
  is_primary: boolean
  added_at: timestamp
  youtube_videos: {
    video_id: string
    title: string
    channel_name: string
    duration_seconds: number
  }
}
```

## Component Props

### AssetsScreen
```typescript
{
  route: {
    params: {
      lessonId: string
      lessonTitle: string
    }
  }
  navigation: any
}
```

### AssetRow
```typescript
{
  asset?: Asset
  youtubeResource?: YouTubeResource
  onPress: () => void
  onDelete: () => void
}
```

### UploadProgress
```typescript
{
  filename: string
  progress: number  // 0-100
  status: 'uploading' | 'processing' | 'complete' | 'error'
}
```

## Styling Tokens

```typescript
// Colors
colors.background      // #1F1F1F
colors.surface         // #1F1F1F
colors.border          // #2A2A2A
colors.textPrimary     // #C5C5C5
colors.textSecondary   // #8A8A8A
colors.textTertiary    // #5A5A5A

// Spacing
spacing.sm             // 8px
spacing.md             // 16px
spacing.lg             // 24px

// Border Radius
borderRadius.sm        // 8px
borderRadius.md        // 12px
```

## State Management

```typescript
// Assets grouped by type
const [assets, setAssets] = useState<GroupedAssets>({
  notes: [],
  pdfs: [],
  slides: [],
  images: [],
  audio: [],
  youtube: [],
});

// Upload tracking
const [uploads, setUploads] = useState<UploadItem[]>([]);

// UI state
const [loading, setLoading] = useState(true);
const [uploadMenuVisible, setUploadMenuVisible] = useState(false);
```

## Common Tasks

### Add New Asset Type
1. Update `AssetKind` type
2. Add to `GroupedAssets` interface
3. Add icon mapping in `AssetRow.getIcon()`
4. Add section in `AssetsScreen.render()`

### Fetch Assets
```typescript
const { data } = await supabase
  .from('lesson_assets')
  .select('*')
  .eq('lesson_id', lessonId)
  .order('created_at', { ascending: false });
```

### Upload Asset
```typescript
// 1. Pick file
const file = await DocumentPicker.getDocumentAsync();

// 2. Upload to storage
const { data } = await supabase.storage
  .from('lesson-assets')
  .upload(path, file);

// 3. Create DB record
await supabase.from('lesson_assets').insert({
  lesson_id: lessonId,
  kind: 'pdf',
  storage_path: data.path,
  // ...
});
```

### Delete Asset
```typescript
// 1. Delete from storage
await supabase.storage
  .from('lesson-assets')
  .remove([asset.storage_path]);

// 2. Delete from DB
await supabase
  .from('lesson_assets')
  .delete()
  .eq('id', assetId);
```

## Testing

### Visual
- [ ] Header displays correctly
- [ ] Empty state shows icon and text
- [ ] Asset rows show correct icons
- [ ] Upload menu opens
- [ ] Upload progress animates

### Interaction
- [ ] Back button works
- [ ] Upload icon opens menu
- [ ] Asset rows are tappable
- [ ] Delete buttons work
- [ ] Bottom sheet closes

### States
- [ ] Loading → Empty
- [ ] Loading → Content
- [ ] Upload progress updates
- [ ] Error handling

## Design Checklist

- [x] Flat design (no elevation)
- [x] Muted colors
- [x] Subtle borders
- [x] Consistent spacing
- [x] Clean typography
- [x] No gradients
- [x] No shadows
- [x] No emojis
- [x] No marketing copy

## Next Steps

1. **Implement File Picker**
   - Install: `expo-document-picker`
   - Add to upload handlers

2. **Connect to Supabase**
   - Implement `fetchAssets()`
   - Add error handling

3. **Upload Flow**
   - Implement file upload
   - Track progress
   - Handle errors

4. **Asset Viewer**
   - PDF viewer
   - Image viewer
   - Audio player
   - YouTube player

5. **Delete Confirmation**
   - Add confirmation dialog
   - Implement delete logic

## Support

- See `ASSETS_SCREEN.md` for detailed documentation
- See `COMPONENT_STRUCTURE.md` for visual structure
- See `ASSETS_SCREEN_IMPLEMENTATION.md` for implementation summary
