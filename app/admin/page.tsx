"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit2, Trash2, QrCode, X, Download, Search } from 'lucide-react';
import QRCode from 'qrcode';
import { getItems, addItem, updateItem, deleteItem, Item } from '@/lib/firebase';

export default function AdminPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const [currentItem, setCurrentItem] = useState<Partial<Item>>({});
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getItems();
      setItems(data);
      setFilteredItems(data);
    } catch (error) {
      console.error("Error fetching items", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      setFilteredItems(items.filter(item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.sku.toLowerCase().includes(lowerQuery) ||
        item.location.toLowerCase().includes(lowerQuery) ||
        (item.size && item.size.toLowerCase().includes(lowerQuery)) ||
        (item.colour && item.colour.toLowerCase().includes(lowerQuery)) ||
        (item.position && item.position.toLowerCase().includes(lowerQuery))
      ));
    } else {
      setFilteredItems(items);
    }
  }, [searchQuery, items]);

  const handleOpenModal = (item?: Item) => {
    if (item) {
      setCurrentItem(item);
    } else {
      setCurrentItem({ name: '', sku: '', size: '', upps: 0, core: 0, location: '', quantity: 0 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentItem({});
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem.name || !currentItem.sku) return;

    const itemData = currentItem as Omit<Item, 'id'>;

    if (currentItem.id) {
      await updateItem(currentItem.id, itemData);
    } else {
      await addItem(itemData);
    }

    fetchItems();
    handleCloseModal();
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteItem(id);
      fetchItems();
    }
  };

  const handleGenerateQR = async (item: Item) => {
    try {
      const qrData = JSON.stringify({
        id: item.id,
        sku: item.sku,
        name: item.name,
        location: item.location
      });
      const url = await QRCode.toDataURL(qrData, { width: 300, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
      setQrCodeUrl(url);
      setSelectedItemName(item.name);
      setIsQrModalOpen(true);
    } catch (error) {
      console.error('Error generating QR code', error);
    }
  };

  return (
    <div className="container animate-fade-in">
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" className="btn-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={24} />
          </Link>
          <h1 className="header-title" style={{ margin: 0 }}>Admin Dashboard</h1>
        </div>
        <button className="btn btn-primary animate-fade-in" onClick={() => handleOpenModal()} style={{ animationDelay: '0.1s' }}>
          <Plus size={20} /> Add Material
        </button>
      </div>

      <div className="card animate-fade-in" style={{ animationDelay: '0.15s', marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            style={{ width: '100%', paddingLeft: '3rem' }}
            placeholder="Search materials by SKU, Name, Location, Size, Colour, Position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card animate-fade-in" style={{ animationDelay: '0.2s', padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state">Loading inventory...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">No materials found. Add some to get started!</div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SKU</th>
                  <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                  <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</th>
                  <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quantity</th>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: 'all var(--transition-fast)', animation: `fadeIn 0.3s ease-out ${index * 0.05}s forwards`, opacity: 0 }} className="table-row-hover">
                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: '500' }}>{item.sku}</td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>{item.name}</td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                        {item.location}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.1rem' }}>{item.quantity}</td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn-icon" onClick={() => handleGenerateQR(item)} title="Generate QR Code">
                          <QrCode size={20} />
                        </button>
                        <button className="btn-icon" onClick={() => handleOpenModal(item)} title="Edit">
                          <Edit2 size={20} />
                        </button>
                        <button className="btn-icon" onClick={() => item.id && handleDeleteItem(item.id)} style={{ color: 'var(--danger)' }} title="Delete">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Item Form Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">{currentItem.id ? 'Edit Material' : 'Add Material'}</h2>
              <button className="modal-close" onClick={handleCloseModal}><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div className="form-grid">
                <div className="input-group">
                  <label className="input-label">SKU / Item Code</label>
                  <input required className="input-field" value={currentItem.sku || ''} onChange={e => setCurrentItem({ ...currentItem, sku: e.target.value })} placeholder="e.g. MT-001" />
                </div>
                <div className="input-group">
                  <label className="input-label">Material Name</label>
                  <input required className="input-field" value={currentItem.name || ''} onChange={e => setCurrentItem({ ...currentItem, name: e.target.value })} placeholder="e.g. Steel Pipes" />
                </div>
                <div className="input-group">
                  <label className="input-label">Size</label>
                  <input required className="input-field" value={currentItem.size || ''} onChange={e => setCurrentItem({ ...currentItem, size: e.target.value })} placeholder="e.g. 20mm" />
                </div>
                <div className="input-group">
                  <label className="input-label">UPPS</label>
                  <input required type="number" className="input-field" value={currentItem.upps || ''} onChange={e => setCurrentItem({ ...currentItem, upps: Number(e.target.value) })} placeholder="e.g. 20" />
                </div>
                <div className="input-group">
                  <label className="input-label">CORE</label>
                  <input required type="number" className="input-field" value={currentItem.core || ''} onChange={e => setCurrentItem({ ...currentItem, core: Number(e.target.value) })} placeholder="e.g. 10" />
                </div>
                <div className="input-group">
                  <label className="input-label">Colour</label>
                  <input required className="input-field" value={currentItem.colour || ''} onChange={e => setCurrentItem({ ...currentItem, colour: e.target.value })} placeholder="e.g. Silver" />
                </div>
                <div className="input-group">
                  <label className="input-label">BIN-Location</label>
                  <input required className="input-field" value={currentItem.location || ''} onChange={e => setCurrentItem({ ...currentItem, location: e.target.value })} placeholder="e.g. Aisle 4, Rack 2" />
                </div>
                <div className="input-group">
                  <label className="input-label">Position</label>
                  <select required className="input-field" value={currentItem.position || ''} onChange={e => setCurrentItem({ ...currentItem, position: e.target.value })}>
                    <option value="" disabled>Select Position</option>
                    <option value="Front(F)">Front(F)</option>
                    <option value="Back (B)">Back (B)</option>
                  </select>
                </div>
                <div className="input-group full-width">
                  <label className="input-label">Quantity</label>
                  <input required type="number" min={0} className="input-field" value={currentItem.quantity || 0} onChange={e => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">{currentItem.id ? 'Save Changes' : 'Add Material'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQrModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">QR Code: {selectedItemName}</h2>
              <button className="modal-close" onClick={() => setIsQrModalOpen(false)}><X size={24} /></button>
            </div>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              <img src={qrCodeUrl} alt="QR Code" style={{ width: '250px', height: '250px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <a href={qrCodeUrl} download={`QR_${selectedItemName}.png`} className="btn btn-primary" style={{ width: '100%' }}>
                <Download size={20} /> Download QR Code
              </a>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .table-row-hover:hover {
          background-color: var(--surface-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
      `}} />
    </div>
  );
}
