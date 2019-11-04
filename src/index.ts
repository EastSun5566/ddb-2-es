/* eslint-disable no-useless-catch */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
// eslint-disable-next-line import/no-unresolved
import { Converter } from 'aws-sdk/clients/dynamodb';

import { DDB2ESParam } from './interfaces';
import { createESClient } from './utils/es';

export const ddb2es = async ({
  ddbStreamEvent,
  esOptions,
  forEachRecordToDocument,
}: DDB2ESParam): Promise<void> => {
  const es = createESClient(esOptions);

  for (const record of ddbStreamEvent.Records) {
    const keys = Converter.unmarshall(record.dynamodb.Keys);

    const {
      id = Object.values(keys).join(''),
      index = record.eventSourceARN.split('/')[1].toLowerCase(),
      ...resParam
    } = forEachRecordToDocument(record) || {};


    if (record.eventName === 'REMOVE') {
      await es.delete({ index, id, ...resParam });
      return;
    }

    await es.index({
      index,
      id,
      body: Converter.unmarshall(record.dynamodb.NewImage),
      ...resParam,
    });
  }
};

export default ddb2es;
