/**
 * Assets for a lesson – grid/list view
 */
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Icon } from '../components/Icons'
import './screens.css'

const MOCK_ASSETS = [
  { id: '1', title: 'Cell diagram.pdf', type: 'pdf', size: '240 KB' },
  { id: '2', title: 'Notes export', type: 'doc', size: '12 KB' },
  { id: '3', title: 'Slide deck', type: 'file', size: '1.2 MB' },
  { id: '4', title: 'Summary.md', type: 'doc', size: '8 KB' },
  { id: '5', title: 'Flashcards export', type: 'file', size: '16 KB' },
]

export default function AssetsScreen() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const lessonTitle = location.state?.lessonTitle || 'Assets'

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
        <div className="so-assets-content">
          {MOCK_ASSETS.length > 0 ? (
            <div className="so-assets-grid">
              {MOCK_ASSETS.map((asset) => (
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
              <p className="so-assets-empty-desc">Generated outputs (PDFs, exports) will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
