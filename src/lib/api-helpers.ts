import { getUTHApi } from '@/lib/services/uth-api';
import { userConfigDb } from '@/lib/db-postgres';

/**
 * Helper function to get authenticated UTH API instance
 */
export async function getAuthenticatedUTHApi(userSession: string) {
  const userConfig = await userConfigDb.findBySession(userSession);
  
  if (!userConfig) {
    throw new Error('Phiên đăng nhập không hợp lệ');
  }

  const savedData = JSON.parse(userConfig.uth_cookies);
  const { authToken, ...cookies } = savedData;
  
  console.log('Creating UTH API with token:', authToken ? 'present' : 'missing');
  const uthApi = getUTHApi(cookies, authToken);

  return uthApi;
}
