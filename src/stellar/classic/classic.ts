import {
  Asset,
  Claimant,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { z } from 'zod';

import {
  AccountKeyPairSchema,
  AssetParamsSchema,
  AssetSchema,
  BalanceSchema,
  ClaimClaimableBalanceParamsSchema,
  ClaimPredicateSchema,
  CreateClaimableBalanceParamsSchema,
  FundbotResponseSchema,
  PaymentParamsSchema,
  TransactionSchema,
  TrustlineParamsSchema,
} from './schemas.js';

export class Classic {
  private server: Horizon.Server;
  private networkPassphrase: string;
  private networkConfig: {
    [key: string]: { server: Horizon.Server; networkPassphrase: string };
  };

  constructor(serverUrl: string) {
    this.networkConfig = {
      testnet: {
        server: new Horizon.Server(serverUrl, { allowHttp: true }),
        networkPassphrase: Networks.TESTNET,
      },
      public: {
        server: new Horizon.Server(serverUrl, { allowHttp: true }),
        networkPassphrase: Networks.PUBLIC,
      },
      futurenet: {
        server: new Horizon.Server(serverUrl, { allowHttp: true }),
        networkPassphrase: Networks.FUTURENET,
      },
    };

    const network = serverUrl.includes('testnet')
      ? 'testnet'
      : serverUrl.includes('futurenet')
        ? 'futurenet'
        : 'public';
    const config = this.networkConfig[network];
    this.server = config.server;
    this.networkPassphrase = config.networkPassphrase;
  }

  async createAccount(): Promise<z.infer<typeof AccountKeyPairSchema>> {
    try {
      const keypair = Keypair.random();
      return {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  async getBalance(params: {
    account: string;
  }): Promise<z.infer<typeof BalanceSchema>[]> {
    try {
      const { account } = params;
      const { balances } = await this.server.loadAccount(account);
      return BalanceSchema.array().parse(balances);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  async createPayment(
    params: z.infer<typeof PaymentParamsSchema>,
  ): Promise<z.infer<typeof TransactionSchema>> {
    try {
      const { destination, amount, asset, secretKey } =
        PaymentParamsSchema.parse(params);
      const sourceKeypair = Keypair.fromSecret(secretKey);
      const sourceAccount = await this.server.loadAccount(
        sourceKeypair.publicKey(),
      );

      const paymentAsset = asset
        ? new Asset(asset.code, asset.issuer)
        : Asset.native();

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: (await this.server.fetchBaseFee()).toString(),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination,
            asset: paymentAsset,
            amount,
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(sourceKeypair);

      const result = await this.server.submitTransaction(transaction);
      return TransactionSchema.parse(result);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  async getTransactions(params: {
    account: string;
  }): Promise<z.infer<typeof TransactionSchema>[]> {
    try {
      const { account } = params;
      const { records } = await this.server
        .transactions()
        .forAccount(account)
        .call();
      return TransactionSchema.array().parse(records);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  async createAsset(params: z.infer<typeof AssetParamsSchema>): Promise<{
    asset: z.infer<typeof AssetSchema>;
    transaction: z.infer<typeof TransactionSchema>;
  }> {
    try {
      const { code, issuerSecretKey, distributorSecretKey, totalSupply } =
        AssetParamsSchema.parse(params);

      const issuerKeypair = Keypair.fromSecret(issuerSecretKey);
      const distributorKeypair = Keypair.fromSecret(distributorSecretKey);

      const issuerAccount = await this.server.loadAccount(
        issuerKeypair.publicKey(),
      );

      const asset = new Asset(code, issuerKeypair.publicKey());

      const transaction = new TransactionBuilder(issuerAccount, {
        fee: (await this.server.fetchBaseFee()).toString(),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.changeTrust({
            asset,
            limit: totalSupply,
            source: distributorKeypair.publicKey(),
          }),
        )
        .addOperation(
          Operation.payment({
            destination: distributorKeypair.publicKey(),
            asset,
            amount: totalSupply,
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(issuerKeypair, distributorKeypair);

      const result = await this.server.submitTransaction(transaction);
      return {
        asset: {
          code,
          issuer: issuerKeypair.publicKey(),
        },
        transaction: TransactionSchema.parse(result),
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  async changeTrust(
    params: z.infer<typeof TrustlineParamsSchema>,
  ): Promise<z.infer<typeof TransactionSchema>> {
    try {
      const { asset, limit, secretKey } = TrustlineParamsSchema.parse(params);
      const accountKeypair = Keypair.fromSecret(secretKey);
      const account = await this.server.loadAccount(accountKeypair.publicKey());

      const stellarAsset = new Asset(asset.code, asset.issuer);

      const transaction = new TransactionBuilder(account, {
        fee: (await this.server.fetchBaseFee()).toString(),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.changeTrust({
            asset: stellarAsset,
            limit,
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(accountKeypair);

      const result = await this.server.submitTransaction(transaction);
      return TransactionSchema.parse(result);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  async fundAccount(params: {
    publicKey: string;
  }): Promise<z.infer<typeof FundbotResponseSchema>> {
    try {
      const { publicKey } = params;
      const response = await this.server.friendbot(publicKey).call();
      return FundbotResponseSchema.parse({
        success: true,
        transaction: response,
      });
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  async createClaimableBalance(
    params: z.infer<typeof CreateClaimableBalanceParamsSchema>,
  ): Promise<z.infer<typeof TransactionSchema>> {
    try {
      const { asset, amount, claimants, secretKey } =
        CreateClaimableBalanceParamsSchema.parse(params);
      const sourceKeypair = Keypair.fromSecret(secretKey);
      const sourceAccount = await this.server.loadAccount(
        sourceKeypair.publicKey(),
      );

      const claimableAsset = asset
        ? new Asset(asset.code, asset.issuer)
        : Asset.native();

      const stellarClaimants = claimants.map(
        (claimant) =>
          new Claimant(
            claimant.destination,
            this.buildPredicate(claimant.predicate),
          ),
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: (await this.server.fetchBaseFee()).toString(),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.createClaimableBalance({
            asset: claimableAsset,
            amount,
            claimants: stellarClaimants,
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(sourceKeypair);

      const result = await this.server.submitTransaction(transaction);
      return TransactionSchema.parse(result);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  private buildPredicate(
    predicate: z.infer<typeof ClaimPredicateSchema>,
  ): xdr.ClaimPredicate {
    switch (predicate.type) {
      case 'UNCONDITIONAL':
        return xdr.ClaimPredicate.claimPredicateUnconditional();
      case 'BEFORE_RELATIVE_TIME':
        return xdr.ClaimPredicate.claimPredicateBeforeRelativeTime(
          new xdr.Int64(predicate.value),
        );
      case 'BEFORE_ABSOLUTE_TIME':
        return xdr.ClaimPredicate.claimPredicateBeforeAbsoluteTime(
          new xdr.Int64(predicate.value),
        );
      case 'NOT':
        return xdr.ClaimPredicate.claimPredicateNot(
          this.buildPredicate(predicate.value[0]),
        );
      case 'AND':
        return xdr.ClaimPredicate.claimPredicateAnd([
          this.buildPredicate(predicate.value[0]),
          this.buildPredicate(predicate.value[1]),
        ]);
      case 'OR':
        return xdr.ClaimPredicate.claimPredicateOr([
          this.buildPredicate(predicate.value[0]),
          this.buildPredicate(predicate.value[1]),
        ]);
      default:
        throw new Error('Invalid predicate type');
    }
  }

  async claimClaimableBalance(
    params: z.infer<typeof ClaimClaimableBalanceParamsSchema>,
  ): Promise<z.infer<typeof TransactionSchema>> {
    try {
      const { balanceId, secretKey } =
        ClaimClaimableBalanceParamsSchema.parse(params);
      const sourceKeypair = Keypair.fromSecret(secretKey);
      const sourceAccount = await this.server.loadAccount(
        sourceKeypair.publicKey(),
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: (await this.server.fetchBaseFee()).toString(),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.claimClaimableBalance({
            balanceId,
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(sourceKeypair);

      const result = await this.server.submitTransaction(transaction);
      return TransactionSchema.parse(result);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }
}
