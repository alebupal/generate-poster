import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './CoverManagement.css'

const API_URL = 'http://localhost:3001/api'

function CoverManagement() {
  const [covers, setCovers] = useState([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    visible: true,
    image: null
  })
  const [preview, setPreview] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const itemsPerPage = 12

  // States for renaming
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  // State for image viewer
  const [viewImage, setViewImage] = useState(null)

  useEffect(() => {
    loadCovers()
  }, [])

  const loadCovers = async () => {
    try {
      const response = await axios.get(`${API_URL}/covers`)
      setCovers(response.data)
    } catch (error) {
      console.error('Error cargando covers:', error)
      alert('Error al cargar las covers')
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type !== 'image/png') {
        alert('Solo se permiten archivos PNG')
        return
      }
      setFormData(prev => ({ ...prev, image: file }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.image) {
      alert('Por favor completa todos los campos')
      return
    }

    setLoading(true)
    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('visible', formData.visible ? 'true' : 'false')
      data.append('image', formData.image)

      await axios.post(`${API_URL}/covers`, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setFormData({ name: '', visible: true, image: null })
      setPreview(null)
      e.target.reset()
      await loadCovers()
      setCurrentPage(1) // Volver a la primera página después de añadir
      alert('Cover añadida correctamente')
    } catch (error) {
      console.error('Error añadiendo cover:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Error al añadir la cover'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleVisible = async (id, currentVisible) => {
    try {
      const cover = covers.find(c => c.id === id)
      await axios.put(`${API_URL}/covers/${id}`, {
        name: cover.name,
        visible: !currentVisible
      })
      loadCovers()
    } catch (error) {
      console.error('Error actualizando cover:', error)
      alert('Error al actualizar la cover')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta cover?')) {
      return
    }

    try {
      await axios.delete(`${API_URL}/covers/${id}`)
      loadCovers()
      alert('Cover eliminada correctamente')
    } catch (error) {
      console.error('Error eliminando cover:', error)
      alert('Error al eliminar la cover')
    }
  }

  // Rename handlers
  const handleStartEdit = (cover) => {
    setEditingId(cover.id)
    setEditName(cover.name)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleSaveEdit = async (id, currentVisible) => {
    if (!editName.trim()) {
      alert('El nombre no puede estar vacío')
      return
    }

    try {
      // Ensure visible is passed correctly regardless if it's 1/0 or true/false
      const isVisible = currentVisible === 1 || currentVisible === true || currentVisible === 'true'

      await axios.put(`${API_URL}/covers/${id}`, {
        name: editName.trim(),
        visible: isVisible
      })

      setEditingId(null)
      setEditName('')
      loadCovers()
      // Removed alert to avoid annoyance during quick edits
    } catch (error) {
      console.error('Error actualizando cover:', error)
      alert('Error al actualizar la cover')
    }
  }

  return (
    <div className="cover-management">
      <div className="cover-form-section">
        <h2>Añadir Nueva Cover</h2>
        <form onSubmit={handleSubmit} className="cover-form">
          <div className="form-group">
            <label>Nombre:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ej: 4K, 2K, 1080p"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="visible"
                checked={formData.visible}
                onChange={handleInputChange}
              />
              Visible
            </label>
          </div>

          <div className="form-group">
            <label>Imagen (PNG):</label>
            <input
              type="file"
              accept="image/png"
              onChange={handleImageChange}
              required
            />
            {preview && (
              <div className="preview-container">
                <img src={preview} alt="Preview" />
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Añadiendo...' : 'Añadir Cover'}
          </button>
        </form>
      </div>

      <div className="covers-list-section">
        <h2>Covers Existentes ({covers.length})</h2>

        {covers.length > 0 && (
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
        )}

        {covers.length === 0 ? (
          <p className="empty-message">No hay covers añadidas aún</p>
        ) : (
          <>
            {(() => {
              const filteredCovers = covers.filter(cover =>
                cover.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              const paginatedCovers = filteredCovers.slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              )
              const totalPages = Math.ceil(filteredCovers.length / itemsPerPage)

              return (
                <>
                  <div className="covers-grid">
                    {paginatedCovers.map(cover => (
                      <div key={cover.id} className="cover-card">
                        <div
                          className="cover-image"
                          onClick={() => setViewImage(`http://localhost:3001${cover.image_path}`)}
                          title="Ver en grande"
                        >
                          <img src={`http://localhost:3001${cover.image_path}`} alt={cover.name} />
                        </div>
                        <div className="cover-info">
                          {editingId === cover.id ? (
                            <div className="edit-name-container">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="edit-name-input"
                                autoFocus
                              />
                              <div className="edit-actions">
                                <button
                                  onClick={() => handleSaveEdit(cover.id, cover.visible)}
                                  className="save-edit-btn"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="cancel-edit-btn"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="name-container">
                              <h3>{cover.name}</h3>
                              <button
                                onClick={() => handleStartEdit(cover)}
                                className="edit-btn"
                                title="Editar nombre"
                              >
                                ✎
                              </button>
                            </div>
                          )}

                          <div className="cover-actions">
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={cover.visible === 1}
                                onChange={() => handleToggleVisible(cover.id, cover.visible === 1)}
                              />
                              <span className="slider"></span>
                              <span className="toggle-label">
                                {cover.visible === 1 ? 'Visible' : 'Oculta'}
                              </span>
                            </label>
                            <button
                              onClick={() => handleDelete(cover.id)}
                              className="delete-btn"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredCovers.length === 0 ? (
                    <p className="empty-message">No se encontraron covers con "{searchTerm}"</p>
                  ) : filteredCovers.length > itemsPerPage && (
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
                </>
              )
            })()}
          </>
        )}
      </div>

      {/* Image Viewer Modal */}
      {viewImage && (
        <div className="image-viewer-overlay" onClick={() => setViewImage(null)}>
          <div className="image-viewer-content" onClick={e => e.stopPropagation()}>
            <img src={viewImage} alt="Full Size" />
            <button className="close-viewer-btn" onClick={() => setViewImage(null)}>×</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CoverManagement
