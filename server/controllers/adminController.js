import { Invoice } from '../models/Invoice.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';

export const getAllInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find()
      .populate('clientId', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminMetrics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalInvoices = await Invoice.countDocuments();
    const paidInvoices = await Invoice.countDocuments({ status: 'Paid' });
    const pendingInvoices = await Invoice.countDocuments({ status: 'Pending' });

    const revenueResult = await Invoice.aggregate([
      { $match: { status: 'Paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        totalRevenue
      }
    });
  } catch (error) {
    next(error);
  }
};
