// Module-level store for Firebase phone auth ConfirmationResult.
// Not in Zustand because ConfirmationResult is not JSON-serializable.
let _result: any = null;

export const setConfirmation = (r: any) => { _result = r; };
export const getConfirmation = () => _result;
export const clearConfirmation = () => { _result = null; };

// Dev-only OTP pre-fill (web backend-OTP flow)
let _devOtp: string | null = null;

export const setDevOtp = (otp: string) => { _devOtp = otp; };
export const consumeDevOtp = (): string | null => { const v = _devOtp; _devOtp = null; return v; };
