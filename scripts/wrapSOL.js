const {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    Keypair,
    LAMPORTS_PER_SOL,
  } = require("@solana/web3.js");
  
  const {
    TOKEN_PROGRAM_ID,
    NATIVE_MINT,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    createSyncNativeInstruction,
  } = require("@solana/spl-token");
  
  async function convertSolToWsol(connection, owner, amountInSol) {
    try {
      // Get the wSOL ATA address
      const ata = await getAssociatedTokenAddress(
        NATIVE_MINT, // wSOL mint
        owner.publicKey
      );
  
      console.log("wSOL ATA:", ata.toString());
  
      // Check if the ATA exists
      const account = await connection.getAccountInfo(ata);
      
      const transaction = new Transaction();
  
      if (!account) {
        console.log("Creating new wSOL ATA...");
        // Create ATA for wSOL
        transaction.add(
          createAssociatedTokenAccountInstruction(
            owner.publicKey, // payer
            ata, // ata address
            owner.publicKey, // owner
            NATIVE_MINT // mint
          )
        );
      }
  
      // Transfer SOL to the wrapped account
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: owner.publicKey,
          toPubkey: ata,
          lamports: amountInSol * LAMPORTS_PER_SOL,
        })
      );
  
      // Sync wrapped SOL balance
      transaction.add(createSyncNativeInstruction(ata));
  
      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [owner]
      );
  
      console.log("Transaction signature:", signature);
      console.log(`Successfully wrapped ${amountInSol} SOL to wSOL`);
      
      return signature;
    } catch (error) {
      console.error("Error converting SOL to wSOL:", error);
      throw error;
    }
  }
  
  // Example usage:
  async function main() {
    // Connect to devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    // Generate a new keypair or load your existing one
    const owner = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(require('fs').readFileSync('/home/rohit/.config/solana/id.json')))
    );
    console.log("Public Key:", owner.publicKey.toString());
  
    try {
      // Request airdrop first (for testing in devnet)
      // console.log("Requesting airdrop...");
      // const airdropSignature = await connection.requestAirdrop(
      //   owner.publicKey,
      //   2 * LAMPORTS_PER_SOL // 2 SOL
      // );
      
      // await connection.confirmTransaction(airdropSignature);
      // console.log("Airdrop successful");
  
      // Get balance after airdrop
      const balance = await connection.getBalance(owner.publicKey);
      console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  
      // Convert 1 SOL to wSOL
      console.log("Converting 1 SOL to wSOL...");
      await convertSolToWsol(connection, owner, 9);
      
      // Get final balance
      const finalBalance = await connection.getBalance(owner.publicKey);
      console.log(`Final balance: ${finalBalance / LAMPORTS_PER_SOL} SOL`);
      
    } catch (error) {
      console.error("Error in main:", error);
    }
  }
  
  main();