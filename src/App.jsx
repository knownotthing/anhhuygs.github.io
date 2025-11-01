import React, { useState, useEffect, useRef } from 'react';
import { Camera, User, FileText, Download, Plus, X } from 'lucide-react';

function GasStationApp() {
  const [activeTab, setActiveTab] = useState('transaction');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showDriverList, setShowDriverList] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [qrCodeModal, setQrCodeModal] = useState(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    fuelType: 'Diesel',
    unitPrice: '',
    quantity: '',
    total: '',
    vehiclePlate: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const savedDrivers = localStorage.getItem('gas_drivers');
      const savedVehicles = localStorage.getItem('gas_vehicles');
      const savedTransactions = localStorage.getItem('gas_transactions');
      
      if (savedDrivers) setDrivers(JSON.parse(savedDrivers));
      if (savedVehicles) setVehicles(JSON.parse(savedVehicles));
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveDrivers = (newDrivers) => {
    localStorage.setItem('gas_drivers', JSON.stringify(newDrivers));
    setDrivers(newDrivers);
  };

  const saveVehicles = (newVehicles) => {
    localStorage.setItem('gas_vehicles', JSON.stringify(newVehicles));
    setVehicles(newVehicles);
  };

  const saveTransactions = (newTransactions) => {
    localStorage.setItem('gas_transactions', JSON.stringify(newTransactions));
    setTransactions(newTransactions);
  };

  const generateId = () => {
    return 'DRV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  };

  const generateQRCode = (text) => {
  const container = document.createElement('div');
  const qr = new QRCode(container, {
    text: text,
    width: 256,
    height: 256,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
  
  // Get the canvas or image from the container
  const canvas = container.querySelector('canvas');
  return canvas ? canvas.toDataURL('image/png') : null;
};

  const addDriver = () => {
    const name = prompt('Enter driver name:');
    if (!name || !name.trim()) return;

    const company = prompt('Enter company/organization:');
    if (!company || !company.trim()) return;

    const driverId = generateId();
    
    const newDriver = {
      id: driverId,
      name: name.trim(),
      company: company.trim(),
      addedDate: new Date().toISOString(),
    };

    saveDrivers([...drivers, newDriver]);
    
    const qrCode = generateQRCode(driverId);
    setQrCodeModal({
      name: name.trim(),
      company: company.trim(),
      qrCode: qrCode,
      driverId: driverId
    });
  };

  const addVehicle = () => {
    const plate = prompt('Enter vehicle plate number:');
    if (!plate || !plate.trim()) return;

    const plateUpper = plate.trim().toUpperCase();
    
    if (vehicles.find(v => v.plate === plateUpper)) {
      alert('Vehicle already exists!');
      return;
    }

    const newVehicle = {
      id: 'VEH-' + Date.now(),
      plate: plateUpper,
      addedDate: new Date().toISOString(),
    };

    saveVehicles([...vehicles, newVehicle]);
    alert('Vehicle ' + plateUpper + ' added!');
  };

  const handleFormChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    
    if (field === 'total' || field === 'unitPrice') {
      const total = parseFloat(field === 'total' ? value : formData.total);
      const unitPrice = parseFloat(field === 'unitPrice' ? value : formData.unitPrice);
      
      if (total > 0 && unitPrice > 0) {
        newFormData.quantity = Math.ceil((total / unitPrice) * 1000) / 1000;
      }
    }
    
    setFormData(newFormData);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        startScanning();
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('Cannot access camera. Please check permissions or use manual entry.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    setScanning(false);
  };

  const startScanning = () => {
    scanIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    }, 500);
  };

  const openQRScanner = () => {
    setShowQRScanner(true);
    setTimeout(() => startCamera(), 100);
  };

  const closeQRScanner = () => {
    stopCamera();
    setShowQRScanner(false);
  };

  const manualDriverEntry = () => {
    const driverId = prompt('Enter Driver ID from QR code:');
    if (!driverId) return;

    const driver = drivers.find(d => d.id.trim() === driverId.trim());
    if (driver) {
      setSelectedDriver(driver);
      closeQRScanner();
      alert('Driver verified: ' + driver.name);
    } else {
      alert('Invalid Driver ID!');
    }
  };

  const selectDriverFromList = (driver) => {
    setSelectedDriver(driver);
    setShowDriverList(false);
    alert('Driver selected: ' + driver.name);
  };

  const submitTransaction = () => {
    if (!selectedDriver) {
      alert('Please select a driver first!');
      return;
    }

    if (!formData.quantity || !formData.total || !formData.vehiclePlate) {
      alert('Please fill in all required fields!');
      return;
    }

    const transaction = {
      id: 'TXN-' + Date.now(),
      ...formData,
      driverName: selectedDriver.name,
      driverCompany: selectedDriver.company,
      driverId: selectedDriver.id,
      timestamp: new Date().toISOString(),
    };

    saveTransactions([...transactions, transaction]);
    generateReceipt(transaction);

    setFormData({
      date: new Date().toISOString().split('T')[0],
      fuelType: 'Diesel',
      unitPrice: '',
      quantity: '',
      total: '',
      vehiclePlate: '',
    });
    setSelectedDriver(null);

    alert('Transaction saved and receipt downloaded!');
  };

  const generateReceipt = (txn) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1000, 500);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeRect(5, 5, 990, 490);

    ctx.fillStyle = '#000000';
    ctx.fillRect(5, 5, 990, 70);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ANH HUY GAS STATION', 500, 45);
    ctx.font = '14px Arial';
    ctx.fillText('FUEL RECEIPT', 500, 65);

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';

    let y = 110;
    ctx.font = 'bold 16px Arial';
    ctx.fillText('TRANSACTION INFO', 40, y);
    ctx.font = '15px Arial';
    y += 30;
    ctx.fillText('Date: ' + txn.date, 40, y);
    y += 25;
    ctx.fillText('Time: ' + new Date(txn.timestamp).toLocaleTimeString('vi-VN'), 40, y);
    y += 25;
    ctx.fillText('Vehicle: ' + txn.vehiclePlate, 40, y);
    y += 25;
    ctx.fillText('Driver: ' + txn.driverName, 40, y);
    y += 25;
    ctx.fillStyle = '#666666';
    ctx.font = '13px Arial';
    ctx.fillText('Company: ' + txn.driverCompany, 40, y);

    y = 110;
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('FUEL DETAILS', 520, y);
    ctx.font = '15px Arial';
    y += 30;
    ctx.fillText('Fuel Type: ' + txn.fuelType, 520, y);
    y += 25;
    ctx.fillText('Quantity: ' + txn.quantity + ' L', 520, y);
    y += 25;
    ctx.fillText('Unit Price: ' + formatNumber(txn.unitPrice) + ' VND/L', 520, y);
    
    y += 40;
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(510, y - 25, 450, 45);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('TOTAL: ' + formatNumber(txn.total) + ' VND', 520, y);

    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666666';
    ctx.fillText('Thank you for your business!', 500, 430);
    ctx.font = '11px Arial';
    ctx.fillText('Transaction ID: ' + txn.id, 500, 455);

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Receipt_' + txn.vehiclePlate + '_' + Date.now() + '.jpg';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const exportCSV = () => {
    if (transactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    let csv = 'Date,Time,Driver,Company,Vehicle,Fuel Type,Quantity (L),Unit Price,Total,Transaction ID\n';
    transactions.forEach(t => {
      const time = new Date(t.timestamp).toLocaleTimeString('vi-VN');
      csv += t.date + ',' + time + ',' + t.driverName + ',' + t.driverCompany + ',' + t.vehiclePlate + ',' + t.fuelType + ',' + t.quantity + ',' + t.unitPrice + ',' + t.total + ',' + t.id + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ANH_HUY_Transactions_' + Date.now() + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-black text-white p-4">
        <h1 className="text-2xl font-bold text-center">ANH HUY GAS STATION</h1>
        <p className="text-center text-sm mt-1">Fleet Management System</p>
      </div>

      <div className="flex bg-white border-b">
        <button
          onClick={() => setActiveTab('transaction')}
          className={'flex-1 p-4 flex items-center justify-center gap-2 ' + (activeTab === 'transaction' ? 'border-b-4 border-black font-bold' : '')}
        >
          <Camera size={20} />
          Transaction
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={'flex-1 p-4 flex items-center justify-center gap-2 ' + (activeTab === 'drivers' ? 'border-b-4 border-black font-bold' : '')}
        >
          <User size={20} />
          Drivers
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={'flex-1 p-4 flex items-center justify-center gap-2 ' + (activeTab === 'records' ? 'border-b-4 border-black font-bold' : '')}
        >
          <FileText size={20} />
          Records
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'transaction' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="font-bold text-lg mb-3">Step 1: Verify Driver</h2>
              {selectedDriver ? (
                <div className="bg-green-50 border-2 border-green-500 p-4 rounded">
                  <p className="font-bold text-green-700">✓ Driver Verified</p>
                  <p className="text-lg mt-1">{selectedDriver.name}</p>
                  <p className="text-sm text-gray-600">{selectedDriver.company}</p>
                  <button
                    onClick={() => setSelectedDriver(null)}
                    className="mt-2 text-sm text-blue-600 underline"
                  >
                    Change Driver
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={openQRScanner}
                    className="w-full bg-black text-white p-4 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Camera size={24} />
                    Scan QR Code
                  </button>
                  <button
                    onClick={() => setShowDriverList(true)}
                    className="w-full bg-gray-700 text-white p-3 rounded-lg flex items-center justify-center gap-2"
                  >
                    <User size={20} />
                    Select from List
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="font-bold text-lg mb-3">Step 2: Transaction Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fuel Type</label>
                  <select
                    value={formData.fuelType}
                    onChange={(e) => handleFormChange('fuelType', e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Unleaded">Unleaded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Unit Price (VND/L)</label>
                  <input
                    type="number"
                    value={formData.unitPrice}
                    onChange={(e) => handleFormChange('unitPrice', e.target.value)}
                    placeholder="23000"
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Total Amount (VND)</label>
                  <input
                    type="number"
                    value={formData.total}
                    onChange={(e) => handleFormChange('total', e.target.value)}
                    placeholder="500000"
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Quantity (Liters)</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    readOnly
                    placeholder="Auto-calculated"
                    className="w-full p-2 border rounded bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-calculated: Total ÷ Unit Price</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle Plate</label>
                  <select
                    value={formData.vehiclePlate}
                    onChange={(e) => handleFormChange('vehiclePlate', e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.plate}>{v.plate}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={submitTransaction}
                className="w-full mt-4 bg-green-600 text-white p-4 rounded-lg font-bold"
              >
                Submit & Generate Receipt
              </button>
            </div>
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={addDriver}
                className="bg-black text-white p-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Driver
              </button>
              <button
                onClick={addVehicle}
                className="bg-blue-600 text-white p-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Vehicle
              </button>
            </div>

            <div className="bg-white rounded-lg shadow">
              <h2 className="font-bold text-lg p-4 border-b">Drivers ({drivers.length})</h2>
              <div className="divide-y max-h-96 overflow-y-auto">
                {drivers.length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No drivers yet</p>
                ) : (
                  drivers.map((d) => (
                    <div key={d.id} className="p-4">
                      <p className="font-medium">{d.name}</p>
                      <p className="text-sm text-gray-600">{d.company}</p>
                      <p className="text-xs text-gray-400 mt-1">{d.id}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <h2 className="font-bold text-lg p-4 border-b">Vehicles ({vehicles.length})</h2>
              <div className="divide-y">
                {vehicles.length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No vehicles yet</p>
                ) : (
                  vehicles.map((v) => (
                    <div key={v.id} className="p-4">
                      <p className="font-medium text-lg">{v.plate}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="space-y-4">
            <button
              onClick={exportCSV}
              className="w-full bg-green-600 text-white p-4 rounded-lg flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Export to CSV
            </button>

            <div className="bg-white rounded-lg shadow">
              <h2 className="font-bold text-lg p-4 border-b">History ({transactions.length})</h2>
              <div className="divide-y max-h-96 overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No transactions yet</p>
                ) : (
                  [...transactions].reverse().map((t) => (
                    <div key={t.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold">{t.vehiclePlate}</p>
                          <p className="text-sm text-gray-600">{t.driverName} • {t.driverCompany}</p>
                        </div>
                        <p className="font-bold text-lg">{formatNumber(t.total)} ₫</p>
                      </div>
                      <div className="text-xs text-gray-500">
                        <p>{t.date} • {new Date(t.timestamp).toLocaleTimeString('vi-VN')}</p>
                        <p>{t.fuelType} • {t.quantity}L @ {formatNumber(t.unitPrice)} ₫/L</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {qrCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-xl">Driver QR Code</h2>
              <button onClick={() => setQrCodeModal(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="text-center mb-4">
              <p className="font-medium text-lg">{qrCodeModal.name}</p>
              <p className="text-sm text-gray-600">{qrCodeModal.company}</p>
            </div>
            <div className="bg-white p-4 border-2 rounded-lg mb-4">
              <img src={qrCodeModal.qrCode} alt="QR Code" className="w-full" />
            </div>
            <button
              onClick={() => {
                const a = document.createElement('a');
                a.href = qrCodeModal.qrCode;
                a.download = 'QR_' + qrCodeModal.name.replace(/\s/g, '_') + '.png';
                a.click();
                alert('QR Code downloaded!');
              }}
              className="w-full bg-blue-600 text-white p-3 rounded-lg mb-2"
            >
              Download QR Code
            </button>
            <p className="text-xs text-gray-500 text-center">
              Print this QR code and give it to the driver
            </p>
          </div>
        </div>
      )}

      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="font-bold text-xl mb-4 text-center">Scan QR Code</h2>
            
            <div className="bg-black rounded-lg overflow-hidden mb-4">
              <video ref={videoRef} className="w-full h-full object-cover" style={{ height: '300px' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
            
            <p className="text-sm text-gray-600 text-center mb-4">
              {scanning ? 'Position QR code in camera view' : 'Starting camera...'}
            </p>
            
            <div className="space-y-2">
              <button
                onClick={manualDriverEntry}
                className="w-full bg-gray-700 text-white p-3 rounded-lg"
              >
                Manual Entry (Type Driver ID)
              </button>
              <button
                onClick={closeQRScanner}
                className="w-full p-3 bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDriverList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <h2 className="font-bold text-xl mb-4">Select Driver</h2>
            <div className="space-y-2">
              {drivers.map((d) => (
                <button
                  key={d.id}
                  onClick={() => selectDriverFromList(d)}
                  className="w-full p-3 border-2 rounded-lg text-left hover:border-black"
                >
                  <p className="font-medium">{d.name}</p>
                  <p className="text-sm text-gray-600">{d.company}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDriverList(false)}
              className="w-full mt-4 p-3 bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GasStationApp;