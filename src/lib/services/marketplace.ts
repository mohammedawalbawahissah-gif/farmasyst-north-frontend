import api from '../api';
import type { Produce, Order, Paginated } from '../../types';

export const marketplaceService = {
  listProduce: (params?: Record<string, string>) =>
    api.get<Paginated<Produce>>('/marketplace/produce/', { params }).then(r => r.data),
  getProduce: (id: string) =>
    api.get<Produce>(`/marketplace/produce/${id}/`).then(r => r.data),
  createProduce: (data: FormData | Partial<Produce>) =>
    api.post<Produce>('/marketplace/produce/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }).then(r => r.data),
  updateProduce: (id: string, data: Partial<Produce>) =>
    api.patch<Produce>(`/marketplace/produce/${id}/`, data).then(r => r.data),
  deleteProduce: (id: string) => api.delete(`/marketplace/produce/${id}/`),

  listOrders: (params?: Record<string, string>) =>
    api.get<Paginated<Order>>('/marketplace/orders/', { params }).then(r => r.data),
  createOrder: (data: Partial<Order>) =>
    api.post<Order>('/marketplace/orders/', data).then(r => r.data),
  cancelOrder: (id: string) =>
    api.post<Order>(`/marketplace/orders/${id}/cancel/`).then(r => r.data),
};
