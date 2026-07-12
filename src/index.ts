import AWS from 'aws-sdk';
// eslint-disable-next-line import/no-unresolved
import type { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { Client } from '@elastic/elasticsearch';

import { createESClient } from './es.ts';

type ClientOptions = ConstructorParameters<typeof Client>[0];

interface DDB2ESOptions {
  ddbStreamEvent: DynamoDBStreamEvent;
  esOptions: ClientOptions;
  bulkOptions?: Record<string, unknown>;
  forEachRecordToDocument?: (record: DynamoDBRecord) => { index: string; id: string };
}

export const ddb2es = async ({
  ddbStreamEvent,
  esOptions,
  bulkOptions,
  forEachRecordToDocument,
}: DDB2ESOptions): Promise<void> => {
  const es = createESClient(esOptions);

  const bulkParam: Record<string, unknown> = {
    operations: ddbStreamEvent.Records
      .flatMap((record) => {
        const keys = AWS.DynamoDB.Converter.unmarshall((record.dynamodb && record.dynamodb.Keys) || {});
        const {
          id = Object.values(keys).join(''),
          index = record.eventSourceARN && record.eventSourceARN.split('/')[1]?.toLowerCase(),
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
          AWS.DynamoDB.Converter.unmarshall((record.dynamodb && record.dynamodb.NewImage) || {}),
        ];
      }),
    ...bulkOptions,
  };

  const bulkResponse = await es.bulk(bulkParam);
  if (bulkResponse.errors) throw new Error('Bulk request encountered errors');
};

export default ddb2es;
