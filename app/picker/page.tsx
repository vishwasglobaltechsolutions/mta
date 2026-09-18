"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Filter, Plus, Minus, Save, Package, QrCode, X, FileText, Download, Printer } from 'lucide-react';
import { getItems, updateItemQuantity, getMovements, Item, ItemLocation, MovementLog } from '@/lib/firebase';
import { Html5Qrcode } from 'html5-qrcode';

export default function PickerPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');

  const [adjustAmount, setAdjustAmount] = useState<{ [id: string]: number | '' }>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const [dispatchModal, setDispatchModal] = useState<{
    isOpen: boolean;
    item: Item | null;
    location: ItemLocation | null;
    partyName: string;
    quantity: number | '';
  }>({
    isOpen: false,
    item: null,
    location: null,
    partyName: '',
    quantity: ''
  });

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Report State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [movements, setMovements] = useState<MovementLog[]>([]);
  const [reportFilter, setReportFilter] = useState<'daily' | 'monthly' | 'annual' | 'all_time'>('daily');

  const fetchReports = async () => {
    try {
      const data = await getMovements();
      setMovements(data);
    } catch (error) {
      console.error("Error fetching reports", error);
      showToast("Failed to fetch reports", "error");
    }
  };

  const handleOpenReport = () => {
    fetchReports();
    setIsReportModalOpen(true);
  };

  const filteredMovements = movements.filter(m => {
    const d = new Date(m.timestamp);
    const now = new Date();
    if (reportFilter === 'daily') {
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (reportFilter === 'monthly') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (reportFilter === 'annual') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const comprehensiveReport = items.map(item => {
    const itemMovements = filteredMovements.filter(m => m.itemId === item.id);
    itemMovements.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return { item, movements: itemMovements };
  });

  const handleDownloadPickerReport = () => {

    if (filteredMovements.length === 0) {
      alert("No movement data available to download.");
      return;
    }

    const headers = ["Date", "Item Name", "SKU", "Action", "Old Quantity", "New Quantity", "Difference", "Location", "Rack", "Row", "Position", "Party Name"];
    const csvContent = [
      headers.join(","),
      ...filteredMovements.map(m => {
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
    link.setAttribute("download", `picker_movement_${reportFilter}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleExpand = (id: string | undefined) => {
    if (!id) return;
    setExpandedItemId(prev => prev === id ? null : id);
  };

  // QR Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItem, setScannedItem] = useState<Item | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getItems();
      setItems(data);
      setFilteredItems(data);

      setAdjustAmount({});
    } catch (error) {
      console.error("Error fetching items", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    let result = items;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.sku.toLowerCase().includes(lowerQuery)
      );
    }
    setFilteredItems(result);
  }, [searchQuery, items]);

  // QR Scanner Logic
  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        (errorMessage) => {
          // parse errors are frequent, ignore them
        }
      ).catch(err => {
        const errMsg = typeof err === 'string' ? err : (err?.message || '');
        if (errMsg.includes('Camera streaming not supported') || errMsg.includes('mediaDevices')) {
          showToast("Camera access requires HTTPS. Please use the 'Upload QR Image' button below.", "error");
        }
        // Don't close the modal so they can use the file upload fallback!
      });
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isScanning, items]);

  const handleSuccessfulScan = (decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);
      const foundItem = items.find(i => i.id === data.id || i.sku === data.sku);
      if (foundItem) {
        setScannedItem(foundItem);
        setSearchQuery(foundItem.sku); // Also filter the list
        setIsScanning(false);
      } else {
        showToast("Scanned item not found in inventory!", "error");
      }
    } catch (e) {
      console.error("Invalid QR Code", e);
      showToast("Invalid QR Code Format. Make sure it was generated by the Admin Panel.", "error");
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
          }).catch(() => { });
        } else {
          scannerRef.current.clear();
          scannerRef.current = null;
        }
      } catch (e) {
        // Ignore transition errors during rapid unmounting
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (scannerRef.current) {
        scannerRef.current.scanFile(file, true)
          .then(decodedText => {
            handleSuccessfulScan(decodedText);
          })
          .catch(err => {
            showToast("Failed to read QR code from image.", "error");
            console.error(err);
          });
      }
    }
  };

  const handleAdjustChange = (locId: string, value: string) => {
    if (value === '') {
      setAdjustAmount(prev => ({ ...prev, [locId]: '' }));
      return;
    }
    const num = parseInt(value);
    if (!isNaN(num) && num >= 0) {
      setAdjustAmount(prev => ({ ...prev, [locId]: num }));
    }
  };

  const saveAdjustment = async (itemId: string, locationId: string, action: 'add' | 'remove') => {
    setSavingId(locationId);
    try {
      const amount = adjustAmount[locationId];
      if (typeof amount !== 'number' || amount <= 0) {
        setSavingId(null);
        return;
      }

      const itemToUpdate = items.find(i => i.id === itemId);

      if (itemToUpdate && itemToUpdate.locations) {
        const targetLocation = itemToUpdate.locations.find(l => l.id === locationId);
        if (targetLocation) {
          if (action === 'remove' && targetLocation.quantity < amount) {
            alert('Cannot remove more than current quantity!');
            setSavingId(null);
            return;
          }

          const newQty = action === 'add'
            ? targetLocation.quantity + amount
            : targetLocation.quantity - amount;

          const updatedLocations = itemToUpdate.locations.map(loc =>
            loc.id === locationId ? { ...loc, quantity: newQty } : loc
          );

          await updateItemQuantity(itemId, updatedLocations, {
            name: itemToUpdate.name,
            sku: itemToUpdate.sku,
            oldQuantity: targetLocation.quantity,
            newQuantity: newQty,
            difference: action === 'add' ? amount : -amount,
            location: targetLocation.location,
            rack: targetLocation.rack,
            row: targetLocation.row,
            position: targetLocation.position
          });

          // Update local state
          const updatedItems = items.map(item => {
            if (item.id === itemId) {
              return { ...item, locations: updatedLocations };
            }
            return item;
          });
          setItems(updatedItems);

          // If scanned item modal is open, update it
          if (scannedItem && scannedItem.id === itemId) {
            setScannedItem({ ...scannedItem, locations: updatedLocations });
          }

          // Clear input after success
          setAdjustAmount(prev => ({ ...prev, [locationId]: '' }));
        }
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDispatch = async () => {
    if (!dispatchModal.item || !dispatchModal.location || !dispatchModal.partyName || !dispatchModal.quantity) {
      alert("Please fill all details.");
      return;
    }
    const amount = Number(dispatchModal.quantity);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    const { item, location, partyName } = dispatchModal;
    const itemId = item.id;
    if (!itemId) return;

    if (location.quantity < amount) {
      alert(`Cannot dispatch ${amount}. Only ${location.quantity} available at this location.`);
      return;
    }

    setSavingId(location.id);

    try {
      const newQty = location.quantity - amount;
      const updatedLocations = item.locations!.map(loc =>
        loc.id === location.id ? { ...loc, quantity: newQty } : loc
      );

      await updateItemQuantity(itemId, updatedLocations, {
        name: item.name,
        sku: item.sku,
        oldQuantity: location.quantity,
        newQuantity: newQty,
        difference: -amount,
        location: location.location,
        rack: location.rack,
        row: location.row,
        position: location.position,
        partyName: partyName
      });

      // Update local state
      const updatedItems = items.map(i => {
        if (i.id === itemId) {
          return { ...i, locations: updatedLocations };
        }
        return i;
      });
      setItems(updatedItems);

      if (scannedItem && scannedItem.id === itemId) {
        setScannedItem({ ...scannedItem, locations: updatedLocations });
      }

      setDispatchModal({ isOpen: false, item: null, location: null, partyName: '', quantity: '' });
      showToast(`Successfully dispatched ${amount} item(s) to ${partyName}`);
    } catch (error) {
      console.error("Error dispatching item:", error);
      alert("Failed to dispatch item.");
    } finally {
      setSavingId(null);
    }
  };

  const renderItemCard = (item: Item, isModal: boolean = false) => {
    const isExpanded = isModal || expandedItemId === item.id;

    return (
      <div
        key={item.id}
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          width: '100%',
          marginBottom: isModal ? '0' : '1.5rem',
          cursor: isModal ? 'default' : 'pointer',
          boxShadow: isExpanded && !isModal ? '0 8px 30px rgba(0,0,0,0.12)' : 'var(--shadow-sm)',
          border: isExpanded && !isModal ? '1px solid var(--primary)' : '1px solid var(--border)',
          transition: 'all 0.3s ease'
        }}
        onClick={() => !isModal && toggleExpand(item.id)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: '1 1 min-content' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.35rem', lineHeight: '1.2' }}>{item.name}</h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'var(--surface-hover)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {item.sku}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', backgroundColor: 'rgba(59, 130, 246, 0.08)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.15)', minWidth: '90px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem', fontWeight: '600' }}>Total Qty</span>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', lineHeight: 1 }}>
              {item.locations?.reduce((sum, l) => sum + (l.quantity || 0), 0) || 0}
            </span>
          </div>
        </div>

        {isExpanded && (
          <div className="animate-fade-in" style={{ fontSize: '0.875rem', marginBottom: '1.5rem', padding: '1.25rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={14} /> Material Details
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
              <div><div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.125rem', textTransform: 'uppercase' }}>Size</div><div style={{ fontWeight: '500', color: 'var(--text-main)' }}>{item.size || '-'}</div></div>
              <div><div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.125rem', textTransform: 'uppercase' }}>Colour</div><div style={{ fontWeight: '500', color: 'var(--text-main)' }}>{item.colour || '-'}</div></div>
              <div><div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.125rem', textTransform: 'uppercase' }}>UPPS</div><div style={{ fontWeight: '500', color: 'var(--text-main)' }}>{item.upps || '-'}</div></div>
              <div><div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.125rem', textTransform: 'uppercase' }}>CORE</div><div style={{ fontWeight: '500', color: 'var(--text-main)' }}>{item.core || '-'}</div></div>
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} onClick={(e) => e.stopPropagation()}>
          <h4 style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Inventory Locations
          </h4>

          {item.locations && item.locations.length > 0 ? (
            item.locations.map(loc => (
              <div key={loc.id} style={{
                display: 'flex', flexDirection: 'column', gap: '0.75rem',
                padding: '1rem',
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: 'var(--primary)', opacity: 0.8 }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', paddingLeft: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      {loc.location}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span><span style={{ opacity: 0.7 }}>Rack:</span> <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{loc.rack || '-'}</span></span>
                      <span><span style={{ opacity: 0.7 }}>Row:</span> <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{loc.row || '-'}</span></span>
                      <span><span style={{ opacity: 0.7 }}>Pos:</span> <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{loc.position || '-'}</span></span>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                    {loc.quantity} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>Nos</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap', paddingLeft: '0.5rem' }}>
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    className="input-field"
                    style={{ flex: '1 1 80px', padding: '0.75rem', textAlign: 'center', fontSize: '1rem', fontWeight: '600', minWidth: '80px', height: '44px', border: '1px solid var(--border)' }}
                    value={adjustAmount[loc.id] !== undefined ? adjustAmount[loc.id] : ''}
                    onChange={(e) => handleAdjustChange(loc.id, e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    style={{ flex: '2 1 100px', display: 'flex', justifyContent: 'center', padding: '0 0.5rem', height: '44px', fontWeight: '600' }}
                    onClick={() => item.id && saveAdjustment(item.id, loc.id, 'add')}
                    disabled={savingId === loc.id || !adjustAmount[loc.id]}
                  >
                    <Plus size={18} style={{ marginRight: '0.25rem' }} /> Add
                  </button>
                  <button
                    className="btn"
                    style={{ flex: '2 1 100px', display: 'flex', justifyContent: 'center', padding: '0 0.5rem', height: '44px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: '600' }}
                    onClick={() => setDispatchModal({ isOpen: true, item, location: loc, partyName: '', quantity: adjustAmount[loc.id] || '' })}
                    disabled={savingId === loc.id}
                  >
                    <Minus size={18} style={{ marginRight: '0.25rem' }} /> Dispatch
                  </button>
                </div>

                {savingId === loc.id && (
                  <div className="animate-pulse" style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600', marginTop: '0.25rem' }}>Updating inventory...</div>
                )}
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
              No inventory locations recorded for this material.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" className="btn-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={24} />
          </Link>
          <h1 className="header-title" style={{ margin: 0, fontSize: '1.75rem' }}>Picker Operations</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={handleOpenReport} style={{ padding: '0.75rem 1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} /> Reports
          </button>
          <button className="btn btn-primary" onClick={() => setIsScanning(true)} style={{ padding: '0.75rem 1.25rem', fontWeight: '600' }}>
            <QrCode size={20} style={{ marginRight: '0.5rem' }} /> Scan QR
          </button>
        </div>
      </div>

      {/* Floating Search Bar */}
      <div style={{ marginBottom: '2.5rem', position: 'relative' }}>
        <Search size={22} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="input-field"
          style={{ width: '100%', padding: '1rem 3rem', height: '56px', fontSize: '1.05rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}
          placeholder="Search items by name or SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="btn-icon" onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'transparent', border: 'none' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        )}
      </div>

      {/* Grid of Items */}
      {loading ? (
        <div className="empty-state" style={{ padding: '4rem 1rem' }}>
          <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Package size={40} style={{ color: 'var(--border)' }} />
            <div style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Loading inventory...</div>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state" style={{ padding: '4rem 1rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <Package size={56} style={{ margin: '0 auto 1.5rem', opacity: 0.3, color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: '600' }}>No materials found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search query.</p>
        </div>
      ) : (
        <div className="data-grid" style={{ gap: '1.5rem' }}>
          {filteredItems.map(item => renderItemCard(item))}
        </div>
      )}

      {/* Scanner Modal */}
      {isScanning && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{
            padding: '1.25rem',
            maxWidth: '450px',
            width: '95%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <style>{`
              #qr-reader {
                width: 100% !important;
                border: none !important;
              }
              #qr-reader video {
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                border-radius: 8px !important;
                object-fit: cover;
              }
              #qr-reader img {
                max-width: 100% !important;
              }
            `}</style>
            <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem' }}>
                <QrCode size={24} color="var(--primary)" /> Scan Item
              </h2>
              <button className="btn-icon modal-close" onClick={() => setIsScanning(false)}><X size={24} /></button>
            </div>
            <div id="qr-reader" style={{ width: '100%', margin: '0 auto', overflow: 'hidden', borderRadius: 'var(--radius-lg)', border: '2px solid var(--primary)', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.2)' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4', margin: 0 }}>
                Point your camera at an item's QR code to quickly find it in the inventory.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>OR</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
              </div>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', padding: '0.85rem', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
              >
                Upload QR Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanned Item Modal */}
      {scannedItem && !isScanning && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{ padding: '1rem', background: 'transparent', border: 'none', boxShadow: 'none', maxWidth: '600px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '0.75rem' }}>
              <button className="btn-icon" onClick={() => setScannedItem(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '50%', padding: '0.5rem', boxShadow: 'var(--shadow-md)' }}>
                <X size={24} color="var(--text-main)" />
              </button>
            </div>
            {renderItemCard(scannedItem, true)}
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {dispatchModal.isOpen && dispatchModal.item && dispatchModal.location && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000 }}>
          <div className="modal-content animate-fade-in" style={{ padding: '2rem', maxWidth: '450px', width: '90%', borderRadius: 'var(--radius-lg)' }}>
            <div className="modal-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem', color: 'var(--text-main)' }}>
                Dispatch Item
              </h2>
              <button className="btn-icon modal-close" onClick={() => setDispatchModal({ isOpen: false, item: null, location: null, partyName: '', quantity: '' })}><X size={24} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem', backgroundColor: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: 'white' }}>{dispatchModal.item.name}</h3>
              <div style={{ fontSize: '0.95rem', color: 'white', marginBottom: '0.25rem' }}>Location: <strong>{dispatchModal.location.location}</strong></div>
              <div style={{ fontSize: '0.95rem', color: 'white' }}>Available Quantity: <strong>{dispatchModal.location.quantity}</strong></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-main)' }}>Dispatch Party Name</label>
                <input
                  type="text"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                  placeholder="Enter party name..."
                  value={dispatchModal.partyName}
                  onChange={(e) => setDispatchModal(prev => ({ ...prev, partyName: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-main)' }}>Quantity to Dispatch</label>
                <input
                  type="number"
                  min="1"
                  max={dispatchModal.location.quantity}
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                  placeholder="Enter quantity..."
                  value={dispatchModal.quantity}
                  onChange={(e) => setDispatchModal(prev => ({ ...prev, quantity: e.target.value ? Number(e.target.value) : '' }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                className="btn"
                style={{ flex: 1, padding: '0.75rem', fontWeight: '600', border: '1px solid var(--border)' }}
                onClick={() => setDispatchModal({ isOpen: false, item: null, location: null, partyName: '', quantity: '' })}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: '0.75rem', fontWeight: '600', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleDispatch}
                disabled={!dispatchModal.partyName || !dispatchModal.quantity || dispatchModal.quantity > dispatchModal.location.quantity || savingId === dispatchModal.location.id}
              >
                {savingId === dispatchModal.location.id ? 'Dispatching...' : 'Confirm Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, alignItems: 'flex-start', paddingTop: '4rem' }}>
          <div className="modal-content animate-fade-in report-printable report-printable-scroll" style={{ padding: '2rem', maxWidth: '900px', width: '95%', borderRadius: 'var(--radius-lg)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', marginTop: 0 }}>
            <div className="modal-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.6rem', fontWeight: '700', color: 'white' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--primary)', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
                  <FileText size={22} color="white" />
                </span>
                Items Movement Report
              </h2>
              <button className="btn-icon modal-close no-print" onClick={() => setIsReportModalOpen(false)}><X size={24} /></button>
            </div>

            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--surface-hover)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                <button
                  style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: 'var(--radius-sm)', background: reportFilter === 'daily' ? 'var(--primary)' : 'transparent', color: reportFilter === 'daily' ? 'white' : 'var(--text-main)', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s' }}
                  onClick={() => setReportFilter('daily')}
                >Daily</button>
                <button
                  style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: 'var(--radius-sm)', background: reportFilter === 'monthly' ? 'var(--primary)' : 'transparent', color: reportFilter === 'monthly' ? 'white' : 'var(--text-main)', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s' }}
                  onClick={() => setReportFilter('monthly')}
                >Monthly</button>
                <button
                  style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: 'var(--radius-sm)', background: reportFilter === 'annual' ? 'var(--primary)' : 'transparent', color: reportFilter === 'annual' ? 'white' : 'var(--text-main)', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s' }}
                  onClick={() => setReportFilter('annual')}
                >Annual</button>
                <button
                  style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: 'var(--radius-sm)', background: reportFilter === 'all_time' ? 'var(--primary)' : 'transparent', color: reportFilter === 'all_time' ? 'white' : 'var(--text-main)', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s' }}
                  onClick={() => setReportFilter('all_time')}
                >All Time</button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', color: '#0f172a' }}>
                  <Printer size={18} /> Download PDF
                </button>
                <button className="btn btn-primary" onClick={handleDownloadPickerReport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Download size={18} /> Download CSV
                </button>
              </div>
            </div>

            <div className="report-printable-scroll" style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              {comprehensiveReport.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No items found in inventory.
                </div>
              ) : (
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead className="no-print" style={{ backgroundColor: 'var(--surface-hover)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ padding: '1rem', paddingLeft: '2.5rem', width: '25%', textAlign: 'left', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Item Name </th>
                      <th style={{ padding: '1rem', width: '15%', textAlign: 'center', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Quantity</th>
                      <th style={{ padding: '1rem', width: '20%', textAlign: 'left', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Action</th>
                      <th style={{ padding: '1rem', width: '20%', textAlign: 'left', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Party</th>
                      <th style={{ padding: '1rem', width: '20%', textAlign: 'left', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comprehensiveReport.map(({ item, movements }) => {
                      const addedQty = movements.filter(m => m.action === 'add').reduce((acc, m) => acc + Math.abs(m.difference), 0);
                      const dispatchedQty = movements.filter(m => m.action === 'remove').reduce((acc, m) => acc + Math.abs(m.difference), 0);
                      const dispatchedParties = Array.from(new Set(movements.filter(m => m.action === 'remove' && m.partyName).map(m => m.partyName))).join(', ');

                      return (
                        <React.Fragment key={item.id}>
                          <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '2px solid var(--border)', borderTop: '4px solid var(--background)' }}>
                            <td style={{ padding: '1rem', paddingLeft: '2.5rem', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: '700', color: 'white', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{item.name}</div>
                              <div style={{ color: 'var(--primary)', display: 'inline-block', fontWeight: '600', fontSize: '0.8rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>{item.sku}</div>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'top' }}>
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'var(--surface-hover)', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
                                <span style={{ fontWeight: '700', color: 'var(--accent)', fontSize: '1.1rem', lineHeight: '1' }}>
                                  {item.locations?.reduce((acc, l) => acc + (l.quantity || 0), 0) || 0}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>+{addedQty}</span>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Added</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>-{dispatchedQty}</span>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Dispatched</span>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '1rem', verticalAlign: 'top', fontSize: '0.85rem' }}>
                              {dispatchedParties ? (
                                <span style={{ color: 'var(--text-muted)' }}>{dispatchedParties}</span>
                              ) : (
                                <span style={{ color: '#64748b' }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {item.locations && item.locations.length > 0
                                  ? item.locations.map((l, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < item.locations!.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: i < item.locations!.length - 1 ? '0.25rem' : '0' }}>
                                      <span style={{ color: '#cbd5e1' }}>{l.location}</span>
                                      <span style={{ fontWeight: '600', color: 'white' }}>{l.quantity}</span>
                                    </div>
                                  ))
                                  : <span style={{ color: '#ef4444' }}>No stock available</span>}
                              </div>
                            </td>
                          </tr>
                          {movements.length > 0 ? (
                            movements.map(m => (
                              <tr key={m.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <td style={{ width: '25%', padding: '0.85rem 1rem', paddingLeft: '3.5rem', fontSize: '0.85rem' }}>
                                  <div style={{ fontWeight: '500', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: '#64748b' }}>↳</span> {new Date(m.timestamp).toLocaleDateString()}
                                  </div>
                                  <div style={{ color: '#cbd5e1', fontSize: '0.75rem', marginTop: '0.1rem', paddingLeft: '1.2rem' }}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </td>
                                <td style={{ width: '15%', padding: '0.85rem 1rem', textAlign: 'center', fontWeight: '700', fontSize: '1.05rem', color: 'white' }}>{Math.abs(m.difference)}</td>
                                <td style={{ width: '20%', padding: '0.85rem 1rem' }}>
                                  <span className="badge" style={{ backgroundColor: m.action === 'add' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: m.action === 'add' ? '#10b981' : '#ef4444', borderColor: m.action === 'add' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)', padding: '0.35rem 0.6rem', fontWeight: '600' }}>
                                    {m.action === 'add' ? 'Stock In' : 'Dispatch'}
                                  </span>
                                </td>
                                <td style={{ width: '20%', padding: '0.85rem 1rem', wordBreak: 'break-word' }}>
                                  <div style={{ fontWeight: '500', color: 'white' }}>{m.partyName ? m.partyName : '-'}</div>
                                </td>
                                <td style={{ width: '20%', padding: '0.85rem 1rem', wordBreak: 'break-word' }}>
                                  <div style={{ fontWeight: '500', color: 'white' }}>{m.location ? m.location : '-'}</div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                              <td colSpan={5} style={{ padding: '0.75rem 1.25rem', paddingLeft: '2rem', color: 'var(--text-muted)' }}>
                                No movements in this period.
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '1.25rem 2rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '0.75rem',
          zIndex: 9999,
          fontWeight: '600',
          fontSize: '1.1rem',
          animation: 'fadeIn 0.3s ease-out forwards'
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
