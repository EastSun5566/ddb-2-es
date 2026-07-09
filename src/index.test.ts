import { before, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { DynamoDBStreamEvent } from 'aws-lambda';

const mockBulk = mock.fn(async () => ({ body: { errors: false } }));

// Mock ./es before ./index is loaded so createESClient is replaced
mock.module('./es', {
  exports: {
    createESClient: () => ({ bulk: mockBulk }),
  },
});

let ddb2es: (options: {
  ddbStreamEvent: DynamoDBStreamEvent;
  esOptions: object;
  bulkOptions?: object;
  forEachRecordToDocument?: (record: any) => { index: string; id: string };
}) => Promise<void>;

before(async () => {
  ({ ddb2es } = await import('./index'));
});

test('handles INSERT event and creates index operation', async () => {
  mockBulk.mock.resetCalls();

  const event: DynamoDBStreamEvent = {
    Records: [
      {
        eventName: 'INSERT',
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789:table/my-table/stream/2021-01-01T00:00:00.000',
        dynamodb: {
          Keys: { pk: { S: 'abc' } },
          NewImage: { pk: { S: 'abc' }, count: { N: '1' } },
        },
      },
    ],
  };

  await ddb2es({ ddbStreamEvent: event, esOptions: {} });

  assert.strictEqual(mockBulk.mock.callCount(), 1);
  const [param] = mockBulk.mock.calls[0].arguments as any[];
  assert.deepStrictEqual(param.body[0], { index: { _index: 'my-table', _id: 'abc' } });
  assert.deepStrictEqual(param.body[1], { pk: 'abc', count: 1 });
});

test('handles REMOVE event and creates delete operation', async () => {
  mockBulk.mock.resetCalls();

  const event: DynamoDBStreamEvent = {
    Records: [
      {
        eventName: 'REMOVE',
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789:table/my-table/stream/2021-01-01T00:00:00.000',
        dynamodb: {
          Keys: { pk: { S: 'abc' } },
        },
      },
    ],
  };

  await ddb2es({ ddbStreamEvent: event, esOptions: {} });

  assert.strictEqual(mockBulk.mock.callCount(), 1);
  const [param] = mockBulk.mock.calls[0].arguments as any[];
  assert.deepStrictEqual(param.body[0], { delete: { _index: 'my-table', _id: 'abc' } });
  assert.strictEqual(param.body.length, 1);
});

test('throws an error when bulk response has errors', async () => {
  mockBulk.mock.mockImplementationOnce(async () => ({ body: { errors: true } }));

  const event: DynamoDBStreamEvent = {
    Records: [
      {
        eventName: 'INSERT',
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789:table/my-table/stream/2021-01-01T00:00:00.000',
        dynamodb: {
          Keys: { pk: { S: 'abc' } },
          NewImage: { pk: { S: 'abc' } },
        },
      },
    ],
  };

  await assert.rejects(
    () => ddb2es({ ddbStreamEvent: event, esOptions: {} }),
    Error,
  );
});

test('uses custom forEachRecordToDocument for index and id', async () => {
  mockBulk.mock.resetCalls();

  const event: DynamoDBStreamEvent = {
    Records: [
      {
        eventName: 'MODIFY',
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789:table/my-table/stream/2021-01-01T00:00:00.000',
        dynamodb: {
          Keys: { pk: { S: 'abc' } },
          NewImage: { pk: { S: 'abc' } },
        },
      },
    ],
  };

  await ddb2es({
    ddbStreamEvent: event,
    esOptions: {},
    forEachRecordToDocument: () => ({ index: 'custom-index', id: 'custom-id' }),
  });

  const [param] = mockBulk.mock.calls[0].arguments as any[];
  assert.deepStrictEqual(param.body[0], { index: { _index: 'custom-index', _id: 'custom-id' } });
});
