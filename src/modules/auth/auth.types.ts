export type AuthProvider = 'GOOGLE' | 'FACEBOOK'

export type OAuthProvider = 'google' | 'facebook'

export interface OAuthRequest {
  provider: OAuthProvider
  idToken: string
}
