const {
  tendermint: {
    abci: {
      ResponseInfo,
    },
  },
} = require('@dashevo/abci/types');

const Long = require('long');

const { version: driveVersion } = require('../../../package.json');

/**
 * @param {BlockExecutionContext} blockExecutionContext
 * @param {Long} latestProtocolVersion
 * @param {updateSimplifiedMasternodeList} updateSimplifiedMasternodeList
 * @param {BaseLogger} logger
 * @param {GroveDBStore} groveDBStore
 * @return {infoHandler}
 */
function infoHandlerFactory(
  blockExecutionContext,
  latestProtocolVersion,
  updateSimplifiedMasternodeList,
  logger,
  groveDBStore,
) {
  /**
   * Info ABCI handler
   *
   * @typedef infoHandler
   *
   * @param {abci.RequestInfo} request
   * @return {Promise<ResponseInfo>}
   */
  async function infoHandler(request) {
    let contextLogger = logger.child({
      abciMethod: 'info',
    });

    contextLogger.debug('Info ABCI method requested');
    contextLogger.trace({ abciRequest: request });

    // Update CreditsDistributionPool

    const lastHeader = blockExecutionContext.getHeader();

    let lastHeight = Long.fromNumber(0);
    let lastCoreChainLockedHeight = 0;
    if (lastHeader) {
      lastHeight = lastHeader.height;
      lastCoreChainLockedHeight = lastHeader.coreChainLockedHeight;
    }

    contextLogger = contextLogger.child({
      height: lastHeight.toString(),
    });

    if (lastHeader) {
      // Update SML store to latest saved core chain lock to make sure
      // that verify chain lock handler has updated SML Store to verify signatures

      await updateSimplifiedMasternodeList(lastCoreChainLockedHeight, {
        logger: contextLogger,
      });
    }

    const appHash = groveDBStore.getRootHash();

    contextLogger.info(
      {
        lastHeight: lastHeight.toString(),
        appHash: appHash.toString('hex').toUpperCase(),
        latestProtocolVersion: latestProtocolVersion.toString(),
      },
      `Start processing from block #${lastHeight} with appHash ${appHash.toString('hex').toUpperCase() || 'nil'}`,
    );

    return new ResponseInfo({
      version: driveVersion,
      appVersion: latestProtocolVersion,
      lastBlockHeight: lastHeight,
      lastBlockAppHash: appHash,
    });
  }

  return infoHandler;
}

module.exports = infoHandlerFactory;
