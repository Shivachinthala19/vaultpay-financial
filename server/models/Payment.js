import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    stripePaymentIntentId: {
      type: String,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    },
    status: {
      type: String,
      default: 'succeeded'
    },
    stripeEventId: {
      type: String,
      required: true,
      unique: true,
      index: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const Payment = mongoose.model('Payment', paymentSchema);
