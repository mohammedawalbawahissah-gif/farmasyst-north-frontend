import api from '../api';

export interface OTPVerifyPayload {
  user_id: string;
  code: string;
  channel: 'sms' | 'email';
}

export const otpService = {
  verify: (payload: OTPVerifyPayload) =>
    api.post<{ detail: string; is_verified: boolean }>('/auth/verify-otp/', payload).then(r => r.data),

  resend: (user_id: string, channel: 'sms' | 'email') =>
    api.post<{ detail: string }>('/auth/resend-otp/', { user_id, channel }).then(r => r.data),
};
