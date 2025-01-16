import { Connection, PublicKey } from '@solana/web3.js'
import { BN } from 'bn.js'
import { PoolUtils } from '@raydium-io/raydium-sdk-v2'


const TICK_ARRAY_SEED = Buffer.from("tick_array", "utf8");
const POOL_TICK_ARRAY_BITMAP_SEED = Buffer.from("pool_tick_array_bitmap_extension", "utf8");

const MIN_TICK = -443636;
const MAX_TICK = -MIN_TICK;


const TICK_ARRAY_SIZE = 60;
const TICK_ARRAY_BITMAP_SIZE = 512;


function i32ToBytes(num) {
    const arr = new ArrayBuffer(4);
    const view = new DataView(arr);
    view.setInt32(0, num, false);
    return new Uint8Array(arr);
}

function findProgramAddress(seeds, programId) {
    const [publicKey, nonce] = PublicKey.findProgramAddressSync(seeds, programId);
    return { publicKey, nonce };
}

function getPdaTickArrayAddress(
    programId,
    poolId,
    startIndex,
) {
    return findProgramAddress([TICK_ARRAY_SEED, poolId.toBuffer(), i32ToBytes(startIndex)], programId);
}

function getPdaExBitmapAccount(
    programId,
    poolId,
) {
    return findProgramAddress([POOL_TICK_ARRAY_BITMAP_SEED, poolId.toBuffer()], programId);
}



function tickCount(tickSpacing) {
    return TICK_ARRAY_SIZE * tickSpacing;
}

function maxTickInTickarrayBitmap(tickSpacing) {
    return tickSpacing * TICK_ARRAY_SIZE * TICK_ARRAY_BITMAP_SIZE;
}

function getArrayStartIndex(tickIndex, tickSpacing) {
    const ticksInArray = tickCount(tickSpacing);
    const start = Math.floor(tickIndex / ticksInArray);

    return start * ticksInArray;
}

function tickRange(tickSpacing) {
    let maxTickBoundary = maxTickInTickarrayBitmap(tickSpacing);
    let minTickBoundary = -maxTickBoundary;

    if (maxTickBoundary > MAX_TICK) {
        maxTickBoundary = getArrayStartIndex(MAX_TICK, tickSpacing) + TickQuery.tickCount(tickSpacing);
    }
    if (minTickBoundary < MIN_TICK) {
        minTickBoundary = getArrayStartIndex(MIN_TICK, tickSpacing);
    }
    return { maxTickBoundary, minTickBoundary };
}

function getTickArrayBitIndex(tickIndex, tickSpacing) {
    const ticksInArray = tickCount(tickSpacing);

    let startIndex = tickIndex / ticksInArray;
    if (tickIndex < 0 && tickIndex % ticksInArray != 0) {
        startIndex = Math.ceil(startIndex) - 1;
    } else {
        startIndex = Math.floor(startIndex);
    }
    return startIndex;
}

function getTickArrayStartIndexByTick(tickIndex, tickSpacing) {
    return getTickArrayBitIndex(tickIndex, tickSpacing) * tickCount(tickSpacing);
}

function isOverflowDefaultTickarrayBitmap(tickSpacing, tickarrayStartIndexs) {
    const { maxTickBoundary, minTickBoundary } = tickRange(tickSpacing);

    for (const tickIndex of tickarrayStartIndexs) {
        const tickarrayStartIndex = getTickArrayStartIndexByTick(tickIndex, tickSpacing);

        if (tickarrayStartIndex >= maxTickBoundary || tickarrayStartIndex < minTickBoundary) {
            return true;
        }
    }

    return false;
}

function checkIsOutOfBoundary(tick) {
    return tick < MIN_TICK || tick > MAX_TICK;
}

function checkIsValidStartIndex(tickIndex, tickSpacing) {
    if (checkIsOutOfBoundary(tickIndex)) {
        if (tickIndex > MAX_TICK) {
            return false;
        }
        const minStartIndex = getTickArrayStartIndexByTick(MIN_TICK, tickSpacing);
        return tickIndex == minStartIndex;
    }
    return tickIndex % tickCount(tickSpacing) == 0;
}

function extensionTickBoundary(tickSpacing) {
    const positiveTickBoundary = maxTickInTickarrayBitmap(tickSpacing);

    const negativeTickBoundary = -positiveTickBoundary;

    if (MAX_TICK <= positiveTickBoundary)
        throw Error(`extensionTickBoundary check error: ${MAX_TICK}, ${positiveTickBoundary}`);
    if (negativeTickBoundary <= MIN_TICK)
        throw Error(`extensionTickBoundary check error: ${negativeTickBoundary}, ${MIN_TICK}`);

    return { positiveTickBoundary, negativeTickBoundary };
}

function checkExtensionBoundary(tickIndex, tickSpacing) {
    const { positiveTickBoundary, negativeTickBoundary } = extensionTickBoundary(tickSpacing);

    if (tickIndex >= negativeTickBoundary && tickIndex < positiveTickBoundary) {
        throw Error("checkExtensionBoundary -> InvalidTickArrayBoundary");
    }
}

function getBitmapOffset(tickIndex, tickSpacing) {
    if (!checkIsValidStartIndex(tickIndex, tickSpacing)) {
        throw new Error("No enough initialized tickArray");
    }
    checkExtensionBoundary(tickIndex, tickSpacing);

    const ticksInOneBitmap = maxTickInTickarrayBitmap(tickSpacing);
    let offset = Math.floor(Math.abs(tickIndex) / ticksInOneBitmap) - 1;

    if (tickIndex < 0 && Math.abs(tickIndex) % ticksInOneBitmap === 0) offset--;
    return offset;
}

function getBitmap(tickIndex, tickSpacing, tickArrayBitmapExtension) {
    const offset = getBitmapOffset(tickIndex, tickSpacing);
    if (tickIndex < 0) {
        return { offset, tickarrayBitmap: tickArrayBitmapExtension.negativeTickArrayBitmap[offset] };
    } else {
        return { offset, tickarrayBitmap: tickArrayBitmapExtension.positiveTickArrayBitmap[offset] };
    }
}

function tickArrayOffsetInBitmapFun(tickArrayStartIndex, tickSpacing) {
    const m = Math.abs(tickArrayStartIndex) % maxTickInTickarrayBitmap(tickSpacing);
    let tickArrayOffsetInBitmap = Math.floor(m / tickCount(tickSpacing));
    if (tickArrayStartIndex < 0 && m != 0) {
        tickArrayOffsetInBitmap = TICK_ARRAY_BITMAP_SIZE - tickArrayOffsetInBitmap;
    }
    return tickArrayOffsetInBitmap;
}

function mergeTickArrayBitmap(bns) {
    let b = new BN(0);
    for (let i = 0; i < bns.length; i++) {
        b = b.add(bns[i].shln(64 * i));
    }
    return b;
}

function checkTickArrayIsInit(tickArrayStartIndex, tickSpacing, tickArrayBitmapExtension) {
    const { tickarrayBitmap } = getBitmap(tickArrayStartIndex, tickSpacing, tickArrayBitmapExtension);

    const tickArrayOffsetInBitmap = tickArrayOffsetInBitmap(tickArrayStartIndex, tickSpacing);

    return {
        isInitialized: mergeTickArrayBitmap(tickarrayBitmap).testn(tickArrayOffsetInBitmap),
        startIndex: tickArrayStartIndex,
    };
}

function leadingZeros(bitNum, data) {
    let i = 0;
    for (let j = bitNum - 1; j >= 0; j--) {
        if (!data.testn(j)) {
            i++;
        } else {
            break;
        }
    }
    return i;
}

function trailingZeros(bitNum, data) {
    let i = 0;
    for (let j = 0; j < bitNum; j++) {
        if (!data.testn(j)) {
            i++;
        } else {
            break;
        }
    }
    return i;
}

function isZero(bitNum, data) {
    for (let i = 0; i < bitNum; i++) {
        if (data.testn(i)) return false;
    }
    return true;
}

function mostSignificantBit(bitNum, data) {
    if (isZero(bitNum, data)) return null;
    else return leadingZeros(bitNum, data);
}

function leastSignificantBit(bitNum, data) {
    if (isZero(bitNum, data)) return null;
    else return trailingZeros(bitNum, data);
}

function checkTickArrayIsInitialized(bitmap, tick, tickSpacing) {
    const multiplier = tickSpacing * TICK_ARRAY_SIZE;
    const compressed = Math.floor(tick / multiplier) + 512;
    const bitPos = Math.abs(compressed);
    return {
        isInitialized: bitmap.testn(bitPos),
        startIndex: (bitPos - 512) * multiplier,
    };
}

function nextInitializedTickArrayStartIndexBitMap(bitMap, lastTickArrayStartIndex, tickSpacing, zeroForOne) {
    if (!checkIsValidStartIndex(lastTickArrayStartIndex, tickSpacing))
        throw Error("nextInitializedTickArrayStartIndex check error");

    const tickBoundary = maxTickInTickarrayBitmap(tickSpacing);
    const nextTickArrayStartIndex = zeroForOne
        ? lastTickArrayStartIndex - tickCount(tickSpacing)
        : lastTickArrayStartIndex + tickCount(tickSpacing);

    if (nextTickArrayStartIndex < -tickBoundary || nextTickArrayStartIndex >= tickBoundary) {
        return { isInit: false, tickIndex: lastTickArrayStartIndex };
    }

    const multiplier = tickSpacing * TICK_ARRAY_SIZE;
    let compressed = nextTickArrayStartIndex / multiplier + 512;

    if (nextTickArrayStartIndex < 0 && nextTickArrayStartIndex % multiplier != 0) {
        compressed--;
    }

    const bitPos = Math.abs(compressed);

    if (zeroForOne) {
        const offsetBitMap = bitMap.shln(1024 - bitPos - 1);
        const nextBit = mostSignificantBit(1024, offsetBitMap);
        if (nextBit !== null) {
            const nextArrayStartIndex = (bitPos - nextBit - 512) * multiplier;
            return { isInit: true, tickIndex: nextArrayStartIndex };
        } else {
            return { isInit: false, tickIndex: -tickBoundary };
        }
    } else {
        const offsetBitMap = bitMap.shrn(bitPos);
        const nextBit = leastSignificantBit(1024, offsetBitMap);
        if (nextBit !== null) {
            const nextArrayStartIndex = (bitPos + nextBit - 512) * multiplier;
            return { isInit: true, tickIndex: nextArrayStartIndex };
        } else {
            return { isInit: false, tickIndex: tickBoundary - tickCount(tickSpacing) };
        }
    }
}

function getBitmapTickBoundary(tickarrayStartIndex, tickSpacing) {
    const ticksInOneBitmap = maxTickInTickarrayBitmap(tickSpacing);
    let m = Math.floor(Math.abs(tickarrayStartIndex) / ticksInOneBitmap);
    if (tickarrayStartIndex < 0 && Math.abs(tickarrayStartIndex) % ticksInOneBitmap != 0) m += 1;

    const minValue = ticksInOneBitmap * m;

    return tickarrayStartIndex < 0
        ? { minValue: -minValue, maxValue: -minValue + ticksInOneBitmap }
        : { minValue, maxValue: minValue + ticksInOneBitmap };
}

function nextInitializedTickArrayInBitmap(tickarrayBitmap, nextTickArrayStartIndex, tickSpacing, zeroForOne) {
    const { minValue: bitmapMinTickBoundary, maxValue: bitmapMaxTickBoundary } = getBitmapTickBoundary(
        nextTickArrayStartIndex,
        tickSpacing,
    );

    const tickArrayOffsetInBitmap = tickArrayOffsetInBitmapFun(nextTickArrayStartIndex, tickSpacing);
    if (zeroForOne) {
        // tick from upper to lower
        // find from highter bits to lower bits
        const offsetBitMap = mergeTickArrayBitmap(tickarrayBitmap).shln(
            TICK_ARRAY_BITMAP_SIZE - 1 - tickArrayOffsetInBitmap,
        );

        const nextBit = isZero(512, offsetBitMap) ? null : leadingZeros(512, offsetBitMap);

        if (nextBit !== null) {
            const nextArrayStartIndex = nextTickArrayStartIndex - nextBit * tickCount(tickSpacing);
            return { isInit: true, tickIndex: nextArrayStartIndex };
        } else {
            // not found til to the end
            return { isInit: false, tickIndex: bitmapMinTickBoundary };
        }
    } else {
        // tick from lower to upper
        // find from lower bits to highter bits
        const offsetBitMap = mergeTickArrayBitmap(tickarrayBitmap).shrn(tickArrayOffsetInBitmap);

        const nextBit = isZero(512, offsetBitMap) ? null : trailingZeros(512, offsetBitMap);

        if (nextBit !== null) {
            const nextArrayStartIndex = nextTickArrayStartIndex + nextBit * tickCount(tickSpacing);
            return { isInit: true, tickIndex: nextArrayStartIndex };
        } else {
            // not found til to the end
            return { isInit: false, tickIndex: bitmapMaxTickBoundary - tickCount(tickSpacing) };
        }
    }
}

function nextInitializedTickArrayFromOneBitmap(lastTickArrayStartIndex, tickSpacing, zeroForOne, tickArrayBitmapExtension) {
    const multiplier = tickCount(tickSpacing);
    const nextTickArrayStartIndex = zeroForOne
        ? lastTickArrayStartIndex - multiplier
        : lastTickArrayStartIndex + multiplier;
    const { tickarrayBitmap } = getBitmap(nextTickArrayStartIndex, tickSpacing, tickArrayBitmapExtension);

    return nextInitializedTickArrayInBitmap(tickarrayBitmap, nextTickArrayStartIndex, tickSpacing, zeroForOne);
}

function nextInitializedTickArrayStartIndex(poolInfo, lastTickArrayStartIndex, zeroForOne) {
    lastTickArrayStartIndex = getArrayStartIndex(poolInfo.tickCurrent, poolInfo.tickSpacing);

    while (true) {
        const { isInit: startIsInit, tickIndex: startIndex } = nextInitializedTickArrayStartIndexBitMap(
            mergeTickArrayBitmap(poolInfo.tickArrayBitmap),
            lastTickArrayStartIndex,
            poolInfo.tickSpacing,
            zeroForOne,
        );
        if (startIsInit) {
            return { isExist: true, nextStartIndex: startIndex };
        }
        lastTickArrayStartIndex = startIndex;

        const { isInit, tickIndex } = nextInitializedTickArrayFromOneBitmap(
            lastTickArrayStartIndex,
            poolInfo.tickSpacing,
            zeroForOne,
            poolInfo.exBitmapInfo,
        );
        if (isInit) return { isExist: true, nextStartIndex: tickIndex };

        lastTickArrayStartIndex = tickIndex;

        if (lastTickArrayStartIndex < MIN_TICK || lastTickArrayStartIndex > MAX_TICK)
            return { isExist: false, nextStartIndex: 0 };
    }

    // const tickArrayBitmap = TickUtils.mergeTickArrayBitmap(
    //   poolInfo.tickArrayBitmap
    // );
    // const currentOffset = TickUtils.getTickArrayOffsetInBitmapByTick(
    //   poolInfo.tickCurrent,
    //   poolInfo.tickSpacing
    // );
    // const result[] = zeroForOne ? TickUtils.searchLowBitFromStart(
    //   tickArrayBitmap,
    //   currentOffset - 1,
    //   0,
    //   1,
    //   poolInfo.tickSpacing
    // ) : TickUtils.searchHightBitFromStart(
    //   tickArrayBitmap,
    //   currentOffset,
    //   1024,
    //   1,
    //   poolInfo.tickSpacing
    // );

    // return result.length > 0 ? { isExist: true, nextStartIndex: result[0] } : { isExist: false, nextStartIndex: 0 }
}

function getFirstInitializedTickArray(poolInfo, zeroForOne) {
    const { isInitialized, startIndex } = isOverflowDefaultTickarrayBitmap(poolInfo.tickSpacing, [
        poolInfo.tickCurrent,
    ])
        ? checkTickArrayIsInit(
            getArrayStartIndex(poolInfo.tickCurrent, poolInfo.tickSpacing),
            poolInfo.tickSpacing,
            poolInfo.exBitmapInfo,
        )
        : checkTickArrayIsInitialized(
            mergeTickArrayBitmap(poolInfo.tickArrayBitmap),
            poolInfo.tickCurrent,
            poolInfo.tickSpacing,
        );

    if (isInitialized) {
        const { publicKey: address } = getPdaTickArrayAddress(poolInfo.programId, poolInfo.id, startIndex);
        return {
            isExist: true,
            startIndex,
            nextAccountMeta: address,
        };
    }
    const { isExist, nextStartIndex } = nextInitializedTickArrayStartIndex(
        poolInfo,
        getArrayStartIndex(poolInfo.tickCurrent, poolInfo.tickSpacing),
        zeroForOne,
    );
    if (isExist) {
        const { publicKey: address } = getPdaTickArrayAddress(poolInfo.programId, poolInfo.id, nextStartIndex);
        return {
            isExist: true,
            startIndex: nextStartIndex,
            nextAccountMeta: address,
        };
    }
    return { isExist: false, nextAccountMeta: undefined, startIndex: undefined };
}

function getRemainingAccounts(poolInfo, zeroForOne) {
    const result = [];
    const addedAddresses = new Set();

    const { isInitialized, startIndex } = isOverflowDefaultTickarrayBitmap(poolInfo.tickSpacing, [
        poolInfo.tickCurrent,
    ])
        ? checkTickArrayIsInit(
            getArrayStartIndex(poolInfo.tickCurrent, poolInfo.tickSpacing),
            poolInfo.tickSpacing,
            poolInfo.exBitmapInfo,
        )
        : checkTickArrayIsInitialized(
            mergeTickArrayBitmap(poolInfo.tickArrayBitmap),
            poolInfo.tickCurrent,
            poolInfo.tickSpacing,
        );

    if (isInitialized) {
        const { publicKey: address } = getPdaTickArrayAddress(poolInfo.programId, poolInfo.id, startIndex);
        result.push({ startIndex: startIndex, tickArrayAddress: address });
        addedAddresses.add(address);
    }

    const { isExist, nextStartIndex } = nextInitializedTickArrayStartIndex(
        poolInfo,
        getArrayStartIndex(poolInfo.tickCurrent, poolInfo.tickSpacing),
        zeroForOne,
    );
    if (isExist) {
        const { publicKey: address } = getPdaTickArrayAddress(poolInfo.programId, poolInfo.id, nextStartIndex);
        if (!addedAddresses.has(address)) {
            result.push({ startIndex: nextStartIndex, tickArrayAddress: address });
            addedAddresses.add(address);
        }
    }
    return result;
}


const programId = new PublicKey("devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH");
const poolId = new PublicKey("89ReBZ4AU4j1H51hCUvvmkxQNMKLyDkKifqxYcaqqmss");


const address1 = getPdaTickArrayAddress(programId, poolId, -118711);
console.log(`TickArray Address: ${address1.publicKey.toBase58()}`);

const address2 = getPdaTickArrayAddress(programId, poolId, MAX_TICK);
console.log(`TickArray Address: ${address2.publicKey.toBase58()}`);

const address3 = getPdaExBitmapAccount(programId, poolId);
console.log(`BitMap Extension Address: ${address3.publicKey.toBase58()}`);

/*
export interface ComputeClmmPoolInfo {
    id: PublicKey;
    mintA: ApiV3Token;
    mintB: ApiV3Token;

    ammConfig: ClmmConfigInfo;
    observationId: PublicKey;
    exBitmapAccount: PublicKey;

    programId: PublicKey;

    tickSpacing: number;
    liquidity: BN;
    sqrtPriceX64: BN;
    tickCurrent: number;

    feeGrowthGlobalX64A: BN;
    feeGrowthGlobalX64B: BN;
    protocolFeesTokenA: BN;
    protocolFeesTokenB: BN;
    swapInAmountTokenA: BN;
    swapOutAmountTokenB: BN;
    swapInAmountTokenB: BN;
    swapOutAmountTokenA: BN;
    tickArrayBitmap: BN[];


    exBitmapInfo: TickArrayBitmapExtensionType;
}
*/

const poolInfo = {
    id: new PublicKey("89ReBZ4AU4j1H51hCUvvmkxQNMKLyDkKifqxYcaqqmss"),
    mintA: {
        address: new PublicKey("So11111111111111111111111111111111111111112"),
    },
    mintB: {
        address: new PublicKey("AdwzK2QgpPHeTV5iN8udm6Q1jYAL4tFkZifV4MkkPSPr"),
    },

    ammConfig: {
        id: new PublicKey("CQYbhr6amxUER4p5SC44C63R4qw4NFc9Z4Db9vF4tZwG"),
    },
    observationId: new PublicKey("Di7B23MeqnjUfuD2DMRKLtX4o1gad88B7r4CRvhgHGib"),
    // exBitmapAccount: getPdaExBitmapAccount(programId, poolId),

    programId: programId,

    tickSpacing: 10,
    liquidity: new BN("190077287308439843"),
    sqrtPriceX64: new BN("48785830690961265"),
    tickCurrent: -118711,

    // feeGrowthGlobalX64A: new BN("88342294"),
    // feeGrowthGlobalX64B: new BN("2037"),
    // protocolFeesTokenA: new BN("129955"),
    // protocolFeesTokenB: new BN("0"),
    // swapInAmountTokenA: new BN("10402000000"),
    // swapOutAmountTokenB: new BN("72654"),
    // swapInAmountTokenB: new BN("2595"),
    // swapOutAmountTokenA: new BN("367991322"),

    tickArrayBitmap: [new BN("0"), new BN("0"), new BN("2048"), new BN("0"), new BN("864691128455135232"), new BN("32"), new BN("0"), new BN("0"), new BN("0"), new BN("0"), new BN("0"), new BN("0"), new BN("0"), new BN("0"), new BN("0"), new BN("0")],

    exBitmapInfo: {
        // poolId: new PublicKey("89ReBZ4AU4j1H51hCUvvmkxQNMKLyDkKifqxYcaqqmss"),
        positiveTickArrayBitmap: Array.from({ length: 14 }, () =>
            Array.from({ length: 8 }, () => new BN("0"))
        ),
        negativeTickArrayBitmap: Array.from({ length: 14 }, () =>
            Array.from({ length: 8 }, () => new BN("0"))
        ),
    },
};

// const result = getFirstInitializedTickArray(poolInfo, true);
// console.log(`Result: ${JSON.stringify(result)}`)

// // const zeroForOne = outputTokenMint.toBase58() === poolInfo.mintB.address;
// // const zeroForOne = inputTokenMint.toBase58() === poolInfo.mintA.address;


const result1 = getRemainingAccounts(poolInfo, true);
console.log(`Result1: ${JSON.stringify(result1)}`)

const raydium_program_id = new PublicKey("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK");
const pool_id = new PublicKey("8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj");

const { publicKey: address } = getPdaTickArrayAddress(raydium_program_id, pool_id, -18720);

console.log("address:", address);


// const res = PoolUtils.getOutputAmountAndRemainAccounts(poolInfo, {}, poolInfo.mintA.address, new BN("10000"));
// console.log(JSON.stringify(res));

/*

export async function getOutputAmountAndRemainAccounts(poolInfo, inputMint, inputAmount) {
    const allNeededAccounts = [];
    const zeroForOne = inputMint.toBase58() === poolInfo.mintA.address;

    const { isExist, startIndex, nextAccountMeta } = getFirstInitializedTickArray(poolInfo, zeroForOne);

    if (!isExist || startIndex === undefined || !nextAccountMeta) {
        throw new Error("Invalid tick array");
    }

    allNeededAccounts.push(nextAccountMeta);

    if (inputAmount.eq(ZERO)) {
        throw new Error("inputAmount must not be 0");
    }

    const tickCurrent = poolInfo.tickCurrent;
    const tickSpacing = poolInfo.tickSpacing;

    const lastSavedTickArrayStartIndex = startIndex;

    const liquidity = poolInfo.liquidity;
    const currentSqrtPriceX64 = poolInfo.sqrtPriceX64;
    const sqrtPriceLimitX64 = zeroForOne ? MIN_SQRT_PRICE_X64.add(ONE) : MAX_SQRT_PRICE_X64.sub(ONE);

    const state = {
        amountRemaining: inputAmount,
        amountCalculated: ZERO,
        sqrtPriceX64: currentSqrtPriceX64,
        tick: tickCurrent > lastSavedTickArrayStartIndex ? Math.min(lastSavedTickArrayStartIndex + tickCount(tickSpacing) - 1, tickCurrent) : lastSavedTickArrayStartIndex,
        accounts: [],
        liquidity: liquidity,
        feeAmount: new BN(0),
    }

    let loopCount = 0;
    let tickAarrayStartIndex = lastSavedTickArrayStartIndex;
    // let tickArrayCurrent = tickArrayCache[lastSavedTickArrayStartIndex];
    let t = !zeroForOne && lastSavedTickArrayStartIndex === state.tick;

    while (!state.amountRemaining.eq(ZERO)) {

        // interface StepComputations {
        //     sqrtPriceStartX64: BN;
        //     tickNext: number;
        //     initialized: boolean;
        //     sqrtPriceNextX64: BN;
        //     amountIn: BN;
        //     amountOut: BN;
        //     feeAmount: BN;
        // }

        const step = {};
        step.sqrtPriceStartX64 = state.sqrtPriceX64;
        const tickState = TickUtils.nextInitTick(tickArrayCurrent, state.tick, tickSpacing, zeroForOne, t);
    }
}

*/