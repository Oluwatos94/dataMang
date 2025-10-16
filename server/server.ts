import { Keypair } from '@nillion/nuc';
import { SecretVaultUserClient, Did } from '@nillion/secretvaults';
import { randomUUID } from 'crypto';

const PORT = process.env.PORT || 3000;

// Cache ONLY user clients (NO BUILDER CLIENT!)
const userClients = new Map<string, { client: SecretVaultUserClient, did: string }>();

const DB_NODES = [
  'https://nildb-stg-n1.nillion.network',
  'https://nildb-stg-n2.nillion.network',
  'https://nildb-stg-n3.nillion.network'
];

// ONLY User Client - This is all we need!
async function getUserClient(userPrivateKey: string): Promise<{ client: SecretVaultUserClient, did: string }> {
  // Check cache
  if (userClients.has(userPrivateKey)) {
    return userClients.get(userPrivateKey)!;
  }

  // Create user client
  const userKeypair = Keypair.from(userPrivateKey);
  const publicKey = userKeypair.publicKey('hex');
  const userDid = `did:nil:${publicKey}`;

  console.log('🔨 Creating user client for DID:', userDid.substring(0, 24) + '...');

  // User client uses baseUrls (not urls object)
  const userClient = await SecretVaultUserClient.from({
    keypair: userKeypair,
    baseUrls: DB_NODES,
    blindfold: { operation: 'store' }
  });

  const cached = { client: userClient, did: userDid };
  userClients.set(userPrivateKey, cached);

  console.log('✅ User client created');
  return cached;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const server = Bun.serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (url.pathname === '/health') {
        return Response.json({
          status: 'ok',
          mode: 'user-centric',
          activeUsers: userClients.size,
          timestamp: Date.now()
        }, { headers: corsHeaders });
      }

      // Get user's DID from their private key
      if (url.pathname === '/api/user/did' && req.method === 'POST') {
        const { userPrivateKey } = await req.json();
        const { did } = await getUserClient(userPrivateKey);

        return Response.json({
          success: true,
          did
        }, { headers: corsHeaders });
      }

      // Store data in APP-PROVIDED collection
      if (url.pathname === '/api/data/store' && req.method === 'POST') {
        const { userPrivateKey, collectionId, data } = await req.json();

        if (!collectionId) {
          throw new Error('collectionId is required - app must provide it');
        }

        const { client, did } = await getUserClient(userPrivateKey);

        const dataId = randomUUID();
        const dataToStore = {
          _id: dataId,
          ...data,
          timestamp: Date.now(),
          owner: did
        };

        const ownerDid = Did.parse(did);

        console.log('[API] Storing data:');
        console.log('  Collection:', collectionId);
        console.log('  Owner:', did.substring(0, 24) + '...');
        console.log('  Data ID:', dataId);

        // User stores data in the collection provided by the app
        const result = await client.createData('', {
          owner: ownerDid,
          collection: collectionId, // App provides this!
          data: [dataToStore],
          acl: {
            grantee: ownerDid,
            read: true,
            write: true,
            execute: false
          }
        });

        console.log('✅ Data stored successfully');

        return Response.json({
          success: true,
          dataId,
          collection: collectionId,
          result,
          message: 'Data stored successfully'
        }, { headers: corsHeaders });
      }

      // List user's data
      if (url.pathname === '/api/data/list' && req.method === 'GET') {
        const userPrivateKey = url.searchParams.get('userKey');
        if (!userPrivateKey) throw new Error('User private key required');

        const { client } = await getUserClient(userPrivateKey);
        const result = await client.listDataReferences();

        return Response.json({
          success: true,
          data: result
        }, { headers: corsHeaders });
      }

      // Retrieve specific data
      if (url.pathname.startsWith('/api/data/') && req.method === 'GET') {
        const dataId = url.pathname.split('/api/data/')[1];
        const userPrivateKey = url.searchParams.get('userKey');
        const collectionId = url.searchParams.get('collection');

        if (!userPrivateKey) throw new Error('User private key required');
        if (!collectionId) throw new Error('Collection ID required');

        const { client } = await getUserClient(userPrivateKey);
        const data = await client.readData({
          collection: collectionId,
          document: dataId
        });

        return Response.json({
          success: true,
          data
        }, { headers: corsHeaders });
      }

      // Delete data
      if (url.pathname.startsWith('/api/data/') && req.method === 'DELETE') {
        const dataId = url.pathname.split('/api/data/')[1];
        const userPrivateKey = url.searchParams.get('userKey');
        const collectionId = url.searchParams.get('collection');

        if (!userPrivateKey) throw new Error('User private key required');
        if (!collectionId) throw new Error('Collection ID required');

        const { client } = await getUserClient(userPrivateKey);
        const result = await client.deleteData({
          collection: collectionId,
          document: dataId
        });

        return Response.json({
          success: true,
          result,
          message: 'Data deleted successfully'
        }, { headers: corsHeaders });
      }

      // Grant permission to app
      if (url.pathname === '/api/permissions/grant' && req.method === 'POST') {
        const { userPrivateKey, dataId, collectionId, appDid, permissions } = await req.json();

        const { client } = await getUserClient(userPrivateKey);
        const granteeDid = Did.parse(appDid);

        console.log('[API] Granting permissions:');
        console.log('  To:', appDid.substring(0, 24) + '...');
        console.log('  Permissions:', permissions);
        console.log('  Collection:', collectionId);
        console.log('  Document:', dataId);

        const result = await client.grantAccess({
          collection: collectionId,
          document: dataId,
          acl: {
            grantee: granteeDid,
            read: permissions.includes('read'),
            write: permissions.includes('write'),
            execute: permissions.includes('execute') || false
          }
        });

        return Response.json({
          success: true,
          result,
          message: `✅ Granted ${permissions.join(', ')} to ${appDid.substring(0, 20)}...`
        }, { headers: corsHeaders });
      }

      // Revoke permission from app
      if (url.pathname === '/api/permissions/revoke' && req.method === 'POST') {
        const { userPrivateKey, dataId, collectionId, appDid } = await req.json();

        const { client } = await getUserClient(userPrivateKey);
        const granteeDid = Did.parse(appDid);

        console.log('[API] Revoking permissions:');
        console.log('  From:', appDid.substring(0, 24) + '...');
        console.log('  Collection:', collectionId);
        console.log('  Document:', dataId);

        const result = await client.revokeAccess({
          collection: collectionId,
          document: dataId,
          grantee: granteeDid
        });

        return Response.json({
          success: true,
          result,
          message: `✅ Revoked access from ${appDid.substring(0, 20)}...`
        }, { headers: corsHeaders });
      }

      // 404
      return Response.json({
        error: 'Not found'
      }, { status: 404, headers: corsHeaders });

    } catch (error: any) {
      console.error('❌ API Error:', error);

      // Better error serialization
      let errorDetails = error.message;
      if (error.cause) errorDetails = JSON.stringify(error.cause, null, 2);
      if (error.details) errorDetails = JSON.stringify(error.details, null, 2);

      return Response.json({
        error: error.message || 'Internal server error',
        details: errorDetails
      }, { status: 500, headers: corsHeaders });
    }
  }
});

console.log(`\n🚀 PDM running at http://localhost:${PORT}`);
console.log('\n✨ USER-OWNED ARCHITECTURE:');
console.log('  👤 Users own their keypairs');
console.log('  🔐 Users own their data');
console.log('  🎯 Apps provide collection IDs');
console.log('  ⭐ Users grant/revoke app permissions');
console.log('  📱 ONLY SecretVaultUserClient (NO Builder!)');
console.log('\n📝 Endpoints (User Client Only):');
console.log('  GET    /health                     - Server status');
console.log('  POST   /api/user/did               - Get user DID');
console.log('  POST   /api/data/store             - Store user data (app provides collectionId)');
console.log('  GET    /api/data/list              - List user\'s data');
console.log('  GET    /api/data/:id               - Retrieve data');
console.log('  DELETE /api/data/:id               - Delete data');
console.log('  POST   /api/permissions/grant      - Grant app access ⭐');
console.log('  POST   /api/permissions/revoke     - Revoke app access ⭐');
console.log('\n💡 Apps provide collection IDs - users don\'t create collections!\n');
