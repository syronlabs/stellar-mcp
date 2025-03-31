import { Classic } from '../classic';
import { Keypair } from '@stellar/stellar-sdk';
import { z } from 'zod';
import { AccountKeyPairSchema } from '../schemas';

describe('Classic Stellar Operations', () => {
    const serverUrl = "https://horizon-testnet.stellar.org";
    const classic = new Classic(serverUrl);
    let testAccount1: z.infer<typeof AccountKeyPairSchema>;
    let testAccount2: z.infer<typeof AccountKeyPairSchema>;

    beforeEach(async () => {
        testAccount1 = await classic.createAccount();
        await classic.fundAccount({ publicKey: testAccount1.publicKey });

        testAccount2 = await classic.createAccount();
        await classic.fundAccount({ publicKey: testAccount2.publicKey });
    });

    describe('Account Operations', () => {
        it('Should create a new account with valid keypair', async () => {
            const { publicKey, secretKey } = await classic.createAccount();
            const keypair = Keypair.fromSecret(secretKey);

            expect(keypair.publicKey()).toBe(publicKey);
            expect(keypair.secret()).toBe(secretKey);
        });

        it('Should get account balance', async () => {
            const [{ balance, asset_type }] = await classic.getBalance({ account: testAccount1.publicKey });

            expect(asset_type).toBe("native");
            expect(balance).toBe("10000.0000000");
        });

        it('Should throw error for invalid account when getting balance', async () => {
            await expect(classic.getBalance({ account: 'invalid-account' })).rejects.toThrow();
        });

        it('Should fund an account using friendbot', async () => {
            const { publicKey: pubKey } = await classic.createAccount();
            const friendbot = await classic.fundAccount({
                publicKey: pubKey
            });

            expect(friendbot.success).toBe(true);
            expect(friendbot.transaction).toBeDefined();
            expect(friendbot.transaction.successful).toBe(true);
            expect(friendbot.transaction.fee_charged).toBe("100");
        });
    });

    describe('Payment Operations', () => {
        it('Should make a native XLM payment between accounts', async () => {
            const { successful, operation_count, fee_charged, source_account } = await classic.createPayment({
                destination: testAccount2.publicKey,
                amount: '100',
                secretKey: testAccount1.secretKey
            });
            const [{ balance: sourceAccountBalance, asset_type: sourceAccountAssetType }] = await classic.getBalance({ account: testAccount1.publicKey });
            const [{ balance: destinationAccountBalance, asset_type: destinationAccountAssetType }] = await classic.getBalance({ account: testAccount2.publicKey });

            expect(sourceAccountBalance).toBe("9899.9999900");
            expect(destinationAccountBalance).toBe("10100.0000000");
            expect(sourceAccountAssetType).toBe("native");
            expect(destinationAccountAssetType).toBe("native");

            expect(successful).toBe(true);
            expect(operation_count).toBe(1);
            expect(fee_charged).toBe("100");
            expect(source_account).toBe(testAccount1.publicKey);
        });

        it('Should throw error for payment with invalid secret key', async () => {
            await expect(
                classic.createPayment({
                    destination: testAccount2.publicKey,
                    amount: '100',
                    secretKey: 'invalid-secret-key'
                })
            ).rejects.toThrow();
        });
    });

    describe('Asset Operations', () => {
        it('Should create a new custom asset', async () => {
            const assetCode = "STELLARMCP"
            const totalSupply = "1000000"
            const result = await classic.createAsset({
                code: assetCode,
                issuerSecretKey: testAccount1.secretKey,
                distributorSecretKey: testAccount2.secretKey,
                totalSupply
            });

            expect(result.asset.code).toBe(assetCode);
            expect(result.transaction.successful).toBe(true);
            expect(result.transaction.fee_charged).toBe("200");
            expect(result.transaction.operation_count).toBe(2);
            expect(result.asset.issuer).toBe(testAccount1.publicKey);
        });

        it('Should establish a custom asset trustline to the new account', async () => {
            const testAccount3 = await classic.createAccount();
            await classic.fundAccount({ publicKey: testAccount3.publicKey });

            const assetCode = "STELLARMCP"
            const totalSupply = "1000000"
            const amount = "100"
            const limit = "100"

            await classic.createAsset({
                code: assetCode,
                issuerSecretKey: testAccount1.secretKey,
                distributorSecretKey: testAccount2.secretKey,
                totalSupply
            });

            await classic.changeTrust({
                asset: {
                    code: assetCode,
                    issuer: testAccount1.publicKey
                },
                limit,
                secretKey: testAccount3.secretKey
            });

            await classic.createPayment({
                destination: testAccount3.publicKey,
                amount,
                secretKey: testAccount2.secretKey,
                asset: {
                    code: assetCode,
                    issuer: testAccount1.publicKey
                },
            });

            const [{ balance: sourceAccountBalance, asset_issuer: sourceAccountAssetIssuer }] = await classic.getBalance({ account: testAccount2.publicKey });
            const [{ balance: destinationAccountBalance, asset_code: destinationAccountAssetCode, limit: destinationAccountAssetLimit }] = await classic.getBalance({ account: testAccount3.publicKey });

            expect(sourceAccountBalance).toBe("999900.0000000");
            expect(sourceAccountAssetIssuer).toBe(testAccount1.publicKey);

            expect(destinationAccountAssetCode).toBe(assetCode);
            expect(destinationAccountBalance).toBe("100.0000000");
            expect(destinationAccountAssetLimit).toBe("100.0000000");
        });

    });
    describe('Transaction History', () => {
        it('Should get transaction history for an account', async () => {
            const transactions = await classic.getTransactions({
                account: testAccount1.publicKey
            });

            expect(Array.isArray(transactions)).toBe(true);
        });

        it('Should throw error for invalid account when getting transactions', async () => {
            await expect(
                classic.getTransactions({ account: 'invalid-account' })
            ).rejects.toThrow();
        });
    });
});