import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  total: {
    type: Number,
    required: true
  }
}, { _id: false });

const invoiceSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Invoice must belong to a client'],
      index: true
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    description: {
      type: String,
      default: 'Corporate Services Billing'
    },
    items: {
      type: [lineItemSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'An invoice must contain at least one line item.'
      }
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Cancelled'],
      default: 'Pending',
      index: true
    },
    stripePaymentIntentId: {
      type: String,
      default: null
    },
    stripeCheckoutSessionId: {
      type: String,
      default: null
    },
    pdfUrl: {
      type: String,
      default: null
    },
    paidAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Helper function to auto-generate unique corporate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function () {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const count = await this.countDocuments();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `NEXUS-INV-${year}${month}-${String(count + 1).padStart(4, '0')}-${randomSuffix}`;
};

export const Invoice = mongoose.model('Invoice', invoiceSchema);
