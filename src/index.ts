import dynamodb from 'aws-sdk/clients/dynamodb';
import { RequestParams } from '@elastic/elasticsearch';

import { DDB2ESParam } from './interfaces';
import { createESClient } from './utils/es';

export const ddb2es = async ({
  ddbStreamEvent,
  esOptions,
  bulkOptions,
  forEachRecordToDocument,
}: DDB2ESParam): Promise<void> => {
  const es = createESClient(esOptions);

  const bulkParam: RequestParams.Bulk = {
    body: ddbStreamEvent.Records
      .flatMap((record) => {
        const keys = dynamodb.Converter.unmarshall((record.dynamodb && record.dynamodb.Keys) || {});

        const {
          id = Object.values(keys).join(''),
          index = record.eventSourceARN && record.eventSourceARN.split('/')[1].toLowerCase(),
        } = forEachRecordToDocument(record) || {};

        if (record.eventName === 'REMOVE') {
          return [
            {
              delete: {
                _index: index,
                _id: id,
              },
            },
          ];
        }

        return [
          {
            index: {
              _index: index,
              _id: id,
            },
          },
          dynamodb.Converter.unmarshall((record.dynamodb && record.dynamodb.NewImage) || {}),
        ];
      }),
    ...bulkOptions,
  };

  const { body: bulkResponse } = await es.bulk(bulkParam);
  if (bulkResponse.errors) throw new Error(bulkResponse.errors);
};

export default ddb2es;
