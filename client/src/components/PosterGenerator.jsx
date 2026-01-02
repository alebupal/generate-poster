import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import './PosterGenerator.css'

const API_URL = 'http://localhost:3001/api'

function PosterGenerator() {
  const [covers, setCovers] = useState([])
  const [selectedCover, setSelectedCover] = useState(null)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8
  const [viewScale, setViewScale] = useState(1.3)
  const containerRef = useRef(null)
  const imageRef = useRef(null)

  useEffect(() => {
    loadCovers()
  }, [])

  const loadCovers = async () => {
    try {
      const response = await axios.get(`${API_URL}/covers/visible`)
      setCovers(response.data)
    } catch (error) {
      console.error('Error cargando covers:', error)
      alert('Error al cargar las covers')
    }
  }

  const handleCoverSelect = (cover) => {
    setSelectedCover(cover)
    // El centrado se recalculará automáticamente con el useEffect
    if (!uploadedImage) {
      setPosition({ x: 0, y: 0 })
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedImage({
          file: file,
          url: reader.result
        })
        // El centrado se hará automáticamente con el useEffect
        setPosition({ x: 0, y: 0 })
        setScale(1)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleMouseDown = useCallback((e) => {
    if (!uploadedImage) return
    e.preventDefault()
    setIsDragging(true)
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      // Adjust for zoom level
      const zoomFactor = viewScale
      setDragStart({
        x: (e.clientX - rect.left) / zoomFactor - position.x,
        y: (e.clientY - rect.top) / zoomFactor - position.y
      })
    } else {
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }, [uploadedImage, position, viewScale])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !uploadedImage) return
    setPosition(prev => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const zoomFactor = viewScale
        const newX = (e.clientX - rect.left) / zoomFactor - dragStart.x
        const newY = (e.clientY - rect.top) / zoomFactor - dragStart.y
        return { x: newX, y: newY }
      } else {
        const newX = e.clientX - dragStart.x
        const newY = e.clientY - dragStart.y
        return { x: newX, y: newY }
      }
    })
  }, [isDragging, dragStart, uploadedImage, viewScale])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleKeyDown = (e) => {
    if (!uploadedImage) return

    const step = e.shiftKey ? 10 : 1
    const scaleStep = e.shiftKey ? 0.1 : 0.05

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        setPosition(prev => ({ ...prev, y: prev.y - step }))
        break
      case 'ArrowDown':
        e.preventDefault()
        setPosition(prev => ({ ...prev, y: prev.y + step }))
        break
      case 'ArrowLeft':
        e.preventDefault()
        setPosition(prev => ({ ...prev, x: prev.x - step }))
        break
      case 'ArrowRight':
        e.preventDefault()
        setPosition(prev => ({ ...prev, x: prev.x + step }))
        break
      case '+':
      case '=':
        e.preventDefault()
        setScale(prev => Math.min(prev + scaleStep, 3))
        break
      case '-':
      case '_':
        e.preventDefault()
        setScale(prev => Math.max(prev - scaleStep, 0.1))
        break
      default:
        break
    }
  }

  useEffect(() => {
    if (uploadedImage) {
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [uploadedImage, position, scale])

  // Centrar el poster cuando se carga una nueva imagen o se cambia de cover
  useEffect(() => {
    if (uploadedImage && selectedCover && containerRef.current) {
      const centerPoster = () => {
        const coverImg = containerRef.current.querySelector('.poster-cover-overlay')
        const uploadedImg = imageRef.current
        if (coverImg && uploadedImg) {
          const coverWidth = coverImg.offsetWidth || coverImg.naturalWidth
          const coverHeight = coverImg.offsetHeight || coverImg.naturalHeight
          const imgWidth = uploadedImg.naturalWidth * scale
          const imgHeight = uploadedImg.naturalHeight * scale

          const centerX = (coverWidth - imgWidth) / 2
          const centerY = (coverHeight - imgHeight) / 2

          setPosition({ x: Math.max(0, centerX), y: Math.max(0, centerY) })
        }
      }

      // Esperar a que las imágenes se carguen
      const coverImg = containerRef.current.querySelector('.poster-cover-overlay')
      if (coverImg) {
        const checkAndCenter = () => {
          if (coverImg.complete && imageRef.current?.complete) {
            centerPoster()
          } else {
            coverImg.onload = () => {
              if (imageRef.current?.complete) {
                centerPoster()
              } else {
                imageRef.current.onload = centerPoster
              }
            }
            if (imageRef.current && !imageRef.current.complete) {
              imageRef.current.onload = centerPoster
            }
          }
        }

        const timer = setTimeout(checkAndCenter, 100)
        return () => clearTimeout(timer)
      }
    }
  }, [uploadedImage?.url, selectedCover?.id, scale])

  const handleSave = async () => {
    if (!saveName.trim()) {
      alert('Por favor ingresa un nombre')
      return
    }

    if (!selectedCover || !uploadedImage) {
      alert('Por favor selecciona una cover y sube una imagen')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', uploadedImage.file)
      formData.append('coverId', selectedCover.id)
      formData.append('name', saveName)
      formData.append('positionX', position.x.toString())
      formData.append('positionY', position.y.toString())
      formData.append('scale', scale.toString())

      await axios.post(`${API_URL}/images/generate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setShowSaveModal(false)
      setSaveName('')
      alert('Poster guardado correctamente')
    } catch (error) {
      console.error('Error guardando poster:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Error al guardar el poster'
      alert(`Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar covers según el término de búsqueda
  const filteredCovers = covers.filter(cover =>
    cover.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calcular covers paginadas
  const paginatedCovers = filteredCovers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredCovers.length / itemsPerPage)

  return (
    <div className="poster-generator">
      <div className="generator-controls">
        <div className="control-section">
          <h3>Seleccionar Cover ({filteredCovers.length})</h3>
          <div className="search-container">
            <input
              type="text"
              placeholder="Buscar cover..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1) // Resetear a la primera página al buscar
              }}
              className="search-input"
            />
          </div>
          <div className="covers-selector">
            {paginatedCovers.map(cover => (
              <div
                key={cover.id}
                className={`cover-option ${selectedCover?.id === cover.id ? 'selected' : ''}`}
                onClick={() => handleCoverSelect(cover)}
              >
                <img src={`http://localhost:3001${cover.image_path}`} alt={cover.name} />
                <span>{cover.name}</span>
              </div>
            ))}
          </div>
          {filteredCovers.length === 0 && (
            <p className="empty-message">
              {searchTerm ? 'No se encontraron covers' : 'No hay covers visibles disponibles'}
            </p>
          )}
          {filteredCovers.length > itemsPerPage && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                Anterior
              </button>
              <div className="pagination-info">
                Página {currentPage} de {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="pagination-btn"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>

        <div className="control-section">
          <h3>Subir Imagen</h3>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="file-input"
          />
          {uploadedImage && (
            <div className="image-info">
              <p>Imagen cargada ✓</p>
              <p className="hint">Usa el ratón para arrastrar o las flechas del teclado para mover</p>
              <p className="hint">Usa + y - para escalar (Shift para pasos más grandes)</p>
            </div>
          )}
        </div>

        {uploadedImage && selectedCover && (
          <div className="control-section">
            <h3>Controles</h3>
            <div className="controls-info">
              <p><strong>Posición:</strong> X: {Math.round(position.x)}, Y: {Math.round(position.y)}</p>
              <p><strong>Escala:</strong> {(scale * 100).toFixed(0)}%</p>
              <button
                onClick={() => setShowSaveModal(true)}
                className="save-btn"
              >
                Guardar Poster
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="generator-preview">
        {/* Zoom Controls */}
        <div className="zoom-controls">
          <button onClick={() => setViewScale(prev => Math.max(0.5, prev - 0.1))} title="Reducir Vista">-</button>
          <span>{(viewScale * 100).toFixed(0)}%</span>
          <button onClick={() => setViewScale(prev => Math.min(3, prev + 0.1))} title="Aumentar Vista">+</button>
        </div>

        {selectedCover ? (
          <div
            className="scale-wrapper"
            style={{
              transform: `scale(${viewScale})`,
              transformOrigin: 'top center'
            }}
          >
            <div
              ref={containerRef}
              className="preview-container"
              onMouseDown={handleMouseDown}
              style={{
                cursor: uploadedImage ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
            >
              {uploadedImage && (
                <img
                  ref={imageRef}
                  src={uploadedImage.url}
                  alt="Uploaded"
                  className="uploaded-image"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: 'top left'
                  }}
                />
              )}
              <img
                src={`http://localhost:3001${selectedCover.image_path}`}
                alt={selectedCover.name}
                className="poster-cover-overlay"
              />
            </div>
          </div>
        ) : (
          <div className="no-cover-selected">
            <p>Por favor selecciona una cover para comenzar</p>
          </div>
        )}
      </div>

      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Guardar Poster</h2>
            <div className="modal-form">
              <label>
                Nombre del poster:
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Ej: Mi Película - 4K"
                  autoFocus
                />
              </label>
              <div className="modal-actions">
                <button
                  onClick={() => {
                    setShowSaveModal(false)
                    setSaveName('')
                  }}
                  className="cancel-btn"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !saveName.trim()}
                  className="confirm-btn"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PosterGenerator

