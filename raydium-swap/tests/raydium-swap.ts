import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RaydiumSwap } from "../target/types/raydium_swap";
import { ASSOCIATED_TOKEN_PROGRAM_ID, } from "@solana/spl-token";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";

describe("raydium-swap", () => {
  // const raydiumProgramId = new anchor.web3.PublicKey("devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH");

  const ammConfig = new anchor.web3.PublicKey("CQYbhr6amxUER4p5SC44C63R4qw4NFc9Z4Db9vF4tZwG");
  const poolState = new anchor.web3.PublicKey("HRn16fqH3gR8xXgxgRxHY4M2unraFYTapgz8JLJRAvck");

  const inputTokenAccount = new anchor.web3.PublicKey("Dssy4EoKmZVpjMbiyBsxkdXXHzSpNhGJq1QzyRa3idSa");
  const outputTokenAccount = new anchor.web3.PublicKey("BRNRLhAmNX1BybMzGN9AcQjDRCHomU8UMCX5XP64iqDR");

  const poolInputVault = new anchor.web3.PublicKey("sohUc9fNVXwRhpoA1m4TYTmkn3hGwBB53Yw6kRL62h3");
  const poolOutputVault = new anchor.web3.PublicKey("H2xBLMD5DZ8Sgk1xfNv6MuHVA1Nvur8UY5EZ3TZt278V");

  const observationState = new anchor.web3.PublicKey("1iDWLzyRDTnvaAxW7tT8rJYViG1ktx9CS4AvgeJ8pdb");

  const tokenProgram = new anchor.web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const tokenProgram2022 = new anchor.web3.PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
  const memoProgram = new anchor.web3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

  const inputVaultMint = new anchor.web3.PublicKey("So11111111111111111111111111111111111111112");
  const outputVaultMint = new anchor.web3.PublicKey("686P1DCV27RYVkiq5rgh74nQqWfV5W6itB2gBJtqNPHy");

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
      amount: new anchor.BN(10000),
      otherAmountThreshold: new anchor.BN(500),
      sqrtPriceLimitX64: new anchor.BN("0"),
      isBaseInput: true,
    };

    const remainingAccounts = [
      new anchor.web3.PublicKey("EqsToU5h55zkrT4APCGku8nfVbNQMXHUeRnDEqtETELz"),
      new anchor.web3.PublicKey("FRemXN1aJ1H1ApRMVhMKKmx83KFJrV2sUbVnxR3Q8fqR"),
      new anchor.web3.PublicKey("2Mjgy6E2peVE5VF6bZDTWsWAeZtsymh8636okLqUxVYp")
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
        systemProgram: SYSTEM_PROGRAM_ID,
        raydiumProgram: raydiumProgram,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts.map(account => {
        return { pubkey: account, isSigner: false, isWritable: true };
      }))
      .signers([payer])
      .rpc();

    console.log("Swap executed successfully!");
  });
});
