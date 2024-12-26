import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RaydiumSwap } from "../target/types/raydium_swap";

describe("raydium-swap", () => {
  // const raydiumProgramId = new anchor.web3.PublicKey("devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH");

  const ammConfig = new anchor.web3.PublicKey("CQYbhr6amxUER4p5SC44C63R4qw4NFc9Z4Db9vF4tZwG");
  const poolState = new anchor.web3.PublicKey("89ReBZ4AU4j1H51hCUvvmkxQNMKLyDkKifqxYcaqqmss");

  const inputTokenAccount = new anchor.web3.PublicKey("Dssy4EoKmZVpjMbiyBsxkdXXHzSpNhGJq1QzyRa3idSa");
  const outputTokenAccount = new anchor.web3.PublicKey("2BYDFzVpXx24ajfXBiSdUY6QQmmuwHUP1GKNBSX7kjE2");

  const poolInputVault = new anchor.web3.PublicKey("E34pSEkzBLfuakPpewhEGv63dzMeQ1ZTzSkLsefPAk6T");
  const poolOutputVault = new anchor.web3.PublicKey("96zRBbFmeVW1Drbu183jLXPUTCwjDuun9occg3VuRaRo");

  const observationState = new anchor.web3.PublicKey("Di7B23MeqnjUfuD2DMRKLtX4o1gad88B7r4CRvhgHGib");

  const tokenProgram = new anchor.web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const tokenProgram2022 = new anchor.web3.PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
  const memoProgram = new anchor.web3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

  const inputVaultMint = new anchor.web3.PublicKey("So11111111111111111111111111111111111111112");
  const outputVaultMint = new anchor.web3.PublicKey("AdwzK2QgpPHeTV5iN8udm6Q1jYAL4tFkZifV4MkkPSPr");

  const raydiumProgram = new anchor.web3.PublicKey("devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH");

  let payer: anchor.web3.Keypair;

  before(async () => {
    payer = anchor.web3.Keypair.fromSecretKey(
      Buffer.from(JSON.parse(require('fs').readFileSync('/home/rohit/.config/solana/id.json')))
    );
    console.log("Using user with public key:", payer.publicKey.toString());
  });

  it("tests the ping function", async () => {
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.RaydiumSwap as Program<RaydiumSwap>;

    // Call the ping method
    await program.methods
      .ping()
      .accounts({
        payer: payer.publicKey,
      })
      .signers([payer])
      .rpc();

    console.log("Ping executed successfully!");
  });

  it("tests the swap function", async () => {
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.RaydiumSwap as Program<RaydiumSwap>;

    const params = {
      amount: new anchor.BN(1000000000),
      otherAmountThreshold: new anchor.BN(500),
      sqrtPriceLimitX64: new anchor.BN("0"),
      isBaseInput: true,
    };

    const remainingAccounts = [
      new anchor.web3.PublicKey("5NkHDTm4EhHeDeAs8UqLRg8AC7TciT9PK3XBeyCHJVK7"),
      new anchor.web3.PublicKey("9VQTRfHsf8dPcBijRSZPvDfGmzcc5xk4pDHEcGZKVvsT"),
      new anchor.web3.PublicKey("AUQqfQe58Ybt9aiEgmEUJ2HxCjdqhryXAbGrXAx9HxCR")
    ];

    await program.methods
      .swap(params)
      .accounts({
        payer: payer.publicKey,
        ammConfig: ammConfig,
        poolState: poolState,
        inputTokenAccount: inputTokenAccount,
        outputTokenAccount: outputTokenAccount,
        inputVault: poolInputVault,
        outputVault: poolOutputVault,
        observationState: observationState,
        tokenProgram: tokenProgram,
        tokenProgram2022: tokenProgram2022,
        memoProgram: memoProgram,
        inputVaultMint: inputVaultMint,
        outputVaultMint: outputVaultMint,
        raydiumProgram: raydiumProgram,
      })
      .remainingAccounts(remainingAccounts.map(account => {
        return { pubkey: account, isSigner: false, isWritable: true };
      }))
      .signers([payer])
      .rpc();

    console.log("Swap executed successfully!");
  });
});
