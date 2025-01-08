import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RaydiumSwap } from "../target/types/raydium_swap";
import { ASSOCIATED_TOKEN_PROGRAM_ID, } from "@solana/spl-token";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";

describe("raydium-swap", () => {
  const ammConfig1 = new anchor.web3.PublicKey("CQYbhr6amxUER4p5SC44C63R4qw4NFc9Z4Db9vF4tZwG");
  const ammConfig2 = new anchor.web3.PublicKey("B9H7TR8PSjJT7nuW2tuPkFC63z7drtMZ4LoCtD7PrCN1");

  const poolState1 = new anchor.web3.PublicKey("89ReBZ4AU4j1H51hCUvvmkxQNMKLyDkKifqxYcaqqmss");
  const poolState2 = new anchor.web3.PublicKey("7ZU5acRDvnfRYWNUvqK3fgR7HyXnsSUDoTiBHMeWMMS1");

  const observationState1 = new anchor.web3.PublicKey("Di7B23MeqnjUfuD2DMRKLtX4o1gad88B7r4CRvhgHGib");
  const observationState2 = new anchor.web3.PublicKey("J2VN9jbogTqyLRzi9Ch9wuQHMASSgo3DS7vZoCR1Atwa");

  const tokenAccount1 = new anchor.web3.PublicKey("2BYDFzVpXx24ajfXBiSdUY6QQmmuwHUP1GKNBSX7kjE2");
  const tokenAccount2 = new anchor.web3.PublicKey("Dssy4EoKmZVpjMbiyBsxkdXXHzSpNhGJq1QzyRa3idSa");
  const tokenAccount3 = new anchor.web3.PublicKey("BahhMfHMyURc5PiWfgus8keCyLbdLvUJhfoVAeRUjaaX");

  const tokenVault1 = new anchor.web3.PublicKey("96zRBbFmeVW1Drbu183jLXPUTCwjDuun9occg3VuRaRo");
  const tokenVault2 = new anchor.web3.PublicKey("E34pSEkzBLfuakPpewhEGv63dzMeQ1ZTzSkLsefPAk6T");

  const tokenVault3 = new anchor.web3.PublicKey("FXxQvnxFhq9bWRfwjGh1qTMakWKoYnTu1m3hS3aaAmXa");
  const tokenVault4 = new anchor.web3.PublicKey("3vNZvNVFEt5A6bRZ7jghQVMTG6g5yF6Xd9ykdNRM9QsT");

  const tokenMint1 = new anchor.web3.PublicKey("AdwzK2QgpPHeTV5iN8udm6Q1jYAL4tFkZifV4MkkPSPr");
  const tokenMint2 = new anchor.web3.PublicKey("So11111111111111111111111111111111111111112");
  const tokenMint3 = new anchor.web3.PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");

  const otherAccount1 = new anchor.web3.PublicKey("5NkHDTm4EhHeDeAs8UqLRg8AC7TciT9PK3XBeyCHJVK7");
  const otherAccount2 = new anchor.web3.PublicKey("9VQTRfHsf8dPcBijRSZPvDfGmzcc5xk4pDHEcGZKVvsT");
  const otherAccount3 = new anchor.web3.PublicKey("AUQqfQe58Ybt9aiEgmEUJ2HxCjdqhryXAbGrXAx9HxCR");

  const otherAccount4 = new anchor.web3.PublicKey("CwMoqQeG9eeUf3Sy4R1FS7B9VYAssKLcyRZiYFjPeZ1C");
  const otherAccount5 = new anchor.web3.PublicKey("5XQtvTLynS3VvFeLxrDYe4WsdGfCN1SZhNiEBiUkULnd");
  const otherAccount6 = new anchor.web3.PublicKey("JCe5FeKmfTk8zyUJRoaJV5EQQbjF1RDpQ9e9BmGY6V5x");

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
      amount: new anchor.BN(10000000),
      otherAmountThreshold: new anchor.BN(500),
      isBaseTokenSOL: true,
      isQuoteTokenSOL: false,
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
