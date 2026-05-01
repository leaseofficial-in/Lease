import { ActivityItem } from '../components/rental/ActivityFeed';
import {
  DepositTransaction,
  Proof,
  RentPayment,
  Rental,
  RepairRequest,
} from '../types';
import {
  formatCurrency,
  formatMonth,
  proofStatusLabel,
  repairPriorityLabel,
  repairStatusLabel,
} from './formatters';

type BuildRentalActivityInput = {
  rental: Rental;
  payments?: RentPayment[];
  repairs?: RepairRequest[];
  proofs?: Proof[];
  deposits?: DepositTransaction[];
};

export function buildRentalActivity({
  rental,
  payments = [],
  repairs = [],
  proofs = [],
  deposits = [],
}: BuildRentalActivityInput): ActivityItem[] {
  const items: ActivityItem[] = [
    {
      id: `rental-created-${rental.id}`,
      title: 'Rental created',
      subtitle: rental.property?.name
        ? `${rental.property.name} was added to Flatvio.`
        : 'The rental record was created.',
      timestamp: rental.created_at,
      type: 'invite',
    },
  ];

  if (rental.tenant_id) {
    items.push({
      id: `tenant-joined-${rental.id}`,
      title: 'Tenant joined',
      subtitle: rental.tenant?.full_name
        ? `${rental.tenant.full_name} joined this rental.`
        : 'The tenant accepted the invite.',
      timestamp: rental.updated_at ?? rental.created_at,
      type: 'invite',
    });
  }

  if (rental.agreement_signed_at) {
    items.push({
      id: `agreement-signed-${rental.id}`,
      title: 'Agreement signed',
      subtitle: 'The tenant accepted the rental agreement terms.',
      timestamp: rental.agreement_signed_at,
      type: 'agreement',
    });
  }

  payments.forEach((payment) => {
    items.push({
      id: `payment-${payment.id}`,
      title: payment.status === 'paid' ? 'Rent payment received' : 'Rent payment due',
      subtitle: `${formatMonth(payment.month)} - ${formatCurrency(payment.amount)}`,
      timestamp: payment.paid_at ?? payment.created_at,
      type: 'payment',
    });
  });

  repairs.forEach((repair) => {
    items.push({
      id: `repair-${repair.id}`,
      title: repair.title,
      subtitle: `${repairPriorityLabel[repair.priority]} priority - ${repairStatusLabel[repair.status]}`,
      timestamp: repair.updated_at ?? repair.created_at,
      type: 'repair',
    });
  });

  proofs.forEach((proof) => {
    items.push({
      id: `proof-${proof.id}`,
      title: proof.type === 'move_in' ? 'Move-in proof' : 'Move-out proof',
      subtitle: proofStatusLabel[proof.status],
      timestamp: proof.updated_at ?? proof.created_at,
      type: 'proof',
    });
  });

  deposits.forEach((deposit) => {
    items.push({
      id: `deposit-${deposit.id}`,
      title: deposit.type === 'deduction' ? 'Deposit deduction' : deposit.type === 'refund' ? 'Deposit refund' : 'Deposit entry',
      subtitle: `${formatCurrency(deposit.amount)} - ${deposit.note}`,
      timestamp: deposit.created_at,
      type: 'deposit',
    });
  });

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
