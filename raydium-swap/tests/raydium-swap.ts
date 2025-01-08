import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RaydiumSwap } from "../target/types/raydium_swap";
import { ASSOCIATED_TOKEN_PROGRAM_ID, } from "@solana/spl-token";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";

describe("raydium-swap", () => {
  const ammConfig1 = new anchor.web3.PublicKey("CQYbhr6amxUER4p5SC44C63R4qw4NFc9Z4Db9vF4tZwG");
  const ammConfig2 = new anchor.web3.PublicKey("CQYbhr6amxUER4p5SC44C63R4qw4NFc9Z4Db9vF4tZwG");

  const poolState1 = new anchor.web3.PublicKey("HRn16fqH3gR8xXgxgRxHY4M2unraFYTapgz8JLJRAvck");
  const poolState2 = new anchor.web3.PublicKey("89ReBZ4AU4j1H51hCUvvmkxQNMKLyDkKifqxYcaqqmss");

  const observationState1 = new anchor.web3.PublicKey("1iDWLzyRDTnvaAxW7tT8rJYViG1ktx9CS4AvgeJ8pdb");
  const observationState2 = new anchor.web3.PublicKey("Di7B23MeqnjUfuD2DMRKLtX4o1gad88B7r4CRvhgHGib");

  const tokenAccount1 = new anchor.web3.PublicKey("BRNRLhAmNX1BybMzGN9AcQjDRCHomU8UMCX5XP64iqDR");
  const tokenAccount2 = new anchor.web3.PublicKey("Dssy4EoKmZVpjMbiyBsxkdXXHzSpNhGJq1QzyRa3idSa");
  const tokenAccount3 = new anchor.web3.PublicKey("2BYDFzVpXx24ajfXBiSdUY6QQmmuwHUP1GKNBSX7kjE2");

  const tokenVault1 = new anchor.web3.PublicKey("H2xBLMD5DZ8Sgk1xfNv6MuHVA1Nvur8UY5EZ3TZt278V");
  const tokenVault2 = new anchor.web3.PublicKey("sohUc9fNVXwRhpoA1m4TYTmkn3hGwBB53Yw6kRL62h3");

  const tokenVault3 = new anchor.web3.PublicKey("E34pSEkzBLfuakPpewhEGv63dzMeQ1ZTzSkLsefPAk6T");
  const tokenVault4 = new anchor.web3.PublicKey("96zRBbFmeVW1Drbu183jLXPUTCwjDuun9occg3VuRaRo");

  const tokenMint1 = new anchor.web3.PublicKey("686P1DCV27RYVkiq5rgh74nQqWfV5W6itB2gBJtqNPHy");
  const tokenMint2 = new anchor.web3.PublicKey("So11111111111111111111111111111111111111112");
  const tokenMint3 = new anchor.web3.PublicKey("AdwzK2QgpPHeTV5iN8udm6Q1jYAL4tFkZifV4MkkPSPr");

  const otherAccount1 = new anchor.web3.PublicKey("EqsToU5h55zkrT4APCGku8nfVbNQMXHUeRnDEqtETELz");
  const otherAccount2 = new anchor.web3.PublicKey("FRemXN1aJ1H1ApRMVhMKKmx83KFJrV2sUbVnxR3Q8fqR");
  const otherAccount3 = new anchor.web3.PublicKey("2Mjgy6E2peVE5VF6bZDTWsWAeZtsymh8636okLqUxVYp");

  const otherAccount4 = new anchor.web3.PublicKey("5NkHDTm4EhHeDeAs8UqLRg8AC7TciT9PK3XBeyCHJVK7");
  const otherAccount5 = new anchor.web3.PublicKey("9VQTRfHsf8dPcBijRSZPvDfGmzcc5xk4pDHEcGZKVvsT");
  const otherAccount6 = new anchor.web3.PublicKey("AUQqfQe58Ybt9aiEgmEUJ2HxCjdqhryXAbGrXAx9HxCR");

  const tokenProgram = new anchor.web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const tokenProgram2022 = new anchor.web3.PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
  const memoProgram = new anchor.web3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

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
      swapLen: new anchor.BN(2),
      amount: new anchor.BN(1000000),
      otherAmountThreshold: new anchor.BN(500),
    };

    const remainingAccounts = [
      { pubkey: ammConfig1, isSigner: false, isWritable: false },
      { pubkey: ammConfig2, isSigner: false, isWritable: false },

      { pubkey: poolState1, isSigner: false, isWritable: true },
      { pubkey: poolState2, isSigner: false, isWritable: true },

      { pubkey: observationState1, isSigner: false, isWritable: true },
      { pubkey: observationState2, isSigner: false, isWritable: true },

      { pubkey: tokenAccount1, isSigner: false, isWritable: true },
      { pubkey: tokenAccount2, isSigner: false, isWritable: true },
      { pubkey: tokenAccount3, isSigner: false, isWritable: true },

      { pubkey: tokenVault1, isSigner: false, isWritable: true },
      { pubkey: tokenVault2, isSigner: false, isWritable: true },
      { pubkey: tokenVault3, isSigner: false, isWritable: true },
      { pubkey: tokenVault4, isSigner: false, isWritable: true },

      { pubkey: tokenMint1, isSigner: false, isWritable: false },
      { pubkey: tokenMint2, isSigner: false, isWritable: false },
      { pubkey: tokenMint3, isSigner: false, isWritable: false },

      { pubkey: otherAccount1, isSigner: false, isWritable: true },
      { pubkey: otherAccount2, isSigner: false, isWritable: true },
      { pubkey: otherAccount3, isSigner: false, isWritable: true },
      { pubkey: otherAccount4, isSigner: false, isWritable: true },
      { pubkey: otherAccount5, isSigner: false, isWritable: true },
      { pubkey: otherAccount6, isSigner: false, isWritable: true },
    ];


    await program.methods
      .swap(params)
      .accounts({
        payer: payer.publicKey,
        tokenProgram: tokenProgram,
        tokenProgram2022: tokenProgram2022,
        memoProgram: memoProgram,
        systemProgram: SYSTEM_PROGRAM_ID,
        raydiumProgram: raydiumProgram,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts.map(account => ({
        pubkey: account.pubkey,
        isSigner: account.isSigner,
        isWritable: account.isWritable,
      })))
      .signers([payer])
      .rpc();

    console.log("Swap executed successfully!");
  });
});
