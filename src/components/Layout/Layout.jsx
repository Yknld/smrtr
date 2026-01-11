import TopBar from './TopBar'
import MainContent from './MainContent'
import './Layout.css'

function Layout({ children }) {
  return (
    <div className="layout">
      <TopBar />
      <div className="layout-main-wrapper">
        <MainContent>
          <div className="page-content">
            {children}
          </div>
        </MainContent>
      </div>
    </div>
  )
}

export default Layout
