import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, X, Search, Image as ImageIcon, CheckCircle } from 'lucide-react';
import resolveImg from '../../utils/resolveImg';

const Rooms = () => {
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [amenityInput, setAmenityInput] = useState('');
  const [featureInput, setFeatureInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  
  // Validation & Touched States
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  const initialRoomData = {
    roomNumber: '',
    roomName: '',
    roomType: '',
    bedType: '',
    price: '',
    rate3Hours: '',
    rate6Hours: '',
    rate12Hours: '',
    description: '',
    maxAdults: 2,
    maxChildren: 0,
    amenities: [],
    features: [],
    images: []
  };
  const [roomData, setRoomData] = useState(initialRoomData);
  const [filters, setFilters] = useState({ roomNumber: '', roomType: 'All', maxPrice: '', status: 'All' });

  const ownerSession = JSON.parse(localStorage.getItem('ownerSession'));
  const hotelId = ownerSession?.hotelId || ownerSession?.hotel_id || ownerSession?.id;

  const AMENITY_OPTIONS = ["Free Wi-Fi", "Air Conditioning", "Smart TV", "Mini Bar", "Coffee Maker", "Safe Box", "Balcony"];
  const FEATURE_OPTIONS = ["No Windows view", "Private bathroom", "Hair dryer", "Shower", "Free bottled water", "Non-smoking"];

  const showStatus = (msg) => {
    setNotification({ show: true, message: msg });
    setTimeout(() => setNotification({ show: false, message: '' }), 3000);
  };

  useEffect(() => { 
    fetchRooms(); 
  }, []);

  const fetchRooms = async () => {
    if (!hotelId) return;
    try {
      const res = await fetch(`/api/owner/rooms/${hotelId}`);
      const data = await res.json();
      if (res.ok) {
        const fetchedRooms = Array.isArray(data) ? data : [];
        setRooms(fetchedRooms);
      }
    } catch (err) {
      console.error("Error fetching rooms:", err);
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchNumber = room.roomNumber.toLowerCase().includes(filters.roomNumber.toLowerCase());
    const matchType = filters.roomType === 'All' || room.roomType === filters.roomType;
    const matchStatus = filters.status === 'All' || (room.status || 'Available') === filters.status;
    const matchPrice = filters.maxPrice === '' || Number(room.price) <= Number(filters.maxPrice);
    return matchNumber && matchType && matchStatus && matchPrice;
  });

  const generateNextRoomNumber = (existingRooms) => {
    if (!existingRooms || existingRooms.length === 0) return "101";
    const numericNumbers = existingRooms
      .map(r => parseInt(r.roomNumber, 10))
      .filter(n => !isNaN(n));

    if (numericNumbers.length > 0) {
      const maxNum = Math.max(...numericNumbers);
      return String(maxNum + 1);
    }
    return String(existingRooms.length + 1);
  };

  const openAddModal = () => {
    setIsEditing(false);
    setFieldErrors({});
    setTouchedFields({});
    setErrorMessage('');
    
    const nextRoomNum = generateNextRoomNumber(rooms);
    setRoomData({
      ...initialRoomData,
      roomNumber: nextRoomNum
    });
    setShowModal(true);
  };

  const openEditModal = (room) => {
    setIsEditing(true);
    setCurrentRoomId(room.id);
    setFieldErrors({});
    setTouchedFields({});
    setErrorMessage('');
    setRoomData({
      roomNumber: room.roomNumber,
      roomName: room.roomName || '',
      roomType: room.roomType,
      bedType: room.bedType || '1 Queen Bed',
      price: room.price,
      rate3Hours: room.rate3Hours || '',
      rate6Hours: room.rate6Hours || '',
      rate12Hours: room.rate12Hours || '',
      description: room.description || '',
      maxAdults: room.maxAdults || 2,
      maxChildren: room.maxChildren || 0,
      amenities: room.amenities || [],
      features: room.features || [],
      images: room.images && room.images.length > 0 ? room.images : []
    });
    setShowModal(true);
  };

  const validateSingleField = (key, value) => {
    let error = null;
    if (key === 'roomNumber' && !String(value).trim()) {
      error = "Room number is required.";
    }
    if (key === 'price') {
      if (!value || Number(value) <= 0) error = "Valid price per night is required.";
    }
    if (key === 'maxAdults' && (Number(value) < 1)) {
      error = "At least 1 adult capacity is required.";
    }
    if (key === 'maxChildren' && Number(value) < 0) {
      error = "Child capacity cannot be negative.";
    }
    return error;
  };

  const updateField = (key, value) => {
    setRoomData(prev => ({ ...prev, [key]: value }));
    if (touchedFields[key]) {
      const err = validateSingleField(key, value);
      setFieldErrors(prev => ({ ...prev, [key]: err }));
    }
  };

  const handleBlur = (key) => {
    setTouchedFields(prev => ({ ...prev, [key]: true }));
    const err = validateSingleField(key, roomData[key]);
    setFieldErrors(prev => ({ ...prev, [key]: err }));
  };

  const validateAllFields = () => {
    const errors = {};
    const newTouched = {};

    ["roomNumber", "price", "maxAdults", "maxChildren"].forEach(field => {
      newTouched[field] = true;
      const err = validateSingleField(field, roomData[field]);
      if (err) errors[field] = err;
    });

    setTouchedFields(newTouched);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addAmenity = (e) => {
    if (e.key === 'Enter' && amenityInput.trim() !== '') {
      e.preventDefault();
      if (!roomData.amenities.includes(amenityInput.trim())) {
        setRoomData({
          ...roomData,
          amenities: [...roomData.amenities, amenityInput.trim()]
        });
      }
      setAmenityInput('');
    }
  };

  const removeAmenity = (amenityToRemove) => {
    setRoomData({
      ...roomData,
      amenities: roomData.amenities.filter(a => a !== amenityToRemove)
    });
  };

  const addFeature = (e) => {
    if (e.key === 'Enter' && featureInput.trim() !== '') {
      e.preventDefault();
      if (!roomData.features.includes(featureInput.trim())) {
        setRoomData({
          ...roomData,
          features: [...roomData.features, featureInput.trim()]
        });
      }
      setFeatureInput('');
    }
  };

  const removeFeature = (featureToRemove) => {
    setRoomData({
      ...roomData,
      features: roomData.features.filter(f => f !== featureToRemove)
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setRoomData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const removeImage = (index) => {
    setRoomData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateAllFields()) {
      setErrorMessage("Please resolve the highlighted validation errors before saving.");
      return;
    }

    setErrorMessage('');
    try {
      const formData = new FormData();
      formData.append('hotelId', hotelId);
      formData.append('roomNumber', roomData.roomNumber);
      formData.append('roomName', roomData.roomName || '');
      formData.append('roomType', roomData.roomType);
      formData.append('bedType', roomData.bedType);
      
      formData.append('price', parseFloat(roomData.price) || 0);
      formData.append('rate3Hours', parseFloat(roomData.rate3Hours) || 0);
      formData.append('rate6Hours', parseFloat(roomData.rate6Hours) || 0);
      formData.append('rate12Hours', parseFloat(roomData.rate12Hours) || 0);
      formData.append('description', roomData.description || '');
      formData.append('maxAdults', parseInt(roomData.maxAdults) || 2);
      formData.append('maxChildren', parseInt(roomData.maxChildren) || 0);

      formData.append('amenities', JSON.stringify(roomData.amenities)); 
      formData.append('features', JSON.stringify(roomData.features)); // Isinasama na rin sa DB payload

      roomData.images.forEach((file) => {
        if (file instanceof File) {
          formData.append('images', file);
        } else if (typeof file === 'string' && file.trim() !== '') {
          formData.append('existing_images', file);
        }
      });

      const url = isEditing 
        ? `/api/owner/rooms/update/${currentRoomId}` 
        : `/api/owner/rooms/add`;
    
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        body: formData 
      });

      if (res.ok) { 
        setShowModal(false); 
        fetchRooms(); 
        setRoomData(initialRoomData); 

        const successMsg = isEditing 
          ? `Room ${roomData.roomNumber} updated successfully!` 
          : `Room ${roomData.roomNumber} created successfully!`;
        showStatus(successMsg);
      } else {
        const errorData = await res.json();
        setErrorMessage("Error: " + (errorData.error || "Failed to process room request."));
      }
    } catch (err) {
      console.error("Submission error:", err);
      setErrorMessage("An unexpected server connection error occurred.");
    }
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'Available': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20';
      case 'Occupied': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20';
      case 'Maintenance': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20';
      default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10';
    }
  };

  const confirmDelete = async () => {
    if (!roomToDelete) return;
    try {
      const res = await fetch(`/api/owner/rooms/delete/${roomToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setRooms(rooms.filter(room => room.id !== roomToDelete.id));
        setShowDeleteModal(false);
        showStatus(`Room ${roomToDelete.roomNumber} deleted successfully.`);
        setRoomToDelete(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-8 font-sans dark:bg-slate-950 dark:text-slate-100">
      
      {/* Header Bar */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rooms Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage hotel rooms, short-stay pricing tiers, capacities, and uploaded media assets.</p>
        </div>
        <button 
          onClick={openAddModal} 
          className="bg-emerald-800 text-white px-5 py-2.5 rounded text-xs font-bold flex items-center gap-2 hover:bg-emerald-900 shadow-sm transition-colors"
        >
          <Plus size={16} /> Add New Room
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={15} />
          <input 
            type="text" 
            placeholder="Search Room #..." 
            className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-4 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" 
            value={filters.roomNumber} 
            onChange={(e) => setFilters({...filters, roomNumber: e.target.value})} 
          />
        </div>
        <select 
          className="rounded border border-slate-300 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" 
          value={filters.roomType} 
          onChange={(e) => setFilters({...filters, roomType: e.target.value})}
        >
            <option value="All">All Types</option>
            {[...new Set(rooms.map(room => room.roomType).filter(Boolean).concat(['Single', 'Double', 'Suite', 'Deluxe']))].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select 
          className="rounded border border-slate-300 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" 
          value={filters.status} 
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
            <option value="All">All Statuses</option>
            {['Available', 'Occupied', 'Maintenance', 'Cleaning'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-slate-500">MAX ₱</span>
          <input 
            type="number" 
            placeholder="Max Price" 
            className="w-full rounded border border-slate-300 bg-white py-2 pl-14 pr-4 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" 
            value={filters.maxPrice} 
            onChange={(e) => setFilters({...filters, maxPrice: e.target.value})} 
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
            <tr>
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Room Info</th>
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Capacity & Bed</th>
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Price / Night</th>
              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</th>
              <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {filteredRooms.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-slate-400">No rooms found matching your filter configuration.</td>
              </tr>
            ) : (
              filteredRooms.map((room) => (
                <tr key={room.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
                        {room.images?.[0] ? (
                          <img
                            src={resolveImg(room.images[0])}
                            className="w-full h-full object-cover"
                            alt=""
                            onError={(e) => { e.target.src = '/images/deluxe-room.jpg'; }}
                          />
                        ) : (
                          <ImageIcon className="m-auto h-full text-slate-300" size={16} />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white">Room {room.roomNumber}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{room.roomName || room.roomType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">
                      <div>{room.maxAdults} Adults ({room.bedType || 'Standard'})</div>
                      <div className="text-[10px] text-slate-400">{room.maxChildren} Kids</div>
                  </td>
                  <td className="px-6 py-3.5 font-bold text-emerald-700 dark:text-emerald-400">₱{Number(room.price).toLocaleString()}</td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusStyles(room.status)}`}>
                      {room.status || 'Available'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex justify-end gap-3 text-slate-400 dark:text-slate-500">
                      <button onClick={() => openEditModal(room)} className="hover:text-blue-500 transition-colors"><Edit size={16} /></button>
                      <button onClick={() => { setRoomToDelete(room); setShowDeleteModal(true); }} className="hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
            
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
                <div>
                  <h2 className="font-bold text-base text-slate-900 dark:text-white">
                    {isEditing ? 'Update Room Information' : 'New Room Registration'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isEditing ? `Modifying settings for Room ${roomData.roomNumber}` : 'Room Number is auto-incremented based on existing inventory.'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
            </div>
            
            {/* Modal Error Banner */}
            {errorMessage && (
              <div className="mb-5 p-3 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600 rounded-r text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              
              {/* Left Column: Basic Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Room # <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          value={roomData.roomNumber} 
                          readOnly={!isEditing} 
                          title={!isEditing ? "Auto-generated sequence number" : ""}
                          className={`w-full rounded border p-2.5 outline-none font-mono ${
                            !isEditing 
                              ? "bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400" 
                              : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                          }`}
                          onChange={e => updateField('roomNumber', e.target.value)} 
                          onBlur={() => handleBlur('roomNumber')}
                        />
                        {!isEditing && <span className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 block">Auto-counted</span>}
                    </div>
                    <div>
                        <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Room Name</label>
                        <input 
                          type="text" 
                          value={roomData.roomName} 
                          placeholder="e.g. Premium Room without window" 
                          className="w-full rounded border border-slate-300 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:placeholder:text-slate-500" 
                          onChange={e => updateField('roomName', e.target.value)} 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Type</label>
                        <select 
                          value={roomData.roomType} 
                          className="w-full rounded border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800" 
                          onChange={e => updateField('roomType', e.target.value)}
                        >
                            {[...new Set(rooms.map(room => room.roomType).filter(Boolean).concat(['Single', 'Double', 'Suite', 'Deluxe']))].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Bed Type</label>
                        <select 
                          value={roomData.bedType} 
                          className="w-full rounded border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800" 
                          onChange={e => updateField('bedType', e.target.value)}
                        >
                            {['1 Single Bed', '1 Double Bed', '1 Queen Bed', '1 King Bed', '2 Twin Beds'].map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Price / Night (₱) <span className="text-red-500">*</span></label>
                        <input 
                          type="number" 
                          value={roomData.price} 
                          placeholder="1418"
                          className={`w-full rounded border p-2.5 outline-none ${
                            touchedFields.price && fieldErrors.price ? "border-red-500 bg-red-50/20" : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                          }`} 
                          onChange={e => updateField('price', e.target.value)} 
                          onBlur={() => handleBlur('price')}
                        />
                        {touchedFields.price && fieldErrors.price && (
                          <span className="text-[10px] text-red-600 mt-0.5 block">{fieldErrors.price}</span>
                        )}
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Capacity Breakdown</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="number" 
                          min="1"
                          placeholder="Adults"
                          className="w-full rounded border border-slate-300 bg-white p-2 text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" 
                          value={roomData.maxAdults} 
                          onChange={e => updateField('maxAdults', e.target.value)} 
                          onBlur={() => handleBlur('maxAdults')}
                          title="Max Adults"
                        />
                        <input 
                          type="number" 
                          min="0"
                          placeholder="Children"
                          className="w-full rounded border border-slate-300 bg-white p-2 text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" 
                          value={roomData.maxChildren} 
                          onChange={e => updateField('maxChildren', e.target.value)} 
                          title="Max Children"
                        />
                      </div>
                    </div>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Short-Stay Rates (PHP)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[['rate3Hours', '3 Hours'], ['rate6Hours', '6 Hours'], ['rate12Hours', '12 Hours']].map(([key, label]) => (
                      <div key={key}>
                        <span className="mb-1 block text-[10px] text-slate-400">{label}</span>
                        <input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          placeholder="0" 
                          value={roomData[key]} 
                          className="w-full rounded border border-slate-300 p-2 outline-none dark:border-slate-700 dark:bg-slate-800" 
                          onChange={e => updateField(key, e.target.value)} 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Description</label>
                    <textarea 
                      rows="3" 
                      className="w-full resize-none rounded border border-slate-300 p-2.5 outline-none dark:border-slate-700 dark:bg-slate-800" 
                      value={roomData.description} 
                      onChange={e => updateField('description', e.target.value)}
                    ></textarea>
                </div>
              </div>

              {/* Right Column: Features, Amenities & Images */}
              <div className="space-y-4">
                {/* Room Features / Inclusions (Gaya ng No windows view, private bathroom, etc.) */}
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Room Features & Facilities</label>
                  <div className="relative mb-2">
                    <input 
                      type="text" 
                      placeholder="Type feature (e.g. No Windows view) & press Enter..." 
                      className="w-full rounded border border-slate-300 p-2.5 outline-none transition-colors focus:border-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:placeholder:text-slate-500"
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={addFeature}
                    />
                    <Plus className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2 min-h-[30px]">
                    {roomData.features.map((feature, idx) => (
                      <span key={idx} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[11px] font-bold dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                        {feature}
                        <button type="button" onClick={() => removeFeature(feature)} className="hover:text-red-500">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {FEATURE_OPTIONS.filter(opt => !roomData.features.includes(opt)).map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setRoomData({...roomData, features: [...roomData.features, option]})}
                        className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        + {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Amenities</label>
                  <div className="relative mb-2">
                    <input 
                      type="text" 
                      placeholder="Type amenity and press Enter..." 
                      className="w-full rounded border border-slate-300 p-2.5 outline-none transition-colors focus:border-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:placeholder:text-slate-500"
                      value={amenityInput}
                      onChange={(e) => setAmenityInput(e.target.value)}
                      onKeyDown={addAmenity}
                    />
                    <Plus className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2 min-h-[30px]">
                    {roomData.amenities.map((amenity, idx) => (
                      <span key={idx} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-bold dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                        {amenity}
                        <button type="button" onClick={() => removeAmenity(amenity)} className="hover:text-red-500">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {AMENITY_OPTIONS.filter(opt => !roomData.amenities.includes(opt)).map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setRoomData({...roomData, amenities: [...roomData.amenities, option]})}
                        className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        + {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Room Images */}
                <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Upload Room Images</label>
                    <div className="space-y-2">
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            className="hidden" 
                            id="room-images"
                            onChange={handleImageUpload} 
                        />
                        <label htmlFor="room-images" className="flex w-full cursor-pointer items-center justify-center rounded border border-dashed border-slate-300 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
                            <div className="text-center">
                                <ImageIcon className="mx-auto text-slate-400 mb-1" size={18} />
                                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Click to attach photos</span>
                            </div>
                        </label>
                        
                        <div className="grid grid-cols-3 gap-2">
                            {roomData.images.map((file, idx) => {
                                let imgSrc = "";
                                if (file instanceof File) {
                                    imgSrc = URL.createObjectURL(file);
                                } else if (typeof file === 'string' && file !== '') {
                                    imgSrc = resolveImg(file);
                                }

                                if (!imgSrc) return null;

                                return (
                                    <div key={idx} className="relative group aspect-square rounded overflow-hidden border border-slate-200 dark:border-slate-700">
                                        <img src={imgSrc} className="w-full h-full object-cover" alt="preview" />
                                        <button 
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button 
                      type="button" 
                      onClick={() => setShowModal(false)} 
                      className="flex-1 rounded py-2 border border-slate-300 font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-2 py-2 px-6 bg-emerald-800 text-white rounded font-bold hover:bg-emerald-900 shadow-sm"
                    >
                        {isEditing ? 'Save Changes' : 'Confirm & Create Room'}
                    </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                  <AlertTriangle size={22} />
                </div>
                <h2 className="mb-1 font-bold text-base text-slate-900 dark:text-white">Delete Room Record?</h2>
                <p className="mb-6 text-xs text-slate-500 dark:text-slate-400">Removing Room {roomToDelete?.roomNumber} from database is a permanent action.</p>
                <div className="flex flex-col gap-2 text-xs font-bold">
                    <button onClick={confirmDelete} className="w-full py-2.5 bg-red-600 text-white rounded hover:bg-red-700 shadow-sm">Confirm Deletion</button>
                    <button onClick={() => setShowDeleteModal(false)} className="w-full py-2 text-slate-600 dark:text-slate-300">Cancel</button>
                </div>
            </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {notification.show && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded shadow-xl z-50 text-xs font-semibold">
          <div className="bg-emerald-500 p-0.5 rounded-full">
            <CheckCircle size={14} className="text-white" />
          </div>
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
};

export default Rooms;
