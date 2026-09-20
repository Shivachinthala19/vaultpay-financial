import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceAPI } from '../services/api';
import { Plus, Trash2, ArrowLeft, Check, AlertCircle, ShieldAlert } from 'lucide-react';

export const CreateInvoice = () => {
  const navigate = useNavigate();
  const [description, setDescription] = useState('Enterprise Cloud & Security Architecture');
  const [taxRate, setTaxRate] = useState(8);
  const [currency, setCurrency] = useState('USD');
  const [items, setItems] = useState([
    { description: 'Dedicated Virtual Private Cloud (VPC) Cluster', quantity: 1, price: 4500 },
    { description: '24/7 Enterprise Tier Security Operations Center (SOC)', quantity: 1, price: 2500 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === 'description' ? value : Number(value);
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 100 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Preview calculations
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
  const tax = (subtotal * (Number(taxRate) || 0)) / 100;
  const total = subtotal + tax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate items
    for (const item of items) {
      if (!item.description.trim()) {
        setError('All line items must have a valid description.');
        return;
      }
      if (item.quantity <= 0 || item.price < 0) {
        setError('Quantity must be positive and price cannot be negative.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await invoiceAPI.createInvoice({
        description,
        items,
        taxRate: Number(taxRate),
        currency
      });

      if (res.data.success) {
        navigate(`/invoices/${res.data.data._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create invoice.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="btn btn-secondary"
        style={{ marginBottom: '20px', padding: '6px 12px', fontSize: '0.8125rem' }}
      >
        <ArrowLeft size={14} />
        <span>Back</span>
      </button>

      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '28px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
            Generate Corporate Invoice
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Amounts will be cryptographically verified and bound to your authenticated client account.
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* General Metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Billing Description / Project</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Q3 Dedicated Engineering & Infrastructure"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="form-input"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Currency</label>
              <select
                className="form-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Line Items Section */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="form-label" style={{ margin: 0 }}>Invoice Line Items</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.75rem' }}
              >
                <Plus size={14} />
                <span>Add Item</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {items.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '4fr 1.2fr 2fr 2fr 40px',
                    gap: '10px',
                    alignItems: 'center',
                    background: 'var(--bg-input)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Item Description / Scope"
                      className="form-input"
                      style={{ padding: '8px 10px', fontSize: '0.875rem' }}
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    />
                  </div>

                  <div>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Qty"
                      className="form-input"
                      style={{ padding: '8px 10px', fontSize: '0.875rem' }}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    />
                  </div>

                  <div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="Unit Price"
                      className="form-input"
                      style={{ padding: '8px 10px', fontSize: '0.875rem' }}
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                    />
                  </div>

                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    ${((Number(item.quantity) || 0) * (Number(item.price) || 0)).toFixed(2)}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length <= 1}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: items.length <= 1 ? 'var(--text-muted)' : '#f87171',
                        cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary Card */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              maxWidth: '350px',
              marginLeft: 'auto',
              marginBottom: '28px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <span>Subtotal:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <span>Estimated Tax ({taxRate}%):</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>${tax.toFixed(2)}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
              <span style={{ color: '#ffffff' }}>Total Amount:</span>
              <span style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>${total.toFixed(2)} {currency}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Invoice...' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
