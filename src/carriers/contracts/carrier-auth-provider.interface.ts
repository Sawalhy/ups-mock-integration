export interface CarrierAuthProvider {
  getAccessToken(): Promise<string>;
}
