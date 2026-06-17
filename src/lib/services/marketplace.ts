import api from '../api';
import type { Produce, Order, Paginated } from '../../types';

export const marketplaceService = {
  listProduce: (params?: Record<string, string>) =>
    api.get<Paginated<Produce>>('/marketplace/produce/', { params }).then(r => r.data),
  getProduce: (id: string) =>
    api.get<Produce>(`/marketplace/produce/${id}/`).then(r => r.data),
  createProduce: (data: FormData) =>
    api.post<Produce>('/marketplace/produce/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  updateProduce: (id: string, data: FormData | Partial<Produce>) =>
    api.patch<Produce>(`/marketplace/produce/${id}/`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }).then(r => r.data),
  deleteProduce: (id: string) => api.delete(`/marketplace/produce/${id}/`),

  listOrders: (params?: Record<string, string>) =>
    api.get<Paginated<Order>>('/marketplace/orders/', { params }).then(r => r.data),

  createOrder: (data: {
    delivery_type: 'pickup' | 'delivery';
    delivery_address?: string;
    delivery_date?: string;
    payment_method?: string;
    notes?: string;
    items_data: { produce: string; quantity: string | number; unit_price: string | number }[];
  }) => api.post<Order>('/marketplace/orders/', data).then(r => r.data),

  /**
   * Initiate real payment for an existing order.
   * - MoMo: sends a prompt to the buyer's phone (requires phone_number in payload)
   * - Card: returns authorization_url to redirect buyer to Paystack
   * - Bank transfer: returns bank account details
   * - Cash on delivery: no-op
   */
  initiatePayment: (orderId: string, payload: { phone_number?: string }) =>
    api.post(`/marketplace/orders/${orderId}/initiate_payment/`, payload).then(r => r.data),

  /**
   * Verify a card payment after Paystack redirects back.
   * Call this when the buyer returns from Paystack with a reference in the URL.
   */
  verifyPayment: (orderId: string, reference: string) =>
    api.post(`/marketplace/orders/${orderId}/verify_payment/`, { reference }).then(r => r.data),

  confirmOrder: (id: string) =>
    api.post<Order>(`/marketplace/orders/${id}/confirm/`).then(r => r.data),

  cancelOrder: (id: string) =>
    api.post<Order>(`/marketplace/orders/${id}/cancel/`).then(r => r.data),
};
