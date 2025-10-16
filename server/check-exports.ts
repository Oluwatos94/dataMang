import * as sv from '@nillion/secretvaults';
import * as nuc from '@nillion/nuc';

console.log('\n=== @nillion/secretvaults exports ===');
console.log(Object.keys(sv));

console.log('\n=== @nillion/nuc exports ===');
console.log(Object.keys(nuc));

console.log('\n=== Detailed inspection ===');
console.log('SecretVault?', typeof (sv as any).SecretVault);
console.log('SecretVaults?', typeof (sv as any).SecretVaults);
console.log('SecretVaultBuilderClient?', typeof (sv as any).SecretVaultBuilderClient);
console.log('default?', typeof (sv as any).default);

console.log('\nKeypair?', typeof (nuc as any).Keypair);
console.log('NilauthClient?', typeof (nuc as any).NilauthClient);
console.log('PayerBuilder?', typeof (nuc as any).PayerBuilder);
