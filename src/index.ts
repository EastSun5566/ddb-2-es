import dynamodb from 'aws-sdk/clients/dynamodb';
// eslint-disable-next-line import/no-unresolved
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { ClientOptions, RequestParams } from '@elastic/elasticsearch';

import { createESClient } from './es';

interface DDB2ESOptions {
  ddbStreamEvent: DynamoDBStreamEvent;
  esOptions: ClientOptions;
  bulkOptions?: RequestParams.Bulk;
  forEachRecordToDocument?: (record: DynamoDBRecord) => { index: string; id: string };
}

export const ddb2es = async ({
  ddbStreamEvent,
  esOptions,
  bulkOptions,
  forEachRecordToDocument,
}: DDB2ESOptions): Promise<void> => {
  const es = createESClient(esOptions);

  const bulkParam: RequestParams.Bulk = {
    body: ddbStreamEvent.Records
      .flatMap((record) => {
        const keys = dynamodb.Converter.unmarshall((record.dynamodb && record.dynamodb.Keys) || {});
        const {
          id = Object.values(keys).join(''),
          index = record.eventSourceARN && record.eventSourceARN.split('/')[1].toLowerCase(),
        } = (forEachRecordToDocument && forEachRecordToDocument(record)) || {};

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
