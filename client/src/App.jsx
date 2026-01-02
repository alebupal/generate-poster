import React, { useState } from 'react'
import CoverManagement from './components/CoverManagement'
import PosterGenerator from './components/PosterGenerator'
import './App.css'
import pkg from '../package.json'

function App() {
  const [activeTab, setActiveTab] = useState('covers')

  return (
    <div className="app">
      <header className="app-header">
        <h1>Generate Poster</h1>
        <nav className="tabs">
          <button
            className={activeTab === 'covers' ? 'active' : ''}
            onClick={() => setActiveTab('covers')}
          >
            Gestionar Covers
          </button>
          <button
            className={activeTab === 'generator' ? 'active' : ''}
            onClick={() => setActiveTab('generator')}
          >
            Generar Poster
          </button>
        </nav>
      </header>
      <main className="app-main">
        {activeTab === 'covers' && <CoverManagement />}
        {activeTab === 'generator' && <PosterGenerator />}
      </main>
      <footer className="app-footer">
        <p>v{pkg.version}</p>
      </footer>
    </div>
  )
}

export default App

