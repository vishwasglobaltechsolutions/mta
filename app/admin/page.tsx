"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit2, Trash2, QrCode, X, Download, Search, ArrowUpDown, Save } from 'lucide-react';
import QRCode from 'qrcode';
import { getItems, addItem, updateItem, deleteItem, Item, getMovements, MovementLog, updateItemQuantity, ItemLocation } from '@/lib/firebase';

export default function AdminPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<Item | null>(null);
  const [adjustLocationId, setAdjustLocationId] = useState<string>('');
  const [adjustAmount, setAdjustAmount] = useState<number | ''>('');
  const [adjustAction, setAdjustAction] = useState<'add' | 'remove'>('add');

  const [currentItem, setCurrentItem] = useState<Partial<Item>>({});
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToastMessage({ text: message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

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
      setFilteredItems(items.filter(item => {
        const matchBasic = item.name.toLowerCase().includes(lowerQuery) ||
          item.sku.toLowerCase().includes(lowerQuery) ||
          (item.size && item.size.toLowerCase().includes(lowerQuery)) ||
          (item.colour && item.colour.toLowerCase().includes(lowerQuery));
        if (matchBasic) return true;

        if (item.locations) {
          return item.locations.some(loc =>
            loc.location.toLowerCase().includes(lowerQuery) ||
            loc.rack.toLowerCase().includes(lowerQuery) ||
            loc.row.toLowerCase().includes(lowerQuery) ||
            loc.position.toLowerCase().includes(lowerQuery)
          );
        }
        return false;
      }));
    } else {
      setFilteredItems(items);
    }
  }, [searchQuery, items]);

  const handleOpenModal = (item?: Item) => {
    if (item) {
      setCurrentItem({ ...item, locations: item.locations ? JSON.parse(JSON.stringify(item.locations)) : [] });
    } else {
      setCurrentItem({
        name: '', sku: '', size: '', upps: 0, core: 0, colour: '',
        locations: [{ id: Math.random().toString(36).substr(2, 9), location: '', rack: '', row: '', position: '', quantity: 0 }]
      });
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
    if (!itemData.locations) itemData.locations = [];

    if (currentItem.id) {
      await updateItem(currentItem.id, itemData);
      showToast('Item successfully updated!');
    } else {
      await addItem(itemData);
      showToast('New item successfully added!');
    }

    fetchItems();
    handleCloseModal();
  };

  const handleAddLocation = () => {
    setCurrentItem(prev => ({
      ...prev,
      locations: [...(prev.locations || []), { id: Math.random().toString(36).substr(2, 9), location: '', rack: '', row: '', position: '', quantity: 0 }]
    }));
  };

  const handleRemoveLocation = (id: string) => {
    setCurrentItem(prev => ({
      ...prev,
      locations: (prev.locations || []).filter(l => l.id !== id)
    }));
  };

  const handleLocationChange = (id: string, field: keyof ItemLocation, value: any) => {
    setCurrentItem(prev => ({
      ...prev,
      locations: (prev.locations || []).map(loc => loc.id === id ? { ...loc, [field]: value } : loc)
    }));
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteItem(id);
      fetchItems();
    }
  };

  const handleOpenAdjustModal = (item: Item) => {
    setAdjustItem(item);
    setAdjustAmount('');
    setAdjustAction('add');
    if (item.locations && item.locations.length > 0) {
      setAdjustLocationId(item.locations[0].id);
    }
    setIsAdjustModalOpen(true);
  };

  const handleAdjustQuantity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem || !adjustItem.id || !adjustAmount || adjustAmount <= 0 || !adjustLocationId) return;

    const targetLocation = adjustItem.locations?.find(l => l.id === adjustLocationId);
    if (!targetLocation) return;

    const amount = Number(adjustAmount);
    const newQuantity = adjustAction === 'add'
      ? targetLocation.quantity + amount
      : targetLocation.quantity - amount;

    if (newQuantity < 0) {
      alert("Quantity cannot be negative!");
      return;
    }

    const updatedLocations = adjustItem.locations!.map(loc =>
      loc.id === adjustLocationId ? { ...loc, quantity: newQuantity } : loc
    );

    await updateItemQuantity(adjustItem.id, updatedLocations, {
      name: adjustItem.name,
      sku: adjustItem.sku,
      oldQuantity: targetLocation.quantity,
      newQuantity: newQuantity,
      difference: newQuantity - targetLocation.quantity,
      location: targetLocation.location,
      rack: targetLocation.rack,
      row: targetLocation.row,
      position: targetLocation.position
    });

    fetchItems();
    setIsAdjustModalOpen(false);
    setAdjustItem(null);
    showToast('Quantity successfully updated!');
  };

  const handleGenerateQR = async (item: Item) => {
    try {
      // Include all item information except location-related fields
      const { locations, location, position, rack, row, quantity, ...itemDataWithoutLocation } = item;
      const qrData = JSON.stringify(itemDataWithoutLocation);
      const url = await QRCode.toDataURL(qrData, { width: 300, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
      setQrCodeUrl(url);
      setSelectedItemName(item.name);
      setIsQrModalOpen(true);
    } catch (error) {
      console.error('Error generating QR code', error);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const movements = await getMovements();
      if (!movements || movements.length === 0) {
        alert("No movement data available to download.");
        return;
      }

      const headers = ["Date", "Item Name", "SKU", "Action", "Old Quantity", "New Quantity", "Difference", "Location", "Rack", "Row", "Position", "Party Name"];
      const csvContent = [
        headers.join(","),
        ...movements.map(m => {
          const date = new Date(m.timestamp).toLocaleString().replace(/,/g, '');
          const currentItem = items.find(i => i.id === m.itemId);
          const itemName = currentItem ? currentItem.name : m.itemName;
          const sku = currentItem ? currentItem.sku : m.sku;

          let location = m.location || '';
          let rack = m.rack || '';
          let row = m.row || '';
          let position = m.position || '';

          if (currentItem) {
            if (currentItem.locations && currentItem.locations.length > 0) {
              const locMatch = currentItem.locations.find(l => l.location === m.location) || currentItem.locations[0];
              location = locMatch.location || location;
              rack = locMatch.rack || rack;
              row = locMatch.row || row;
              position = locMatch.position || position;
            } else {
              location = currentItem.location || location;
              rack = currentItem.rack || rack;
              row = currentItem.row || row;
              position = currentItem.position || position;
            }
          }

          return `"${date}","${itemName}","${sku}","${m.action}",${m.oldQuantity},${m.newQuantity},${m.difference},"${location}","${rack}","${row}","${position}","${m.partyName || ''}"`;
        })
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `material_movement_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading report', error);
      alert("Failed to download report.");
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
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary animate-fade-in" onClick={handleDownloadReport} style={{ animationDelay: '0.05s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={20} /> Movement Report
          </button>
          <button className="btn btn-primary animate-fade-in" onClick={() => handleOpenModal()} style={{ animationDelay: '0.1s' }}>
            <Plus size={20} /> Add Material
          </button>
        </div>
      </div>
      <div style={{ position: 'relative', marginBottom: '1rem', padding: '0.1rem' }}>
        <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="input-field"
          style={{ width: '100%', paddingLeft: '3rem' }}
          placeholder="Search materials by SKU, Name, Location, Size, Colour, Position..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="card animate-fade-in" style={{ animationDelay: '0.2s', padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state">Loading inventory...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">No materials found. Add some to get started!</div>
        ) : (
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>SKU</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Name</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Location</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quantity</th>
                    <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s', animation: `fadeIn 0.3s ease-out ${index * 0.05}s forwards`, opacity: 0 }} className="table-row-hover">
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: '500', color: '#94a3b8', fontSize: '0.95rem' }}>{item.sku}</td>
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: '#f8fafc', fontSize: '1.05rem', letterSpacing: '0.01em' }}>{item.name}</td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                          {item.locations?.map(loc => (
                            <span key={loc.id} style={{
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              color: '#60a5fa',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.75rem',
                              padding: '0.35rem 0.75rem',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}>
                              {loc.location}
                              <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-full)', fontSize: '0.65rem', color: '#e2e8f0' }}>
                                {loc.quantity}
                              </span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: '700', color: '#ffffff', fontSize: '1.15rem' }}>
                        {item.locations?.reduce((sum, l) => sum + (l.quantity || 0), 0) || 0}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button className="btn-icon" onClick={() => handleGenerateQR(item)} title="Generate QR Code" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                            <QrCode size={18} />
                          </button>
                          <button className="btn-icon" onClick={() => handleOpenAdjustModal(item)} title="Adjust Quantity" style={{ color: '#60a5fa', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                            <ArrowUpDown size={18} />
                          </button>
                          <button className="btn-icon" onClick={() => handleOpenModal(item)} title="Edit" style={{ color: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>
                            <Edit2 size={18} />
                          </button>
                          <button className="btn-icon" onClick={() => item.id && handleDeleteItem(item.id)} style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }} title="Delete">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Item Form Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">{currentItem.id ? 'Update Material' : 'Add Material'}</h2>
              <button className="modal-close" onClick={handleCloseModal}><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div className="form-grid">
                <div className="form-grid full-width" style={{ maxWidth: '800px', margin: '0 auto', paddingRight: '2rem' }}>
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
                  <div className="input-group full-width">
                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Total Quantity
                      <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>(Auto-calculated from locations)</span>
                    </label>
                    <input
                      readOnly
                      className="input-field"
                      style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', cursor: 'default', fontWeight: 'bold', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--primary)', fontSize: '1.1rem' }}
                      value={currentItem.locations?.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0) || 0}
                    />
                  </div>
                </div>
                <div className="full-width" style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem', gap: '0.75rem' }}>
                    <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--border)' }}></div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location Details</h3>
                    <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--border)' }}></div>
                  </div>

                  {currentItem.locations?.map((loc, index) => (
                    <div key={loc.id} className="form-grid" style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.03)',
                      padding: '1.5rem',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid rgba(59, 130, 246, 0.15)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                      marginBottom: '1rem',
                      position: 'relative'
                    }}>
                      {currentItem.locations!.length > 1 && (
                        <button type="button" onClick={() => handleRemoveLocation(loc.id)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Remove Location">
                          <Trash2 size={18} />
                        </button>
                      )}
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">BIN-Location</label>
                        <input required className="input-field" value={loc.location || ''} onChange={e => handleLocationChange(loc.id, 'location', e.target.value)} placeholder="e.g. Aisle 4" />
                      </div>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">RACK</label>
                        <input required className="input-field" value={loc.rack || ''} onChange={e => handleLocationChange(loc.id, 'rack', e.target.value)} placeholder="e.g. Rack A" />
                      </div>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">ROW</label>
                        <input required className="input-field" value={loc.row || ''} onChange={e => handleLocationChange(loc.id, 'row', e.target.value)} placeholder="e.g. Row 1" />
                      </div>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">Position</label>
                        <select required className="input-field" value={loc.position || ''} onChange={e => handleLocationChange(loc.id, 'position', e.target.value)}>
                          <option value="" disabled>Select Position</option>
                          <option value="Front(F)">Front(F)</option>
                          <option value="Back (B)">Back (B)</option>
                        </select>
                      </div>
                      <div className="input-group full-width" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                        <label className="input-label">Quantity</label>
                        <input required type="number" min={0} className="input-field" value={loc.quantity || 0} onChange={e => handleLocationChange(loc.id, 'quantity', Number(e.target.value))} />
                      </div>
                      <div className='form-group full-width' style={{ margin: 0, marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                        <button type="button" onClick={() => {
                          if (currentItem.id) {
                            if (window.confirm("Warning: Are you sure you want to update this location?")) {
                              updateItem(currentItem.id, currentItem as Omit<Item, 'id'>).then(() => {
                                showToast('Location and quantity updated!', 'warning');
                                fetchItems();
                              });
                            }
                          } else {
                            showToast('Save the item first before updating.', 'warning');
                          }
                        }} className="btn btn-warning" style={{ flex: 1, padding: '0.75rem' }}>
                          <Save size={18} style={{ marginRight: '0.5rem' }} /> Update Location
                        </button>
                        <button type="button" onClick={() => handleRemoveLocation(loc.id)} className="btn" style={{ padding: '0 1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }} title="Remove Location">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button type="button" className="btn btn-secondary" onClick={handleAddLocation} style={{ width: '100%', marginTop: '0.5rem', borderStyle: 'dashed' }}>
                    <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Another Location
                  </button>
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

      {/* Adjust Quantity Modal */}
      {isAdjustModalOpen && adjustItem && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Adjust Quantity</h2>
              <button className="modal-close" onClick={() => setIsAdjustModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAdjustQuantity}>
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Current Quantity for <strong>{adjustItem.name}</strong></p>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                  {adjustItem.locations?.find(l => l.id === adjustLocationId)?.quantity || 0}
                </div>
              </div>

              <div className="form-grid">
                <div className="input-group full-width">
                  <label className="input-label">Select Location</label>
                  <select required className="input-field" value={adjustLocationId} onChange={e => setAdjustLocationId(e.target.value)}>
                    {adjustItem.locations?.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.location} (Rack: {loc.rack}, Row: {loc.row})</option>
                    ))}
                  </select>
                </div>

                <div className="input-group full-width">
                  <label className="input-label">Action</label>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
                      <input
                        type="radio"
                        name="adjustAction"
                        value="add"
                        checked={adjustAction === 'add'}
                        onChange={() => setAdjustAction('add')}
                        style={{ accentColor: 'var(--primary)', width: '1.2rem', height: '1.2rem' }}
                      />
                      <span style={{ color: adjustAction === 'add' ? 'var(--primary)' : 'inherit' }}>Add (+)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
                      <input
                        type="radio"
                        name="adjustAction"
                        value="remove"
                        checked={adjustAction === 'remove'}
                        onChange={() => setAdjustAction('remove')}
                        style={{ accentColor: 'var(--danger)', width: '1.2rem', height: '1.2rem' }}
                      />
                      <span style={{ color: adjustAction === 'remove' ? 'var(--danger)' : 'inherit' }}>Remove (-)</span>
                    </label>
                  </div>
                </div>

                <div className="input-group full-width">
                  <label className="input-label">Amount</label>
                  <input
                    required
                    type="number"
                    min={1}
                    className="input-field"
                    value={adjustAmount === '' ? '' : adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value === '' ? '' : parseInt(e.target.value))}
                    placeholder="Enter quantity to add/remove"
                    style={{ fontSize: '1.1rem', padding: '0.75rem' }}
                  />
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: adjustAction === 'add' ? 'var(--primary)' : 'var(--danger)', border: 'none' }}>
                  {adjustAction === 'add' ? 'Add Quantity' : 'Remove Quantity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          backgroundColor: toastMessage.type === 'warning' ? '#F59E0B' : '#10B981',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          fontWeight: 500,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toastMessage.text}
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .table-row-hover:hover {
          background-color: var(--surface-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .btn-warning {
          background-color: #F59E0B;
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .btn-warning:hover {
          background-color: #D97706;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
          transform: translateY(-1px);
        }
        .btn-warning:active {
          transform: translateY(0);
        }
      `}} />
    </div>
  );
}
