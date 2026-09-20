import React from 'react';
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

export const InvoiceStatusBadge = ({ status }) => {
  switch (status) {
    case 'Paid':
      return (
        <span className="badge badge-paid">
          <CheckCircle2 size={13} />
          Paid
        </span>
      );
    case 'Pending':
      return (
        <span className="badge badge-pending">
          <Clock size={13} />
          Pending
        </span>
      );
    case 'Failed':
      return (
        <span className="badge badge-failed">
          <AlertCircle size={13} />
          Failed
        </span>
      );
    case 'Cancelled':
      return (
        <span className="badge badge-cancelled">
          <XCircle size={13} />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="badge badge-cancelled">
          {status}
        </span>
      );
  }
};
