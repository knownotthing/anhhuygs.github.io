import React, { useState, useEffect, useRef } from 'react';
import { Camera, User, FileText, Download, Plus, List } from 'lucide-react';

const GasStationApp = () => {
  const [activeTab, setActiveTab] = useState('transaction');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverQRCode, setDriverQRCode] = useState(null);
  const qrScannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    fuelType: 'Diesel',
    unitPrice: '',
    quantity: '',
    total: '',
    vehiclePlate: '',
  });

  const receiptRef = useRef(null);

  // Load data from storage on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const driversData = await window.storage.get('drivers');
      const vehiclesData = await window.storage.get('vehicles');
      const transactionsData = await window.storage.get('transactions');
      
      if (driversData) setDrivers(JSON.parse(driversData.value));
      if (vehiclesData) setVehicles(JSON.parse(vehiclesData.value));
      if (transactionsData) setTransactions(JSON.parse(transactionsData.value));
    } catch (error) {
      console.log('No existing data, starting fresh');
    }
  };

  const saveDrivers = async (newDrivers) => {
    try {
      const result = await window.storage.set('drivers', JSON.stringify(newDrivers));
      setDrivers(newDrivers);
      console.log('Drivers saved successfully:', result);
      return result;
    } catch (error) {
      console.error('Error saving drivers:', error);
      alert('Error saving drivers: ' + error.message);
      return null;
    }
  };

  const saveVehicles = async (newVehicles) => {
    try {
      await window.storage.set('vehicles', JSON.stringify(newVehicles));
      setVehicles(newVehicles);
    } catch (error) {
      alert('Error saving vehicles');
    }
  };

  const saveTransactions = async (newTransactions) => {
    try {
      await window.storage.set('transactions', JSON.stringify(newTransactions));
      setTransactions(newTransactions);
    } catch (error) {
      alert('Error saving transactions');
    }
  };

  const generateUniqueId = () => {
    return 'DRV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  };

  const generateQRCode = async (text) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(text, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataUrl;
    } catch (err) {
      console.error('Error generating QR code:', err);
      return null;
    }
  };

  const addDriver = async () => {
    try {
      const name = prompt('Enter driver name:');
      if (!name || !name.trim()) return;

      const company = prompt('Enter company/organization:');
      if (!company || !company.trim()) return;

      const privateKey = generateUniqueId();
      
      const newDriver = {
        id: privateKey,
        name: name.trim(),
        company: company.trim(),
        addedDate: new Date().toISOString(),
      };

      console.log('Adding driver:', newDriver);

      // Save driver first
      const updatedDrivers = [...drivers, newDriver];
      const saveResult = await saveDrivers(updatedDrivers);
      
      console.log('Driver saved, generating QR...');
      
      // Generate QR code
      const qrCode = await generateQRCode(privateKey);
      
      console.log('QR code generated:', qrCode ? 'success' : 'failed');
      
      if (qrCode) {
        setDriverQRCode({ 
          name: name.trim(), 
          company: company.trim(), 
          qrCode, 
          privateKey 
        });
      } else {
        alert('Driver added successfully, but QR code generation failed.');
      }
    } catch (error) {
      console.error('Error adding driver:', error);
      alert('Error adding driver: ' + error.message);
    }
  };

  const addVehicle = () => {
    const plate = prompt('Enter vehicle plate number:');
    if (!plate) return;

    const plateUpper = plate.trim().toUpperCase();
    
    if (vehicles.find(v => v.plate === plateUpper)) {
      alert('This vehicle is already in the fleet!');
      return;
    }

    const newVehicle = {
      id: 'VEH-' + Date.now(),
      plate: plateUpper,
      addedDate: new Date().toISOString(),
    };

    saveVehicles([...vehicles, newVehicle]);
    alert(`Vehicle "${plateUpper}" added to fleet!`);
  };

  const handleFormChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    
    // Auto-calculate quantity when total or unitPrice changes
    if (field === 'total' || field === 'unitPrice') {
      const total = parseFloat(field === 'total' ? value : formData.total);
      const unitPrice = parseFloat(field === 'unitPrice' ? value : formData.unitPrice);
      
      if (total > 0 && unitPrice > 0) {
        const quantity = total / unitPrice;
        newFormData.quantity = Math.ceil(quantity * 1000) / 1000; // Round up to 3 decimals
      }
    }
    
    setFormData(newFormData);
  };

  const scanDriver = () => {
    setShowQRScanner(true);
    // Start QR scanner after modal opens
    setTimeout(() => {
      startQRScanner();
    }, 300);
  };

  const startQRScanner = async () => {
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      }

      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // QR code successfully scanned
          onQRCodeScanned(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors (happens continuously while scanning)
        }
      );
    } catch (err) {
      console.error("Unable to start QR scanner:", err);
      alert("Camera access denied or not available. Please enable camera permissions.");
    }
  };

  const stopQRScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch (err) {
      console.error("Error stopping scanner:", err);
    }
  };

  const onQRCodeScanned = async (scannedKey) => {
    await stopQRScanner();
    
    const driver = drivers.find(d => d.id === scannedKey.trim());
    if (driver) {
      setSelectedDriver(driver);
      setShowQRScanner(false);
      alert(`Driver verified: ${driver.name}`);
    } else {
      alert('Invalid QR code! Driver not found in database.');
      setShowQRScanner(false);
    }
  };

  const handleQRScan = () => {
    const scannedKey = prompt('Enter the scanned QR code key (or driver ID):');
    if (!scannedKey) {
      return;
    }

    onQRCodeScanned(scannedKey);
  };

  const closeQRScanner = async () => {
    await stopQRScanner();
    setShowQRScanner(false);
  };

  const selectDriverFromList = (driver) => {
    setSelectedDriver(driver);
    setShowScanner(false);
    alert(`Driver verified: ${driver.name}`);
  };

  const submitTransaction = async () => {
    if (!selectedDriver) {
      alert('Please scan/select a driver first!');
      return;
    }

    if (!formData.quantity || !formData.total || !formData.vehiclePlate) {
      alert('Please fill in all required fields!');
      return;
    }

    const newTransaction = {
      id: 'TXN-' + Date.now(),
      ...formData,
      driverName: selectedDriver.name,
      driverCompany: selectedDriver.company,
      driverId: selectedDriver.id,
      timestamp: new Date().toISOString(),
    };

    const updatedTransactions = [...transactions, newTransaction];
    await saveTransactions(updatedTransactions);

    // Generate receipt
    generateReceipt(newTransaction);

    // Reset form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      fuelType: 'Diesel',
      unitPrice: '',
      quantity: '',
      total: '',
      vehiclePlate: '',
    });
    setSelectedDriver(null);

    alert('Transaction saved successfully!');
  };

  const generateReceipt = (transaction) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1200, 600);

    // Header
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ANH HUY GAS STATION', 600, 50);

    ctx.font = '18px Arial';
    ctx.fillText('FUEL RECEIPT', 600, 80);

    // Line separator
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 100);
    ctx.lineTo(1150, 100);
    ctx.stroke();

    // Left column - Transaction details
    ctx.textAlign = 'left';
    ctx.font = '20px Arial';
    let yPos = 140;
    const lineHeight = 35;

    const leftDetails = [
      `Date: ${transaction.date}`,
      `Time: ${new Date(transaction.timestamp).toLocaleTimeString('vi-VN')}`,
      `Driver: ${transaction.driverName}`,
      `Company: ${transaction.driverCompany}`,
      `Vehicle: ${transaction.vehiclePlate}`,
    ];

    leftDetails.forEach((detail, index) => {
      ctx.fillText(detail, 80, yPos + (index * lineHeight));
    });

    // Right column - Fuel details
    const rightDetails = [
      `Fuel Type: ${transaction.fuelType}`,
      `Quantity: ${transaction.quantity} L`,
      `Unit Price: ${formatCurrency(transaction.unitPrice)} VND/L`,
      ``,
      `TOTAL: ${formatCurrency(transaction.total)} VND`,
    ];

    yPos = 140;
    rightDetails.forEach((detail, index) => {
      if (index === rightDetails.length - 1) {
        ctx.font = 'bold 28px Arial';
      } else {
        ctx.font = '20px Arial';
      }
      ctx.fillText(detail, 650, yPos + (index * lineHeight));
    });

    // Footer
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Thank you for your business!', 600, 500);
    ctx.font = '14px Arial';
    ctx.fillText(`Transaction ID: ${transaction.id}`, 600, 530);

    // Convert to image and download
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt_${transaction.vehiclePlate}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const exportToExcel = () => {
    if (transactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    let csv = 'Date,Time,Driver,Company,Vehicle Plate,Fuel Type,Quantity (L),Unit Price (VND),Total (VND),Transaction ID\n';
    
    transactions.forEach(t => {
      const time = new Date(t.timestamp).toLocaleTimeString('vi-VN');
      csv += `${t.date},${time},${t.driverName},${t.driverCompany},${t.vehiclePlate},${t.fuelType},${t.quantity},${t.unitPrice},${t.total},${t.id}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ANH_HUY_Transactions_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-black text-white p-4">
        <h1 className="text-2xl font-bold text-center">ANH HUY GAS STATION</h1>
        <p className="text-center text-sm mt-1">Fleet Management System</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-white border-b">
        <button
          onClick={() => setActiveTab('transaction')}
          className={`flex-1 p-4 flex items-center justify-center gap-2 ${
            activeTab === 'transaction' ? 'border-b-4 border-black font-bold' : ''
          }`}
        >
          <Camera size={20} />
          Transaction
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex-1 p-4 flex items-center justify-center gap-2 ${
            activeTab === 'drivers' ? 'border-b-4 border-black font-bold' : ''
          }`}
        >
          <User size={20} />
          Drivers
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`flex-1 p-4 flex items-center justify-center gap-2 ${
            activeTab === 'records' ? 'border-b-4 border-black font-bold' : ''
          }`}
        >
          <FileText size={20} />
          Records
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Transaction Tab */}
        {activeTab === 'transaction' && (
          <div className="space-y-4">
            {/* Driver Selection */}
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
                    onClick={scanDriver}
                    className="w-full bg-black text-white p-4 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Camera size={24} />
                    Scan QR Code
                  </button>
                  <button
                    onClick={() => setShowScanner(true)}
                    className="w-full bg-gray-700 text-white p-3 rounded-lg flex items-center justify-center gap-2 text-sm"
                  >
                    <User size={20} />
                    Select from List
                  </button>
                </div>
              )}
            </div>

            {/* Transaction Form */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="font-bold text-lg mb-3">Step 2: Fill Transaction Details</h2>
              
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
                  <label className="block text-sm font-medium mb-1">Quantity (Liters)</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    readOnly
                    placeholder="Auto-calculated"
                    className="w-full p-2 border rounded bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-calculated from Total ÷ Unit Price</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Unit Price (VND/L)</label>
                  <input
                    type="number"
                    value={formData.unitPrice}
                    onChange={(e) => handleFormChange('unitPrice', e.target.value)}
                    placeholder="0"
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Total (VND)</label>
                  <input
                    type="number"
                    value={formData.total}
                    onChange={(e) => handleFormChange('total', e.target.value)}
                    placeholder="0"
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle Plate</label>
                  <select
                    value={formData.vehiclePlate}
                    onChange={(e) => handleFormChange('vehiclePlate', e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select vehicle...</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.plate}>
                        {vehicle.plate}
                      </option>
                    ))}
                  </select>
                  {vehicles.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      No vehicles in fleet. Add vehicles in the Drivers tab.
                    </p>
                  )}
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

        {/* Drivers Tab */}
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
              <h2 className="font-bold text-lg p-4 border-b">Registered Drivers ({drivers.length})</h2>
              <div className="divide-y">
                {drivers.length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No drivers registered yet</p>
                ) : (
                  drivers.map((driver) => (
                    <div key={driver.id} className="p-4">
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-sm text-gray-700 mt-1">{driver.company}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        ID: {driver.id} | Added: {new Date(driver.addedDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <h2 className="font-bold text-lg p-4 border-b">Fleet Vehicles ({vehicles.length})</h2>
              <div className="divide-y">
                {vehicles.length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No vehicles in fleet yet</p>
                ) : (
                  vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="p-4">
                      <p className="font-medium text-lg">{vehicle.plate}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Added: {new Date(vehicle.addedDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Records Tab */}
        {activeTab === 'records' && (
          <div className="space-y-4">
            <button
              onClick={exportToExcel}
              className="w-full bg-green-600 text-white p-4 rounded-lg flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Export to Excel/CSV
            </button>

            <div className="bg-white rounded-lg shadow">
              <h2 className="font-bold text-lg p-4 border-b">Transaction History ({transactions.length})</h2>
              <div className="divide-y max-h-96 overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No transactions yet</p>
                ) : (
                  [...transactions].reverse().map((txn) => (
                    <div key={txn.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold">{txn.vehiclePlate}</p>
                          <p className="text-sm text-gray-600">{txn.driverName} • {txn.driverCompany}</p>
                        </div>
                        <p className="font-bold text-lg">{formatCurrency(txn.total)} ₫</p>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>{txn.date} • {new Date(txn.timestamp).toLocaleTimeString('vi-VN')}</p>
                        <p>{txn.fuelType} • {txn.quantity}L @ {formatCurrency(txn.unitPrice)} ₫/L</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <h2 className="font-bold text-xl mb-4">Select Driver</h2>
            <div className="space-y-2">
              {drivers.map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => selectDriverFromList(driver)}
                  className="w-full p-3 border-2 rounded-lg text-left hover:border-black hover:bg-gray-50"
                >
                  <p className="font-medium">{driver.name}</p>
                  <p className="text-sm text-gray-600">{driver.company}</p>
                  <p className="text-xs text-gray-500 mt-1">ID: {driver.id}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowScanner(false)}
              className="w-full mt-4 p-3 bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="font-bold text-xl mb-4 text-center">Scan Driver QR Code</h2>
            
            {/* QR Scanner Container */}
            <div id="qr-reader" className="mb-4 rounded-lg overflow-hidden"></div>
            
            <p className="text-sm text-gray-600 text-center mb-4">
              Position the QR code within the frame
            </p>
            
            <div className="space-y-2">
              <button
                onClick={handleQRScan}
                className="w-full bg-gray-700 text-white p-3 rounded-lg text-sm"
              >
                Manual Entry (Type ID)
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

      {/* QR Code Display Modal */}
      {driverQRCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="font-bold text-xl mb-4">Driver QR Code Generated!</h2>
            <div className="text-center mb-4">
              <p className="font-medium text-lg">{driverQRCode.name}</p>
              <p className="text-sm text-gray-600">{driverQRCode.company}</p>
            </div>
            <div className="bg-white p-4 border-2 border-gray-300 rounded-lg mb-4">
              <img src={driverQRCode.qrCode} alt="Driver QR Code" className="w-full" />
            </div>
            <p className="text-xs text-gray-600 mb-4 text-center">
              Save this QR code and give it to the driver. They must show this to fuel up.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = driverQRCode.qrCode;
                  a.download = `QR_${driverQRCode.name.replace(/\s/g, '_')}.png`;
                  a.click();
                }}
                className="w-full bg-blue-600 text-white p-3 rounded-lg"
              >
                Download QR Code
              </button>
              <button
                onClick={() => setDriverQRCode(null)}
                className="w-full p-3 bg-gray-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GasStationApp;