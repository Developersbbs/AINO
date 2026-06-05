import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  let credential: admin.credential.Credential;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    credential = admin.credential.cert(JSON.parse(serviceAccountJson));
  } else {
    // Fallback: individual env vars
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replaceAll('\\n', '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      clientId: process.env.FIREBASE_CLIENT_ID,
      clientX509CertUrl: process.env.FIREBASE_CLIENT_CERT_URL,
      type: 'service_account',
    } as admin.ServiceAccount);
  }

  admin.initializeApp({
    credential,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

export default admin;
