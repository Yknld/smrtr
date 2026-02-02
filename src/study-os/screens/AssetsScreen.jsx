/**
 * Assets for a lesson – grid/list view. Synced with Supabase lesson_assets.
 * Drag and drop (or click) to upload files.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { fetchLessonAssets, uploadLessonAsset } from '../data/lessonAssets.repository'
import './screens.css'

export default function AssetsScreen() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const lessonTitle = location.state?.lessonTitle || 'Assets'
  const fileInputRef = useRef(null)

  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const loadAssets = useCallback(() => {
    if (!lessonId) return
    setLoading(true)
    fetchLessonAssets(lessonId)
      .then(setAssets)
      .catch(() => setAssets([]))
      .finally(() => setLoading(false))
  }, [lessonId])

  useEffect(() => {
    if (!lessonId) {
      setAssets([])
      setLoading(false)
      return
    }
    loadAssets()
  }, [lessonId, loadAssets])

  const handleFiles = useCallback(
    async (files) => {
      if (!lessonId || !files?.length) return
      setUploadError(null)
      setUploading(true)
      const next = [...assets]
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          if (!file?.name) continue
          const added = await uploadLessonAsset(lessonId, file)
          next.unshift(added)
        }
        setAssets(next)
      } catch (e) {
        setUploadError(e?.message || 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [lessonId, assets]
  )

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const onDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)
      const files = e.dataTransfer?.files
      if (files?.length) handleFiles(Array.from(files))
    },
    [handleFiles]
  )

  const onFileInputChange = useCallback(
    (e) => {
      const files = e.target?.files
      if (files?.length) handleFiles(Array.from(files))
      e.target.value = ''
    },
    [handleFiles]
  )

  const openFilePicker = () => fileInputRef.current?.click()

  return (
    <div className="so-screen">
      <header className="so-assets-header">
        <button type="button" className="so-assets-back" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" size={24} />
        </button>
        <h1 className="so-assets-title">{lessonTitle} – Assets</h1>
        <span className="so-assets-spacer" />
      </header>

      <div className="so-screen-inner">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="so-assets-file-input"
          onChange={onFileInputChange}
          aria-hidden
        />
        <div
          className={`so-assets-dropzone ${dragOver ? 'so-assets-dropzone-active' : ''} ${uploading ? 'so-assets-dropzone-uploading' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="so-assets-content">
            {uploadError && (
              <p className="so-assets-upload-error" role="alert">
                {uploadError}
              </p>
            )}
            {loading ? (
              <p className="so-assets-empty-desc">Loading assets…</p>
            ) : assets.length > 0 ? (
              <div className="so-assets-grid">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className="so-asset-card-full"
                    onClick={() => {}}
                  >
                    <span className="so-asset-card-icon" aria-hidden><Icon name="fileText" size={28} /></span>
                    <span className="so-asset-card-title">{asset.title}</span>
                    <span className="so-asset-card-meta">{asset.size}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="so-assets-empty">
                <span className="so-assets-empty-icon" aria-hidden><Icon name="folder" size={48} /></span>
                <p className="so-assets-empty-title">No assets yet</p>
                <p className="so-assets-empty-desc">Drop files here or click to upload.</p>
              </div>
            )}
            {!loading && (
              <button
                type="button"
                className="so-assets-drop-hint"
                onClick={openFilePicker}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : dragOver ? 'Drop to upload' : 'Drag and drop files here, or click to choose'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
