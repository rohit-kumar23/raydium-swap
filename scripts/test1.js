import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

const mint = new PublicKey("So11111111111111111111111111111111111111112");
const pubKey = new PublicKey("Zivon5h5wAjQS8NTnApXjs8mrq8WBP5EnpVn6h2mcFA");

// Create a connection to the Solana Devnet
const connection = new Connection("https://api.devnet.solana.com");

async function checkAssociatedTokenAccount(mint, pubKey) {
    try {
        const tokenProgram = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
        const tokenProgram2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

        // Derive the associated token account address
        const tokenAccountAddress = await getAssociatedTokenAddress(
            mint,
            pubKey,
            false,
            tokenProgram
        );

        // Fetch account information
        const accountInfo = await connection.getAccountInfo(tokenAccountAddress);

        if (accountInfo !== null) {
            console.log(`Associated Token Account exists: ${tokenAccountAddress.toBase58()}`);
        } else {
            console.log(`Associated Token Account does not exist: ${tokenAccountAddress.toBase58()}`);
        }
    } catch (error) {
        console.error("Error checking associated token account:", error);
    }
}

// Call the function
checkAssociatedTokenAccount(mint, pubKey);
